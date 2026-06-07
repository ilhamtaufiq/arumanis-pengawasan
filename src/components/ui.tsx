import type {
  ButtonHTMLAttributes,
  ComponentProps,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'ghost' | 'success'

export function cn(...args: Array<string | false | null | undefined>) {
  return clsx(args)
}

export function Surface({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <div className={cn('neo-surface', className)}>{children}</div>
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

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn('neo-input', props.className)} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn('neo-input neo-textarea', props.className)} />
}

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

export function WelcomeModal({
  open,
  title,
  description,
  guideLabel = 'Baca Panduan',
  dismissLabel = 'Tutup',
  hideLabel = 'Jangan tampilkan lagi',
  guideTo,
  onClose,
  onHideForever,
}: {
  open: boolean
  title: ReactNode
  description?: ReactNode
  guideLabel?: ReactNode
  dismissLabel?: ReactNode
  hideLabel?: ReactNode
  guideTo: string
  onClose: () => void
  onHideForever: () => void
}) {
  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-shell welcome-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
        aria-describedby={description ? 'welcome-modal-description' : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div className="stack stack--dense">
            <strong id="welcome-modal-title">{title}</strong>
            {description ? (
              <span id="welcome-modal-description" className="modal-subtitle">
                {description}
              </span>
            ) : null}
          </div>
        </div>
        <div className="modal-actions modal-actions--welcome">
          <AnchorButton variant="neutral" to={guideTo} onClick={onClose}>
            {guideLabel}
          </AnchorButton>
          <Button type="button" variant="neutral" onClick={onClose}>
            {dismissLabel}
          </Button>
          <Button type="button" variant="success" onClick={onHideForever}>
            {hideLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
