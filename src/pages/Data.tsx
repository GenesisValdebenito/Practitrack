
import { useEffect, useMemo, useState } from 'react'
import { exportExcel, exportPdf } from '../lib/exportLogs'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { LOGS_CHANGED_EVENT } from '../components/QuickLogWidget'
import TaskTrash from '../components/TaskTrash'
import DataImporter from '../components/DataImporter'

type DataProps = {
    activePracticeId: string | null
}

type Log = {
    id: string
    date: string
    hours_worked: number
    task_description: string
    category: string
    is_in_person: boolean
}

type ModalityFilter = 'all' | 'in_person' | 'remote'

const CATEGORIES = [
    'Todas',
    'Desarrollo',
    'Reunión',
    'Documentación',
    'Investigación',
    'Testing',
    'Otro',
]

export default function Data({ activePracticeId }: DataProps) {
    const { profile } = useProfile()

    const [logs, setLogs] = useState<Log[]>([])
    const [loadingLogs, setLoadingLogs] = useState(true)

    // Filtros
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('Todas')
    const [selectedModality, setSelectedModality] =
        useState<ModalityFilter>('all')
    const [sortOrder, setSortOrder] =
        useState<'desc' | 'asc'>('desc')
    const [showOnlyLatest5, setShowOnlyLatest5] = useState(true)

    // Edición y eliminación
    const [editingLog, setEditingLog] = useState<Log | null>(null)
    const [savingEdit, setSavingEdit] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [showTrash, setShowTrash] = useState(false)
    const [loadError, setLoadError] = useState('')
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        let cancelled = false

        const loadLogs = async () => {
            setLoadingLogs(true)
            setLoadError('')

            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser()

            if (cancelled) return

            if (authError || !user) {
                setLogs([])
                setLoadError('No se pudo verificar tu sesión.')
                setLoadingLogs(false)
                return
            }

            let query = supabase
                .from('work_logs')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: false })

            if (activePracticeId) {
                query = query.eq('practice_id', activePracticeId)
            } else {
                setLogs([])
                setLoadingLogs(false)
                return
            }

            const { data, error } = await query

            if (cancelled) return

            if (error) {
                setLoadError(error.message)
                setLogs([])
            } else {
                setLogs((data ?? []) as Log[])
            }

            setLoadingLogs(false)
        }

        void loadLogs()

        return () => {
            cancelled = true
        }
    }, [activePracticeId, reloadKey])

    // Guardar edición
    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingLog || !activePracticeId) return

        if (
            !editingLog.task_description.trim() ||
            !editingLog.date ||
            !Number.isFinite(Number(editingLog.hours_worked)) ||
            Number(editingLog.hours_worked) <= 0 ||
            Number(editingLog.hours_worked) > 24
        ) {
            alert('Revisa la descripción, fecha y horas (mayores que 0 y hasta 24).')
            return
        }

        setSavingEdit(true)

        try {
            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser()

            if (authError || !user) {
                throw new Error('Sesión no disponible.')
            }

            const { data, error } = await supabase
                .from('work_logs')
                .update({
                    date: editingLog.date,
                    hours_worked: Number(editingLog.hours_worked),
                    task_description: editingLog.task_description.trim(),
                    category: editingLog.category,
                    is_in_person: editingLog.is_in_person,
                })
                .eq('id', editingLog.id)
                .eq('user_id', user.id)
                .eq('practice_id', activePracticeId)
                .select('id')

            if (error) throw error
            if (!data?.length) {
                throw new Error('No se encontró el registro para actualizar.')
            }

            setLogs(prev =>
                prev.map(log =>
                    log.id === editingLog.id
                        ? { ...editingLog }
                        : log
                )
            )

            setEditingLog(null)
            window.dispatchEvent(new Event(LOGS_CHANGED_EVENT))
        } catch (error) {
            alert(
                'Error al guardar: ' +
                (error instanceof Error ? error.message : 'Inténtalo de nuevo.')
            )
        } finally {
            setSavingEdit(false)
        }
    }

    // Eliminar registro
    const handleDeleteLog = async (id: string) => {
        if (!activePracticeId) return

        if (!window.confirm(
            '¿Estás seguro de que deseas eliminar este registro de bitácora?'
        )) {
            return
        }

        setDeletingId(id)

        try {
            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser()

            if (authError || !user) {
                throw new Error('Sesión no disponible.')
            }

            const { data, error } = await supabase
                .from('work_logs')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id)
                .eq('practice_id', activePracticeId)
                .select('id')

            if (error) throw error
            if (!data?.length) {
                throw new Error('No se encontró el registro para eliminar.')
            }

            setLogs(prev => prev.filter(log => log.id !== id))
            window.dispatchEvent(new Event(LOGS_CHANGED_EVENT))
        } catch (error) {
            alert(
                'Error al eliminar: ' +
                (error instanceof Error ? error.message : 'Inténtalo de nuevo.')
            )
        } finally {
            setDeletingId(null)
        }
    }

    // Métricas
    const metrics = useMemo(() => {
        const totalHours = logs.reduce(
            (sum, log) => sum + Number(log.hours_worked || 0),
            0
        )

        const inPersonHours = logs
            .filter(log => log.is_in_person)
            .reduce(
                (sum, log) => sum + Number(log.hours_worked || 0),
                0
            )

        const remoteHours = totalHours - inPersonHours
        const requiredHours = profile?.required_hours || 360

        const percentage = requiredHours > 0
            ? Math.min((totalHours / requiredHours) * 100, 100)
            : 0

        const remainingHours = Math.max(
            0,
            requiredHours - totalHours
        )

        const byCategory = logs.reduce((acc, log) => {
            const category = log.category || 'Otro'
            acc[category] =
                (acc[category] || 0) +
                Number(log.hours_worked || 0)
            return acc
        }, {} as Record<string, number>)

        const uniqueDays = new Set(
            logs.map(log => log.date)
        ).size

        const avgPerDay = uniqueDays > 0
            ? (totalHours / uniqueDays).toFixed(1)
            : '0'

        return {
            totalHours: Math.round(totalHours * 10) / 10,
            inPersonHours: Math.round(inPersonHours * 10) / 10,
            remoteHours: Math.round(remoteHours * 10) / 10,
            requiredHours,
            percentage: percentage.toFixed(1),
            remainingHours: Math.round(remainingHours * 10) / 10,
            totalEntries: logs.length,
            uniqueDays,
            avgPerDay,
            byCategory,
        }
    }, [logs, profile])

    // Filtros de bitácora
    const filteredLogs = useMemo(() => {
        return [...logs]
            .filter(log => {
                if (
                    selectedCategory !== 'Todas' &&
                    log.category !== selectedCategory
                ) {
                    return false
                }

                if (
                    selectedModality === 'in_person' &&
                    !log.is_in_person
                ) {
                    return false
                }

                if (
                    selectedModality === 'remote' &&
                    log.is_in_person
                ) {
                    return false
                }

                const query = searchQuery.trim().toLowerCase()

                if (query) {
                    const matchesDescription =
                        log.task_description?.toLowerCase().includes(query)

                    const matchesDate = log.date?.includes(query)

                    const matchesCategory =
                        log.category?.toLowerCase().includes(query)

                    if (
                        !matchesDescription &&
                        !matchesDate &&
                        !matchesCategory
                    ) {
                        return false
                    }
                }

                return true
            })
            .sort((a, b) =>
                sortOrder === 'asc'
                    ? a.date.localeCompare(b.date)
                    : b.date.localeCompare(a.date)
            )
    }, [
        logs,
        selectedCategory,
        selectedModality,
        searchQuery,
        sortOrder,
    ])

    const displayedLogs = useMemo(
        () => showOnlyLatest5
            ? filteredLogs.slice(0, 5)
            : filteredLogs,
        [filteredLogs, showOnlyLatest5]
    )

    return (
        <div className="space-y-6">

            {/* Encabezado */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-primary">
                        Datos y Gestión de Bitácora
                    </h1>

                    <p className="mt-1 text-sm text-secondary">
                        Consulta tus registros, revisa las horas de práctica
                        e importa o exporta información.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 no-print">
                    <button
                        type="button"
                        onClick={() => setShowTrash(prev => !prev)}
                        className="btn-ghost border border-[var(--border-soft)]"
                    >
                        {showTrash ? 'Ocultar papelera' : 'Papelera'}
                    </button>

                    <button
                        type="button"
                        onClick={() => window.print()}
                        disabled={logs.length === 0}
                        className="btn-primary"
                    >
                        Imprimir resumen
                    </button>
                </div>
            </div>

            {/* Papelera */}
            {showTrash && (
                <TaskTrash activePracticeId={activePracticeId} />
            )}

            {/* Encabezado de impresión */}
            <div className="hidden print-only mb-6 border-b border-gray-300 pb-4">
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Informe de Práctica Profesional
                        </h1>

                        <p className="mt-1 text-sm text-gray-600">
                            {profile?.full_name || 'Estudiante'}
                            {' · '}
                            {profile?.career || 'Carrera'}
                            {' · '}
                            {profile?.institution || 'Institución'}
                        </p>

                        {profile?.company && (
                            <p className="text-xs text-gray-500">
                                Empresa: {profile.company}
                                {profile.supervisor
                                    ? ` · Supervisor: ${profile.supervisor}`
                                    : ''}
                            </p>
                        )}
                    </div>

                    <div className="text-right text-xs text-gray-500">
                        <p>Fecha de emisión:</p>
                        <p className="font-semibold text-gray-800">
                            {new Date().toLocaleDateString('es-CL')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Resumen métrico */}
            <section className="card space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] pb-3">
                    <div>
                        <h2 className="text-base font-semibold text-primary">
                            Resumen Métrico General
                        </h2>
                        <p className="mt-1 text-xs text-muted">
                            Total acumulado y avance de tu práctica.
                        </p>
                    </div>

                    <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                        {metrics.percentage}% completado
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                    <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3.5">
                        <p className="text-xs text-muted">
                            Horas Registradas
                        </p>
                        <p className="mt-1 text-xl font-bold text-primary">
                            {metrics.totalHours}
                            <span className="ml-1 text-xs font-normal text-muted">
                                / {metrics.requiredHours}h
                            </span>
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                            {metrics.remainingHours}h restantes
                        </p>
                    </div>

                    <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3.5">
                        <p className="text-xs text-muted">
                            Modalidad
                        </p>
                        <p className="mt-1 text-sm font-semibold text-primary">
                            🏢 {metrics.inPersonHours}h presencial
                        </p>
                        <p className="mt-1 text-sm font-semibold text-primary">
                            🏠 {metrics.remoteHours}h remoto
                        </p>
                    </div>

                    <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3.5">
                        <p className="text-xs text-muted">
                            Actividades
                        </p>
                        <p className="mt-1 text-xl font-bold text-primary">
                            {metrics.totalEntries}
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                            en {metrics.uniqueDays} días registrados
                        </p>
                    </div>

                    <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3.5">
                        <p className="text-xs text-muted">
                            Promedio Diario
                        </p>
                        <p className="mt-1 text-xl font-bold text-primary">
                            {metrics.avgPerDay}
                            <span className="ml-1 text-xs font-normal text-muted">
                                h/día
                            </span>
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                            Días con actividad
                        </p>
                    </div>
                </div>

                {/* Barra de progreso */}
                <div>
                    <div className="mb-2 flex justify-between gap-2 text-xs text-muted">
                        <span>
                            Progreso hacia las {metrics.requiredHours} horas
                        </span>
                        <span className="font-semibold text-brand-600">
                            {metrics.percentage}%
                        </span>
                    </div>

                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${Math.min(
                                    100,
                                    Number(metrics.percentage)
                                )}%`,
                                background:
                                    'linear-gradient(90deg, var(--color-brand-600), var(--color-brand-400))',
                            }}
                        />
                    </div>
                </div>

                {/* Categorías */}
                {Object.keys(metrics.byCategory).length > 0 && (
                    <div className="border-t border-[var(--border-soft)] pt-3">
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary">
                            Horas por categoría
                        </h3>

                        <div className="flex flex-wrap gap-2">
                            {Object.entries(metrics.byCategory).map(
                                ([category, hours]) => {
                                    const percentage = metrics.totalHours > 0
                                        ? (
                                            (hours / metrics.totalHours) * 100
                                        ).toFixed(0)
                                        : '0'

                                    return (
                                        <div
                                            key={category}
                                            className="flex items-center gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2 text-xs"
                                        >
                                            <span className="font-medium text-primary">
                                                {category}:
                                            </span>
                                            <span className="font-semibold text-brand-600">
                                                {hours}h
                                            </span>
                                            <span className="text-muted">
                                                ({percentage}%)
                                            </span>
                                        </div>
                                    )
                                }
                            )}
                        </div>
                    </div>
                )}
            </section>

            {/* Explorador de bitácora */}
            <section className="card space-y-4">
                <div className="flex flex-col gap-3 border-b border-[var(--border-soft)] pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold text-primary">
                                {showOnlyLatest5
                                    ? 'Últimas 5 Actividades'
                                    : 'Registros Actuales'}
                            </h2>

                            <p className="mt-1 text-xs text-muted">
                                Mostrando {displayedLogs.length} de{' '}
                                {filteredLogs.length} registros
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowOnlyLatest5(prev => !prev)}
                            className="btn-ghost border border-[var(--border-soft)] text-xs"
                        >
                            {showOnlyLatest5
                                ? 'Ver todos los registros'
                                : 'Mostrar últimas 5'}
                        </button>
                    </div>

                    {/* Filtros */}
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 no-print">
                        <input
                            type="search"
                            placeholder="Buscar actividad..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="input-base w-full text-xs"
                        />

                        <select
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                            className="input-base w-full text-xs"
                        >
                            {CATEGORIES.map(category => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>

                        <select
                            value={selectedModality}
                            onChange={e =>
                                setSelectedModality(
                                    e.target.value as ModalityFilter
                                )
                            }
                            className="input-base w-full text-xs"
                        >
                            <option value="all">Todas las modalidades</option>
                            <option value="in_person">Presencial</option>
                            <option value="remote">Remoto</option>
                        </select>

                        <button
                            type="button"
                            onClick={() =>
                                setSortOrder(prev =>
                                    prev === 'desc' ? 'asc' : 'desc'
                                )
                            }
                            className="btn-ghost border border-[var(--border-soft)] text-xs"
                        >
                            {sortOrder === 'desc'
                                ? 'Recientes ↓'
                                : 'Antiguos ↑'}
                        </button>
                    </div>
                </div>

                {loadError && (
                    <p
                        role="alert"
                        className="rounded-lg border border-red-500/30 p-3 text-sm text-red-500"
                    >
                        Error al cargar registros: {loadError}
                    </p>
                )}

                {loadingLogs ? (
                    <p className="py-8 text-center text-sm text-muted">
                        Cargando registros...
                    </p>
                ) : displayedLogs.length === 0 ? (
                    <div className="py-8 text-center">
                        <p className="text-sm text-muted">
                            No se encontraron registros.
                        </p>
                        <p className="mt-1 text-xs text-muted">
                            Puedes registrar horas o revisar tus filtros.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-lg border border-[var(--border-soft)]">
                        <table className="w-full text-left text-xs">
                            <thead className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)] text-secondary">
                                <tr>
                                    <th className="px-3 py-3 font-medium">Fecha</th>
                                    <th className="px-3 py-3 font-medium">Descripción</th>
                                    <th className="px-3 py-3 font-medium">Categoría</th>
                                    <th className="px-3 py-3 font-medium">Modalidad</th>
                                    <th className="px-3 py-3 text-right font-medium">Horas</th>
                                    <th className="px-3 py-3 text-right font-medium no-print">Acciones</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-[var(--border-soft)]">
                                {displayedLogs.map(log => (
                                    <tr
                                        key={log.id}
                                        className="transition-colors hover:bg-[var(--bg-hover)]"
                                    >
                                        <td className="whitespace-nowrap px-3 py-3 font-medium text-primary">
                                            {log.date}
                                        </td>

                                        <td className="max-w-xs break-words px-3 py-3 text-primary">
                                            {log.task_description}
                                        </td>

                                        <td className="px-3 py-3">
                                            <span className="rounded border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2 py-1 text-secondary">
                                                {log.category || 'Otro'}
                                            </span>
                                        </td>

                                        <td className="whitespace-nowrap px-3 py-3 text-secondary">
                                            {log.is_in_person
                                                ? '🏢 Presencial'
                                                : '🏠 Remoto'}
                                        </td>

                                        <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-primary">
                                            {log.hours_worked} h
                                        </td>

                                        <td className="whitespace-nowrap px-3 py-3 text-right no-print">
                                            <div className="inline-flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingLog(log)}
                                                    className="rounded-lg border border-[var(--border-soft)] px-2 py-1 text-secondary hover:bg-[var(--bg-subtle)]"
                                                    title="Modificar registro"
                                                >
                                                    Editar
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        void handleDeleteLog(log.id)
                                                    }
                                                    disabled={deletingId === log.id}
                                                    className="rounded-lg border border-red-500/30 px-2 py-1 text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                                                    title="Eliminar registro"
                                                >
                                                    {deletingId === log.id
                                                        ? 'Eliminando...'
                                                        : 'Eliminar'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Modal de edición */}
            {editingLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print">
                    <div className="w-full max-w-md space-y-4 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-5 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-3">
                            <h2 className="font-semibold text-primary">
                                Modificar registro
                            </h2>

                            <button
                                type="button"
                                onClick={() => setEditingLog(null)}
                                className="btn-ghost"
                                aria-label="Cerrar"
                            >
                                ×
                            </button>
                        </div>

                        <form
                            onSubmit={handleSaveEdit}
                            className="space-y-4"
                        >
                            <div>
                                <label className="mb-1 block text-xs font-medium text-secondary">
                                    Descripción
                                </label>

                                <textarea
                                    required
                                    value={editingLog.task_description}
                                    onChange={e =>
                                        setEditingLog({
                                            ...editingLog,
                                            task_description: e.target.value,
                                        })
                                    }
                                    className="input-base h-24 w-full text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-secondary">
                                        Fecha
                                    </label>

                                    <input
                                        required
                                        type="date"
                                        value={editingLog.date}
                                        onChange={e =>
                                            setEditingLog({
                                                ...editingLog,
                                                date: e.target.value,
                                            })
                                        }
                                        className="input-base w-full text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium text-secondary">
                                        Horas
                                    </label>

                                    <input
                                        required
                                        type="number"
                                        min="0.25"
                                        max="24"
                                        step="0.25"
                                        value={editingLog.hours_worked}
                                        onChange={e =>
                                            setEditingLog({
                                                ...editingLog,
                                                hours_worked: Number(e.target.value),
                                            })
                                        }
                                        className="input-base w-full text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-secondary">
                                        Categoría
                                    </label>

                                    <select
                                        value={editingLog.category}
                                        onChange={e =>
                                            setEditingLog({
                                                ...editingLog,
                                                category: e.target.value,
                                            })
                                        }
                                        className="input-base w-full text-sm"
                                    >
                                        {[
                                            ...new Set([
                                                ...CATEGORIES.filter(
                                                    category => category !== 'Todas'
                                                ),
                                                editingLog.category,
                                            ]),
                                        ].map(category => (
                                            <option
                                                key={category}
                                                value={category}
                                            >
                                                {category}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium text-secondary">
                                        Modalidad
                                    </label>

                                    <select
                                        value={
                                            editingLog.is_in_person
                                                ? 'presencial'
                                                : 'remoto'
                                        }
                                        onChange={e =>
                                            setEditingLog({
                                                ...editingLog,
                                                is_in_person:
                                                    e.target.value === 'presencial',
                                            })
                                        }
                                        className="input-base w-full text-sm"
                                    >
                                        <option value="presencial">
                                            Presencial
                                        </option>
                                        <option value="remoto">
                                            Remoto
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 border-t border-[var(--border-soft)] pt-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingLog(null)}
                                    className="btn-ghost"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="btn-primary"
                                >
                                    {savingEdit
                                        ? 'Guardando...'
                                        : 'Guardar cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Nuevo importador multisección */}
            <div className="no-print">
                <DataImporter
                    activePracticeId={activePracticeId}
                    onImported={() => setReloadKey(key => key + 1)}
                />
            </div>

            {/* Exportaciones existentes */}
            <section className="card space-y-4 no-print">
                <div>
                    <h2 className="text-base font-semibold text-primary">
                        Exportar archivos
                    </h2>

                    <p className="mt-1 text-sm text-secondary">
                        Descarga tu bitácora para respaldo o entrega.
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() =>
                            profile && exportExcel(profile, logs)
                        }
                        disabled={!profile || logs.length === 0}
                        className="flex items-center gap-3 rounded-xl border border-[var(--border-soft)] p-4 text-left transition-colors hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                            XLS
                        </span>

                        <span>
                            <span className="block text-sm font-semibold text-primary">
                                Excel (.xlsx)
                            </span>
                            <span className="mt-1 block text-xs text-muted">
                                Ideal para análisis y cálculos
                            </span>
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            profile && exportPdf(profile, logs)
                        }
                        disabled={!profile || logs.length === 0}
                        className="flex items-center gap-3 rounded-xl border border-[var(--border-soft)] p-4 text-left transition-colors hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
                            PDF
                        </span>

                        <span>
                            <span className="block text-sm font-semibold text-primary">
                                Documento PDF
                            </span>
                            <span className="mt-1 block text-xs text-muted">
                                Informe listo para entregar
                            </span>
                        </span>
                    </button>
                </div>

                {logs.length === 0 && (
                    <p className="text-center text-xs text-muted">
                        Registra horas primero para habilitar las exportaciones.
                    </p>
                )}
            </section>
        </div>
    )
}
