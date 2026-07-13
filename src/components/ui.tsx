import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ComponentProps,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { clsx } from 'clsx'
import {
  BookOpenText,
  Camera,
  ClipboardList,
  Loader2,
  MessageSquareText,
  RefreshCcw,
  Shield,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '@/lib/format'
import type { Foto, Output, Penerima } from '@/lib/types'

type Variant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'ghost' | 'success'

export function cn(...args: Array<string | false | null | undefined>) {
  return clsx(args)
}

type SurfaceTone = 'default' | 'highlight' | 'warning' | 'danger' | 'success' | 'info'

export function Surface({
  className,
  children,
  padding = 'md',
  shadow = 'default',
  tone = 'default',
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: 'none' | 'sm' | 'default'
  tone?: SurfaceTone
}) {
  return (
    <div
      className={cn(
        'neo-surface',
        padding === 'none' && 'neo-surface--flush',
        padding === 'sm' && 'neo-surface--compact',
        padding === 'lg' && 'neo-surface--panel',
        shadow === 'default' && 'neo-surface--shadow',
        tone === 'highlight' && 'neo-surface--highlight',
        tone === 'warning' && 'metric-card--warning',
        tone === 'danger' && 'metric-card--danger',
        tone === 'success' && 'metric-card--success',
        tone === 'info' && 'metric-card--info',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  isLoading,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}) {
  return (
    <button
      className={cn('neo-button', `neo-button--${variant}`, `neo-button--${size}`, className)}
      {...props}
    >
      {isLoading ? <Loader2 className="neo-spinner" size={16} /> : null}
      <span>{children}</span>
    </button>
  )
}

export function AnchorButton({
  className,
  variant = 'primary',
  children,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: Variant
}) {
  return (
    <Link className={cn('neo-button neo-anchor', `neo-button--${variant}`, className)} {...props}>
      {children}
    </Link>
  )
}

export function Badge({
  className,
  tone = 'neutral',
  children,
}: {
  className?: string
  tone?: 'neutral' | 'warning' | 'danger' | 'success' | 'info'
  children: ReactNode
}) {
  return <span className={cn('neo-badge', `neo-badge--${tone}`, className)}>{children}</span>
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} {...props} className={cn('neo-input', className)} />
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} {...props} className={cn('neo-input neo-textarea', className)} />
  },
)

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <label className={cn('neo-label', className)}>{children}</label>
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="section-header">
      <div>
        <h2 className="section-title">{title}</h2>
        {description ? <p className="section-description">{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}

// Neobrutalism official components
export const NeoSurface = Surface

export function Panel({
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Surface>, 'padding' | 'shadow'>) {
  return (
    <Surface className={cn('panel', className)} padding="lg" shadow="default" {...props}>
      {children}
    </Surface>
  )
}

export function FieldGroup({
  label,
  children,
  error,
  hint,
  className,
}: {
  label?: ReactNode
  children: ReactNode
  error?: ReactNode
  hint?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('field-group', className)}>
      {label ? <Label className="field-group-label">{label}</Label> : null}
      <div className="field-group-content">{children}</div>
      {hint ? <div className="hint-text">{hint}</div> : null}
      {error ? <div className="field-group-error">{error}</div> : null}
    </div>
  )
}

export function StatusChip({
  children,
  className,
  tone = 'neutral',
}: {
  children: ReactNode
  className?: string
  tone?: 'neutral' | 'warning' | 'danger' | 'success' | 'info'
}) {
  return <span className={cn('status-chip', `status-chip--${tone}`, className)}>{children}</span>
}

export function DetailRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="detail-row-item">
      <span className="detail-row-label">{label}</span>
      <strong className="detail-row-value">{value}</strong>
    </div>
  )
}

export function LoadingRow({ children }: { children: ReactNode }) {
  return (
    <div className="loading-row">
      <Spinner />
      <span>{children}</span>
    </div>
  )
}

export function ProgressFill({ percent, className }: { percent: number; className?: string }) {
  const width = `${Math.max(0, Math.min(percent, 100))}%`
  return <div className={cn('progress-fill', className)} style={{ width }} />
}

export function DetailProgressFill({ percent, className }: { percent: number; className?: string }) {
  const width = `${Math.max(0, Math.min(percent, 100))}%`
  return <div className={cn('detail-progress-fill', className)} style={{ width }} />
}

export type PhotoMatrixEntry = {
  output: Output
  slots: Array<{ slot: string; foto?: Foto | undefined }>
  count: number
  penerima?: Penerima | undefined
  showPenerimaWarning?: boolean | undefined
}

export function PhotoSlotCard({
  slot,
  foto,
  selected = false,
  onToggleSelect,
  onClick,
  onUpload,
}: {
  slot: string
  foto?: Foto | undefined
  selected?: boolean
  onToggleSelect?: (checked: boolean) => void
  onClick: () => void
  onUpload: () => void
}) {
  const coordsInvalid =
    Boolean(foto?.koordinat && String(foto.koordinat).trim()) && foto?.validasi_koordinat === false

  return (
    <div
      className={cn(
        'neo-surface photo-slot',
        selected && 'photo-slot--selected',
        coordsInvalid && 'photo-slot--coords-invalid',
      )}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      style={
        selected
          ? { outline: '2px solid var(--neo-primary, #2563eb)', outlineOffset: 2 }
          : coordsInvalid
            ? { outline: '2px solid #dc2626', outlineOffset: 2 }
            : undefined
      }
      title={
        coordsInvalid
          ? foto?.validasi_koordinat_message || 'Koordinat di luar desa'
          : undefined
      }
    >
      <div className="photo-slot-header">
        <span>{slot}</span>
        {foto && onToggleSelect ? (
          <label onClick={(event) => event.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={selected}
              onChange={(event) => onToggleSelect(event.target.checked)}
              aria-label={`Pilih foto ${slot}`}
            />
          </label>
        ) : null}
      </div>
      <div className="photo-slot-body" style={{ position: 'relative' }}>
        {foto ? (
          <img
            src={foto.foto_thumb_url || foto.foto_url || ''}
            alt={foto.keterangan || slot}
            className="photo-slot-img"
          />
        ) : (
          <div className="photo-slot-empty">
            <Camera size={22} className="photo-slot-empty-icon" />
          </div>
        )}
        {coordsInvalid ? (
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              background: '#dc2626',
              color: '#fff',
              fontSize: 9,
              fontWeight: 800,
              padding: '2px 4px',
              borderRadius: 4,
              lineHeight: 1.1,
            }}
          >
            GPS!
          </span>
        ) : null}
      </div>
      <div className="photo-slot-footer">
        <div className="photo-slot-text">
          <div className="photo-slot-label">{foto?.keterangan || `Slot ${slot}`}</div>
          <div
            className="photo-slot-hint"
            style={coordsInvalid ? { color: '#b91c1c', fontWeight: 600 } : undefined}
          >
            {coordsInvalid
              ? foto?.validasi_koordinat_message || 'Koordinat invalid'
              : foto
                ? formatDateTime(foto.created_at)
                : 'Klik untuk unggah'}
          </div>
        </div>
        <Button
          type="button"
          variant="neutral"
          size="sm"
          onClick={(event) => {
            event.stopPropagation()
            onUpload()
          }}
        >
          <Upload size={12} />
        </Button>
      </div>
    </div>
  )
}

export function PhotoMatrix({
  entries,
  formatVolume,
  onSlotClick,
  onSlotUpload,
  selectedFotoIds,
  onToggleFotoSelect,
  className,
}: {
  entries: PhotoMatrixEntry[]
  formatVolume: (volume: Output['volume'], satuan?: string | null) => ReactNode
  onSlotClick: (output: Output, slot: string, foto: Foto | undefined, penerima?: Penerima) => void
  onSlotUpload: (output: Output, slot: string, penerima?: Penerima) => void
  selectedFotoIds?: number[]
  onToggleFotoSelect?: (fotoId: number, checked: boolean) => void
  className?: string
}) {
  const selected = selectedFotoIds ?? []
  return (
    <div className={cn('stack stack--compact', className)}>
      {entries.map(({ output, slots, count, penerima, showPenerimaWarning }, idx) => (
        <div key={`matrix-output-${output.id}-${penerima?.id || '0'}-${idx}`} className="detail-foto-matrix-output">
          <div className="detail-foto-matrix-head">
            <div>
              <div className="photo-matrix-output-title">{output.komponen}</div>
              <div className="photo-matrix-output-meta">
                {formatVolume(output.volume, output.satuan)} • {count} foto diunggah
              </div>
              {penerima ? (
                <NeoSurface tone="highlight" padding="sm" className="penerima-meta-panel">
                  <div className="penerima-meta-grid">
                    <span className="penerima-meta-label">Penerima</span>
                    <span>
                      : {penerima.nama} {penerima.is_komunal ? '(Komunal)' : ''}
                    </span>
                    {!penerima.is_komunal ? (
                      <>
                        <span className="penerima-meta-label">NIK</span>
                        <span>: {penerima.nik || '-'}</span>
                        <span className="penerima-meta-label">Jumlah Jiwa</span>
                        <span>: {penerima.jumlah_jiwa || '-'}</span>
                      </>
                    ) : null}
                    <span className="penerima-meta-label">Alamat</span>
                    <span>: {penerima.alamat || '-'}</span>
                  </div>
                </NeoSurface>
              ) : null}
              {showPenerimaWarning ? (
                <div className="penerima-warning">Belum ada penerima ditambahkan.</div>
              ) : null}
            </div>
            <Badge tone={output.penerima_is_optional ? 'neutral' : 'warning'}>
              {output.penerima_is_optional ? 'Komunal' : 'Individual'}
            </Badge>
          </div>

          <div className="detail-foto-slots">
            {slots.map(({ slot, foto }, sIdx) => {
              const slotProps: {
                slot: string
                foto?: Foto
                selected?: boolean
                onToggleSelect?: (checked: boolean) => void
                onClick: () => void
                onUpload: () => void
              } = {
                slot,
                onClick: () => onSlotClick(output, slot, foto, penerima),
                onUpload: () => onSlotUpload(output, slot, penerima),
              }
              if (foto) {
                slotProps.foto = foto
                slotProps.selected = selected.includes(foto.id)
                if (onToggleFotoSelect) {
                  slotProps.onToggleSelect = (checked) => onToggleFotoSelect(foto.id, checked)
                }
              }
              return (
                <PhotoSlotCard
                  key={`${output.id}-${penerima?.id || '0'}-${slot}-${sIdx}`}
                  {...slotProps}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function MetricCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  tone?: 'neutral' | 'warning' | 'danger' | 'success' | 'info'
}) {
  return (
    <Surface className={cn('metric-card', `metric-card--${tone}`)}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {hint ? <div className="metric-hint">{hint}</div> : null}
    </Surface>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <Surface className="empty-state">
      <div className="empty-state-title">{title}</div>
      {description ? <div className="empty-state-description">{description}</div> : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </Surface>
  )
}

export function Spinner() {
  return <Loader2 className="neo-spinner" size={18} />
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Lanjutkan',
  cancelLabel = 'Batal',
  confirmTone = 'danger',
  isLoading,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: ReactNode
  description?: ReactNode
  confirmLabel?: ReactNode
  cancelLabel?: ReactNode
  confirmTone?: Variant
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal-shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby={description ? 'confirm-modal-description' : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div className="stack stack--dense">
            <strong id="confirm-modal-title">{title}</strong>
            {description ? (
              <span id="confirm-modal-description" className="modal-subtitle">
                {description}
              </span>
            ) : null}
          </div>
        </div>
        <div className="modal-actions">
          <Button type="button" variant="neutral" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={confirmTone} isLoading={Boolean(isLoading)} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function AlertModal({
  open,
  title,
  description,
  closeLabel = 'Tutup',
  tone = 'danger',
  onClose,
}: {
  open: boolean
  title: ReactNode
  description?: ReactNode
  closeLabel?: ReactNode
  tone?: Variant
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={cn('modal-shell', tone === 'danger' && 'modal-shell--danger')}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-modal-title"
        aria-describedby={description ? 'alert-modal-description' : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div className="stack stack--dense">
            <strong id="alert-modal-title">{title}</strong>
            {description ? (
              <span id="alert-modal-description" className="modal-subtitle modal-subtitle--prewrap">
                {description}
              </span>
            ) : null}
          </div>
        </div>
        <div className="modal-actions">
          <Button type="button" variant={tone} onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

const WELCOME_FEATURES = [
  {
    icon: ClipboardList,
    label: 'Pantau pekerjaan',
    hint: 'Paket yang Anda awasi di satu tempat',
    tone: 'info' as const,
  },
  {
    icon: Camera,
    label: 'Upload foto',
    hint: 'Dokumentasi progress per output',
    tone: 'warning' as const,
  },
  {
    icon: RefreshCcw,
    label: 'Update progress',
    hint: 'Rencana & realisasi per minggu',
    tone: 'success' as const,
  },
  {
    icon: MessageSquareText,
    label: 'Buat tiket',
    hint: 'Laporkan isu ke tim pusat',
    tone: 'danger' as const,
  },
] as const

const arumanisLogoSrc = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/arumanis.png`

export function WelcomeModal({
  open,
  userName,
  description,
  guideLabel = 'Baca Panduan',
  startLabel = 'Mulai bekerja',
  hideLabel = 'Jangan tampilkan lagi',
  guideTo,
  onClose,
  onHideForever,
}: {
  open: boolean
  userName: string
  description?: ReactNode
  guideLabel?: ReactNode
  startLabel?: ReactNode
  hideLabel?: ReactNode
  guideTo: string
  onClose: () => void
  onHideForever: () => void
}) {
  if (!open) return null

  return (
    <div className="modal-backdrop welcome-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-shell welcome-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
        aria-describedby={description ? 'welcome-modal-description' : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="welcome-modal-hero">
          <button
            type="button"
            className="welcome-modal-close"
            aria-label="Tutup"
            onClick={onClose}
          >
            <X size={18} />
          </button>

          <div className="welcome-modal-brand">
            <div className="brand-logo-wrapper welcome-modal-logo-wrap">
              <img
                src={arumanisLogoSrc}
                alt="Arumanis"
                className="brand-logo welcome-modal-logo"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            </div>
            <div className="welcome-modal-intro">
              <div className="welcome-modal-eyebrow">Arumanis • Air Minum &amp; Sanitasi</div>
              <h2 id="welcome-modal-title" className="welcome-modal-title">
                Selamat datang,
                <span className="welcome-modal-name">{userName}</span>
              </h2>
            </div>
          </div>
        </div>

        <div className="welcome-modal-body">
          {description ? (
            <p id="welcome-modal-description" className="welcome-modal-description">
              {description}
            </p>
          ) : null}

          <div className="welcome-modal-features" role="list" aria-label="Fitur utama">
            {WELCOME_FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.label}
                  className={cn('welcome-modal-feature', `welcome-modal-feature--${feature.tone}`)}
                  role="listitem"
                >
                  <span className="welcome-modal-feature-icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className="welcome-modal-feature-copy">
                    <strong>{feature.label}</strong>
                    <span>{feature.hint}</span>
                  </span>
                </div>
              )
            })}
          </div>

          <div className="welcome-modal-tip">
            <Shield size={16} className="welcome-modal-tip-icon" aria-hidden="true" />
            <span>
              Baru pertama kali? Buka <strong>Panduan</strong> untuk memahami alur kerja harian.
            </span>
          </div>
        </div>

        <div className="welcome-modal-footer">
          <Button type="button" variant="primary" className="welcome-modal-cta" onClick={onClose}>
            <Sparkles size={16} />
            <span>{startLabel}</span>
          </Button>
          <div className="welcome-modal-secondary-actions">
            <AnchorButton variant="neutral" to={guideTo} onClick={onClose}>
              <BookOpenText size={16} />
              <span>{guideLabel}</span>
            </AnchorButton>
            <Button type="button" variant="ghost" onClick={onHideForever}>
              {hideLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
