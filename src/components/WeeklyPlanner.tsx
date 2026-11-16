
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type Task = {
  id: string
  title: string
  status: 'todo' | 'doing' | 'done'
  due_date: string | null
  planned_hours: number | null
  category: string | null
  activity_id?: string | null
}

type Sprint = {
  id: string
  name: string
  start_date: string
  end_date: string
  status: 'open' | 'closed'
}

type Activity = {
  id: string
  sprint_id: string | null
}

type Entry = {
  id: string
  task_id: string
  planned_date: string
  planned_hours: number
  notes: string
}

type Props = {
  tasks: Task[]
  activePracticeId?: string | null
  onNewTask: () => void
}

const DAYS = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves',
  'Viernes', 'Sábado', 'Domingo',
]

const STATUS = {
  todo: 'Por hacer',
  doing: 'En curso',
  done: 'Hecho',
}

function dateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseDate(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfWeek(date: Date) {
  return addDays(date, -((date.getDay() + 6) % 7))
}

function formatDate(value: string) {
  return parseDate(value).toLocaleDateString('es-CL')
}

const card =
  'rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)]'

export default function WeeklyPlanner({
  tasks,
  activePracticeId,
  onNewTask,
}: Props) {
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [sprintId, setSprintId] = useState('')
  const [week, setWeek] = useState(() => startOfWeek(new Date()))

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [selectedTask, setSelectedTask] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [hours, setHours] = useState('1')
  const [notes, setNotes] = useState('')

  const dates = useMemo(
    () => DAYS.map((_, i) => dateKey(addDays(week, i))),
    [week],
  )

  const selectedSprint = sprints.find(
    sprint => sprint.id === sprintId,
  )

  const sprintTasks = useMemo(() => {
    const activityIds = new Set(
      activities
        .filter(activity => activity.sprint_id === sprintId)
        .map(activity => activity.id),
    )

    return tasks.filter(
      task => !!task.activity_id &&
        activityIds.has(task.activity_id),
    )
  }, [tasks, activities, sprintId])

  const taskMap = useMemo(
    () => new Map(sprintTasks.map(task => [task.id, task])),
    [sprintTasks],
  )

  const visibleEntries = entries.filter(
    entry => taskMap.has(entry.task_id),
  )

  const totalHours = visibleEntries.reduce(
    (sum, entry) => sum + Number(entry.planned_hours),
    0,
  )

  const completed = visibleEntries.filter(
    entry => taskMap.get(entry.task_id)?.status === 'done',
  ).length

  const loadStructure = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser()

      if (authError || !auth.user) {
        throw new Error('Debes iniciar sesión.')
      }

      if (!activePracticeId) {
        setSprints([])
        setActivities([])
        setSprintId('')
        return
      }

      const [sprintResult, activityResult] = await Promise.all([
        supabase
          .from('sprints')
          .select('id,name,start_date,end_date,status')
          .eq('user_id', auth.user.id)
          .eq('practice_id', activePracticeId)
          .order('start_date', { ascending: false }),
        supabase
          .from('activities')
          .select('id,sprint_id')
          .eq('user_id', auth.user.id)
          .eq('practice_id', activePracticeId),
      ])

      if (sprintResult.error) throw sprintResult.error
      if (activityResult.error) throw activityResult.error

      const loadedSprints = (sprintResult.data ?? []) as Sprint[]
      setSprints(loadedSprints)
      setActivities((activityResult.data ?? []) as Activity[])

      setSprintId(previous => {
        if (loadedSprints.some(s => s.id === previous)) {
          return previous
        }

        return loadedSprints.find(s => s.status === 'open')?.id
          ?? loadedSprints[0]?.id
          ?? ''
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar.')
    } finally {
      setLoading(false)
    }
  }, [activePracticeId])

  useEffect(() => {
    void loadStructure()
  }, [loadStructure])

  const loadEntries = useCallback(async () => {
    setEntries([])

    if (!sprintId || !activePracticeId) return

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      setError('Sesión no disponible.')
      return
    }

    const { data, error: queryError } = await supabase
      .from('task_planning')
      .select('id,task_id,planned_date,planned_hours,notes')
      .eq('user_id', auth.user.id)
      .eq('practice_id', activePracticeId)
      .gte('planned_date', dates[0])
      .lte('planned_date', dates[6])
      .order('planned_date')

    if (queryError) {
      setError(queryError.message)
      return
    }

    setEntries((data ?? []) as Entry[])
  }, [activePracticeId, sprintId, dates])

  useEffect(() => {
    void loadEntries()
  }, [loadEntries])

  const changeSprint = (id: string) => {
    setSprintId(id)
    setShowForm(false)
    setError('')
    setNotice('')

    const sprint = sprints.find(item => item.id === id)
    if (sprint) {
      setWeek(startOfWeek(parseDate(sprint.start_date)))
    }
  }

  const openForm = (date: string, entry?: Entry) => {
    setSelectedDate(date)
    setSelectedTask(entry?.task_id ?? '')
    setHours(String(entry?.planned_hours ?? 1))
    setNotes(entry?.notes ?? '')
    setShowForm(true)
    setError('')
  }

  const saveEntry = async () => {
    const amount = Number(hours)

    if (!selectedSprint || !selectedTask || !selectedDate) {
      setError('Selecciona un sprint, una tarea y una fecha.')
      return
    }

    if (!taskMap.has(selectedTask)) {
      setError('La tarea no pertenece al sprint seleccionado.')
      return
    }

    if (
      selectedDate < selectedSprint.start_date ||
      selectedDate > selectedSprint.end_date
    ) {
      setError('La fecha debe estar dentro del período del sprint.')
      return
    }

    if (
      !hours.trim() ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      amount > 24
    ) {
      setError('Las horas deben estar entre 0 y 24.')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser()

      if (authError || !auth.user || !activePracticeId) {
        throw new Error('Sesión o práctica no disponible.')
      }

      const { error: saveError } = await supabase
        .from('task_planning')
        .upsert({
          user_id: auth.user.id,
          practice_id: activePracticeId,
          task_id: selectedTask,
          planned_date: selectedDate,
          planned_hours: amount,
          notes: notes.trim(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'task_id,planned_date',
        })

      if (saveError) throw saveError

      setShowForm(false)
      setNotice('Planificación guardada.')
      await loadEntries()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo guardar.',
      )
    } finally {
      setSaving(false)
    }
  }

  const removeEntry = async (entry: Entry) => {
    if (!window.confirm('¿Quitar esta planificación?')) return

    setSaving(true)
    setError('')

    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('Sesión no disponible.')

      const { error: deleteError } = await supabase
        .from('task_planning')
        .delete()
        .eq('id', entry.id)
        .eq('user_id', auth.user.id)

      if (deleteError) throw deleteError

      setEntries(previous =>
        previous.filter(item => item.id !== entry.id),
      )
      setNotice('Planificación retirada.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al quitar.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-w-0 space-y-5">
      <header>
        <h2 className="text-xl font-semibold">
          Planificador semanal
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Distribuye durante la semana las tareas de un sprint.
        </p>
      </header>

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/40 p-3 text-sm text-red-500">
          {error}
        </p>
      )}

      {notice && (
        <p role="status" className={`${card} p-3 text-sm`}>
          {notice}
        </p>
      )}

      <section className={`${card} space-y-3 p-4`}>
        <label className="block space-y-2 text-sm">
          <span className="font-semibold">Sprint seleccionado</span>
          <select
            className="input-base w-full"
            value={sprintId}
            onChange={event => changeSprint(event.target.value)}
          >
            <option value="">Seleccionar sprint</option>
            {sprints.map(sprint => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name} · {sprint.status === 'open'
                  ? 'Abierto'
                  : 'Cerrado'}
              </option>
            ))}
          </select>
        </label>

        {selectedSprint && (
          <p className="text-xs text-[var(--text-secondary)]">
            Período del sprint: {formatDate(selectedSprint.start_date)}
            {' – '}
            {formatDate(selectedSprint.end_date)}
          </p>
        )}
      </section>

      {!loading && sprints.length === 0 && (
        <div className={`${card} p-5 text-sm text-[var(--text-secondary)]`}>
          No hay sprints en esta práctica. Crea uno en Backlog.
        </div>
      )}

      {selectedSprint && (
        <>
          <div className={`${card} flex flex-wrap items-center justify-between gap-3 p-3`}>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setWeek(w => addDays(w, -7))}
              >
                ← Anterior
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setWeek(startOfWeek(new Date()))}
              >
                Hoy
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setWeek(w => addDays(w, 7))}
              >
                Siguiente →
              </button>
            </div>
            <span className="text-sm font-semibold">
              {formatDate(dates[0])} – {formatDate(dates[6])}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--text-secondary)]">
              {sprintTasks.length} tareas del sprint
              {' · '}
              {totalHours.toFixed(1)} h previstas
              {' · '}
              {completed} planificaciones terminadas
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => openForm(dates[0])}
              disabled={sprintTasks.length === 0}
            >
              + Planificar
            </button>
          </div>

          {sprintTasks.length === 0 && (
            <div className={`${card} p-5 text-sm`}>
              Este sprint todavía no tiene tareas vinculadas.
              Asocia actividades y tareas desde Backlog.
            </div>
          )}

          {showForm && (
            <section className={`${card} space-y-4 p-4`}>
              <div className="flex justify-between gap-3">
                <h3 className="font-semibold">Planificar tarea</h3>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setShowForm(false)}
                >
                  Cerrar
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span>Tarea del sprint</span>
                  <select
                    className="input-base w-full"
                    value={selectedTask}
                    onChange={e => setSelectedTask(e.target.value)}
                  >
                    <option value="">Seleccionar tarea</option>
                    {sprintTasks.map(task => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm">
                  <span>Fecha planificada</span>
                  <input
                    type="date"
                    className="input-base w-full"
                    min={selectedSprint.start_date}
                    max={selectedSprint.end_date}
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span>Horas previstas</span>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    className="input-base w-full"
                    value={hours}
                    onChange={e => setHours(e.target.value)}
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span>Notas</span>
                  <input
                    className="input-base w-full"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Objetivo de la jornada"
                  />
                </label>
              </div>

              <div className="flex flex-wrap justify-between gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={onNewTask}
                >
                  Crear nueva tarea
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={saving || !selectedTask}
                  onClick={() => void saveEntry()}
                >
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </section>
          )}

          <div className={`${card} overflow-hidden`}>
            <div className="hidden grid-cols-[140px_minmax(0,1fr)_100px_120px] gap-3 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3 text-xs font-semibold md:grid">
              <span>Día</span>
              <span>Tarea / detalle</span>
              <span>Horas</span>
              <span>Acciones</span>
            </div>

            {dates.map((date, index) => {
              const withinSprint =
                date >= selectedSprint.start_date &&
                date <= selectedSprint.end_date

              const dayEntries = visibleEntries.filter(
                entry => entry.planned_date === date,
              )

              return (
                <div
                  key={date}
                  className="grid min-w-0 border-b border-[var(--border-soft)] last:border-0 md:grid-cols-[140px_minmax(0,1fr)]"
                >
                  <div className="bg-[var(--bg-subtle)] p-3">
                    <p className="font-semibold">{DAYS[index]}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {formatDate(date)}
                    </p>
                    {!withinSprint && (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Fuera del sprint
                      </p>
                    )}
                  </div>

                  <div className="min-w-0 divide-y divide-[var(--border-soft)]">
                    {dayEntries.length === 0 && (
                      <p className="p-3 text-sm text-[var(--text-muted)]">
                        Sin tareas planificadas
                      </p>
                    )}

                    {dayEntries.map(entry => {
                      const task = taskMap.get(entry.task_id)
                      if (!task) return null

                      return (
                        <div
                          key={entry.id}
                          className="grid min-w-0 gap-3 p-3 md:grid-cols-[minmax(0,1fr)_100px_120px] md:items-center"
                        >
                          <div className="min-w-0">
                            <p className="break-words text-sm font-medium">
                              {task.title}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {STATUS[task.status]}
                              {task.due_date &&
                                ` · Límite ${formatDate(task.due_date)}`}
                            </p>
                            {entry.notes && (
                              <p className="mt-1 break-words text-xs text-[var(--text-secondary)]">
                                {entry.notes}
                              </p>
                            )}
                          </div>

                          <span className="text-sm">
                            {Number(entry.planned_hours)} h
                          </span>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="btn-ghost text-xs"
                              onClick={() => openForm(date, entry)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn-ghost text-xs text-red-500"
                              disabled={saving}
                              onClick={() => void removeEntry(entry)}
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

        </>
      )}
    </div>
  )
}
