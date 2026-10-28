
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fmt } from '../lib/utils'

type TaskStatus = 'todo' | 'doing' | 'done'

type Task = {
    id: string
    title: string
    status: TaskStatus
    due_date: string | null
    planned_hours: number | null
    category: string | null
    is_in_person: boolean
    log_id: string | null
    created_at?: string
}

type Tab =
    | 'resumen'
    | 'backlog'
    | 'epicas'
    | 'sprints'
    | 'trabajo'
    | 'informes'

const TABS: { id: Tab; label: string }[] = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'backlog', label: 'Backlog' },
    { id: 'epicas', label: 'Épicas' },
    { id: 'sprints', label: 'Sprints' },
    { id: 'trabajo', label: 'Trabajo actual' },
    { id: 'informes', label: 'Informes' },
]

const STATUSES: {
    key: TaskStatus
    label: string
    next?: TaskStatus
    previous?: TaskStatus
}[] = [
        { key: 'todo', label: 'Por hacer', next: 'doing' },
        { key: 'doing', label: 'En curso', previous: 'todo', next: 'done' },
        { key: 'done', label: 'Hecho', previous: 'doing' },
    ]

const STATUS_LABEL: Record<TaskStatus, string> = {
    todo: 'Por hacer',
    doing: 'En curso',
    done: 'Hecho',
}

const inputClass =
    'input-base min-w-0'

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
    if (!task.due_date || task.status === 'done') return false
    return task.due_date < fmt(new Date())
}

export default function Tasks() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [activeTab, setActiveTab] = useState<Tab>('resumen')
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all')
    const [showForm, setShowForm] = useState(false)
    const [title, setTitle] = useState('')
    const [due, setDue] = useState('')
    const [hours, setHours] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        setError('')

        const { data, error: loadError } = await supabase
            .from('tasks')
            .select('*')
            .order('due_date', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: true })

        if (loadError) {
            setError(`No se pudieron cargar las tareas: ${loadError.message}`)
            setLoading(false)
            return
        }

        setTasks((data ?? []) as Task[])
        setLoading(false)
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    const filteredTasks = useMemo(() => {
        const query = search.trim().toLocaleLowerCase('es')

        return tasks.filter((task) => {
            const matchesSearch =
                !query || task.title.toLocaleLowerCase('es').includes(query)

            const matchesStatus =
                statusFilter === 'all' || task.status === statusFilter

            return matchesSearch && matchesStatus
        })
    }, [tasks, search, statusFilter])

    const todoTasks = filteredTasks.filter((task) => task.status === 'todo')
    const doingTasks = filteredTasks.filter((task) => task.status === 'doing')
    const doneTasks = filteredTasks.filter((task) => task.status === 'done')

    const totalPlannedHours = tasks.reduce(
        (total, task) => total + Number(task.planned_hours ?? 0),
        0,
    )

    const completedHours = tasks
        .filter((task) => task.status === 'done')
        .reduce(
            (total, task) => total + Number(task.planned_hours ?? 0),
            0,
        )

    const completion = tasks.length
        ? Math.round((doneTasks.length / tasks.length) * 100)
        : 0

    const overdueTasks = tasks.filter(isOverdue)

    const addTask = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError('')

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
            setError('Las horas deben ser mayores que 0 y no superar 24.')
            return
        }

        setSaving(true)

        try {
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser()

            if (userError || !user) {
                setError('Tu sesión no está disponible. Vuelve a iniciar sesión.')
                return
            }

            const { error: insertError } = await supabase.from('tasks').insert({
                user_id: user.id,
                title: cleanTitle,
                due_date: due || null,
                planned_hours: parsedHours,
                status: 'todo',
            })

            if (insertError) {
                setError(`No se pudo guardar la tarea: ${insertError.message}`)
                return
            }

            setTitle('')
            setDue('')
            setHours('')
            setShowForm(false)
            setActiveTab('backlog')

            await load()
        } catch {
            setError('Ocurrió un error inesperado al guardar la tarea.')
        } finally {
            setSaving(false)
        }
    }

    const moveTask = async (task: Task, status: TaskStatus) => {
        setError('')

        if (task.status === status) return

        try {
            let logId = task.log_id

            // Mantiene la integración actual con el registro de horas.
            if (status === 'done' && !logId && task.planned_hours) {
                const {
                    data: { user },
                    error: userError,
                } = await supabase.auth.getUser()

                if (userError || !user) {
                    setError('Tu sesión no está disponible. Vuelve a iniciar sesión.')
                    return
                }

                const { data, error: logError } = await supabase
                    .from('work_logs')
                    .insert({
                        user_id: user.id,
                        date: fmt(new Date()),
                        hours_worked: task.planned_hours,
                        task_description: task.title,
                        category: task.category ?? 'Otro',
                        is_in_person: task.is_in_person ?? false,
                    })
                    .select('id')
                    .single()

                if (logError) {
                    setError(
                        `No se pudieron registrar las horas de trabajo: ${logError.message}`,
                    )
                    return
                }

                logId = data.id
            }

            // Conserva el comportamiento anterior al reabrir una tarea.
            if (status !== 'done' && logId) {
                const { error: deleteLogError } = await supabase
                    .from('work_logs')
                    .delete()
                    .eq('id', logId)

                if (deleteLogError) {
                    setError(
                        `No se pudo actualizar el registro de horas: ${deleteLogError.message}`,
                    )
                    return
                }

                logId = null
            }

            const { error: updateError } = await supabase
                .from('tasks')
                .update({ status, log_id: logId })
                .eq('id', task.id)

            if (updateError) {
                setError(`No se pudo actualizar la tarea: ${updateError.message}`)
                return
            }

            await load()
        } catch {
            setError('Ocurrió un error inesperado al actualizar la tarea.')
        }
    }

    const removeTask = async (task: Task) => {
        const confirmed = window.confirm(
            `¿Quieres eliminar la tarea "${task.title}"? Esta acción no se puede deshacer.`,
        )

        if (!confirmed) return

        setError('')

        try {
            if (task.log_id) {
                const { error: logError } = await supabase
                    .from('work_logs')
                    .delete()
                    .eq('id', task.log_id)

                if (logError) {
                    setError(
                        `No se pudo eliminar el registro de horas: ${logError.message}`,
                    )
                    return
                }
            }

            const { error: deleteError } = await supabase
                .from('tasks')
                .delete()
                .eq('id', task.id)

            if (deleteError) {
                setError(`No se pudo eliminar la tarea: ${deleteError.message}`)
                return
            }

            await load()
        } catch {
            setError('Ocurrió un error inesperado al eliminar la tarea.')
        }
    }

    const renderTask = (task: Task) => {
        const currentIndex = STATUSES.findIndex(
            (status) => status.key === task.status,
        )
        const currentStatus = STATUSES[currentIndex]

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
                                <span
                                    className={`rounded-md border px-2 py-1 ${isOverdue(task)
                                            ? 'border-[var(--border-strong)] text-[var(--text-primary)]'
                                            : 'border-[var(--border-soft)]'
                                        }`}
                                >
                                    {isOverdue(task) ? 'Vencida · ' : 'Vence · '}
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
                        {currentStatus.previous && (
                            <button
                                type="button"
                                onClick={() =>
                                    void moveTask(task, currentStatus.previous!)
                                }
                                className="btn-ghost border border-[var(--border-soft)]"
                            >
                                ← Atrás
                            </button>
                        )}

                        {currentStatus.next && (
                            <button
                                type="button"
                                onClick={() =>
                                    void moveTask(task, currentStatus.next!)
                                }
                                className="btn-primary"
                            >
                                {task.status === 'todo'
                                    ? 'Iniciar'
                                    : 'Completar'}
                                {' →'}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => void removeTask(task)}
                            className="btn-ghost"
                            aria-label={`Eliminar tarea ${task.title}`}
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </article>
        )
    }

    const renderTaskList = (items: Task[], emptyMessage: string) => {
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

        return <div className="space-y-3">{items.map(renderTask)}</div>
    }

    const renderStat = (
        label: string,
        value: string | number,
        description: string,
    ) => (
        <div className={`${cardClass} min-w-0 p-4 sm:p-5`}>
            <p className="text-sm text-[var(--text-secondary)]">{label}</p>
            <p className="mt-2 break-words text-2xl font-semibold text-[var(--text-primary)]">
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
                        Organiza tu backlog, controla el avance y registra las
                        horas dedicadas a tus actividades.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setShowForm((visible) => !visible)
                        setError('')
                    }}
                    className="btn-primary w-full sm:w-auto"
                >
                    {showForm ? 'Cancelar' : '+ Nueva tarea'}
                </button>
            </header>

            {error && (
                <div
                    role="alert"
                    className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-card)] p-3 text-sm text-[var(--text-primary)]"
                >
                    {error}
                </div>
            )}

            {showForm && (
                <form
                    onSubmit={addTask}
                    className={`${cardClass} space-y-4 p-4 sm:p-5`}
                >
                    <div>
                        <h2 className="font-semibold">Crear tarea</h2>
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
                                onChange={(event) => setTitle(event.target.value)}
                                placeholder="Ej. Revisar los requisitos del proyecto"
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
                                onChange={(event) => setHours(event.target.value)}
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
                                onChange={(event) => setDue(event.target.value)}
                                className={inputClass}
                            />
                        </label>
                    </div>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="btn-ghost"
                            disabled={saving}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={saving}
                        >
                            {saving ? 'Guardando…' : 'Guardar tarea'}
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
                        aria-current={activeTab === tab.id ? 'page' : undefined}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>

            {activeTab !== 'epicas' && activeTab !== 'sprints' && (
                <div className="flex flex-col gap-3 sm:flex-row">
                    <label className="min-w-0 flex-1">
                        <span className="sr-only">Buscar tareas</span>
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar tareas por nombre…"
                            className={inputClass}
                        />
                    </label>

                    <label className="sm:w-48">
                        <span className="sr-only">Filtrar por estado</span>
                        <select
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(
                                    event.target.value as 'all' | TaskStatus,
                                )
                            }
                            className={inputClass}
                        >
                            <option value="all">Todos los estados</option>
                            <option value="todo">Por hacer</option>
                            <option value="doing">En curso</option>
                            <option value="done">Hecho</option>
                        </select>
                    </label>
                </div>
            )}

            {activeTab === 'resumen' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {renderStat(
                            'Total de tareas',
                            tasks.length,
                            'Tareas registradas',
                        )}
                        {renderStat(
                            'Por hacer',
                            tasks.filter((task) => task.status === 'todo').length,
                            'Pendientes de iniciar',
                        )}
                        {renderStat(
                            'Completadas',
                            tasks.filter((task) => task.status === 'done').length,
                            `${completion}% del total`,
                        )}
                        {renderStat(
                            'Vencidas',
                            overdueTasks.length,
                            'Pendientes fuera de plazo',
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
                            aria-label="Progreso general de las tareas"
                        >
                            <div
                                className="h-full rounded-full bg-[var(--color-brand-500)] transition-all"
                                style={{ width: `${completion}%` }}
                            />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--text-secondary)]">
                            <span>
                                Horas estimadas: {totalPlannedHours} h
                            </span>
                            <span>
                                Horas asociadas a tareas completadas:{' '}
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
                                onClick={() => setActiveTab('backlog')}
                                className="btn-ghost"
                            >
                                Ver backlog →
                            </button>
                        </div>

                        {renderTaskList(
                            filteredTasks.slice(0, 5),
                            'No hay tareas para mostrar. Puedes crear una nueva.',
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'backlog' && (
                <div className="space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold">Backlog</h2>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                            Lista priorizable de tareas pendientes, en curso y
                            completadas.
                        </p>
                    </div>

                    {renderTaskList(
                        filteredTasks,
                        'No hay tareas que coincidan con la búsqueda o el filtro.',
                    )}
                </div>
            )}

            {activeTab === 'trabajo' && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold">Trabajo actual</h2>
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
                            'No tienes tareas en curso. Puedes iniciar una desde el backlog.',
                        )}
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
                            Por hacer ({todoTasks.length})
                        </h3>
                        {renderTaskList(
                            todoTasks,
                            'No tienes tareas pendientes.',
                        )}
                    </section>
                </div>
            )}

            {activeTab === 'informes' && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold">Informes</h2>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                            Indicadores calculados a partir de tus tareas
                            guardadas.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {renderStat(
                            'Tareas completadas',
                            doneTasks.length,
                            `De ${tasks.length} tareas en total`,
                        )}
                        {renderStat(
                            'Horas estimadas',
                            `${totalPlannedHours} h`,
                            'Suma de las estimaciones registradas',
                        )}
                        {renderStat(
                            'Horas de tareas completadas',
                            `${completedHours} h`,
                            'Estimación asociada a tareas completadas',
                        )}
                    </div>

                    <div className={`${cardClass} p-4 sm:p-5`}>
                        <h3 className="font-semibold">Distribución por estado</h3>

                        <div className="mt-4 space-y-4">
                            {STATUSES.map((status) => {
                                const count = tasks.filter(
                                    (task) => task.status === status.key,
                                ).length
                                const percentage = tasks.length
                                    ? Math.round((count / tasks.length) * 100)
                                    : 0

                                return (
                                    <div key={status.key}>
                                        <div className="mb-1 flex justify-between gap-3 text-sm">
                                            <span>{status.label}</span>
                                            <span className="text-[var(--text-secondary)]">
                                                {count} · {percentage}%
                                            </span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                                            <div
                                                className="h-full rounded-full bg-[var(--color-brand-500)]"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {(activeTab === 'epicas' || activeTab === 'sprints') && (
                <div className={`${cardClass} p-5 sm:p-7`}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                        Próxima etapa
                    </p>
                    <h2 className="mt-2 text-lg font-semibold">
                        {activeTab === 'epicas'
                            ? 'Gestión de épicas'
                            : 'Planificación de sprints'}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                        {activeTab === 'epicas'
                            ? 'Para guardar épicas e historias de usuario de forma permanente, primero debemos incorporar sus tablas y relaciones en Supabase.'
                            : 'Para planificar sprints con fechas, duración y tareas asignadas, primero debemos incorporar las tablas y relaciones necesarias en Supabase.'}
                    </p>
                    <p className="mt-3 text-sm text-[var(--text-secondary)]">
                        Tus tareas actuales permanecen guardadas. Esta sección
                        todavía no crea ni modifica datos.
                    </p>
                    <button
                        type="button"
                        onClick={() => setActiveTab('backlog')}
                        className="btn-primary mt-5"
                    >
                        Volver al backlog
                    </button>
                </div>
            )}
        </section>
    )
}
