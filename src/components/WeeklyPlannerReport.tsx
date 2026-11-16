
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  exportWeeklyPlannerExcel,
  type ExportEntry,
  type ExportTask,
} from '../lib/weeklyPlannerExcel'

type Task = ExportTask & {
  activity_id?: string | null
}

type Sprint = {
  id: string
  name: string
  start_date: string
  end_date: string
}

type Activity = {
  id: string
  sprint_id: string | null
}

type Props = {
  tasks: Task[]
  activePracticeId?: string | null
}

function dateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function monday(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d, 12)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return dateKey(date)
}

function plusDays(value: string, amount: number) {
  const [y, m, d] = value.split('-').map(Number)
  return dateKey(new Date(y, m - 1, d + amount, 12))
}

export default function WeeklyPlannerReport({
  tasks,
  activePracticeId,
}: Props) {
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [sprintId, setSprintId] = useState('')
  const [weekStart, setWeekStart] = useState(
    () => monday(dateKey(new Date())),
  )
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      setSprints([])
      setActivities([])
      setSprintId('')

      try {
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user || !activePracticeId) return

        const [sprintResult, activityResult] = await Promise.all([
          supabase
            .from('sprints')
            .select('id,name,start_date,end_date')
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

        if (cancelled) return

        setSprints((sprintResult.data ?? []) as Sprint[])
        setActivities((activityResult.data ?? []) as Activity[])
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Error al cargar.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [activePracticeId])

  const sprint = sprints.find(item => item.id === sprintId)

  const sprintTasks = useMemo(() => {
    const activityIds = new Set(
      activities
        .filter(item => item.sprint_id === sprintId)
        .map(item => item.id),
    )

    return tasks.filter(
      task => !!task.activity_id &&
        activityIds.has(task.activity_id),
    )
  }, [activities, sprintId, tasks])

  const selectSprint = (id: string) => {
    setSprintId(id)
    const selected = sprints.find(item => item.id === id)
    if (selected) setWeekStart(monday(selected.start_date))
    setNotice('')
  }

  const download = async () => {
    if (!sprint || !activePracticeId) return

    setExporting(true)
    setError('')
    setNotice('')

    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('Sesión no disponible.')

      const weekEnd = plusDays(weekStart, 6)
      const ids = new Set(sprintTasks.map(task => task.id))

      const { data, error: queryError } = await supabase
        .from('task_planning')
        .select('task_id,planned_date,planned_hours,notes')
        .eq('user_id', auth.user.id)
        .eq('practice_id', activePracticeId)
        .gte('planned_date', weekStart)
        .lte('planned_date', weekEnd)

      if (queryError) throw queryError

      const entries = ((data ?? []) as ExportEntry[])
        .filter(entry => ids.has(entry.task_id))

      exportWeeklyPlannerExcel({
        sprintName: sprint.name,
        weekStart,
        weekEnd,
        tasks: sprintTasks,
        entries,
      })

      setNotice('Archivo Excel generado.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al exportar.',
      )
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4">
      <div>
        <h3 className="font-semibold">
          Exportar planificador semanal
        </h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Descarga la planificación de un sprint en Excel,
          organizada por días.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}

      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Sprint</span>
          <select
            className="input-base w-full"
            value={sprintId}
            disabled={loading}
            onChange={e => selectSprint(e.target.value)}
          >
            <option value="">Seleccionar sprint</option>
            {sprints.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span>Semana</span>
          <input
            type="date"
            className="input-base w-full"
            value={weekStart}
            onChange={e => setWeekStart(monday(e.target.value))}
          />
        </label>
      </div>

      {sprint && (
        <p className="text-xs text-[var(--text-secondary)]">
          {sprintTasks.length} tareas vinculadas al sprint.
          Se exportará la semana del {weekStart} al{' '}
          {plusDays(weekStart, 6)}.
        </p>
      )}

      <button
        type="button"
        className="btn-primary"
        disabled={loading || exporting || !sprint}
        onClick={() => void download()}
      >
        {exporting ? 'Generando…' : 'Descargar Excel'}
      </button>
    </section>
  )
}
