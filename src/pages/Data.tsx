import { useEffect, useState, useRef, useMemo } from 'react'
import { parseFile, downloadTemplate } from '../lib/importLogs'
import { exportExcel, exportPdf } from '../lib/exportLogs'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { LOGS_CHANGED_EVENT } from '../components/QuickLogWidget'

type Log = {
    id: string
    date: string
    hours_worked: number
    task_description: string
    category: string
    is_in_person: boolean
}

const CATEGORIES = ['Todas', 'Desarrollo', 'Reunión', 'Documentación', 'Investigación', 'Testing', 'Otro']

export default function Data() {
    const { profile } = useProfile()
    const [logs, setLogs] = useState<Log[]>([])
    const [loadingLogs, setLoadingLogs] = useState(true)
    const [preview, setPreview] = useState<any[] | null>(null)
    const [fileName, setFileName] = useState('')
    const [error, setError] = useState('')
    const [importing, setImporting] = useState(false)
    const [success, setSuccess] = useState('')
    const fileInput = useRef<HTMLInputElement>(null)

    // Filtros de búsqueda para datos actuales
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('Todas')
    const [selectedModality, setSelectedModality] = useState<'all' | 'in_person' | 'remote'>('all')
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
    const [showOnlyLatest5, setShowOnlyLatest5] = useState(true)

    // Modal de edición de registro
    const [editingLog, setEditingLog] = useState<Log | null>(null)
    const [savingEdit, setSavingEdit] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const fetchLogs = async () => {
        setLoadingLogs(true)
        const { data, error: err } = await supabase
            .from('work_logs')
            .select('*')
            .order('date', { ascending: false })
        if (!err && data) {
            setLogs(data)
        }
        setLoadingLogs(false)
    }

    useEffect(() => {
        fetchLogs()
    }, [])

    // Importación de archivos
    const handleFile = async (file: File) => {
        setError('')
        setSuccess('')
        setFileName(file.name)
        try {
            const rows = await parseFile(file)
            setPreview(rows.slice(0, 10))
        } catch (e: any) {
            setError(e.message ?? 'No se pudo leer el archivo.')
            setPreview(null)
        }
    }

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
    }

    const confirmImport = async () => {
        if (!preview) return
        setImporting(true)
        setError('')
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const rows = preview.map((r: any) => ({
                user_id: user!.id,
                date: r.date,
                hours_worked: r.hours_worked,
                task_description: r.task_description,
                category: r.category ?? 'Otro',
                is_in_person: r.is_in_person ?? false,
            }))
            const { error } = await supabase.from('work_logs').insert(rows)
            if (error) throw error
            setSuccess(`${rows.length} registros importados correctamente.`)
            setPreview(null)
            setFileName('')
            await fetchLogs()
            window.dispatchEvent(new Event(LOGS_CHANGED_EVENT))
        } catch (e: any) {
            setError(e.message ?? 'Error al importar.')
        } finally {
            setImporting(false)
        }
    }

    // Guardar edición
    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingLog) return
        setSavingEdit(true)
        try {
            const { error: err } = await supabase
                .from('work_logs')
                .update({
                    date: editingLog.date,
                    hours_worked: Number(editingLog.hours_worked),
                    task_description: editingLog.task_description,
                    category: editingLog.category,
                    is_in_person: editingLog.is_in_person,
                })
                .eq('id', editingLog.id)

            if (err) throw err
            setLogs((prev) => prev.map((l) => (l.id === editingLog.id ? editingLog : l)))
            setEditingLog(null)
            window.dispatchEvent(new Event(LOGS_CHANGED_EVENT))
        } catch (err: any) {
            alert('Error al guardar: ' + (err.message || 'Inténtalo de nuevo'))
        } finally {
            setSavingEdit(false)
        }
    }

    // Eliminar registro
    const handleDeleteLog = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este registro?')) return
        setDeletingId(id)
        try {
            const { error: err } = await supabase.from('work_logs').delete().eq('id', id)
            if (err) throw err
            setLogs((prev) => prev.filter((l) => l.id !== id))
            window.dispatchEvent(new Event(LOGS_CHANGED_EVENT))
        } catch (err: any) {
            alert('Error al eliminar: ' + (err.message || 'Inténtalo de nuevo'))
        } finally {
            setDeletingId(null)
        }
    }

    // Métricas calculadas
    const metrics = useMemo(() => {
        const totalHours = logs.reduce((sum, l) => sum + Number(l.hours_worked || 0), 0)
        const inPersonHours = logs.filter((l) => l.is_in_person).reduce((sum, l) => sum + Number(l.hours_worked || 0), 0)
        const remoteHours = totalHours - inPersonHours
        const requiredHours = profile?.required_hours || 360
        const percentage = requiredHours > 0 ? Math.min((totalHours / requiredHours) * 100, 100) : 0
        const remainingHours = Math.max(0, requiredHours - totalHours)

        // Agrupación por categoría
        const byCategory = logs.reduce((acc, l) => {
            const cat = l.category || 'Otro'
            acc[cat] = (acc[cat] || 0) + Number(l.hours_worked || 0)
            return acc
        }, {} as Record<string, number>)

        // Días únicos trabajados
        const uniqueDays = new Set(logs.map((l) => l.date)).size
        const avgPerDay = uniqueDays > 0 ? (totalHours / uniqueDays).toFixed(1) : '0'

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

    // Filtrado de logs para la tabla
    const filteredLogs = useMemo(() => {
        const result = logs
            .filter((log) => {
                if (selectedCategory !== 'Todas' && log.category !== selectedCategory) return false
                if (selectedModality === 'in_person' && !log.is_in_person) return false
                if (selectedModality === 'remote' && log.is_in_person) return false
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase()
                    const matchDesc = log.task_description?.toLowerCase().includes(q)
                    const matchDate = log.date?.includes(q)
                    const matchCat = log.category?.toLowerCase().includes(q)
                    if (!matchDesc && !matchDate && !matchCat) return false
                }
                return true
            })
            .sort((a, b) => {
                if (sortOrder === 'asc') return a.date.localeCompare(b.date)
                return b.date.localeCompare(a.date)
            })

        return result
    }, [logs, selectedCategory, selectedModality, searchQuery, sortOrder])

    const displayedLogs = useMemo(() => {
        if (showOnlyLatest5) {
            return filteredLogs.slice(0, 5)
        }
        return filteredLogs
    }, [filteredLogs, showOnlyLatest5])

    const handlePrintSummary = () => {
        window.print()
    }

    return (
        <div className="space-y-6">
            {/* Header / Titulo y Acción de impresión rápida */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-primary">Datos y Gestión de Bitácora</h1>
                    <p className="text-sm text-secondary mt-1">
                        Consulta y ajusta tus datos actuales, imprime informes y gestiona importaciones/exportaciones.
                    </p>
                </div>
                <div className="flex items-center gap-2 no-print">
                    <button
                        onClick={handlePrintSummary}
                        disabled={logs.length === 0}
                        className="btn-primary flex items-center gap-2 text-xs py-2 px-3 shadow-sm hover:shadow transition"
                        title="Imprimir resumen métrico y registros"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 6 2 18 2 18 9" />
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                            <rect x="6" y="14" width="12" height="8" />
                        </svg>
                        <span>Imprimir resumen</span>
                    </button>
                </div>
            </div>

            {/* Encabezado visible únicamente al imprimir el informe */}
            <div className="hidden print-only mb-6 border-b border-gray-300 pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Informe de Práctica Profesional</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            {profile?.full_name || 'Estudiante'} · {profile?.career || 'Carrera'} ({profile?.institution || 'Institución'})
                        </p>
                        {profile?.company && (
                            <p className="text-xs text-gray-500">Empresa: {profile.company} {profile.supervisor ? `· Supervisor: ${profile.supervisor}` : ''}</p>
                        )}
                    </div>
                    <div className="text-right text-xs text-gray-500">
                        <p>Fecha de emisión:</p>
                        <p className="font-semibold text-gray-800">{new Date().toLocaleDateString('es-CL')}</p>
                    </div>
                </div>
            </div>

            {/* Resumen Métrico */}
            <div className="card space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-soft)] pb-3">
                    <div>
                        <h2 className="text-base font-semibold text-primary">Resumen Métrico General</h2>
                        <p className="text-xs text-muted">
                            Total acumulado y estado de avance de tu práctica.
                        </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 w-fit">
                        {metrics.percentage}% completado
                    </span>
                </div>

                {/* Tarjetas de indicadores */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-soft)]">
                        <span className="text-xs text-muted font-medium">Horas Registradas</span>
                        <p className="text-xl font-bold text-primary mt-0.5">
                            {metrics.totalHours} <span className="text-xs font-normal text-muted">/ {metrics.requiredHours}h</span>
                        </p>
                        <p className="text-[11px] text-muted mt-1">{metrics.remainingHours}h restantes</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-soft)]">
                        <span className="text-xs text-muted font-medium">Modalidad</span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-sm font-semibold text-primary">{metrics.inPersonHours}h</span>
                            <span className="text-[11px] text-muted">🏢 Presencial</span>
                        </div>
                        <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-sm font-semibold text-primary">{metrics.remoteHours}h</span>
                            <span className="text-[11px] text-muted">🏠 Remoto</span>
                        </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-soft)]">
                        <span className="text-xs text-muted font-medium">Actividades</span>
                        <p className="text-xl font-bold text-primary mt-0.5">{metrics.totalEntries}</p>
                        <p className="text-[11px] text-muted mt-1">en {metrics.uniqueDays} días registrados</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-soft)]">
                        <span className="text-xs text-muted font-medium">Promedio Diario</span>
                        <p className="text-xl font-bold text-primary mt-0.5">{metrics.avgPerDay} <span className="text-xs font-normal text-muted">h/día</span></p>
                        <p className="text-[11px] text-muted mt-1">Días con actividad</p>
                    </div>
                </div>

                {/* Barra de progreso */}
                <div>
                    <div className="flex justify-between text-xs text-muted mb-1.5 font-medium">
                        <span>Progreso hacia las {metrics.requiredHours} horas requeridas</span>
                        <span className="text-brand-600 dark:text-brand-400 font-semibold">{metrics.percentage}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                        <div
                            className="h-2.5 rounded-full transition-all duration-500"
                            style={{
                                width: `${Math.min(100, Number(metrics.percentage))}%`,
                                background: 'linear-gradient(90deg, var(--color-brand-600), var(--color-brand-400))',
                            }}
                        />
                    </div>
                </div>

                {/* Desglose por categorías */}
                {Object.keys(metrics.byCategory).length > 0 && (
                    <div className="pt-2 border-t border-[var(--border-soft)]">
                        <h3 className="text-xs font-semibold text-secondary mb-2 uppercase tracking-wide">
                            Horas por categoría
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(metrics.byCategory).map(([cat, hours]) => {
                                const pct = metrics.totalHours > 0 ? ((hours / metrics.totalHours) * 100).toFixed(0) : '0'
                                return (
                                    <div
                                        key={cat}
                                        className="text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-soft)] flex items-center gap-2"
                                    >
                                        <span className="font-medium text-primary">{cat}:</span>
                                        <span className="text-brand-600 dark:text-brand-400 font-semibold">{hours}h</span>
                                        <span className="text-[10px] text-muted">({pct}%)</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Explorador de Datos Actuales (Modificar / Eliminar / Buscar) */}
            <div className="card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-soft)] pb-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-semibold text-primary">
                                {showOnlyLatest5 ? 'Últimas 5 Actividades' : 'Registros Actuales'}
                            </h2>
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300">
                                Mostrando {displayedLogs.length} de {filteredLogs.length}
                            </span>
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                            {showOnlyLatest5
                                ? 'Visualizando las 5 actividades más recientes de tu bitácora.'
                                : `${filteredLogs.length} actividades encontradas con los filtros aplicados.`}
                        </p>
                    </div>

                    {/* Filtros no-print */}
                    <div className="flex flex-wrap items-center gap-2 no-print">
                        <button
                            type="button"
                            onClick={() => setShowOnlyLatest5(!showOnlyLatest5)}
                            className={`text-xs py-1.5 px-3 rounded-lg font-medium transition border ${
                                showOnlyLatest5
                                    ? 'bg-brand-600 text-white border-brand-600 hover:bg-brand-700'
                                    : 'bg-[var(--bg-subtle)] text-primary border-[var(--border-soft)] hover:bg-[var(--bg-hover)]'
                            }`}
                        >
                            {showOnlyLatest5 ? 'Ver todos los registros' : 'Mostrar solo últimas 5'}
                        </button>

                        <input
                            type="text"
                            placeholder="Buscar actividad..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-base text-xs py-1.5 px-2.5 w-36 sm:w-44"
                        />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="input-base text-xs py-1.5 px-2"
                        >
                            {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <select
                            value={selectedModality}
                            onChange={(e) => setSelectedModality(e.target.value as any)}
                            className="input-base text-xs py-1.5 px-2"
                        >
                            <option value="all">Todas las mod.</option>
                            <option value="in_person">Presencial</option>
                            <option value="remote">Remoto</option>
                        </select>
                        <button
                            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                            className="btn-ghost border border-[var(--border-soft)] text-xs py-1.5 px-2.5 text-secondary"
                            title="Cambiar orden de fecha"
                        >
                            {sortOrder === 'desc' ? 'Recientes ↓' : 'Antiguos ↑'}
                        </button>
                    </div>
                </div>

                {/* Tabla de registros */}
                {loadingLogs ? (
                    <div className="py-8 text-center text-xs text-muted">Cargando registros...</div>
                ) : displayedLogs.length === 0 ? (
                    <div className="py-8 text-center">
                        <p className="text-sm text-muted">No se encontraron registros con los filtros aplicados.</p>
                        {logs.length === 0 && (
                            <p className="text-xs text-muted mt-1">Usa el botón flotante (+) o importa un archivo abajo para comenzar.</p>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto border border-[var(--border-soft)] rounded-lg">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-[var(--bg-subtle)] text-secondary border-b border-[var(--border-soft)]">
                                <tr>
                                    <th className="py-2.5 px-3 font-medium">Fecha</th>
                                    <th className="py-2.5 px-3 font-medium">Descripción</th>
                                    <th className="py-2.5 px-3 font-medium">Categoría</th>
                                    <th className="py-2.5 px-3 font-medium">Modalidad</th>
                                    <th className="py-2.5 px-3 font-medium text-right">Horas</th>
                                    <th className="py-2.5 px-3 font-medium text-right no-print">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-soft)]">
                                {displayedLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                                        <td className="py-2.5 px-3 whitespace-nowrap font-medium text-primary">
                                            {log.date}
                                        </td>
                                        <td className="py-2.5 px-3 text-primary max-w-xs break-words">
                                            {log.task_description}
                                        </td>
                                        <td className="py-2.5 px-3 whitespace-nowrap">
                                            <span className="px-2 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-soft)] text-[11px] text-secondary">
                                                {log.category || 'Otro'}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 whitespace-nowrap text-secondary">
                                            {log.is_in_person ? (
                                                <span className="inline-flex items-center gap-1">🏢 Presencial</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1">🏠 Remoto</span>
                                            )}
                                        </td>
                                        <td className="py-2.5 px-3 whitespace-nowrap text-right font-semibold text-primary">
                                            {log.hours_worked} h
                                        </td>
                                        <td className="py-2.5 px-3 whitespace-nowrap text-right no-print">
                                            <div className="inline-flex items-center gap-1">
                                                <button
                                                    onClick={() => setEditingLog(log)}
                                                    className="p-1 rounded hover:bg-[var(--bg-subtle)] text-secondary hover:text-primary transition"
                                                    title="Modificar registro"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 20h9" />
                                                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteLog(log.id)}
                                                    disabled={deletingId === log.id}
                                                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 hover:text-red-700 transition disabled:opacity-50"
                                                    title="Eliminar registro"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="3 6 5 6 21 6" />
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de edición */}
            {editingLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in no-print">
                    <div className="card w-full max-w-md p-5 bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-xl shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-2">
                            <h3 className="text-sm font-semibold text-primary">Modificar Registro</h3>
                            <button
                                onClick={() => setEditingLog(null)}
                                className="text-muted hover:text-primary text-base font-bold leading-none px-1"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-secondary mb-1">Descripción</label>
                                <textarea
                                    value={editingLog.task_description}
                                    onChange={(e) => setEditingLog({ ...editingLog, task_description: e.target.value })}
                                    className="input-base w-full h-20 text-xs py-2"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-secondary mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        value={editingLog.date}
                                        onChange={(e) => setEditingLog({ ...editingLog, date: e.target.value })}
                                        className="input-base w-full text-xs"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-secondary mb-1">Horas</label>
                                    <input
                                        type="number"
                                        step="0.25"
                                        min="0.25"
                                        max="24"
                                        value={editingLog.hours_worked}
                                        onChange={(e) => setEditingLog({ ...editingLog, hours_worked: Number(e.target.value) })}
                                        className="input-base w-full text-xs"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-secondary mb-1">Categoría</label>
                                    <select
                                        value={editingLog.category}
                                        onChange={(e) => setEditingLog({ ...editingLog, category: e.target.value })}
                                        className="input-base w-full text-xs"
                                    >
                                        {CATEGORIES.filter((c) => c !== 'Todas').map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-secondary mb-1">Modalidad</label>
                                    <div className="flex gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setEditingLog({ ...editingLog, is_in_person: true })}
                                            className={`flex-1 py-1.5 text-xs rounded font-medium border transition ${editingLog.is_in_person
                                                ? 'bg-brand-600 text-white border-brand-600'
                                                : 'bg-[var(--bg-subtle)] text-secondary border-[var(--border-soft)] hover:bg-[var(--bg-hover)]'
                                            }`}
                                        >
                                            Presencial
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingLog({ ...editingLog, is_in_person: false })}
                                            className={`flex-1 py-1.5 text-xs rounded font-medium border transition ${!editingLog.is_in_person
                                                ? 'bg-brand-600 text-white border-brand-600'
                                                : 'bg-[var(--bg-subtle)] text-secondary border-[var(--border-soft)] hover:bg-[var(--bg-hover)]'
                                            }`}
                                        >
                                            Remoto
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-soft)]">
                                <button
                                    type="button"
                                    onClick={() => setEditingLog(null)}
                                    className="btn-ghost text-xs py-1.5 px-3"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="btn-primary text-xs py-1.5 px-3"
                                >
                                    {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Acciones de Importación y Exportación tradicionales (no-print) */}
            <div className="grid md:grid-cols-2 gap-4 no-print">
                {/* Importar */}
                <div className="card">
                    <h2 className="font-semibold text-sm mb-1 text-primary">Importar registros</h2>
                    <p className="text-xs text-muted mb-4">
                        Acepta archivos .csv y .xlsx con columnas: fecha, horas, descripcion, categoria, presencial.
                    </p>

                    <div
                        onDrop={onDrop}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() => fileInput.current?.click()}
                        className="border-2 border-dashed border-brand-200 dark:border-brand-800 bg-brand-50/30 dark:bg-brand-900/10 rounded-xl p-8 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/60 dark:hover:bg-brand-900/20 transition-colors"
                    >
                        <div className="w-10 h-10 rounded-full bg-brand-600 text-[var(--color-brand-contrast)] flex items-center justify-center mx-auto mb-3">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                        </div>
                        <p className="text-sm font-medium text-primary">
                            {fileName || 'Arrastra tu archivo aquí'}
                        </p>
                        <p className="text-xs text-muted mt-1">o haz clic para seleccionar</p>
                        <input
                            ref={fileInput}
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                        />
                    </div>

                    {error && (
                        <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-lg px-3 py-2 mt-3">
                            {error}
                        </p>
                    )}
                    {success && (
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900 rounded-lg px-3 py-2 mt-3">
                            {success}
                        </p>
                    )}

                    {preview && (
                        <div className="mt-4 animate-fade-in">
                            <p className="text-xs font-medium text-secondary mb-2">
                                Vista previa ({preview.length} filas)
                            </p>
                            <div className="border border-[var(--border-soft)] rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-[var(--bg-subtle)] text-secondary">
                                        <tr>
                                            <th className="text-left px-2 py-1.5 font-medium">Fecha</th>
                                            <th className="text-left px-2 py-1.5 font-medium">Horas</th>
                                            <th className="text-left px-2 py-1.5 font-medium">Descripción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.map((r, i) => (
                                            <tr key={i} className="border-t border-[var(--border-soft)]">
                                                <td className="px-2 py-1.5 text-primary">{r.date}</td>
                                                <td className="px-2 py-1.5 text-primary">{r.hours_worked}</td>
                                                <td className="px-2 py-1.5 truncate max-w-[140px] text-primary">{r.task_description}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <button
                                onClick={confirmImport}
                                disabled={importing}
                                className="btn-primary w-full mt-3"
                            >
                                {importing ? 'Importando...' : 'Confirmar importación'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Exportar */}
                <div className="card">
                    <h2 className="font-semibold text-sm mb-1 text-primary">Exportar archivos</h2>
                    <p className="text-xs text-muted mb-4">
                        Descarga tu bitácora en formato de archivo para respaldo o entrega.
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={() => profile && exportExcel(profile, logs)}
                            disabled={!profile || logs.length === 0}
                            className="w-full flex items-center gap-3 p-4 border border-[var(--border-soft)] rounded-xl hover:border-emerald-400 hover:bg-emerald-50/10 dark:hover:bg-emerald-900/10 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-primary">Excel (.xlsx)</p>
                                <p className="text-xs text-muted">Ideal para análisis y cálculos</p>
                            </div>
                        </button>

                        <button
                            onClick={() => profile && exportPdf(profile, logs)}
                            disabled={!profile || logs.length === 0}
                            className="w-full flex items-center gap-3 p-4 border-2 border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-900/20 rounded-xl hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="w-10 h-10 rounded-lg bg-brand-600 text-[var(--color-brand-contrast)] flex items-center justify-center shrink-0">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-brand-700 dark:text-brand-300">Documento PDF</p>
                                <p className="text-xs text-brand-600/70 dark:text-brand-400/70">Archivo PDF generado directamente</p>
                            </div>
                        </button>
                    </div>

                    {logs.length === 0 && (
                        <p className="text-xs text-muted mt-4 text-center">
                            Registra horas primero para poder exportar.
                        </p>
                    )}
                </div>
            </div>

            {/* Plantilla (no-print) */}
            <div className="rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50/40 dark:bg-brand-900/20 p-5 no-print">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="font-semibold text-sm text-brand-700 dark:text-brand-300">Plantilla de importación</h2>
                        <p className="text-xs text-brand-600/70 dark:text-brand-400/70 mt-0.5">
                            Descarga el formato correcto para evitar errores al importar.
                        </p>
                    </div>
                    <button
                        onClick={downloadTemplate}
                        className="btn-ghost border border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300 shrink-0 hover:bg-brand-100 dark:hover:bg-brand-900/40"
                    >
                        Descargar plantilla
                    </button>
                </div>
            </div>
        </div>
    )
}