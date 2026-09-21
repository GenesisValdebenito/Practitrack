import { useEffect, useState, useRef } from 'react'
import { parseFile, downloadTemplate } from '../lib/importLogs'
import { exportExcel, exportPdf } from '../lib/exportLogs'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'

type Log = {
    id: string
    date: string
    hours_worked: number
    task_description: string
    category: string
    is_in_person: boolean
}

export default function Data() {
    const { profile } = useProfile()
    const [logs, setLogs] = useState<Log[]>([])
    const [preview, setPreview] = useState<any[] | null>(null)
    const [fileName, setFileName] = useState('')
    const [error, setError] = useState('')
    const [importing, setImporting] = useState(false)
    const [success, setSuccess] = useState('')
    const fileInput = useRef<HTMLInputElement>(null)

    // Cargar logs para exportación
    useEffect(() => {
        supabase
            .from('work_logs')
            .select('*')
            .order('date', { ascending: false })
            .then(({ data }) => setLogs(data ?? []))
    }, [])

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
            // Recargar logs
            const { data } = await supabase.from('work_logs').select('*').order('date', { ascending: false })
            setLogs(data ?? [])
        } catch (e: any) {
            setError(e.message ?? 'Error al importar.')
        } finally {
            setImporting(false)
        }
    }

    const handleExportExcel = () => {
        if (!profile) return
        exportExcel(profile, logs)
    }

    const handleExportPdf = () => {
        if (!profile) return
        exportPdf(profile, logs)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-primary">Datos</h1>
                <p className="text-sm text-secondary mt-1">
                    Importa desde CSV/Excel o exporta tu bitácora.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
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
                    <h2 className="font-semibold text-sm mb-1 text-primary">Exportar informe</h2>
                    <p className="text-xs text-muted mb-4">
                        Descarga tu bitácora para entregarla a tu supervisor o institución.
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={handleExportExcel}
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
                            onClick={handleExportPdf}
                            disabled={!profile || logs.length === 0}
                            className="w-full flex items-center gap-3 p-4 border-2 border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-900/20 rounded-xl hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="w-10 h-10 rounded-lg bg-brand-600 text-[var(--color-brand-contrast)] flex items-center justify-center shrink-0">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-brand-700 dark:text-brand-300">PDF</p>
                                <p className="text-xs text-brand-600/70 dark:text-brand-400/70">Formato listo para imprimir</p>
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

            {/* Plantilla */}
            <div className="rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50/40 dark:bg-brand-900/20 p-5">
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