import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fmt } from '../lib/utils'

type Log = {
    id: string
    date: string
    hours_worked: number
    task_description: string
    category: string
    is_in_person: boolean
}

const CATEGORIES = ['Desarrollo', 'Reunión', 'Documentación', 'Investigación', 'Testing', 'Otro']

export default function Logs() {
    const [logs, setLogs] = useState<Log[]>([])
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const [form, setForm] = useState({
        date: fmt(new Date()),
        hours_worked: 1,
        task_description: '',
        category: 'Desarrollo',
        is_in_person: false,
    })

    const load = useCallback(async () => {
        const { data } = await supabase
            .from('work_logs')
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })
        setLogs(data ?? [])
    }, [])
    useEffect(() => { load() }, [load])

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSaving(true)
        const { data: { user } } = await supabase.auth.getUser()
        const { error } = await supabase.from('work_logs').insert({
            user_id: user!.id,
            ...form,
        })
        setSaving(false)
        if (error) return setError(error.message)
        setForm({ ...form, task_description: '', hours_worked: 1 })
        setShowForm(false)
        load()
    }

    const remove = async (id: string) => {
        await supabase.from('work_logs').delete().eq('id', id)
        load()
    }

    // Agrupar por semana
    const grouped = logs.reduce<Record<string, Log[]>>((acc, log) => {
        const d = new Date(log.date + 'T00:00:00')
        const day = d.getDay()
        const diff = (day + 6) % 7
        const monday = new Date(d)
        monday.setDate(d.getDate() - diff)
        const key = fmt(monday)
        acc[key] = acc[key] ?? []
        acc[key].push(log)
        return acc
    }, {})

    const total = logs.reduce((s, l) => s + Number(l.hours_worked), 0)

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Bitácora</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {logs.length} registros · {total.toFixed(1)} h acumuladas
                    </p>
                </div>
                <button
                    onClick={() => setShowForm((v) => !v)}
                    className="btn-primary shrink-0"
                >
                    {showForm ? 'Cancelar' : '+ Registrar horas'}
                </button>
            </div>

            {error && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                    {error}
                </p>
            )}

            {showForm && (
                <form onSubmit={submit} className="card animate-slide-up space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">Fecha</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                                className="input-base"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">Horas trabajadas</label>
                            <input
                                type="number"
                                step="0.25"
                                min="0.25"
                                max="24"
                                value={form.hours_worked}
                                onChange={(e) => setForm({ ...form, hours_worked: Number(e.target.value) })}
                                className="input-base"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Descripción</label>
                        <input
                            value={form.task_description}
                            onChange={(e) => setForm({ ...form, task_description: e.target.value })}
                            className="input-base"
                            placeholder="¿Qué hiciste hoy?"
                            required
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">Categoría</label>
                            <select
                                value={form.category}
                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                className="input-base"
                            >
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">Modalidad</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, is_in_person: true })}
                                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${form.is_in_person
                                        ? 'bg-brand-600 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    Presencial
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, is_in_person: false })}
                                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${!form.is_in_person
                                        ? 'bg-brand-600 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    Remoto
                                </button>
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={saving} className="btn-primary w-full">
                        {saving ? 'Guardando...' : 'Guardar registro'}
                    </button>
                </form>
            )}

            {logs.length === 0 ? (
                <div className="card text-center py-12">
                    <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                    </div>
                    <p className="text-sm text-slate-500 mb-3">Aún no hay registros en tu bitácora.</p>
                    <button onClick={() => setShowForm(true)} className="btn-primary">
                        Registrar mi primera hora
                    </button>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(grouped).map(([weekStart, items]) => {
                        const weekTotal = items.reduce((s, l) => s + Number(l.hours_worked), 0)
                        return (
                            <div key={weekStart}>
                                <div className="flex items-baseline justify-between mb-3">
                                    <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                        Semana del {weekStart}
                                    </h2>
                                    <span className="text-xs text-slate-400">{weekTotal.toFixed(1)} h</span>
                                </div>
                                <ul className="space-y-2">
                                    {items.map((log) => (
                                        <li
                                            key={log.id}
                                            className="card flex items-center gap-4 py-3 hover:border-brand-300 transition-colors group"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex flex-col items-center justify-center shrink-0">
                                                <span className="text-[10px] font-medium leading-none">
                                                    {new Date(log.date + 'T00:00:00').toLocaleDateString('es-CL', { month: 'short' }).replace('.', '')}
                                                </span>
                                                <span className="text-sm font-semibold leading-none mt-0.5">
                                                    {log.date.slice(8, 10)}
                                                </span>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{log.task_description}</p>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="text-[10px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">
                                                        {log.category}
                                                    </span>
                                                    <span className="text-[10px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">
                                                        {log.is_in_person ? 'Presencial' : 'Remoto'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="text-sm font-semibold text-slate-700">
                                                    +{log.hours_worked} h
                                                </span>
                                                <button
                                                    onClick={() => remove(log.id)}
                                                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Eliminar"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" /></svg>
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}