const fs = require('fs');

function patchFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    for (const [oldText, newText] of replacements) {
        if (content.includes(oldText)) {
            content = content.replace(oldText, newText);
            hasChanges = true;
        } else {
            console.log(`Pattern not found in ${filePath}:\n${oldText.substring(0, 50)}...`);
        }
    }
    
    if (hasChanges) {
        fs.writeFileSync(filePath, content);
        console.log(`Patched ${filePath}`);
    }
}

// 1. Dashboard UX: Move "Paket perlu perhatian" to top, above the table
const dashboardPath = 'src/pages/DashboardPage.tsx';
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

const perhatianSection = `{perhatianList.length ? (
        <Surface className="panel">
          <SectionHeader title="Paket perlu perhatian" description="Paket berikut belum lengkap atau memiliki deviasi." />
          <div className="summary-list">
            {perhatianList.slice(0, 8).map((entry) => (
              <div key={entry.item.id} className="summary-row summary-row--wrap">
                <div className="summary-row-copy">
                  <strong>{entry.item.nama_paket}</strong>
                  <span>{formatPekerjaanLokasi(entry.item)}</span>
                </div>
                  <div className="dashboard-issues">
                    {getEstimasiFisik(entry.item) <= 0 ? <Badge tone="warning">Fisik</Badge> : null}
                    {getEstimasiKeuangan(entry.item) <= 0 ? <Badge tone="warning">Keuangan</Badge> : null}
                    {Math.abs(entry.deviasi) > 0.01 ? (
                      <Badge tone={entry.deviasi < 0 ? 'danger' : 'success'}>Deviasi {formatPercent(entry.deviasi)}</Badge>
                    ) : null}
                  {entry.fotoStatus === 'belum_ada_foto' ? <Badge tone="warning">Belum ada foto</Badge> : null}
                  {entry.fotoStatus === 'belum_selesai' ? <Badge tone="danger">Belum Selesai</Badge> : null}
                  </div>
                </div>
            ))}
          </div>
        </Surface>
      ) : null}`;

// First remove it from the bottom
if (dashboardContent.includes(perhatianSection)) {
    dashboardContent = dashboardContent.replace(perhatianSection, '');
    
    // Then inject it right after the KPI grid and before the main table
    const tableSectionStart = `<Surface className="panel">
        <SectionHeader
          title="Pekerjaan yang diawas"`;
          
    if (dashboardContent.includes(tableSectionStart)) {
        dashboardContent = dashboardContent.replace(
            tableSectionStart, 
            `${perhatianSection}\n\n      <Surface className="panel">\n        <SectionHeader\n          title="Pekerjaan yang diawasi"`
        );
        fs.writeFileSync(dashboardPath, dashboardContent);
        console.log('Moved perhatian list to top in DashboardPage.tsx');
    }
}

// 2. CSS Consistency and Readability improvements
patchFile('src/styles/globals.css', [
    // Improve button active state for better neobrutalism feel
    [
        `.neo-button:active,
.neo-anchor:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}`,
        `.neo-button:active,
.neo-anchor:active {
  transform: translate(4px, 4px);
  box-shadow: none;
}`
    ],
    [
        `.nav-item:active {
  transform: translate(1px, 1px);
  box-shadow: none;
}`,
        `.nav-item:active {
  transform: translate(3px, 3px);
  box-shadow: none;
}`
    ],
    // Improve small text readability
    [
        `.metric-hint {
  margin-top: 8px;
  font-size: 13px;
  color: var(--muted-foreground);
}`,
        `.metric-hint {
  margin-top: 8px;
  font-size: 14px;
  color: var(--muted-foreground);
  font-weight: 500;
}`
    ],
    [
        `.neo-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 2px solid var(--border);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 800;
  background: #ffffff;
}`,
        `.neo-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 2px solid var(--border);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 13px;
  font-weight: 800;
  background: #ffffff;
}`
    ]
]);

// 3. UI Component enhancements
patchFile('src/components/ui.tsx', [
    // Make badges more readable by adjusting text colors for contrast
    [
        `export function Badge({
  className,
  tone = 'neutral',
  children,
}: {
  className?: string
  tone?: 'neutral' | 'warning' | 'danger' | 'success' | 'info'
  children: ReactNode
}) {
  return <span className={cn('neo-badge', \`neo-badge--\${tone}\`, className)}>{children}</span>
}`,
        `export function Badge({
  className,
  tone = 'neutral',
  children,
}: {
  className?: string
  tone?: 'neutral' | 'warning' | 'danger' | 'success' | 'info'
  children: ReactNode
}) {
  // Ensure text contrast on certain tones
  const contrastClass = tone === 'danger' ? 'text-danger-foreground' : 
                        tone === 'warning' ? 'text-black' : '';
  return <span className={cn('neo-badge', \`neo-badge--\${tone}\`, contrastClass, className)}>{children}</span>
}`
    ]
]);

console.log("Patching complete");
