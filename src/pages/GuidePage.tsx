import { AnchorButton, Badge, SectionHeader, Surface } from '@/components/ui'
import {
  AlertTriangle,
  BookOpenText,
  Camera,
  ClipboardList,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogIn,
  MessageSquareText,
  RefreshCcw,
  Shield,
  Users,
} from 'lucide-react'

const toc = [
  { href: '#mulai-cepat', label: 'Mulai Cepat' },
  { href: '#navigasi', label: 'Navigasi' },
  { href: '#fitur-utama', label: 'Fitur Utama' },
  { href: '#alur-kerja', label: 'Alur Kerja' },
  { href: '#aturan-foto', label: 'Aturan Foto' },
  { href: '#masalah', label: 'Penanganan Masalah' },
  { href: '#faq', label: 'FAQ' },
]

const loginInfo = [
  {
    icon: LogIn,
    title: 'Masuk via Arumanis',
    desc: 'Panel pengawasan tidak punya form login sendiri. Masuk lewat Arumanis (/sign-in), lalu otomatis dialihkan ke /pengawasan.',
  },
  {
    icon: Shield,
    title: 'SSO Token',
    desc: 'Saat masuk dari Arumanis, URL berisi ?token=... dan sistem otomatis sinkron. Tampil layar "Menyinkronkan sesi SSO...".',
  },
  {
    icon: Users,
    title: 'Sesi & Logout',
    desc: 'Sesi via httpOnly cookie (pengawas_session). Logout lewat tombol Keluar di sidebar — kembali ke login Arumanis.',
  },
]

const navRoutes = [
  { path: '/', page: 'Dashboard', note: 'Ringkasan KPI & tabel pekerjaan' },
  { path: '/pekerjaan', page: 'Daftar Pekerjaan', note: 'Tabel lengkap + filter & pagination' },
  { path: '/pekerjaan/:id', page: 'Detail Pekerjaan', note: '6 tab: Ringkasan, Output, Penerima, Foto, Progress, Tiket' },
  { path: '/tiket', page: 'Tiket / Isu', note: 'Daftar + detail + komentar 2 kolom' },
  { path: '/panduan', page: 'Panduan', note: 'Halaman ini' },
  { path: '/profile', page: 'Profil', note: 'Data user + kecocokan pengawas' },
]

const sidebarItems = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Pekerjaan', icon: ClipboardList },
  { label: 'Tiket', icon: MessageSquareText },
  { label: 'Panduan', icon: BookOpenText },
  { label: 'Profil', icon: Users },
]

const mainFeatures = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    points: [
      'KPI: Jumlah paket, belum progress, deviasi, foto belum lengkap',
      'Tabel pekerjaan yang diawasi (klik baris ke detail)',
      'Section "Paket perlu perhatian" (max 8 item)',
      'Filter tahun & search nama paket',
    ],
  },
  {
    title: 'Daftar Pekerjaan',
    icon: ClipboardList,
    points: [
      'Tabel lengkap + paginasi',
      'Kolom: Paket, Lokasi, Pagu, Progress, Update',
      'Toolbar: search + tahun',
      'Klik nama paket masuk ke detail',
    ],
  },
]

const detailTabs = [
  {
    id: 'ringkasan',
    label: 'Ringkasan',
    icon: Shield,
    desc: 'Info lengkap pekerjaan: kegiatan, lokasi, pengawas, pendamping, pagu, progress, foto wajib. Daftar output dengan jumlah foto.',
  },
  {
    id: 'output',
    label: 'Output',
    icon: FileText,
    desc: 'CRUD output: komponen, satuan, volume, opsi komunal/opsional. Menjadi dasar matriks foto per slot.',
  },
  {
    id: 'penerima',
    label: 'Penerima',
    icon: Users,
    desc: 'Tambah/edit/hapus penerima. Centang Komunal untuk kelompok (jiwa & NIK dinonaktifkan). Tabel daftar dengan aksi.',
  },
  {
    id: 'foto',
    label: 'Foto',
    icon: Camera,
    desc: 'Matriks output × slot (0%, 25%, 50%, 75%, 100%). Klik kosong untuk upload (GPS auto/manual + EXIF). Preview, ganti, hapus. Tombol Cetak Foto (PDF).',
  },
  {
    id: 'progress',
    label: 'Progress',
    icon: RefreshCcw,
    desc: 'Pilih minggu aktif. Isi Rencana & Realisasi per item. Simpan → badge "Tersimpan". KPI deviasi & progress otomatis update.',
  },
  {
    id: 'tiket',
    label: 'Tiket',
    icon: MessageSquareText,
    desc: 'Lihat tiket terkait pekerjaan. Info jumlah terbuka/tertutup. Buka halaman Tiket untuk manajemen penuh (daftar + komentar).',
  },
]

const workflows = [
  {
    title: 'Pantau Dashboard',
    icon: LayoutDashboard,
    steps: [
      'Login → perhatikan KPI (progress 0, deviasi, foto belum lengkap)',
      'Gunakan filter tahun & search untuk fokus',
      'Buka section Paket perlu perhatian',
      'Klik nama paket untuk masuk detail',
    ],
  },
  {
    title: 'Kelola Penerima Manfaat',
    icon: Users,
    steps: [
      'Buka detail → tab Penerima',
      'Klik "Buka form"',
      'Isi Nama (wajib). Centang Komunal bila kelompok',
      'Untuk individu: isi Jumlah Jiwa & NIK',
      'Tambah → muncul di tabel. Edit/Hapus via aksi',
    ],
  },
  {
    title: 'Upload Dokumentasi Foto',
    icon: Camera,
    steps: [
      'Buka detail → tab Foto',
      'Klik slot Kosong pada matriks',
      'Isi koordinat (GPS otomatis atau manual)',
      'Pilih file foto → Unggah',
      'Preview/ganti/hapus tersedia. Gunakan Cetak Foto untuk PDF',
    ],
  },
  {
    title: 'Isi Progress Mingguan',
    icon: RefreshCcw,
    steps: [
      'Buka detail → tab Progress',
      'Pilih minggu aktif dari dropdown',
      'Isi kolom Rencana dan Realisasi',
      'Klik Simpan (aktif jika ada perubahan)',
      'Perhatikan update KPI deviasi & progress',
    ],
  },
  {
    title: 'Buat & Kelola Tiket',
    icon: MessageSquareText,
    steps: [
      'Gunakan halaman /tiket atau dari detail',
      'Isi subjek, deskripsi, kategori, prioritas',
      'Tiket muncul di daftar kiri',
      'Pilih tiket → lihat detail + tambah komentar',
      'Pantau status dari halaman Tiket',
    ],
  },
]

const statusRules = [
  { label: 'Belum ada foto', tone: 'warning' as const, desc: 'Pekerjaan belum punya foto sama sekali.' },
  { label: 'Belum Selesai', tone: 'danger' as const, desc: 'Jumlah foto belum memenuhi minimal per output (5 slot).' },
  { label: 'Selesai', tone: 'success' as const, desc: 'Semua kebutuhan foto terpenuhi untuk semua output.' },
]

const photoRules = [
  'Setiap output memiliki 5 slot foto wajib: 0%, 25%, 50%, 75%, 100%.',
  'Output individu membutuhkan foto per penerima yang ditugaskan.',
  'Output komunal minimal 5 foto per komponen (bisa pakai penerima komunal).',
  'Jika belum ada foto → status "Belum ada foto".',
  'Jika belum memenuhi → status "Belum Selesai".',
  'Semua terpenuhi → status "Selesai".',
]

const errorScenarios = [
  { scenario: '401 Sesi tidak valid', action: 'Klik "Masuk ulang" atau login kembali' },
  { scenario: '403 Akses ditolak', action: 'Hubungi admin (data di luar kewenangan)' },
  { scenario: 'Data kosong', action: 'Ubah filter/search atau cek master data di apiamis' },
  { scenario: 'Upload gagal / GPS error', action: 'Pilih file dulu, izinkan lokasi, atau input koordinat manual' },
  { scenario: 'Progress tidak tersimpan', action: 'Pastikan ada perubahan Rencana/Realisasi' },
  { scenario: 'Popup diblokir (cetak)', action: 'Izinkan popup di browser untuk fitur Cetak Foto' },
]

const faqs = [
  {
    q: 'Bagaimana cara login?',
    a: 'Masuk lewat Arumanis (/sign-in). Setelah login, pengguna pengawas otomatis dialihkan ke panel pengawasan via SSO.',
  },
  {
    q: 'Apa bedanya Komunal dan Individu?',
    a: 'Komunal = kelompok (tidak perlu jiwa/NIK). Individu = perorangan (wajib identitas jiwa + NIK).',
  },
  {
    q: 'Kenapa foto status "Belum Selesai"?',
    a: 'Belum semua slot 5 persen terisi untuk setiap output, atau output komunal belum mencapai minimal.',
  },
  {
    q: 'Progress tidak bisa disimpan?',
    a: 'Tombol Simpan hanya aktif jika ada perubahan pada field Rencana atau Realisasi.',
  },
  {
    q: 'GPS tidak muncul?',
    a: 'Izinkan izin lokasi browser. Jika gagal tetap, ketik koordinat manual di form upload.',
  },
  {
    q: 'Data saya tidak lengkap?',
    a: 'Beberapa data berasal dari relasi backend apiamis. Pastikan master kegiatan/pengawasan sudah lengkap.',
  },
]

export function GuidePage() {
  return (
    <div className="stack">
      {/* HERO */}
      <Surface className="panel guide-hero">
        <div className="guide-hero-top">
          <div className="stack stack--dense">
            <Badge tone="info">Panduan Pengguna • v1.0</Badge>
            <h2 className="section-title">Panduan Pengguna Arumanis</h2>
            <p className="section-description">
              Ringkasan cara kerja dashboard pengawasan: login, navigasi, mengisi penerima, upload foto per slot progress, update progress mingguan, dan membuat tiket isu lapangan.
            </p>
          </div>
          <div className="guide-hero-actions">
            <AnchorButton to="/" variant="neutral">
              Ke Dashboard
            </AnchorButton>
            <AnchorButton to="/pekerjaan" variant="neutral">
              Buka Pekerjaan
            </AnchorButton>
            <AnchorButton to="/tiket" variant="neutral">
              Kelola Tiket
            </AnchorButton>
          </div>
        </div>
      </Surface>

      {/* QUICK TOC */}
      <Surface className="panel">
        <div className="guide-toc">
          {toc.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </div>
      </Surface>

      {/* 1. MULAI CEPAT */}
      <div id="mulai-cepat">
        <Surface className="panel">
          <SectionHeader title="1. Mulai Cepat" description="Login, sesi, dan hal pertama yang perlu diketahui." />
          <div className="guide-grid">
            {loginInfo.map((item, idx) => {
              const Icon = item.icon
              return (
                <div key={idx} className="guide-step">
                  <div className="guide-step-head">
                    <Icon size={18} />
                    <strong>{item.title}</strong>
                  </div>
                  <div className="guide-step-copy">{item.desc}</div>
                </div>
              )
            })}
          </div>
          <div className="guide-actions guide-actions--spaced">
            <a className="neo-button neo-button--neutral" href="/sign-in">
              Masuk via Arumanis
            </a>
          </div>
        </Surface>
      </div>

      {/* 2. NAVIGASI */}
      <div id="navigasi">
        <Surface className="panel">
          <SectionHeader title="2. Navigasi Aplikasi" description="Rute utama dan sidebar." />
          <div className="guide-grid">
            <div>
              <strong className="guide-subheading">Sidebar Navigasi</strong>
              <div className="guide-steps">
                {sidebarItems.map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div key={i} className="guide-step">
                      <div className="guide-step-head">
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="section-description guide-note-spaced">
                Sidebar bisa di-toggle. Otomatis collapse di layar kecil. Status tersimpan di localStorage.
              </p>
            </div>

            <div>
              <strong className="guide-subheading">Struktur Rute</strong>
              <table className="neo-table">
                <thead>
                  <tr>
                    <th>Path</th>
                    <th>Halaman</th>
                  </tr>
                </thead>
                <tbody>
                  {navRoutes.map((r) => (
                    <tr key={r.path}>
                      <td>
                        <code>{r.path}</code>
                      </td>
                      <td>
                        <div>{r.page}</div>
                        <div className="table-note">{r.note}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Surface>
      </div>

      {/* 3. FITUR UTAMA */}
      <div id="fitur-utama">
        <Surface className="panel">
          <SectionHeader title="3. Fitur Utama & Layar" description="Ringkasan halaman yang paling sering dipakai." />

          <div className="guide-feature-grid guide-feature-grid--spaced">
            {mainFeatures.map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className="guide-feature-card">
                  <div className="guide-feature-title">
                    <Icon size={18} /> {f.title}
                  </div>
                  <ul className="guide-list">
                    {f.points.map((p, pi) => (
                      <li key={pi}>{p}</li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          <SectionHeader
            title="Detail Pekerjaan (6 Tab)"
            description="Semua operasi inti dilakukan di halaman /pekerjaan/:id. Tab bersifat sticky."
          />
          <div className="guide-tab-grid">
            {detailTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <div key={tab.id} className="guide-tab-detail">
                  <strong>
                    <Icon size={16} /> {tab.label}
                  </strong>
                  <div className="guide-tab-copy">{tab.desc}</div>
                </div>
              )
            })}
          </div>
        </Surface>
      </div>

      {/* 4. ALUR KERJA INTI */}
      <div id="alur-kerja">
        <Surface className="panel">
          <SectionHeader title="4. Alur Kerja Inti" description="Langkah-langkah paling umum dilakukan pengawas." />
          <div className="guide-grid">
            {workflows.map((wf, idx) => {
              const Icon = wf.icon
              return (
                <div key={idx} className="guide-workflow">
                  <div className="guide-workflow-head">
                    <Icon size={18} />
                    <span>{wf.title}</span>
                  </div>
                  <ol className="guide-step-list">
                    {wf.steps.map((step, si) => (
                      <li key={si}>{step}</li>
                    ))}
                  </ol>
                </div>
              )
            })}
          </div>
        </Surface>
      </div>

      {/* 5. ATURAN FOTO & STATUS */}
      <div id="aturan-foto">
        <div className="guide-grid">
          <Surface className="panel">
            <SectionHeader title="5. Status Foto" description="Badge yang muncul di ringkasan dan tabel." />
            <div className="guide-status-list">
              {statusRules.map((s) => (
                <div key={s.label} className="guide-status-item">
                  <Badge tone={s.tone}>{s.label}</Badge>
                  <p>{s.desc}</p>
                </div>
              ))}
            </div>
          </Surface>

          <Surface className="panel">
            <SectionHeader title="Aturan Foto" description="Validasi dokumentasi yang diterapkan sistem." />
            <ul className="guide-list">
              {photoRules.map((rule, i) => (
                <li key={i}>{rule}</li>
              ))}
            </ul>
          </Surface>
        </div>
      </div>

      {/* 6. MASALAH & PENANGANAN */}
      <div id="masalah">
        <Surface className="panel">
          <SectionHeader title="6. Penanganan Masalah Umum" description="Skenario error dan tindakan yang disarankan." />
          <div className="guide-steps">
            {errorScenarios.map((e, i) => (
              <div key={i} className="guide-step">
                <div className="guide-step-head guide-step-head--danger">
                  <AlertTriangle size={16} />
                  <strong>{e.scenario}</strong>
                </div>
                <div className="guide-step-copy">{e.action}</div>
              </div>
            ))}
          </div>
          <p className="section-description guide-note-spaced">
            Untuk error 401, gunakan "Masuk ulang" untuk kembali ke Arumanis. Selalu pastikan koneksi stabil saat upload.
          </p>
        </Surface>
      </div>

      {/* 7. FAQ */}
      <div id="faq">
        <Surface className="panel">
          <SectionHeader title="7. FAQ" description="Pertanyaan yang sering muncul." />
          <div>
            {faqs.map((f, i) => (
              <div key={i} className="guide-faq">
                <div className="guide-faq-q">
                  <HelpCircle size={15} className="guide-faq-icon" />
                  {f.q}
                </div>
                <p className="guide-faq-a">{f.a}</p>
              </div>
            ))}
          </div>
        </Surface>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="guide-actions guide-actions--start">
        <AnchorButton to="/" variant="neutral">
          Kembali ke Dashboard
        </AnchorButton>
        <AnchorButton to="/pekerjaan" variant="neutral">
          Lihat Semua Pekerjaan
        </AnchorButton>
        <AnchorButton to="/profile" variant="neutral">
          Lihat Profil
        </AnchorButton>
      </div>
    </div>
  )
}
