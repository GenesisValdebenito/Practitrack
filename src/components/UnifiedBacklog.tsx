
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'

type Status = 'todo' | 'doing' | 'done'

type Task = {
    id: string
    title: string
    status: Status
    due_date: string | null
    activity_id?: string | null
}

type Epic = {
    id: string
    name: string
    description: string | null
    category: string
}

type Sprint = {
    id: string
    name: string
    description: string | null
    start_date: string
    end_date: string
    status: 'open' | 'closed'
}

type Activity = {
    id: string
    title: string
    epic_id: string | null
    sprint_id: string | null
}

type Props<T extends Task> = {
    tasks: T[]
    activePracticeId?: string | null
    renderTask: (task: T) => ReactNode
    onNewTask: () => void
}

const CATEGORIES = [
    'Análisis',
    'Base de datos',
    'Backend',
    'Frontend',
    'Automatización',
    'Calidad',
    'Gestión',
]

const card =
    'min-w-0 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)]'

const field = 'input-base w-full min-w-0'

function dateCL(value: string) {
    const [year, month, day] = value.split('-')
    return `${day}/${month}/${year}`
}

export default function UnifiedBacklog<T extends Task>({
    tasks,
    activePracticeId,
    renderTask,
    onNewTask,
}: Props<T>) {
    const [epics, setEpics] = useState<Epic[]>([])
    const [sprints, setSprints] = useState<Sprint[]>([])
    const [activities, setActivities] = useState<Activity[]>([])

    const [epicFilter, setEpicFilter] = useState('all')
    const [sprintFilter, setSprintFilter] = useState('all')

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')

    const [showEpicForm, setShowEpicForm] = useState(false)
    const [showSprintForm, setShowSprintForm] = useState(false)
    const [showActivityForm, setShowActivityForm] = useState(false)

    const [epicName, setEpicName] = useState('')
    const [epicCategory, setEpicCategory] = useState('Análisis')
    const [sprintName, setSprintName] = useState('')
    const [sprintStart, setSprintStart] = useState('')
    const [sprintEnd, setSprintEnd] = useState('')
    const [activityName, setActivityName] = useState('')
    const [activityEpic, setActivityEpic] = useState('')
    const [activitySprint, setActivitySprint] = useState('')

    const [expandedSprints, setExpandedSprints] = useState(true)
    const [expandedActivities, setExpandedActivities] = useState(true)
    const [expandedNotes, setExpandedNotes] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        setError('')

        try {
            const { data: auth, error: authError } =
                await supabase.auth.getUser()

            if (authError || !auth.user) {
                throw new Error('Debes iniciar sesión.')
            }

            if (activePracticeId === null) {
                setEpics([])
                setSprints([])
                setActivities([])
                return
            }

            const userId = auth.user.id

            const scope = (table: 'epics' | 'sprints' | 'activities') => {
                let query = supabase
                    .from(table)
                    .select('*')
                    .eq('user_id', userId)

                if (activePracticeId !== undefined) {
                    query = query.eq('practice_id', activePracticeId!)
                }

                return query
            }

            const [epicResult, sprintResult, activityResult] =
                await Promise.all([
                    scope('epics'),
                    scope('sprints'),
                    scope('activities'),
                ])

            if (epicResult.error) throw epicResult.error
            if (sprintResult.error) throw sprintResult.error
            if (activityResult.error) throw activityResult.error

            setEpics((epicResult.data ?? []) as Epic[])
            setSprints((sprintResult.data ?? []) as Sprint[])
            setActivities((activityResult.data ?? []) as Activity[])
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'No se pudo cargar el backlog.',
            )
        } finally {
            setLoading(false)
        }
    }, [activePracticeId])

    useEffect(() => {
        void load()
    }, [load])

    const filtered = useMemo(() => {
        const activityMap = new Map(
            activities.map((activity) => [activity.id, activity]),
        )

        return tasks.filter((task) => {
            if (epicFilter === 'all' && sprintFilter === 'all') {
                return true
            }

            const activity = task.activity_id
                ? activityMap.get(task.activity_id)
                : undefined

            if (epicFilter !== 'all' &&
                activity?.epic_id !== epicFilter) {
                return false
            }

            if (sprintFilter !== 'all' &&
                activity?.sprint_id !== sprintFilter) {
                return false
            }

            return true
        })
    }, [tasks, activities, epicFilter, sprintFilter])

    const completed = filtered.filter(
        (task) => task.status === 'done',
    ).length

    const progress = filtered.length
        ? Math.round((completed / filtered.length) * 100)
        : 0

    const save = async (
        table: 'epics' | 'sprints' | 'activities',
        values: Record<string, unknown>,
        successMessage: string,
    ) => {
        setSaving(true)
        setError('')
        setNotice('')

        try {
            const { data: auth, error: authError } =
                await supabase.auth.getUser()

            if (authError || !auth.user) {
                throw new Error('Debes iniciar sesión.')
            }

            if (activePracticeId === null) {
                throw new Error('Selecciona una práctica.')
            }

            const { error: insertError } = await supabase
                .from(table)
                .insert({
                    ...values,
                    user_id: auth.user.id,
                    ...(activePracticeId
                        ? { practice_id: activePracticeId }
                        : {}),
                })

            if (insertError) throw insertError

            setNotice(successMessage)
            await load()
            setShowEpicForm(false)
            setShowSprintForm(false)
            setShowActivityForm(false)
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'No se pudo guardar.',
            )
        } finally {
            setSaving(false)
        }
    }

    const createEpic = async () => {
        if (!epicName.trim()) return

        await save(
            'epics',
            {
                name: epicName.trim(),
                category: epicCategory,
            },
            'Épica creada correctamente.',
        )
        setEpicName('')
    }

    const createSprint = async () => {
        if (!sprintName.trim() || !sprintStart || !sprintEnd) {
            setError('Completa el nombre y las fechas del sprint.')
            return
        }

        if (sprintEnd < sprintStart) {
            setError('La fecha final no puede ser anterior al inicio.')
            return
        }

        await save(
            'sprints',
            {
                name: sprintName.trim(),
                start_date: sprintStart,
                end_date: sprintEnd,
                status: 'open',
            },
            'Sprint creado correctamente.',
        )
        setSprintName('')
        setSprintStart('')
        setSprintEnd('')
    }

    const createActivity = async () => {
        if (!activityName.trim()) return

        await save(
            'activities',
            {
                title: activityName.trim(),
                epic_id: activityEpic || null,
                sprint_id: activitySprint || null,
            },
            'Actividad creada correctamente.',
        )
        setActivityName('')
        setActivityEpic('')
        setActivitySprint('')
    }

    const assignTask = async (
        taskId: string,
        activityId: string,
    ) => {
        setError('')
        setNotice('')
        setSaving(true)

        try {
            const { data: auth } = await supabase.auth.getUser()
            if (!auth.user) throw new Error('Sesión no disponible.')

            let query = supabase
                .from('tasks')
                .update({ activity_id: activityId || null })
                .eq('id', taskId)
                .eq('user_id', auth.user.id)

            if (activePracticeId !== undefined) {
                if (!activePracticeId) {
                    throw new Error('Selecciona una práctica.')
                }
                query = query.eq('practice_id', activePracticeId)
            }

            const { data, error: updateError } = await query
                .select('id')

            if (updateError) throw updateError
            if (!data?.length) {
                throw new Error('No se pudo actualizar la tarea.')
            }

            setNotice('Actividad asignada correctamente.')
            // La relación también se refleja localmente para
            // actualizar los filtros sin recargar toda la página.
            setAssignments((previous) => ({
                ...previous,
                [taskId]: activityId || null,
            }))
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'No se pudo asignar la actividad.',
            )
        } finally {
            setSaving(false)
        }
    }

    const [assignments, setAssignments] =
        useState<Record<string, string | null>>({})

    const effectiveTasks = useMemo(
        () => tasks.map((task) => ({
            ...task,
            activity_id: Object.prototype.hasOwnProperty.call(
                assignments,
                task.id,
            )
                ? assignments[task.id]
                : task.activity_id,
        })),
        [tasks, assignments],
    )

    const visibleTasks = useMemo(() => {
        const activityMap = new Map(
            activities.map((activity) => [activity.id, activity]),
        )

        return effectiveTasks.filter((task) => {
            const activity = task.activity_id
                ? activityMap.get(task.activity_id)
                : undefined

            return (
                (epicFilter === 'all' ||
                    activity?.epic_id === epicFilter) &&
                (sprintFilter === 'all' ||
                    activity?.sprint_id === sprintFilter)
            )
        })
    }, [effectiveTasks, activities, epicFilter, sprintFilter])

    const countSprintTasks = (sprintId: string) => {
        const ids = new Set(
            activities
                .filter((activity) => activity.sprint_id === sprintId)
                .map((activity) => activity.id),
        )

        const related = effectiveTasks.filter(
            (task) => task.activity_id && ids.has(task.activity_id),
        )

        return {
            total: related.length,
            done: related.filter((task) => task.status === 'done').length,
        }
    }

    return (
        <div className="min-w-0 space-y-5">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold">
                        Backlog de tareas
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                        Organiza tareas, épicas y sprints en una sola vista.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onNewTask}
                    className="btn-primary"
                >
                    + Nueva tarea
                </button>
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

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    ['Tareas', visibleTasks.length],
                    ['Por hacer', visibleTasks.filter(t => t.status === 'todo').length],
                    ['En curso', visibleTasks.filter(t => t.status === 'doing').length],
                    ['Completadas', visibleTasks.filter(t => t.status === 'done').length],
                ].map(([label, value]) => (
                    <div key={label} className={`${card} p-3`}>
                        <p className="text-xs text-[var(--text-secondary)]">
                            {label}
                        </p>
                        <p className="mt-1 text-2xl font-semibold">
                            {value}
                        </p>
                    </div>
                ))}
            </div>

            <section className={`${card} space-y-3 p-4`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">Épicas</h3>
                    <button
                        type="button"
                        onClick={() => setShowEpicForm(v => !v)}
                        className="btn-ghost text-sm"
                    >
                        + Agregar épica
                    </button>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setEpicFilter('all')}
                        className={epicFilter === 'all' ? 'btn-primary' : 'btn-ghost border border-[var(--border-soft)]'}
                    >
                        Todas
                    </button>

                    {epics.map(epic => (
                        <button
                            type="button"
                            key={epic.id}
                            onClick={() => setEpicFilter(
                                epicFilter === epic.id ? 'all' : epic.id,
                            )}
                            className={epicFilter === epic.id ? 'btn-primary' : 'btn-ghost border border-[var(--border-soft)]'}
                            title={epic.category}
                        >
                            {epic.name}
                        </button>
                    ))}
                </div>

                {showEpicForm && (
                    <div className="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
                        <input
                            className={field}
                            placeholder="Nombre de la épica"
                            value={epicName}
                            onChange={e => setEpicName(e.target.value)}
                            maxLength={150}
                        />
                        <select
                            className={field}
                            value={epicCategory}
                            onChange={e => setEpicCategory(e.target.value)}
                        >
                            {CATEGORIES.map(category => (
                                <option key={category}>{category}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            disabled={saving || !epicName.trim()}
                            onClick={() => void createEpic()}
                            className="btn-primary"
                        >
                            Guardar
                        </button>
                    </div>
                )}
            </section>

            <section className={`${card} space-y-3 p-4`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={() => setExpandedSprints(v => !v)}
                        className="font-semibold"
                        aria-expanded={expandedSprints}
                    >
                        Sprints {expandedSprints ? '⌄' : '›'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setExpandedSprints(true)
                            setShowSprintForm(v => !v)
                        }}
                        className="btn-ghost text-sm"
                    >
                        + Agregar sprint
                    </button>
                </div>

                {expandedSprints && (
                    <>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setSprintFilter('all')}
                                className={sprintFilter === 'all' ? 'btn-primary' : 'btn-ghost border border-[var(--border-soft)]'}
                            >
                                Todos
                            </button>
                            {sprints.map(sprint => (
                                <button
                                    key={sprint.id}
                                    type="button"
                                    onClick={() => setSprintFilter(
                                        sprintFilter === sprint.id ? 'all' : sprint.id,
                                    )}
                                    className={sprintFilter === sprint.id ? 'btn-primary' : 'btn-ghost border border-[var(--border-soft)]'}
                                >
                                    {sprint.name}
                                </button>
                            ))}
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {sprints.map(sprint => {
                                const stats = countSprintTasks(sprint.id)
                                const percent = stats.total
                                    ? Math.round(stats.done / stats.total * 100)
                                    : 0

                                return (
                                    <button
                                        type="button"
                                        key={sprint.id}
                                        onClick={() => setSprintFilter(sprint.id)}
                                        className="min-w-0 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3 text-left"
                                    >
                                        <div className="flex flex-wrap justify-between gap-2">
                                            <span className="break-words text-sm font-semibold">
                                                {sprint.name}
                                            </span>
                                            <span className="text-xs text-[var(--text-secondary)]">
                                                {sprint.status === 'closed' ? 'Cerrado' : 'Abierto'}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-xs text-[var(--text-secondary)]">
                                            {dateCL(sprint.start_date)} – {dateCL(sprint.end_date)}
                                        </p>
                                        <p className="mt-2 text-xs">
                                            {stats.done} de {stats.total} tareas
                                        </p>
                                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--border-soft)]">
                                            <div
                                                className="h-full rounded-full bg-[var(--color-brand-500)]"
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        {showSprintForm && (
                            <div className="grid gap-2 sm:grid-cols-2">
                                <input
                                    className={field}
                                    placeholder="Nombre del sprint"
                                    value={sprintName}
                                    onChange={e => setSprintName(e.target.value)}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        aria-label="Fecha de inicio"
                                        type="date"
                                        className={field}
                                        value={sprintStart}
                                        onChange={e => setSprintStart(e.target.value)}
                                    />
                                    <input
                                        aria-label="Fecha de término"
                                        type="date"
                                        className={field}
                                        value={sprintEnd}
                                        onChange={e => setSprintEnd(e.target.value)}
                                    />
                                </div>
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => void createSprint()}
                                    className="btn-primary sm:col-span-2"
                                >
                                    Guardar sprint
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            <section className={`${card} space-y-3 p-4`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={() => setExpandedActivities(v => !v)}
                        className="font-semibold"
                        aria-expanded={expandedActivities}
                    >
                        Actividades {expandedActivities ? '⌄' : '›'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setExpandedActivities(true)
                            setShowActivityForm(v => !v)
                        }}
                        className="btn-ghost text-sm"
                    >
                        + Nueva actividad
                    </button>
                </div>

                {expandedActivities && (
                    <>
                        {activities.length === 0 && (
                            <p className="text-sm text-[var(--text-secondary)]">
                                Aún no hay actividades. Crea una para vincular tareas
                                con épicas y sprints.
                            </p>
                        )}

                        <div className="flex flex-wrap gap-2">
                            {activities.map(activity => (
                                <span
                                    key={activity.id}
                                    className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2 text-xs"
                                >
                                    {activity.title}
                                </span>
                            ))}
                        </div>

                        {showActivityForm && (
                            <div className="grid gap-2 sm:grid-cols-3">
                                <input
                                    className={field}
                                    placeholder="Nombre de actividad"
                                    value={activityName}
                                    onChange={e => setActivityName(e.target.value)}
                                />
                                <select
                                    className={field}
                                    value={activityEpic}
                                    onChange={e => setActivityEpic(e.target.value)}
                                >
                                    <option value="">Sin épica</option>
                                    {epics.map(epic => (
                                        <option key={epic.id} value={epic.id}>
                                            {epic.name}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    className={field}
                                    value={activitySprint}
                                    onChange={e => setActivitySprint(e.target.value)}
                                >
                                    <option value="">Sin sprint</option>
                                    {sprints.map(sprint => (
                                        <option key={sprint.id} value={sprint.id}>
                                            {sprint.name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    disabled={saving || !activityName.trim()}
                                    onClick={() => void createActivity()}
                                    className="btn-primary sm:col-span-3"
                                >
                                    Guardar actividad
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-semibold">
                            Backlog general
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)]">
                            {visibleTasks.length} tareas · {progress}% completado
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setEpicFilter('all')
                            setSprintFilter('all')
                        }}
                        className="btn-ghost"
                    >
                        Limpiar filtros
                    </button>
                </div>

                {loading ? (
                    <p className="py-6 text-center text-sm">
                        Cargando backlog…
                    </p>
                ) : visibleTasks.length === 0 ? (
                    <div className={`${card} p-6 text-center text-sm text-[var(--text-secondary)]`}>
                        No hay tareas que coincidan con estos filtros.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {visibleTasks.map(task => (
                            <div key={task.id} className="min-w-0 space-y-2">
                                {renderTask(task as T)}
                                <div className="flex flex-wrap items-center gap-2 px-2">
                                    <label
                                        htmlFor={`activity-${task.id}`}
                                        className="text-xs text-[var(--text-secondary)]"
                                    >
                                        Actividad:
                                    </label>
                                    <select
                                        id={`activity-${task.id}`}
                                        className="input-base min-w-0 max-w-full text-xs"
                                        disabled={saving}
                                        value={task.activity_id ?? ''}
                                        onChange={e => void assignTask(task.id, e.target.value)}
                                    >
                                        <option value="">Sin actividad</option>
                                        {activities.map(activity => (
                                            <option key={activity.id} value={activity.id}>
                                                {activity.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className={`${card} p-4`}>
                <button
                    type="button"
                    className="flex w-full items-center justify-between text-left font-semibold"
                    onClick={() => setExpandedNotes(v => !v)}
                    aria-expanded={expandedNotes}
                >
                    <span>Notas clave y decisiones tomadas</span>
                    <span>{expandedNotes ? '⌄' : '›'}</span>
                </button>
                {expandedNotes && (
                    <p className="mt-3 text-sm text-[var(--text-secondary)]">
                        Esta sección está preparada para una futura integración.
                        Todavía no guarda notas ni decisiones en Supabase.
                    </p>
                )}
            </section>
        </div>
    )
}
