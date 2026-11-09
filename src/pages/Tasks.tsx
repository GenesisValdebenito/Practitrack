import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { fmt } from '../lib/utils'
import {
  changeTaskStatus,
  trashTask,
} from '../lib/taskOperations'
import type { TaskStatus } from '../lib/taskOperations'
import TaskTrash from '../components/TaskTrash'
import GanttChart from '../components/GanttChart'
import UnifiedBacklog from '../components/UnifiedBacklog'

type Task = {
  id: string
  title: string
  status: TaskStatus
  due_date: string | null
  planned_hours: number | null
  category: string | null
  is_in_person: boolean
  log_id: string | null
  activity_id?: string | null
  practice_id?: string | null
  created_at?: string
  deleted_at?: string | null
  purge_at?: string | null
}

type Tab =
  | 'resumen'
  | 'backlog'
  | 'trabajo'
  | 'gantt'
  | 'informes'

type TasksProps = {
  activePracticeId?: string | null
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'backlog', label: 'Backlog' },
  { id: 'trabajo', label: 'Trabajo actual' },
  { id: 'gantt', label: 'Carta Gantt' },
  { id: 'informes', label: 'Informes' },
]

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Por hacer',
  doing: 'En curso',
  done: 'Hecho',
}

const inputClass = 'input-base min-w-0'
const cardClass =
  'rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)]'

function formatDate(value: string | null) {
  if (!value) return 'Sin fecha'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function isOverdue(task: Task) {
  return (
    !!task.due_date &&
    task.status !== 'done' &&
    task.due_date < fmt(new Date())
  )
}

export default function Tasks({
  activePracticeId,
}: TasksProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('resumen')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] =
    useState<'all' | TaskStatus>('all')

  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [hours, setHours] = useState('')

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [deletingTask, setDeletingTask] =
    useState<Task | null>(null)
  const [confirmationTitle, setConfirmationTitle] =
    useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [updatingId, setUpdatingId] =
    useState<string | null>(null)

  const [showTrash, setShowTrash] = useState(false)
  const [trashRefreshKey, setTrashRefreshKey] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser()

      if (authError || !auth.user) {
        throw new Error('Debes iniciar sesión.')
      }

      let query = supabase
        .from('tasks')
        .select('*')
        .eq('user_id', auth.user.id)
        .is('deleted_at', null)

      if (activePracticeId !== undefined) {
        if (!activePracticeId) {
          setTasks([])
          return
        }

        query = query.eq('practice_id', activePracticeId)
      }

      const { data, error: loadError } = await query
        .order('due_date', {
          ascending: true,
          nullsFirst: false,
        })
        .order('created_at', { ascending: true })

      if (loadError) throw loadError

      setTasks((data ?? []) as Task[])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las tareas.'
      )
    } finally {
      setLoading(false)
    }
  }, [activePracticeId])

  useEffect(() => {
    void load()
  }, [load])

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')

    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.title.toLocaleLowerCase('es').includes(query)

      const matchesStatus =
        statusFilter === 'all' ||
        task.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [tasks, search, statusFilter])

  const todoTasks = filteredTasks.filter(
    (task) => task.status === 'todo'
  )

  const doingTasks = filteredTasks.filter(
    (task) => task.status === 'doing'
  )

  const doneTasks = filteredTasks.filter(
    (task) => task.status === 'done'
  )

  const totalPlannedHours = tasks.reduce(
    (total, task) =>
      total + Number(task.planned_hours ?? 0),
    0
  )

  const completedHours = tasks
    .filter((task) => task.status === 'done')
    .reduce(
      (total, task) =>
        total + Number(task.planned_hours ?? 0),
      0
    )

  const completion = tasks.length
    ? Math.round(
      (tasks.filter((task) => task.status === 'done')
        .length /
        tasks.length) *
      100
    )
    : 0

  const overdueTasks = tasks.filter(isOverdue)

  const addTask = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    setError('')
    setNotice('')

    const cleanTitle = title.trim()

    if (!cleanTitle) {
      setError('Escribe un título para la tarea.')
      return
    }

    const parsedHours = hours ? Number(hours) : null

    if (
      parsedHours !== null &&
      (!Number.isFinite(parsedHours) ||
        parsedHours <= 0 ||
        parsedHours > 24)
    ) {
      setError(
        'Las horas estimadas deben ser mayores que 0 y no superar 24.'
      )
      return
    }

    if (activePracticeId === null) {
      setError('Selecciona una práctica activa.')
      return
    }

    setSaving(true)

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser()

      if (authError || !auth.user) {
        throw new Error('Tu sesión no está disponible.')
      }

      const payload: {
        user_id: string
        title: string
        due_date: string | null
        planned_hours: number | null
        status: TaskStatus
        practice_id?: string
      } = {
        user_id: auth.user.id,
        title: cleanTitle,
        due_date: due || null,
        planned_hours: parsedHours,
        status: 'todo',
      }

      if (activePracticeId) {
        payload.practice_id = activePracticeId
      }

      const { error: insertError } = await supabase
        .from('tasks')
        .insert(payload)

      if (insertError) throw insertError

      setTitle('')
      setDue('')
      setHours('')
      setShowForm(false)
      setActiveTab('backlog')

      await load()
      setNotice('Tarea creada correctamente.')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar la tarea.'
      )
    } finally {
      setSaving(false)
    }
  }

  const moveTask = async (
    task: Task,
    status: TaskStatus
  ) => {
    if (task.status === status || updatingId) return

    setError('')
    setNotice('')
    setUpdatingId(task.id)

    try {
      const result = await changeTaskStatus(
        task.id,
        status
      )

      if (!result.success) {
        setError(result.message)
        return
      }

      await load()
      setNotice(result.message)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar la tarea.'
      )
    } finally {
      setUpdatingId(null)
    }
  }

  const requestDelete = (task: Task) => {
    setDeletingTask(task)
    setConfirmationTitle('')
    setDeleteError('')
    setError('')
    setNotice('')
  }

  const cancelDelete = () => {
    if (deleting) return

    setDeletingTask(null)
    setConfirmationTitle('')
    setDeleteError('')
  }

  const confirmDelete = async () => {
    if (!deletingTask || deleting) return

    setDeleting(true)
    setDeleteError('')

    try {
      const result = await trashTask(
        deletingTask,
        confirmationTitle
      )

      if (!result.success) {
        setDeleteError(result.message)
        return
      }

      setDeletingTask(null)
      setConfirmationTitle('')

      await load()
      setTrashRefreshKey((value) => value + 1)
      setNotice(result.message)
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : 'No se pudo enviar la tarea a la papelera.'
      )
    } finally {
      setDeleting(false)
    }
  }

  const renderTask = (task: Task) => {
    const previous: TaskStatus | null =
      task.status === 'done'
        ? 'doing'
        : task.status === 'doing'
          ? 'todo'
          : null

    const next: TaskStatus | null =
      task.status === 'todo'
        ? 'doing'
        : task.status === 'doing'
          ? 'done'
          : null

    return (
      <article
        key={task.id}
        className={`${cardClass} p-4 transition-colors hover:border-[var(--border-strong)]`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h3
              className={`break-words text-sm font-semibold ${task.status === 'done'
                ? 'text-[var(--text-secondary)] line-through'
                : 'text-[var(--text-primary)]'
                }`}
            >
              {task.title}
            </h3>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="rounded-md border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2 py-1">
                {STATUS_LABEL[task.status]}
              </span>

              {task.due_date && (
                <span className="rounded-md border border-[var(--border-soft)] px-2 py-1">
                  {isOverdue(task)
                    ? 'Vencida · '
                    : 'Vence · '}
                  {formatDate(task.due_date)}
                </span>
              )}

              {task.planned_hours != null && (
                <span className="rounded-md border border-[var(--border-soft)] px-2 py-1">
                  {task.planned_hours} h estimadas
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {previous && (
              <button
                type="button"
                disabled={updatingId !== null}
                onClick={() =>
                  void moveTask(task, previous)
                }
                className="btn-ghost border border-[var(--border-soft)]"
              >
                ← Atrás
              </button>
            )}

            {next && (
              <button
                type="button"
                disabled={updatingId !== null}
                onClick={() =>
                  void moveTask(task, next)
                }
                className="btn-primary"
              >
                {updatingId === task.id
                  ? 'Actualizando…'
                  : task.status === 'todo'
                    ? 'Iniciar →'
                    : 'Completar →'}
              </button>
            )}

            <button
              type="button"
              disabled={updatingId !== null}
              onClick={() => requestDelete(task)}
              className="btn-ghost"
              aria-label={`Enviar a papelera: ${task.title}`}
            >
              Eliminar
            </button>
          </div>
        </div>
      </article>
    )
  }

  const renderTaskList = (
    items: Task[],
    emptyMessage: string
  ) => {
    if (loading) {
      return (
        <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
          Cargando tareas…
        </p>
      )
    }

    if (items.length === 0) {
      return (
        <div className={`${cardClass} p-8 text-center`}>
          <p className="text-sm text-[var(--text-secondary)]">
            {emptyMessage}
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {items.map(renderTask)}
      </div>
    )
  }

  const renderStat = (
    label: string,
    value: string | number,
    description: string
  ) => (
    <div className={`${cardClass} min-w-0 p-4 sm:p-5`}>
      <p className="text-sm text-[var(--text-secondary)]">
        {label}
      </p>
      <p className="mt-2 break-words text-2xl font-semibold">
        {value}
      </p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  )

  return (
    <section className="animate-fade-in space-y-6 pb-8 text-[var(--text-primary)]">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">
            Organización del trabajo
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Tareas
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
            Organiza tu backlog, controla el avance y
            planifica tus actividades. Las horas reales
            se registran exclusivamente en la bitácora.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setShowTrash((value) => !value)
              setShowForm(false)
            }}
            className="btn-ghost border border-[var(--border-soft)]"
          >
            {showTrash ? 'Cerrar papelera' : 'Papelera'}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowForm((value) => !value)
              setShowTrash(false)
              setError('')
            }}
            className="btn-primary"
          >
            {showForm ? 'Cancelar' : '+ Nueva tarea'}
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3 text-sm"
        >
          {notice}
        </div>
      )}

      {showTrash ? (
        <div className={`${cardClass} p-4 sm:p-5`}>
          <TaskTrash
            key={`${activePracticeId ?? 'all'}-${trashRefreshKey}`}
            activePracticeId={activePracticeId}
            onRestore={load}
          />
        </div>
      ) : (
        <>
          {showForm && (
            <form
              onSubmit={addTask}
              className={`${cardClass} space-y-4 p-4 sm:p-5`}
            >
              <div>
                <h2 className="font-semibold">
                  Crear tarea
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  La tarea se guardará en tu backlog.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="space-y-1.5 md:col-span-3">
                  <span className="text-sm font-medium">
                    Nombre de la tarea *
                  </span>
                  <input
                    autoFocus
                    required
                    maxLength={200}
                    value={title}
                    onChange={(event) =>
                      setTitle(event.target.value)
                    }
                    placeholder="Ej. Revisar requisitos"
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium">
                    Horas estimadas
                  </span>
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="24"
                    value={hours}
                    onChange={(event) =>
                      setHours(event.target.value)
                    }
                    placeholder="Ej. 2"
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium">
                    Fecha límite
                  </span>
                  <input
                    type="date"
                    value={due}
                    onChange={(event) =>
                      setDue(event.target.value)
                    }
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                  className="btn-ghost"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving
                    ? 'Guardando…'
                    : 'Guardar tarea'}
                </button>
              </div>
            </form>
          )}

          <nav
            aria-label="Secciones de tareas"
            className="flex gap-1 overflow-x-auto border-b border-[var(--border-soft)]"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 border-b-2 px-3 py-3 text-sm transition-colors ${activeTab === tab.id
                  ? 'border-[var(--color-brand-500)] font-semibold text-[var(--text-primary)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                aria-current={
                  activeTab === tab.id
                    ? 'page'
                    : undefined
                }
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="min-w-0 flex-1">
              <span className="sr-only">
                Buscar tareas
              </span>
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Buscar tareas por nombre…"
                className={inputClass}
              />
            </label>

            <label className="sm:w-48">
              <span className="sr-only">
                Filtrar por estado
              </span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                    | 'all'
                    | TaskStatus
                  )
                }
                className={inputClass}
              >
                <option value="all">
                  Todos los estados
                </option>
                <option value="todo">
                  Por hacer
                </option>
                <option value="doing">
                  En curso
                </option>
                <option value="done">
                  Hecho
                </option>
              </select>
            </label>
          </div>

          {activeTab === 'resumen' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {renderStat(
                  'Total de tareas',
                  tasks.length,
                  'Tareas activas registradas'
                )}

                {renderStat(
                  'Por hacer',
                  tasks.filter(
                    (task) => task.status === 'todo'
                  ).length,
                  'Pendientes de iniciar'
                )}

                {renderStat(
                  'Completadas',
                  tasks.filter(
                    (task) => task.status === 'done'
                  ).length,
                  `${completion}% del total`
                )}

                {renderStat(
                  'Vencidas',
                  overdueTasks.length,
                  'Pendientes fuera de plazo'
                )}
              </div>

              <div className={`${cardClass} p-4 sm:p-5`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">
                      Progreso general
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Avance según tareas completadas.
                    </p>
                  </div>
                  <span className="text-lg font-semibold">
                    {completion}%
                  </span>
                </div>

                <div
                  className="mt-4 h-2.5 overflow-hidden rounded-full bg-[var(--bg-subtle)]"
                  role="progressbar"
                  aria-valuenow={completion}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progreso de tareas"
                >
                  <div
                    className="h-full rounded-full bg-[var(--color-brand-500)] transition-all"
                    style={{
                      width: `${completion}%`,
                    }}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--text-secondary)]">
                  <span>
                    Horas estimadas: {totalPlannedHours} h
                  </span>
                  <span>
                    Estimación de tareas completadas:{' '}
                    {completedHours} h
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold">
                    Tareas próximas
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab('backlog')
                    }
                    className="btn-ghost"
                  >
                    Ver backlog →
                  </button>
                </div>

                {renderTaskList(
                  filteredTasks.slice(0, 5),
                  'No hay tareas para mostrar.'
                )}
              </div>
            </div>
          )}
          {activeTab === 'gantt' && (
            <GanttChart tasks={filteredTasks} />
          )}
          {activeTab === 'backlog' && (
            <UnifiedBacklog
              tasks={filteredTasks}
              activePracticeId={activePracticeId}
              renderTask={renderTask}
              onNewTask={() => {
                setShowForm(true)
                setShowTrash(false)
                window.scrollTo({
                  top: 0,
                  behavior: 'smooth',
                })
              }}
            />
          )}

          {activeTab === 'trabajo' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">
                  Trabajo actual
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Concéntrate en las tareas que ya comenzaste.
                </p>
              </div>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
                  En curso ({doingTasks.length})
                </h3>

                {renderTaskList(
                  doingTasks,
                  'No tienes tareas en curso.'
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
                  Por hacer ({todoTasks.length})
                </h3>

                {renderTaskList(
                  todoTasks,
                  'No tienes tareas pendientes.'
                )}
              </section>
            </div>
          )}

          {activeTab === 'informes' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">
                  Informes
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Indicadores calculados a partir de tus tareas guardadas.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {renderStat(
                  'Tareas completadas',
                  doneTasks.length,
                  `De ${tasks.length} tareas`
                )}

                {renderStat(
                  'Horas estimadas',
                  `${totalPlannedHours} h`,
                  'No son horas reales registradas'
                )}

                {renderStat(
                  'Estimación completada',
                  `${completedHours} h`,
                  'Horas planificadas de tareas terminadas'
                )}
              </div>

              <div className={`${cardClass} p-4 sm:p-5`}>
                <h3 className="font-semibold">
                  Distribución por estado
                </h3>

                <div className="mt-4 space-y-4">
                  {(
                    [
                      ['todo', 'Por hacer'],
                      ['doing', 'En curso'],
                      ['done', 'Hecho'],
                    ] as const
                  ).map(([status, label]) => {
                    const count = tasks.filter(
                      (task) => task.status === status
                    ).length

                    const percentage = tasks.length
                      ? Math.round(
                        (count / tasks.length) * 100
                      )
                      : 0

                    return (
                      <div key={status}>
                        <div className="mb-1 flex justify-between gap-3 text-sm">
                          <span>{label}</span>
                          <span className="text-[var(--text-secondary)]">
                            {count} · {percentage}%
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                          <div
                            className="h-full rounded-full bg-[var(--color-brand-500)]"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {deletingTask && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              cancelDelete()
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-task-title"
            className={`${cardClass} w-full max-w-md space-y-4 p-5 shadow-2xl`}
          >
            <div>
              <h2
                id="delete-task-title"
                className="text-lg font-semibold"
              >
                Enviar tarea a la papelera
              </h2>

              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                La tarea permanecerá en la papelera
                durante 60 días. Podrás restaurarla
                antes de que expire.
              </p>
            </div>

            <div className="break-words rounded-lg bg-[var(--bg-subtle)] p-3 text-sm font-medium">
              {deletingTask.title}
            </div>

            <label className="block space-y-2">
              <span className="text-sm">
                Escribe exactamente el nombre de la
                tarea para confirmar.
              </span>

              <input
                autoFocus
                value={confirmationTitle}
                onChange={(event) =>
                  setConfirmationTitle(
                    event.target.value
                  )
                }
                className={inputClass}
                placeholder="Nombre exacto de la tarea"
              />
            </label>

            {deleteError && (
              <p role="alert" className="text-sm text-red-500">
                {deleteError}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cancelDelete}
                disabled={deleting}
                className="btn-ghost"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() =>
                  void confirmDelete()
                }
                disabled={
                  deleting ||
                  confirmationTitle !==
                  deletingTask.title
                }
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleting
                  ? 'Enviando…'
                  : 'Enviar a papelera'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
