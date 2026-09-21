import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fmt } from '../lib/utils'

type Task = {
    id: string
    title: string
    status: 'todo' | 'doing' | 'done'
    due_date: string | null
    planned_hours: number | null
    category: string | null
    is_in_person: boolean
    log_id: string | null
}

const COLS: { key: Task['status']; label: string; color: string }[] = [
    { key: 'todo', label: 'Por hacer', color: 'bg-slate-400' },
    { key: 'doing', label: 'En curso', color: 'bg-amber-400' },
    { key: 'done', label: 'Hecho', color: 'bg-emerald-500' },
]

export default function Tasks() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [title, setTitle] = useState('')
    const [due, setDue] = useState('')
    const [hours, setHours] = useState('')
    const [error, setError] = useState('')
    const [showForm, setShowForm] = useState(false)

    const load = useCallback(async () => {
        const { data } = await supabase
            .from('tasks')
            .select('*')
            .order('due_date', { nullsFirst: false })
            .order('created_at')
        setTasks(data ?? [])
    }, [])
    useEffect(() => { load() }, [load])

    const add = async (e: React.FormEvent) => {
        e.preventDefault()
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('tasks').insert({
            user_id: user!.id,
            title,
            due_date: due || null,
            planned_hours: hours ? parseFloat(hours) : null,
        })
        setTitle(''); setDue(''); setHours(''); setShowForm(false); load()
    }

    const move = async (t: Task, status: Task['status']) => {
        setError('')
        let logId = t.log_id

        if (status === 'done' && !logId && t.planned_hours) {
            const { data: { user } } = await supabase.auth.getUser()
            const { data, error } = await supabase
                .from('work_logs')
                .insert({
                    user_id: user!.id,
                    date: fmt(new Date()),
                    hours_worked: t.planned_hours,
                    task_description: t.title,
                    category: t.category ?? 'Otro',
                    is_in_person: t.is_in_person,
                })
                .select('id')
                .single()
            if (error) return setError(error.message)
            logId = data.id
        }

        if (status !== 'done' && logId) {
            await supabase.from('work_logs').delete().eq('id', logId)
            logId = null
        }

        await supabase.from('tasks').update({ status, log_id: logId }).eq('id', t.id)
        load()
    }

    const remove = async (t: Task) => {
        if (t.log_id) await supabase.from('work_logs').delete().eq('id', t.log_id)
        await supabase.from('tasks').delete().eq('id', t.id)
        load()
    }

    const plannedTotal = tasks.reduce((s, t) => s + Number(t.planned_hours ?? 0), 0)
    const doneTotal = tasks.filter((t) => t.status === 'done').reduce((s, t) => s + Number(t.planned_hours ?? 0), 0)
    const donePercent = plannedTotal > 0 ? (doneTotal / plannedTotal) * 100 : 0

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Tareas</h1>
                    <p className="text-sm text-secondary mt-1">
                        {doneTotal.toFixed(1)} h cumplidas de {plannedTotal.toFixed(1)} h planificadas.
                    </p>
                </div>
                <button onClick={() => setShowForm((v) => !v)} className="btn-primary shrink-0">
                    {showForm ? 'Cancelar' : '+ Nueva tarea'}
                </button>
            </div>

            {/* Barra de progreso */}
            <div className="card">
                <div className="flex justify-between text-xs text-secondary mb-2">
                    <span>Progreso de tareas</span>
                    <span>{donePercent.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-[var(--bg-subtle)] rounded-full h-2 overflow-hidden">
                    <div
                        className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all"
                        style={{ width: `${donePercent}%` }}
                    />
                </div>
            </div>

            {error && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                    {error}
                </p>
            )}

            {showForm && (
                <form onSubmit={add} className="card animate-slide-up space-y-3">
                    <input
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="¿Qué vas a hacer?"
                        className="input-base"
                    />
                    <div className="flex flex-col md:flex-row gap-3">
                        <input
                            type="number"
                            step="0.25"
                            min="0.25"
                            max="24"
                            value={hours}
                            onChange={(e) => setHours(e.target.value)}
                            placeholder="Horas planificadas"
                            className="input-base flex-1"
                        />
                        <input
                            type="date"
                            value={due}
                            onChange={(e) => setDue(e.target.value)}
                            className="input-base"
                        />
                    </div>
                    <button className="btn-primary w-full">Agregar tarea</button>
                </form>
            )}

            <div className="grid md:grid-cols-3 gap-4">
                {COLS.map((col, ci) => {
                    const items = tasks.filter((t) => t.status === col.key)
                    return (
                        <div
                            key={col.key}
                            className="bg-[var(--bg-subtle)] border border-[var(--border-soft)] rounded-xl p-3"
                        >
                            <div className="flex items-center gap-2 mb-3 px-1">
                                <span className={`w-2 h-2 rounded-full ${col.color}`} />
                                <p className="font-medium text-sm text-primary">{col.label}</p>
                                <span className="text-xs text-muted ml-auto">{items.length}</span>
                            </div>
                            <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                                {items.length === 0 && (
                                    <p className="text-xs text-muted text-center py-4">Sin tareas</p>
                                )}
                                {items.map((t) => (
                                    <div
                                        key={t.id}
                                        className="bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-lg p-3 group hover:border-brand-400 transition-colors"
                                    >
                                        <p className={`text-sm font-medium leading-snug ${t.status === 'done' ? 'line-through text-muted' : 'text-primary'
                                            }`}>
                                            {t.title}
                                        </p>
                                        <div className="flex flex-wrap gap-2 mt-2 text-xs text-secondary">
                                            {t.due_date && (
                                                <span className="inline-flex items-center gap-1 bg-[var(--bg-subtle)] rounded px-1.5 py-0.5">
                                                    {t.due_date}
                                                </span>
                                            )}
                                            {t.planned_hours && (
                                                <span className="inline-flex items-center gap-1 bg-[var(--bg-subtle)] rounded px-1.5 py-0.5">
                                                    {t.planned_hours} h
                                                </span>
                                            )}
                                            {t.category && (
                                                <span className="inline-flex items-center gap-1 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded px-1.5 py-0.5">
                                                    {t.category}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-[var(--border-soft)] opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="flex gap-1">
                                                {ci > 0 && (
                                                    <button
                                                        onClick={() => move(t, COLS[ci - 1].key)}
                                                        className="text-xs text-secondary hover:text-brand-600 px-1.5 py-0.5 rounded hover:bg-[var(--bg-subtle)]"
                                                    >
                                                        ← Atrás
                                                    </button>
                                                )}
                                                {ci < 2 && (
                                                    <button
                                                        onClick={() => move(t, COLS[ci + 1].key)}
                                                        className="text-xs text-brand-600 hover:text-brand-700 px-1.5 py-0.5 rounded hover:bg-brand-50 dark:hover:bg-brand-900/30"
                                                    >
                                                        {ci === 0 ? 'Empezar →' : 'Completar →'}
                                                    </button>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => remove(t)}
                                                className="text-xs text-muted hover:text-red-600"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}