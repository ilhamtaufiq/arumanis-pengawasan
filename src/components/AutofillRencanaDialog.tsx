import { Wand2, X, ChevronRight } from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import type { RencanaAutofillPlan, ScheduledGroup } from '@/lib/rencana-autofill'

type AutofillRencanaDialogProps = {
  open: boolean
  onClose: () => void
  plan: RencanaAutofillPlan | null
  applying: boolean
  onApply: () => void
}

function projectTypeLabel(value: string) {
  if (value === 'air_minum') return 'Air Minum (SPAM)'
  if (value === 'sanitasi') return 'Sanitasi'
  return value.replace(/_/g, ' ')
}

function GroupRow({ group, weekCount }: { group: ScheduledGroup; weekCount: number }) {
  return (
    <div className="autofill-rencana-group">
      <div className="autofill-rencana-group-head">
        <div>
          <div className="autofill-rencana-group-title">{group.groupName}</div>
          <Badge tone="info">
            Fase: {group.fase ? group.fase.nama_fase : 'Tidak terklasifikasi'}
          </Badge>
        </div>
        <div className="autofill-rencana-group-weeks">
          Mg {group.startWeek} <ChevronRight size={12} /> Mg {group.endWeek}
        </div>
      </div>
      <div className="autofill-rencana-bar" aria-hidden>
        {Array.from({ length: Math.max(1, weekCount) }, (_, index) => {
          const week = index + 1
          const active = week >= group.startWeek && week <= group.endWeek
          return (
            <span
              key={week}
              className={active ? 'autofill-rencana-bar-cell is-active' : 'autofill-rencana-bar-cell'}
            />
          )
        })}
      </div>
      <div className="autofill-rencana-group-meta">
        {group.items.length} item · volume total{' '}
        {group.items.reduce((s, it) => s + (it.volume || 0), 0).toLocaleString('id-ID', {
          maximumFractionDigits: 2,
        })}
      </div>
    </div>
  )
}

export function AutofillRencanaDialog({
  open,
  onClose,
  plan,
  applying,
  onApply,
}: AutofillRencanaDialogProps) {
  if (!open || !plan) return null

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-shell autofill-rencana-modal-shell">
        <div className="modal-header">
          <div>
            <h2>
              <Wand2 className="inline-icon" size={18} /> Auto-Fill Rencana
            </h2>
            <p className="modal-subtitle">
              Distribusi volume target ke kolom <strong>Rencana</strong> per minggu berdasarkan fase
              konstruksi. Realisasi yang sudah diisi tidak diubah.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Tutup">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="autofill-rencana-body">
          <div className="autofill-rencana-meta">
            <div>
              Jenis proyek:{' '}
              <strong>{projectTypeLabel(plan.projectType)}</strong>
            </div>
            <div>
              Total minggu: <strong>{plan.weekCount}</strong>
            </div>
            {plan.usedFallbackFases ? (
              <div className="autofill-rencana-fallback">
                Master fase API kosong — memakai fase default bawaan.
              </div>
            ) : null}
          </div>

          {plan.previewGroups.length === 0 ? (
            <p className="autofill-rencana-empty">
              Tidak ada grup yang bisa dijadwalkan. Pastikan item punya volume target.
            </p>
          ) : (
            <div className="autofill-rencana-groups">
              {plan.previewGroups.map((group) => (
                <GroupRow key={group.groupId} group={group} weekCount={plan.weekCount} />
              ))}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <Button type="button" variant="neutral" onClick={onClose} disabled={applying}>
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onApply}
            isLoading={applying}
            disabled={applying || plan.previewGroups.length === 0}
          >
            <Wand2 size={14} />
            Terapkan jadwal
          </Button>
        </div>
      </div>
    </div>
  )
}
