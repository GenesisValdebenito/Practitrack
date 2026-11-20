import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BriefcaseBusiness, ChevronRight, GraduationCap, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Practice } from '../lib/utils'
import { CAREERS } from '../lib/careers'

type Props = {
  practices: Practice[]
  onSelect: (practiceId: string) => void
}

export type NewPracticeForm = {
  name: string
  institution: string
  career: string
  start_date: string
  required_hours: number
  weekly_hours_target: number
}

export default function PracticeSelector({
  practices,
  onSelect,
}: Props) {
  const navigate = useNavigate()

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<NewPracticeForm>({
    name: 'Mi práctica profesional',
    institution: '',
    career: '',
    required_hours: 360,
    weekly_hours_target: 30,
    start_date: '',
  })

  const handleCreate = async () => {
    setError('')
    if (!form.name.trim()) {
      setError('El nombre de la práctica es obligatorio.')
      return
    }
    if (!form.career.trim()) {
      setError('Selecciona tu carrera.')
      return
    }
    setSaving(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) throw new Error('Sesión no válida.')

      const { data, error: insertError } = await supabase
        .from('practices')
        .insert({
          user_id: authData.user.id,
          name: form.name.trim(),
          institution: form.institution.trim(),
          career: form.career.trim(),
          required_hours: form.required_hours,
          weekly_hours_target: form.weekly_hours_target,
          start_date: form.start_date || null,
          is_active: true,
        })
        .select('id')
        .single()

      if (insertError) throw insertError
      if (!data) throw new Error('No se pudo crear la práctica.')

      onSelect(data.id)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la práctica.')
    } finally {
      setSaving(false)
    }
  }

  const handleSelect = (practiceId: string) => {
    onSelect(practiceId)
    navigate('/dashboard', { replace: true })
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-8"
      style={{
        background: 'var(--bg-app)',
        color: 'var(--text-primary, #1a1a1a)',
      }}
    >
      <section
        className="w-full max-w-[440px] overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          background: 'var(--bg-card, #ffffff)',
          borderColor: 'var(--border-soft, #dddddd)',
        }}
      >
        <header className="px-6 pb-4 pt-7">
          <div
            className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl"
            style={{
              background: 'var(--bg-subtle, #eaeaea)',
            }}
          >
            <BriefcaseBusiness size={21} strokeWidth={1.8} />
          </div>

          <h1 className="text-xl font-semibold tracking-tight">
            ¿En qué práctica deseas trabajar?
          </h1>

          <p
            className="mt-2 text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary, #666666)' }}
          >
            Selecciona un espacio de trabajo para continuar
            en PractiTrack.
          </p>
        </header>

        <div className="px-3 pb-3">
          <div
            className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-muted, #999999)' }}
          >
            Tus prácticas
          </div>

          {practices.length === 0 ? (
            <div
              className="rounded-lg px-4 py-8 text-center text-sm"
              style={{ color: 'var(--text-secondary, #666666)' }}
            >
              No tienes prácticas registradas. Crea la primera para comenzar.
            </div>
          ) : (
            <div className="space-y-1">
              {practices.map((practice) => (
                <button
                  key={practice.id}
                  type="button"
                  onClick={() => handleSelect(practice.id)}
                  className="group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: 'var(--bg-subtle, #eaeaea)',
                    }}
                  >
                    <GraduationCap size={19} strokeWidth={1.8} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {practice.name}
                    </div>

                    <div
                      className="mt-0.5 truncate text-xs"
                      style={{
                        color: 'var(--text-secondary, #666666)',
                      }}
                    >
                      {practice.company || 'Espacio personal'}
                    </div>
                  </div>

                  <ChevronRight
                    size={17}
                    className="shrink-0 opacity-40 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4" style={{ borderColor: 'var(--border-soft, #dddddd)' }}>
          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              style={{ borderColor: 'var(--border-strong, #cccccc)' }}
            >
              <Plus size={16} strokeWidth={2} />
              Crear nueva práctica
            </button>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void handleCreate()
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted, #999999)' }}>
                  Nombre de la práctica *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Ej. Práctica Analista"
                  className="w-full rounded-lg border px-3 py-2 text-sm bg-transparent"
                  style={{ borderColor: 'var(--border-soft, #dddddd)' }}
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted, #999999)' }}>
                    Institución
                  </label>
                  <input
                    type="text"
                    value={form.institution}
                    onChange={(event) => setForm({ ...form, institution: event.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm bg-transparent"
                    style={{ borderColor: 'var(--border-soft, #dddddd)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted, #999999)' }}>
                    Carrera *
                  </label>
                  <select
                    value={form.career}
                    onChange={(event) => setForm({ ...form, career: event.target.value })}
                    required
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    style={{
                      borderColor: 'var(--border-soft, #dddddd)',
                      background: 'var(--bg-card, #ffffff)',
                      color: 'var(--text-primary, #1a1a1a)',
                    }}
                  >
                    <option value="">Selecciona tu carrera</option>
                    {CAREERS.map((career) => (
                      <option key={career} value={career}>
                        {career}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted, #999999)' }}>
                    Fecha de inicio
                  </label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(event) => setForm({ ...form, start_date: event.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm bg-transparent"
                    style={{ borderColor: 'var(--border-soft, #dddddd)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted, #999999)' }}>
                    Meta total (h)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.required_hours}
                    onChange={(event) => setForm({ ...form, required_hours: Number(event.target.value) })}
                    className="w-full rounded-lg border px-3 py-2 text-sm bg-transparent"
                    style={{ borderColor: 'var(--border-soft, #dddddd)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted, #999999)' }}>
                    Meta semanal (h)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.weekly_hours_target}
                    onChange={(event) => setForm({ ...form, weekly_hours_target: Number(event.target.value) })}
                    className="w-full rounded-lg border px-3 py-2 text-sm bg-transparent"
                    style={{ borderColor: 'var(--border-soft, #dddddd)' }}
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  style={{ background: 'var(--color-brand-600, #0066cc)' }}
                >
                  {saving ? 'Creando...' : 'Crear práctica'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError('') }}
                  disabled={saving}
                  className="rounded-lg border px-4 py-2 text-sm"
                  style={{ borderColor: 'var(--border-strong, #cccccc)' }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>

        <footer
          className="flex items-center justify-between border-t px-6 py-4"
          style={{
            borderColor: 'var(--border-soft, #dddddd)',
          }}
        >
          <span
            className="text-xs"
            style={{ color: 'var(--text-muted, #999999)' }}
          >
            PractiTrack
          </span>
        </footer>
      </section>
    </main>
  )
}
