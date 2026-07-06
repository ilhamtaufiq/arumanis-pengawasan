#!/usr/bin/env bash
set -euo pipefail

# Build APK Android lokal di VPS (Expo prebuild + Gradle).
# Monorepo pengawas — app mobile di apps/mobile, install workspace via Bun.
#
# Prasyarat VPS (Ubuntu/Debian):
#   - git, bun, jq, gh (opsional untuk release)
#   - JDK 17+, Android SDK (ANDROID_HOME)
#   - apps/mobile/.env.production dengan URL produksi
#
# Contoh:
#   ./scripts/build-android.sh
#   GIT_BRANCH=main BUMP_VERSION=patch ./scripts/build-android.sh
#   SKIP_RELEASE=1 ./scripts/build-android.sh
#
# Git sync otomatis: fetch + reset ke origin/$GIT_BRANCH sebelum build.

# ─── Konfigurasi ───────────────────────────────────────────────
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="$PROJECT_DIR/apps/mobile"
GIT_BRANCH="${GIT_BRANCH:-main}"
BUMP_VERSION="${BUMP_VERSION:-patch}"  # patch | minor | major | none
SKIP_RELEASE="${SKIP_RELEASE:-0}"
ENV_FILE="${ENV_FILE:-$MOBILE_DIR/.env.production}"
GRADLE_LOG="/tmp/pengawas-gradle-build.log"
INSTALL_LOG="/tmp/pengawas-bun-install.log"
PREBUILD_LOG="/tmp/pengawas-expo-prebuild.log"
RELEASE_NOTES=""
VERSION_BUMP_PENDING=0

# ─── Fungsi bantuan ────────────────────────────────────────────
info()  { echo -e "\033[1;34m[*]\033[0m $*"; }
ok()    { echo -e "\033[1;32m[✓]\033[0m $*"; }
err()   { echo -e "\033[1;31m[✗]\033[0m $*" >&2; }

die()   { err "$*"; exit 1; }
require_cmd() { command -v "$1" &>/dev/null || die "Perintah '$1' tidak ditemukan. Install dulu."; }

validate_version() {
    local ver="$1"
    [[ "$ver" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]] || \
        die "Format versi tidak valid: '$ver'. Perbaiki di repo lalu merge ke $GIT_BRANCH."
}

show_build_progress() {
    local pct="$1"
    local width=36
    local filled=$((pct * width / 100))
    local empty=$((width - filled))
    local bar
    bar="$(printf '%*s' "$filled" '' | tr ' ' '#')$(printf '%*s' "$empty" '' | tr ' ' '-')"
    printf "\r\033[1;34m[*]\033[0m Build [%s] %3d%%" "$bar" "$pct"
}

gradle_progress_pct() {
    local log_file="$1"
    local tasks pct

    if grep -qE 'BUILD SUCCESSFUL' "$log_file" 2>/dev/null; then
        echo 100
        return
    fi

    if grep -qE '> Task :app:assembleRelease' "$log_file" 2>/dev/null; then
        echo 99
        return
    fi
    if grep -qE '> Task :app:packageRelease' "$log_file" 2>/dev/null; then
        echo 92
        return
    fi
    if grep -qE '> Task :app:(minifyReleaseWithR8|optimizeReleaseResources|lintVitalAnalyzeRelease)' "$log_file" 2>/dev/null; then
        echo 85
        return
    fi
    if grep -qE '> Task :app:compileRelease' "$log_file" 2>/dev/null; then
        echo 60
        return
    fi
    if grep -qE '> Task :app:mergeReleaseResources' "$log_file" 2>/dev/null; then
        echo 45
        return
    fi
    if grep -qE '> Task :app:preReleaseBuild' "$log_file" 2>/dev/null; then
        echo 20
        return
    fi

    tasks=0
    if [ -s "$log_file" ]; then
        tasks=$(grep -cE '^> Task ' "$log_file" 2>/dev/null || true)
        tasks=${tasks:-0}
    fi
    pct=$((10 + tasks / 4))
    [ "$pct" -gt 94 ] && pct=94
    [ "$pct" -lt 5 ] && pct=5
    echo "$pct"
}

run_gradle_build() {
    local log_file="$1"
    local gradle_pid last_pct=0 pct

    : > "$log_file"
    NODE_ENV=production ./gradlew assembleRelease --console=plain >"$log_file" 2>&1 &
    gradle_pid=$!

    while kill -0 "$gradle_pid" 2>/dev/null; do
        pct=$(gradle_progress_pct "$log_file")
        pct=${pct//$'\n'/}
        pct=${pct:-0}
        if [ "$pct" -ne "$last_pct" ] 2>/dev/null; then
            show_build_progress "$pct"
            last_pct=$pct
        fi
        sleep 1
    done

    wait "$gradle_pid" || return $?

    pct=$(gradle_progress_pct "$log_file")
    pct=${pct//$'\n'/}
    pct=${pct:-0}
    show_build_progress "$pct"
    echo ""
    return 0
}

sync_from_git() {
    info "Sinkron dari origin/$GIT_BRANCH..."
    cd "$PROJECT_DIR"

    git fetch origin "$GIT_BRANCH"

    if git show-ref --verify --quiet "refs/heads/$GIT_BRANCH"; then
        git checkout "$GIT_BRANCH"
    else
        git checkout -B "$GIT_BRANCH" "origin/$GIT_BRANCH"
    fi

    git reset --hard "origin/$GIT_BRANCH"
    git clean -fd

    ok "Repo sinkron: $(git rev-parse --short HEAD) ($GIT_BRANCH)"
}

read_version_from_git() {
    local pkg_json="$MOBILE_DIR/package.json"
    local app_json="$MOBILE_DIR/app.json"
    local pkg_ver app_ver

    [ -f "$pkg_json" ] || die "apps/mobile/package.json tidak ditemukan."
    [ -f "$app_json" ] || die "apps/mobile/app.json tidak ditemukan."

    pkg_ver=$(jq -r '.version' < "$pkg_json")
    app_ver=$(jq -r '.expo.version' < "$app_json")

    validate_version "$pkg_ver"
    [ "$pkg_ver" = "$app_ver" ] || \
        die "Versi tidak sinkron: package.json=$pkg_ver, app.json=$app_ver. Samakan di apps/mobile lalu merge ke $GIT_BRANCH."

    VERSION="$pkg_ver"
    ok "Versi mobile dari git ($GIT_BRANCH): $VERSION"
}

version_to_code() {
    local ver="${1%%-*}"
    local major minor patch
    IFS='.' read -r major minor patch <<< "$ver"
    major=${major:-0}
    minor=${minor:-0}
    patch=${patch:-0}
    echo $((major * 10000 + minor * 100 + patch))
}

bump_semver() {
    local ver="$1"
    local bump_type="$2"
    local major minor patch suffix=""

    if [[ "$ver" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)(-.+)?$ ]]; then
        major="${BASH_REMATCH[1]}"
        minor="${BASH_REMATCH[2]}"
        patch="${BASH_REMATCH[3]}"
        suffix="${BASH_REMATCH[4]}"
    else
        die "Tidak bisa bump versi: '$ver'"
    fi

    case "$bump_type" in
        patch) patch=$((patch + 1)) ;;
        minor) minor=$((minor + 1)); patch=0 ;;
        major) major=$((major + 1)); minor=0; patch=0 ;;
        none) echo "$ver"; return ;;
        *) die "BUMP_VERSION tidak valid: '$bump_type' (pakai patch|minor|major|none)" ;;
    esac

    echo "${major}.${minor}.${patch}${suffix}"
}

write_version_files() {
    local new_version="$1"
    local new_code="$2"
    local pkg_json="$MOBILE_DIR/package.json"
    local app_json="$MOBILE_DIR/app.json"

    jq --arg v "$new_version" '.version = $v' "$pkg_json" > "${pkg_json}.tmp" \
        && mv "${pkg_json}.tmp" "$pkg_json"

    jq --arg v "$new_version" --argjson c "$new_code" \
        '.expo.version = $v | .expo.android.versionCode = $c' \
        "$app_json" > "${app_json}.tmp" \
        && mv "${app_json}.tmp" "$app_json"
}

prepare_version_bump() {
    local old_version="$VERSION"
    local new_version new_code current_code

    if [ "$BUMP_VERSION" = "none" ]; then
        info "Auto bump dimatikan (BUMP_VERSION=none), pakai versi $VERSION"
        current_code=$(jq -r '.expo.android.versionCode // empty' < "$MOBILE_DIR/app.json")
        if [ -z "$current_code" ]; then
            VERSION_CODE=$(version_to_code "$VERSION")
            write_version_files "$VERSION" "$VERSION_CODE"
            VERSION_BUMP_PENDING=1
            ok "android.versionCode diset ke $VERSION_CODE (belum di-commit)"
        else
            VERSION_CODE="$current_code"
        fi
        return
    fi

    new_version=$(bump_semver "$VERSION" "$BUMP_VERSION")
    [ "$new_version" = "$old_version" ] && die "Gagal menghitung versi baru dari $old_version"

    current_code=$(jq -r '.expo.android.versionCode // 0' < "$MOBILE_DIR/app.json")
    if [ "$current_code" -gt 0 ] 2>/dev/null; then
        new_code=$((current_code + 1))
    else
        new_code=$(version_to_code "$new_version")
    fi

    write_version_files "$new_version" "$new_code"
    VERSION="$new_version"
    VERSION_CODE="$new_code"
    VERSION_BUMP_PENDING=1

    ok "Versi disiapkan: $old_version → $VERSION (versionCode: $VERSION_CODE, commit setelah sukses)"
}

rollback_version_bump() {
    local pkg_json="$MOBILE_DIR/package.json"
    local app_json="$MOBILE_DIR/app.json"

    if [ "$VERSION_BUMP_PENDING" != "1" ]; then
        return
    fi

    info "Build gagal — mengembalikan file versi ke commit terakhir..."
    cd "$PROJECT_DIR"
    git checkout -- "$pkg_json" "$app_json"
    VERSION_BUMP_PENDING=0
}

commit_version_bump() {
    local pkg_json="$MOBILE_DIR/package.json"
    local app_json="$MOBILE_DIR/app.json"

    cd "$PROJECT_DIR"

    if git diff --quiet -- "$pkg_json" "$app_json" 2>/dev/null; then
        return
    fi

    info "Commit & push version bump ke origin/$GIT_BRANCH..."
    git add "$pkg_json" "$app_json"
    git commit -m "chore(mobile): bump version to $VERSION (versionCode $VERSION_CODE)"
    git push origin "$GIT_BRANCH"
    VERSION_BUMP_PENDING=0
    ok "Version bump terpush: $VERSION"
}

finalize_release_version() {
    info "Build sukses — menyimpan version bump ke git..."
    commit_version_bump
}

ensure_production_env() {
    [ -f "$ENV_FILE" ] || die \
        "File env produksi tidak ditemukan: $ENV_FILE
Buat dari contoh:
  cp apps/mobile/.env.example apps/mobile/.env.production
Lalu set minimal:
  EXPO_PUBLIC_APIAMIS_BASE_URL=https://apiamis.cianjur.space/api"

    if ! grep -qE '^EXPO_PUBLIC_APIAMIS_BASE_URL=' "$ENV_FILE"; then
        die "$ENV_FILE wajib berisi EXPO_PUBLIC_APIAMIS_BASE_URL"
    fi

    ok "Env produksi: $ENV_FILE"
}

# ─── Cek prasyarat ─────────────────────────────────────────────
info "Memeriksa prasyarat..."
require_cmd bun
require_cmd git
require_cmd jq

BUN_VER=$(bun -v | cut -d. -f1)
[ "$BUN_VER" -ge 1 ] 2>/dev/null || die "Bun tidak terdeteksi dengan benar: $(bun -v)"

NODE_VER=$(bun --eval "console.log(process.versions.node)" 2>/dev/null || echo "0" | cut -d. -f1)
[ "${NODE_VER:-0}" -ge 18 ] 2>/dev/null || die "Node runtime di Bun minimal 18"

ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
if [ ! -d "$ANDROID_HOME" ]; then
    ANDROID_HOME="/usr/lib/android-sdk"
fi
[ -d "$ANDROID_HOME" ] || die "Android SDK tidak ditemukan. Set ANDROID_HOME atau install Android SDK di VPS."
export ANDROID_HOME
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

JAVA_VER=$(java -version 2>&1 | head -1 | grep -oE '"(1\.)?[0-9]+' | tr -d '"1.' | head -1 || echo "0")
[ "${JAVA_VER:-0}" -ge 17 ] 2>/dev/null || die "JDK minimal 17, saat ini: $(java -version 2>&1 | head -1)"

if [ "$SKIP_RELEASE" != "1" ]; then
    require_cmd gh
    gh auth status &>/dev/null || die "gh CLI belum login. Jalankan: gh auth login — atau set SKIP_RELEASE=1"
fi

ok "Prasyarat OK (Bun $(bun -v), SDK: $ANDROID_HOME, JDK: $JAVA_VER)"

# ─── Sinkron git & versi (otomatis) ───────────────────────────
sync_from_git

read_version_from_git
prepare_version_bump
ensure_production_env

cleanup_on_exit() {
    if [ "$VERSION_BUMP_PENDING" = "1" ]; then
        rollback_version_bump
    fi
}
trap cleanup_on_exit EXIT

APP_NAME=$(jq -r '.expo.name' < "$MOBILE_DIR/app.json")
RELEASE_TITLE="mobile-v$VERSION"
TAG="mobile-v$VERSION"
APK_ASSET_NAME="${APP_NAME// /-}-v${VERSION}.apk"

if [ -t 0 ]; then
    read -rp "Catatan release (opsional, Enter untuk skip): " RELEASE_NOTES_INPUT || true
    if [ -n "${RELEASE_NOTES_INPUT:-}" ]; then
        RELEASE_NOTES="$RELEASE_NOTES_INPUT"
    fi
fi

# ─── Install dependencies (workspace root) ─────────────────────
info "Menginstall dependencies monorepo (bun install)..."
cd "$PROJECT_DIR"
if bun install --frozen-lockfile >"$INSTALL_LOG" 2>&1; then
    ok "Dependencies terinstall"
else
    err "bun install gagal. Log: $INSTALL_LOG"
    tail -30 "$INSTALL_LOG" >&2 || true
    exit 1
fi

# ─── Prebuild (generate android/) ─────────────────────────────
info "Menjalankan expo prebuild..."
cd "$MOBILE_DIR"
rm -rf android
export NODE_ENV=production
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if NODE_ENV=production bunx expo prebuild --platform android --clean >"$PREBUILD_LOG" 2>&1; then
    ok "Prebuild selesai (NODE_ENV=production)"
else
    err "Prebuild gagal. Log: $PREBUILD_LOG"
    tail -40 "$PREBUILD_LOG" >&2 || true
    exit 1
fi

# ─── Build APK lokal ───────────────────────────────────────────
info "Memulai build Android APK..."
cd "$MOBILE_DIR/android"

if run_gradle_build "$GRADLE_LOG"; then
    BUNDLE_FILE=$(find "$MOBILE_DIR/android/app/build" \( -name '*.bundle' -o -name '*.hbc' \) -type f 2>/dev/null | head -1)
    [ -n "$BUNDLE_FILE" ] || die "JS bundle release tidak ditemukan. APK akan force-close saat dibuka."
    ok "Build berhasil! (bundle: $(basename "$BUNDLE_FILE"))"
else
    err "Build gagal. Log lengkap: $GRADLE_LOG"
    grep -E 'FAILURE:|error:|Error:|BUILD FAILED' "$GRADLE_LOG" | tail -20 >&2 || tail -30 "$GRADLE_LOG" >&2
    exit 1
fi

finalize_release_version

# ─── Cari APK hasil build ──────────────────────────────────────
APK_FILE=$(find "$MOBILE_DIR/android/app/build/outputs/apk" -name "*-release.apk" -type f | head -1)

if [ -z "$APK_FILE" ]; then
    APK_FILE=$(find "$MOBILE_DIR/android/app/build/outputs" -name "*.apk" -type f | head -1)
fi

[ -z "$APK_FILE" ] && die "APK tidak ditemukan di output!"
ok "APK: $APK_FILE"
ls -lh "$APK_FILE"

# ─── Salin ke dist/ ────────────────────────────────────────────
APK_DIR="$PROJECT_DIR/dist"
mkdir -p "$APK_DIR"
DIST_APK="$APK_DIR/$APK_ASSET_NAME"
cp "$APK_FILE" "$DIST_APK"
ok "APK disalin ke: $DIST_APK"

# ─── GitHub Release (opsional) ─────────────────────────────────
if [ "$SKIP_RELEASE" = "1" ]; then
    ok "SKIP_RELEASE=1 — lewati GitHub Release"
    echo ""
    echo "  ═══════════════════════════════════════"
    echo "   Versi    : $VERSION (code $VERSION_CODE)"
    echo "   APK      : $DIST_APK"
    echo "  ═══════════════════════════════════════"
    exit 0
fi

info "Membuat git tag $TAG..."
cd "$PROJECT_DIR"

if git rev-parse "$TAG" &>/dev/null; then
    die "Tag $TAG sudah ada. Gunakan BUMP_VERSION=patch atau naikkan versi manual."
fi
if [ -n "$(git ls-remote --tags origin "refs/tags/$TAG" 2>/dev/null)" ]; then
    die "Tag $TAG sudah ada di origin."
fi

git tag -a "$TAG" -m "Mobile release $TAG (versionCode $VERSION_CODE)"
git push origin "$TAG"
ok "Tag $TAG terpush"

info "Mempublish GitHub Release..."

if [ -z "$RELEASE_NOTES" ]; then
    PREV_TAG=$(git describe --tags --abbrev=0 --match 'mobile-v*' "${TAG}^" 2>/dev/null || echo "")
    if [ -n "$PREV_TAG" ]; then
        RELEASE_NOTES=$(git log --oneline --no-decorate "$PREV_TAG..HEAD" 2>/dev/null | head -50)
    fi
    if [ -z "$RELEASE_NOTES" ]; then
        RELEASE_NOTES="Android APK build $TAG"
    fi
fi

if gh release view "$TAG" &>/dev/null; then
    info "Release $TAG sudah ada, mengunggah ulang APK..."
    gh release upload "$TAG" "$DIST_APK#$APK_ASSET_NAME" --clobber
else
    gh release create "$TAG" \
        --title "$RELEASE_TITLE" \
        --notes "$RELEASE_NOTES" \
        "$DIST_APK#$APK_ASSET_NAME"
fi

ok "Release $TAG berhasil dipublish!"
echo ""
echo "  ═══════════════════════════════════════"
echo "   Branch   : $GIT_BRANCH @ $(git rev-parse --short HEAD)"
echo "   Release  : $RELEASE_TITLE"
echo "   Code     : $VERSION_CODE"
echo "   APK      : $DIST_APK"
REPO_URL=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "<repo>")
echo "   URL      : https://github.com/$REPO_URL/releases/tag/$TAG"
echo "  ═══════════════════════════════════════"