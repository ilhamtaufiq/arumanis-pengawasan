import { AnchorButton, Badge, SectionHeader, Surface } from '@/components/ui'
import { ClipboardList, FileImage, FileText, LayoutDashboard, MessageSquareText, PenLine } from 'lucide-react'

const flowSteps = [
  {
    title: 'Buka Dashboard',
    description: 'Lihat jumlah paket, progress, deviasi, dan status foto dari semua pekerjaan yang diawasi.',
    icon: LayoutDashboard,
  },
  {
    title: 'Output & Penerima',
    description: 'Buka detail paket, isi output (komponen & satuan) di tab Output, lalu tambah penerima manfaat di tab Penerima.',
    icon: ClipboardList,
  },
  {
    title: 'Upload Foto & Progress',
    description: 'Upload foto per slot output (0%-100%) di tab Foto — membutuhkan output & penerima terisi. Update progress pekerjaan di tab Progress.',
    icon: PenLine,
  },
]

const statusRules = [
  {
    label: 'Belum ada foto',
    tone: 'warning' as const,
    description: 'Dipakai jika satu pekerjaan belum punya foto sama sekali.',
  },
  {
    label: 'Belum Selesai',
    tone: 'danger' as const,
    description: 'Dipakai jika jumlah foto belum memenuhi kebutuhan minimal output.',
  },
  {
    label: 'Selesai',
    tone: 'success' as const,
    description: 'Dipakai jika foto sudah memenuhi aturan untuk semua output.',
  },
]

const tabs = [
  {
    title: 'Output',
    description: 'Tambah, edit, atau hapus komponen output. Pilih dari dropdown komponen (Sambungan Rumah, MCK, Pipa, dll) dan satuan (Unit, Meter, Meter Persegi, Meter Kubik). Centang Komponen Komunal untuk output kelompok.',
  },
  {
    title: 'Penerima Manfaat',
    description: 'Tambah, edit, atau hapus penerima. Jika Komunal aktif, jumlah jiwa dan NIK tidak diisi.',
  },
  {
    title: 'Foto',
    description: 'Upload foto per output dan per slot 0%, 25%, 50%, 75%, 100%. Catatan: tab Foto baru bisa dipakai jika Output dan Penerima sudah terisi. Output komunal memakai penerima komunal jika tersedia.',
  },
  {
    title: 'Progress',
    description: 'Isi progress dalam tabel. Pilih minggu aktif, lalu isi rencana dan realisasi volume.',
  },
  {
    title: 'Tiket',
    description: 'Buat tiket untuk isu lapangan, lalu pantau status tindak lanjutnya.',
  },
]

export function GuidePage() {
  return (
    <div className="stack">
      <Surface className="panel guide-hero">
        <div className="guide-hero-top">
          <div className="stack stack--dense">
            <Badge tone="info">Panduan Pengguna</Badge>
            <h2 className="section-title">Cara kerja Arumanis</h2>
            <p className="section-description">
              Gunakan halaman ini sebagai ringkasan alur kerja pengawasan: cek paket, lengkapi penerima, upload foto, isi progress, dan buat tiket.
            </p>
          </div>
          <div className="guide-hero-actions">
            <AnchorButton to="/" variant="neutral">
              Ke Dashboard
            </AnchorButton>
            <AnchorButton to="/pekerjaan" variant="neutral">
              Buka Pekerjaan
            </AnchorButton>
          </div>
        </div>
      </Surface>

      <div className="guide-grid">
        <Surface className="panel">
          <SectionHeader title="Alur cepat" description="Urutan kerja yang paling sering dipakai." />
          <div className="guide-steps">
            {flowSteps.map((step) => {
              const Icon = step.icon
              return (
                <div key={step.title} className="guide-step">
                  <div className="guide-step-head">
                    <Icon size={18} />
                    <strong>{step.title}</strong>
                  </div>
                  <div className="guide-step-copy">{step.description}</div>
                </div>
              )
            })}
          </div>
        </Surface>

        <Surface className="panel">
          <SectionHeader title="Status foto" description="Label yang dipakai untuk ringkasan pekerjaan." />
          <div className="guide-status-list">
            {statusRules.map((status) => (
              <div key={status.label} className="guide-status-item">
                <Badge tone={status.tone}>{status.label}</Badge>
                <p>{status.description}</p>
              </div>
            ))}
          </div>
        </Surface>
      </div>

      <Surface className="panel">
        <SectionHeader title="Tab detail pekerjaan" description="Semua pekerjaan inti dipusatkan di halaman detail." />
        <div className="guide-tabs">
          {tabs.map((tab) => (
            <div key={tab.title} className="guide-tab-card">
              <div className="guide-tab-title">{tab.title}</div>
              <div className="guide-tab-copy">{tab.description}</div>
            </div>
          ))}
        </div>
      </Surface>

      <div className="guide-grid">
        <Surface className="panel">
          <SectionHeader title="Alur kerja" description="Urutan pengisian data yang benar." />
          <ul className="guide-list">
            <li><strong>Tab Output</strong> — buat komponen output (Sambungan Rumah, MCK, Pipa, dll) dengan satuan dan volume.</li>
            <li><strong>Tab Penerima</strong> — tambah penerima manfaat (Individual atau Komunal).</li>
            <li><strong>Tab Foto</strong> — upload foto per output setelah output dan penerima terisi. Setiap output punya 5 slot: 0%, 25%, 50%, 75%, 100%.</li>
            <li><strong>Tab Progress</strong> — isi rencana dan realisasi per minggu.</li>
            <li><strong>Tab Tiket</strong> — buat tiket untuk isu lapangan.</li>
          </ul>
        </Surface>

        <Surface className="panel">
          <SectionHeader title="Aturan foto" description="Ringkas aturan validasi dokumentasi." />
          <ul className="guide-list">
            <li>Jika pekerjaan belum punya foto sama sekali, statusnya <strong>Belum ada foto</strong>.</li>
            <li>Jika output individu belum memenuhi volume x 5 foto, statusnya <strong>Belum Selesai</strong>.</li>
            <li>Jika output komunal belum memenuhi minimal 5 foto per komponen, statusnya <strong>Belum Selesai</strong>.</li>
            <li>Jika semua kebutuhan sudah terpenuhi, statusnya <strong>Selesai</strong>.</li>
            <li>Jika tab Foto menampilkan "Belum ada output", artinya output dan penerima harus diisi dulu.</li>
          </ul>
        </Surface>

        <Surface className="panel">
          <SectionHeader title="Tiket" description="Gunakan tiket untuk isu yang perlu ditindaklanjuti." />
          <ul className="guide-list">
            <li>Pilih tab Tiket di detail pekerjaan.</li>
            <li>Isi subjek, deskripsi, kategori, dan prioritas.</li>
            <li>Gunakan tiket untuk isu progress, foto, atau lapangan yang belum selesai.</li>
            <li>Setelah dibuat, tiket bisa dipantau dari halaman tiket utama.</li>
          </ul>
          <div className="guide-actions">
            <AnchorButton to="/tiket" variant="neutral">
              Buka Tiket
            </AnchorButton>
            <AnchorButton to="/profile" variant="neutral">
              Lihat Profil
            </AnchorButton>
          </div>
        </Surface>
      </div>
    </div>
  )
}
