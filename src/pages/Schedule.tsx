import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type ScheduleProps = { activePracticeId: string | null }
type Block = {
  id: string
  user_id: string
  practice_id: string | null
  day_of_week: number
  start_time: string
  end_time: string
  title: string
  is_in_person: boolean
  effective_from: string | null
  effective_to: string | null
  break_minutes: number
}
type CalendarView = 'month' | 'week' | 'day'
type Rule = {
  key: number
  days: number[]
  title: string
  start_time: string
  end_time: string
  break_minutes: number
  is_in_person: boolean
}
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const WEEKDAY = (date: Date) => ((date.getDay() + 6) % 7) + 1
const pad = (value: number) => String(value).padStart(2, '0')
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const addDays = (date: Date, count: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + count, 12)
const startOfWeek = (date: Date) => addDays(date, 1 - WEEKDAY(date))
const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('es-CL', options ?? { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
const minutes = (time: string) => {
  const [hours, mins] = time.split(':').map(Number)
  return hours * 60 + mins
}
const netHours = (start: string, end: string, pause: number) =>
  Math.max(0, (minutes(end) - minutes(start) - pause) / 60)
const applies = (block: Block, date: Date) => {
  const day = dateKey(date)
  return block.day_of_week === WEEKDAY(date) &&
    (!block.effective_from || day >= block.effective_from) &&
    (!block.effective_to || day <= block.effective_to)
}
const newRule = (key: number, day = WEEKDAY(new Date())): Rule => ({
  key, days: [day], title: 'Jornada de práctica', start_time: '09:00',
  end_time: '17:00', break_minutes: 30, is_in_person: true,
})
const buttonClass = 'rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm hover:bg-[var(--bg-hover)]'

export default function Schedule({ activePracticeId }: ScheduleProps) {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [view, setView] = useState<CalendarView>('week')
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [effectiveFrom, setEffectiveFrom] = useState(dateKey(new Date()))
  const [effectiveTo, setEffectiveTo] = useState('')
  const [rules, setRules] = useState<Rule[]>([newRule(1)])
  const nextKey = useRef(2)
  const loadCounter = useRef(0)

  const load = useCallback(async () => {
    const request = ++loadCounter.current
    setBlocks([]) // No conservar datos de la práctica anterior mientras se consulta la nueva.
    setErrorMessage('')
    if (!activePracticeId) { setLoading(false); return }
    setLoading(true)
    const { data: auth, error: authError } = await supabase.auth.getUser()
    if (request !== loadCounter.current) return
    if (authError || !auth.user) {
      setErrorMessage('No se pudo verificar tu sesión.')
      setLoading(false)
      return
    }
    const { data, error } = await supabase.from('schedule_blocks')
      .select('*')
      .eq('user_id', auth.user.id)
      .eq('practice_id', activePracticeId)
      .order('day_of_week')
      .order('start_time')
    if (request !== loadCounter.current) return
    if (error) setErrorMessage(`No se pudieron cargar las jornadas: ${error.message}`)
    else setBlocks((data ?? []).map(item => ({
      ...item,
      effective_from: item.effective_from ?? null,
      effective_to: item.effective_to ?? null,
      break_minutes: Number(item.break_minutes ?? 0),
    })) as Block[])
    setLoading(false)
  }, [activePracticeId])

  useEffect(() => {
    void load()
    return () => { loadCounter.current += 1 }
  }, [load])

  useEffect(() => {
    setShowForm(false)
    setEditingId(null)
  }, [activePracticeId])

  const visibleDates = useMemo(() => {
    if (view === 'day') return [selectedDate]
    if (view === 'week') return Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(selectedDate), index))
    const first = startOfWeek(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12))
    const last = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 12)
    const end = addDays(startOfWeek(last), 6)
    const dates: Date[] = []
    for (let date = first; date <= end; date = addDays(date, 1)) dates.push(date)
    return dates
  }, [selectedDate, view])

  const blocksForDate = (date: Date) => blocks.filter(block => applies(block, date))
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
  const hoursForDate = (date: Date) => blocksForDate(date)
    .reduce((total, block) => total + netHours(block.start_time, block.end_time, block.break_minutes), 0)
  const weeklyHours = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(selectedDate), i))
    .reduce((total, date) => total + hoursForDate(date), 0)
  const monthlyHours = Array.from(
    { length: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate() },
    (_, i) => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i + 1, 12),
  ).reduce((total, date) => total + hoursForDate(date), 0)

  function navigate(direction: number) {
    if (view === 'month') setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + direction, 1, 12))
    else setSelectedDate(addDays(selectedDate, direction * (view === 'week' ? 7 : 1)))
  }
  function openNewForm(date = selectedDate) {
    setEditingId(null)
    setEffectiveFrom(dateKey(date))
    setEffectiveTo('')
    setRules([newRule(nextKey.current++, WEEKDAY(date))])
    setErrorMessage('')
    setShowForm(true)
  }
  function openEditForm(block: Block) {
    setEditingId(block.id)
    setEffectiveFrom(block.effective_from ?? '')
    setEffectiveTo(block.effective_to ?? '')
    setRules([{
      key: nextKey.current++, days: [block.day_of_week], title: block.title,
      start_time: block.start_time.slice(0, 5), end_time: block.end_time.slice(0, 5),
      break_minutes: block.break_minutes, is_in_person: block.is_in_person,
    }])
    setErrorMessage('')
    setShowForm(true)
  }
  function updateRule(key: number, patch: Partial<Rule>) {
    setRules(current => current.map(rule => rule.key === key ? { ...rule, ...patch } : rule))
  }
  function toggleDay(key: number, day: number) {
    setRules(current => current.map(rule => rule.key !== key ? rule : {
      ...rule,
      days: rule.days.includes(day) ? rule.days.filter(value => value !== day) : [...rule.days, day].sort(),
    }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    if (!activePracticeId) { setErrorMessage('Selecciona una práctica antes de guardar.'); return }
    if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) {
      setErrorMessage('La fecha final no puede ser anterior a la inicial.'); return
    }
    if (!rules.length) { setErrorMessage('Agrega al menos una regla.'); return }
    const usedDays = new Set<number>()
    for (const rule of rules) {
      if (!rule.title.trim()) { setErrorMessage('Todas las reglas deben tener nombre.'); return }
      if (!rule.days.length) { setErrorMessage('Selecciona al menos un día en cada regla.'); return }
      if (rule.end_time <= rule.start_time || netHours(rule.start_time, rule.end_time, rule.break_minutes) <= 0) {
        setErrorMessage('Revisa las horas de inicio, término y colación de cada regla.'); return
      }
      if (!Number.isFinite(rule.break_minutes) || rule.break_minutes < 0 || rule.break_minutes > 300) {
        setErrorMessage('La colación debe estar entre 0 y 300 minutos.'); return
      }
      for (const day of rule.days) {
        if (usedDays.has(day)) {
          setErrorMessage(`El ${DAYS[day - 1]} aparece en más de una regla. Ajusta la selección.`)
          return
        }
        usedDays.add(day)
      }
    }
    setSaving(true)
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError || !auth.user) throw new Error('Tu sesión no está disponible.')
      const { data: practice, error: practiceError } = await supabase.from('practices')
        .select('id').eq('id', activePracticeId).eq('user_id', auth.user.id).maybeSingle()
      if (practiceError || !practice) throw new Error('La práctica seleccionada no pertenece a tu cuenta o ya no existe.')
      const payloads = rules.flatMap(rule => rule.days.map(day => ({
        user_id: auth.user.id,
        practice_id: activePracticeId,
        day_of_week: day,
        title: rule.title.trim(),
        start_time: rule.start_time,
        end_time: rule.end_time,
        break_minutes: rule.break_minutes,
        is_in_person: rule.is_in_person,
        effective_from: effectiveFrom || null,
        effective_to: effectiveTo || null,
      })))
      if (editingId) {
        // Edición de una sola jornada: no tocar otras reglas ni crear duplicados.
        const { data, error } = await supabase.from('schedule_blocks').update(payloads[0])
          .eq('id', editingId).eq('user_id', auth.user.id)
          .eq('practice_id', activePracticeId).select('id')
        if (error) throw error
        if (!data?.length) throw new Error('La jornada ya no existe o no tienes permiso para editarla.')
      } else {
        // Un único INSERT para todas las reglas, sin escrituras parciales por día.
        const { error } = await supabase.from('schedule_blocks').insert(payloads)
        if (error) throw error
      }
      setShowForm(false)
      setEditingId(null)
      await load()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo guardar la jornada.')
    } finally {
      setSaving(false)
    }
  }

  async function removeBlock(block: Block) {
    if (!activePracticeId) return
    if (!window.confirm(`¿Eliminar la jornada «${block.title}» del ${DAYS[block.day_of_week - 1]}? Esta acción no se puede deshacer.`)) return
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { setErrorMessage('Debes iniciar sesión.'); return }
    const { data, error } = await supabase.from('schedule_blocks').delete()
      .eq('id', block.id).eq('practice_id', activePracticeId).eq('user_id', auth.user.id).select('id')
    if (error) { setErrorMessage(`No se pudo eliminar: ${error.message}`); return }
    if (!data?.length) { setErrorMessage('La jornada ya no existe o no tienes permiso para eliminarla.'); return }
    await load()
  }

  function renderBlock(block: Block) {
    return (
      <div key={block.id} className={`min-w-0 rounded-lg border-l-4 p-2 ${block.is_in_person
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
        : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'}`}>
        <p className="text-xs font-semibold text-primary">{block.start_time.slice(0, 5)} – {block.end_time.slice(0, 5)}</p>
        <p className="mt-1 break-words text-xs font-medium text-primary">{block.title}</p>
        <p className="mt-1 text-[11px] text-secondary">{netHours(block.start_time, block.end_time, block.break_minutes).toFixed(1)} h · {block.is_in_person ? 'Presencial' : 'Remoto'}</p>
        <div className="mt-2 flex flex-wrap gap-3">
          <button type="button" onClick={() => openEditForm(block)} className="text-xs font-medium text-blue-500 hover:underline">Editar</button>
          <button type="button" onClick={() => void removeBlock(block)} className="text-xs font-medium text-red-500 hover:underline">Eliminar</button>
        </div>
      </div>
    )
  }

  const heading = view === 'month'
    ? formatDate(selectedDate, { month: 'long', year: 'numeric' })
    : view === 'week'
      ? `${formatDate(startOfWeek(selectedDate), { day: 'numeric', month: 'short' })} – ${formatDate(addDays(startOfWeek(selectedDate), 6), { day: 'numeric', month: 'short', year: 'numeric' })}`
      : formatDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="min-w-0 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primary">Calendario de jornada</h1>
          <p className="mt-1 text-sm text-secondary">Organiza tus horarios y consulta las horas planificadas.</p>
        </div>
        <button type="button" onClick={() => openNewForm()} disabled={!activePracticeId} className="btn-primary shrink-0 disabled:opacity-50">+ Nueva jornada</button>
      </header>

      {!activePracticeId && <p className="rounded-xl border border-amber-500/40 p-4 text-sm">Selecciona una práctica para consultar sus jornadas.</p>}
      {errorMessage && !showForm && <p role="alert" className="rounded-xl border border-red-500/40 p-3 text-sm text-red-500">{errorMessage}</p>}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="card"><p className="text-sm text-secondary">Horas planificadas esta semana</p><p className="mt-1 text-2xl font-semibold text-primary">{weeklyHours.toFixed(1)} h</p></div>
        <div className="card"><p className="text-sm text-secondary">Horas planificadas este mes</p><p className="mt-1 text-2xl font-semibold text-primary">{monthlyHours.toFixed(1)} h</p></div>
      </section>

      <section className="card min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate(-1)} className={buttonClass} aria-label="Periodo anterior">‹</button>
            <button type="button" onClick={() => setSelectedDate(new Date())} className={buttonClass}>Hoy</button>
            <button type="button" onClick={() => navigate(1)} className={buttonClass} aria-label="Periodo siguiente">›</button>
          </div>
          <div className="flex rounded-lg bg-[var(--bg-subtle)] p-1">
            {([['month', 'Mes'], ['week', 'Semana'], ['day', 'Día']] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setView(value)} className={`rounded-md px-3 py-2 text-sm ${view === value ? 'bg-[var(--bg-card)] font-semibold text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}>{label}</button>
            ))}
          </div>
        </div>
        <h2 className="text-base font-semibold capitalize text-primary">{heading}</h2>
        {loading ? <p className="py-12 text-center text-sm text-secondary">Cargando jornadas…</p> : view === 'month' ? (
          <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-[var(--border-soft)]">
            {DAYS.map(day => <div key={day} className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)] p-2 text-center text-[10px] font-semibold text-secondary sm:text-xs"><span className="hidden sm:inline">{day}</span><span className="sm:hidden">{day.slice(0, 2)}</span></div>)}
            {visibleDates.map(date => {
              const dayBlocks = blocksForDate(date)
              return (
                <button key={dateKey(date)} type="button" onClick={() => { setSelectedDate(date); setView('day') }} className={`min-w-0 min-h-24 border-b border-r border-[var(--border-soft)] p-1 text-left hover:bg-[var(--bg-hover)] sm:min-h-28 sm:p-2 ${date.getMonth() !== selectedDate.getMonth() ? 'opacity-40' : ''} ${dateKey(date) === dateKey(new Date()) ? 'bg-blue-500/10' : ''}`}>
                  <span className="text-xs font-medium text-primary">{date.getDate()}</span>
                  <div className="mt-1 space-y-1">{dayBlocks.slice(0, 2).map(block => (
                    <div key={block.id} className={`truncate rounded px-1 py-1 text-[9px] sm:text-[10px] ${block.is_in_person ? 'bg-blue-900/50 text-blue-100' : 'bg-emerald-900/50 text-emerald-100'}`}>{block.start_time.slice(0, 5)} {block.title}</div>
                  ))}{dayBlocks.length > 2 && <p className="text-[10px] text-secondary">+{dayBlocks.length - 2} más</p>}</div>
                </button>
              )
            })}
          </div>
        ) : view === 'week' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-7">
            {visibleDates.map(date => (
              <div key={dateKey(date)} className="min-w-0 rounded-xl border border-[var(--border-soft)] p-3">
                <button type="button" onClick={() => { setSelectedDate(date); setView('day') }} className="mb-3 text-left">
                  <p className="text-xs text-secondary">{DAYS[WEEKDAY(date) - 1]}</p><p className="mt-1 text-lg font-semibold text-primary">{date.getDate()}</p>
                </button>
                <div className="space-y-2">{blocksForDate(date).length ? blocksForDate(date).map(renderBlock) : <p className="py-3 text-center text-xs text-muted">Sin jornadas</p>}</div>
                <button type="button" onClick={() => openNewForm(date)} className="mt-3 w-full rounded-lg border border-dashed border-[var(--border-soft)] px-2 py-2 text-xs text-secondary hover:bg-[var(--bg-hover)]">+ Añadir</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[var(--bg-subtle)] p-3">
              <div><p className="font-medium text-primary">{DAYS[WEEKDAY(selectedDate) - 1]}</p><p className="text-sm text-secondary">{formatDate(selectedDate)}</p></div>
              <button type="button" onClick={() => openNewForm(selectedDate)} className="btn-primary text-sm">+ Añadir jornada</button>
            </div>
            {blocksForDate(selectedDate).length ? blocksForDate(selectedDate).map(renderBlock) : <div className="rounded-xl border border-dashed border-[var(--border-soft)] py-10 text-center text-sm text-secondary">No hay jornadas para este día.</div>}
          </div>
        )}
        <div className="flex flex-wrap gap-4 text-xs text-secondary"><span>🔵 Presencial</span><span>🟢 Remoto</span></div>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-3 sm:items-center sm:p-6">
          <form onSubmit={event => void submit(event)} className="my-4 w-full max-w-2xl space-y-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-xl font-semibold text-primary">{editingId ? 'Editar jornada' : 'Nueva jornada semanal'}</h2><p className="mt-1 text-sm text-secondary">Selecciona varios días y configura horarios diferentes.</p></div>
              <button type="button" onClick={() => setShowForm(false)} className={buttonClass} aria-label="Cerrar">×</button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-primary">Vigente desde<input type="date" value={effectiveFrom} onChange={event => setEffectiveFrom(event.target.value)} className="input-base mt-1" /></label>
              <label className="text-sm font-medium text-primary">Vigente hasta (opcional)<input type="date" value={effectiveTo} onChange={event => setEffectiveTo(event.target.value)} className="input-base mt-1" /></label>
            </div>
            <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
              {rules.map((rule, index) => (
                <section key={rule.key} className="space-y-3 rounded-xl border border-[var(--border-soft)] p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-primary">Regla {index + 1}</h3>{!editingId && rules.length > 1 && <button type="button" onClick={() => setRules(current => current.filter(item => item.key !== rule.key))} className="text-xs text-red-500 hover:underline">Quitar regla</button>}</div>
                  <label className="block text-sm font-medium text-primary">Nombre de la jornada<input value={rule.title} onChange={event => updateRule(rule.key, { title: event.target.value })} maxLength={120} required className="input-base mt-1" placeholder="Ej.: Jornada de práctica" /></label>
                  <div><p className="mb-2 text-sm font-medium text-primary">Días de la semana</p><div className="grid grid-cols-7 gap-1.5">{DAYS.map((day, indexDay) => (
                    <button key={day} type="button" onClick={() => toggleDay(rule.key, indexDay + 1)} aria-pressed={rule.days.includes(indexDay + 1)} title={day} className={`rounded-lg border px-1 py-2 text-xs font-semibold sm:text-sm ${rule.days.includes(indexDay + 1) ? 'border-blue-500 bg-blue-500/15 text-blue-400' : 'border-[var(--border-soft)] text-secondary hover:bg-[var(--bg-hover)]'}`}>{day.slice(0, 2)}</button>
                  ))}</div></div>
                  <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium text-primary">Hora de inicio<input type="time" value={rule.start_time} onChange={event => updateRule(rule.key, { start_time: event.target.value })} required className="input-base mt-1" /></label><label className="text-sm font-medium text-primary">Hora de término<input type="time" value={rule.end_time} onChange={event => updateRule(rule.key, { end_time: event.target.value })} required className="input-base mt-1" /></label></div>
                  <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium text-primary">Colación (min)<input type="number" min={0} max={300} step={5} value={rule.break_minutes} onChange={event => updateRule(rule.key, { break_minutes: Number(event.target.value) })} required className="input-base mt-1" /></label><div><p className="text-sm font-medium text-primary">Modalidad</p><div className="mt-1 flex gap-1">{([true, false] as const).map(value => <button key={String(value)} type="button" onClick={() => updateRule(rule.key, { is_in_person: value })} className={`flex-1 rounded-lg border px-2 py-2 text-xs ${rule.is_in_person === value ? 'border-blue-500 bg-blue-500/15 text-primary' : 'border-[var(--border-soft)] text-secondary'}`}>{value ? 'Presencial' : 'Remoto'}</button>)}</div></div></div>
                  <p className="text-xs text-secondary">{netHours(rule.start_time, rule.end_time, rule.break_minutes).toFixed(2)} h netas por día · {rule.days.length} día(s) por semana</p>
                </section>
              ))}
            </div>
            {!editingId && <button type="button" onClick={() => setRules(current => [...current, newRule(nextKey.current++, 1)])} className="w-full rounded-lg border border-dashed border-[var(--border-soft)] px-3 py-2 text-sm text-secondary hover:bg-[var(--bg-hover)]">+ Agregar otro horario</button>}
            {editingId && <p className="text-xs text-secondary">Estás editando una jornada individual. Para configurar varios días a la vez, utiliza «Nueva jornada».</p>}
            {errorMessage && <p role="alert" className="rounded-lg border border-red-500/40 p-3 text-sm text-red-500">{errorMessage}</p>}
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowForm(false)} className={buttonClass}>Cancelar</button><button type="submit" disabled={saving || !activePracticeId} className="btn-primary disabled:opacity-50">{saving ? 'Guardando…' : editingId ? 'Guardar cambios' : `Crear ${rules.reduce((total, rule) => total + rule.days.length, 0)} jornada(s)`}</button></div>
          </form>
        </div>
      )}
    </div>
  )
}
