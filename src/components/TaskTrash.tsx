
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
    getTrashedTasks,
    restoreTask,
} from '../lib/taskOperations'

type TrashedTask = {
    id: string
    title: string
    deleted_at: string | null
    purge_at: string | null
    practice_id: string | null
}

type TaskTrashProps = {
    activePracticeId?: string | null
    onRestore?: () => void | Promise<void>
}

function formatDate(value: string | null) {
    if (!value) return 'Sin fecha'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return 'Fecha inválida'
    }

    return date.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })
}

function remainingDays(value: string | null) {
    if (!value) return null

    const deadline = new Date(value).getTime()

    if (!Number.isFinite(deadline)) return null

    return Math.max(
        0,
        Math.ceil((deadline - Date.now()) / 86400000)
    )
}

export default function TaskTrash({
    activePracticeId,
    onRestore,
}: TaskTrashProps) {
    const [tasks, setTasks] = useState<TrashedTask[]>([])
    const [loading, setLoading] = useState(true)
    const [restoringId, setRestoringId] =
        useState<string | null>(null)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        setError('')

        try {
            if (activePracticeId === null) {
                setTasks([])
                return
            }

            if (activePracticeId) {
                const { data, error: queryError } =
                    await getTrashedTasks(activePracticeId)

                if (queryError) throw queryError

                setTasks((data ?? []) as TrashedTask[])
                return
            }

            // Compatibilidad si App.tsx todavía no entrega
            // el identificador de la práctica activa.
            const { data: auth, error: authError } =
                await supabase.auth.getUser()

            if (authError || !auth.user) {
                throw new Error('Debes iniciar sesión.')
            }

            const { data, error: queryError } =
                await supabase
                    .from('tasks')
                    .select(
                        'id, title, deleted_at, purge_at, practice_id'
                    )
                    .eq('user_id', auth.user.id)
                    .not('deleted_at', 'is', null)
                    .order('deleted_at', {
                        ascending: false,
                    })

            if (queryError) throw queryError

            setTasks((data ?? []) as TrashedTask[])
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'No se pudo cargar la papelera.'
            )
        } finally {
            setLoading(false)
        }
    }, [activePracticeId])

    useEffect(() => {
        void load()
    }, [load])

    const handleRestore = async (task: TrashedTask) => {
        if (restoringId) return

        setRestoringId(task.id)
        setError('')
        setNotice('')

        try {
            const result = await restoreTask(task.id)

            if (!result.success) {
                setError(result.message)
                return
            }

            await load()
            await onRestore?.()

            setNotice(
                `Restauración solicitada para "${task.title}".`
            )
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'No se pudo restaurar la tarea.'
            )
        } finally {
            setRestoringId(null)
        }
    }

    return (
        <section className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold">
                        Papelera de tareas
                    </h2>

                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        Las tareas eliminadas permanecen aquí
                        durante 60 días antes de su eliminación
                        programada.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => void load()}
                    disabled={loading || restoringId !== null}
                    className="btn-ghost border border-[var(--border-soft)]"
                >
                    Actualizar
                </button>
            </div>

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

            {loading ? (
                <p className="py-6 text-sm text-[var(--text-secondary)]">
                    Cargando tareas eliminadas…
                </p>
            ) : tasks.length === 0 ? (
                <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-8 text-center">
                    <p className="font-medium">
                        La papelera está vacía
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        No hay tareas eliminadas para mostrar.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-sm text-[var(--text-secondary)]">
                        {tasks.length}{' '}
                        {tasks.length === 1
                            ? 'tarea en papelera'
                            : 'tareas en papelera'}
                    </p>

                    {tasks.map((task) => {
                        const days = remainingDays(task.purge_at)

                        return (
                            <article
                                key={task.id}
                                className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4"
                            >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="break-words text-sm font-semibold">
                                            {task.title}
                                        </h3>

                                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
                                            <span>
                                                Eliminada:{' '}
                                                {formatDate(task.deleted_at)}
                                            </span>

                                            <span>
                                                Vence:{' '}
                                                {formatDate(task.purge_at)}
                                            </span>

                                            {days !== null && (
                                                <span>
                                                    {days === 0
                                                        ? 'Plazo vencido'
                                                        : `${days} días restantes`}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        disabled={
                                            restoringId !== null ||
                                            (days !== null && days === 0)
                                        }
                                        onClick={() =>
                                            void handleRestore(task)
                                        }
                                        className="btn-primary shrink-0 disabled:opacity-50"
                                    >
                                        {restoringId === task.id
                                            ? 'Restaurando…'
                                            : 'Restaurar'}
                                    </button>
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}
        </section>
    )
}
