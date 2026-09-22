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
        <div className="flex flex-col h-full bg-[#333] rounded-lg border border-[#444] overflow-hidden">
            {/* Header (Standard View) */}
            <div className="flex justify-between items-center bg-[#2e2e2e] border-b border-[#444] px-4 py-2">
                <button className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
                    Standard View
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div className="flex items-center">
                    <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white border-l border-[#444] transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                    </button>
                    <button onClick={() => setShowForm((v) => !v)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white border-l border-[#444] transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-900/50 border-b border-red-800 text-red-200 text-sm">
                    {error}
                </div>
            )}

            {/* Formulario */}
            {showForm && (
                <form onSubmit={add} className="p-4 bg-[#2e2e2e] border-b border-[#444] space-y-3">
                    <input
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="¿Qué vas a hacer?"
                        className="w-full bg-[#1c1c1c] border border-[#444] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-400"
                    />
                    <div className="flex flex-col md:flex-row gap-3">
                        <input
                            type="number"
                            step="0.25"
                            min="0.25"
                            max="24"
                            value={hours}
                            onChange={(e) => setHours(e.target.value)}
                            placeholder="Horas"
                            className="flex-1 bg-[#1c1c1c] border border-[#444] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-400"
                        />
                        <input
                            type="date"
                            value={due}
                            onChange={(e) => setDue(e.target.value)}
                            className="bg-[#1c1c1c] border border-[#444] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-400"
                        />
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
                            Agregar
                        </button>
                    </div>
                </form>
            )}

            {/* Content area */}
            <div className="flex-1 flex flex-col p-4 overflow-hidden relative">
                {tasks.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <h2 className="text-4xl font-bold text-[#444] tracking-wider uppercase">No Tasks</h2>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-3 gap-4 h-full">
                        {COLS.map((col, ci) => {
                            const items = tasks.filter((t) => t.status === col.key)
                            return (
                                <div
                                    key={col.key}
                                    className="bg-[#282828] border border-[#444] rounded p-3 flex flex-col"
                                >
                                    <div className="flex items-center gap-2 mb-3 px-1">
                                        <span className={`w-2 h-2 rounded-full ${col.color}`} />
                                        <p className="font-medium text-sm text-gray-200">{col.label}</p>
                                        <span className="text-xs text-gray-500 ml-auto">{items.length}</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                        {items.map((t) => (
                                            <div
                                                key={t.id}
                                                className="bg-[#1c1c1c] border border-[#444] rounded p-3 group hover:border-gray-500 transition-colors"
                                            >
                                                <p className={`text-sm font-medium leading-snug ${t.status === 'done' ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                                                    {t.title}
                                                </p>
                                                <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-400">
                                                    {t.due_date && (
                                                        <span className="inline-flex items-center gap-1 bg-[#282828] border border-[#444] rounded px-1.5 py-0.5">
                                                            {t.due_date}
                                                        </span>
                                                    )}
                                                    {t.planned_hours && (
                                                        <span className="inline-flex items-center gap-1 bg-[#282828] border border-[#444] rounded px-1.5 py-0.5">
                                                            {t.planned_hours} h
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#444] opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="flex gap-1">
                                                        {ci > 0 && (
                                                            <button
                                                                onClick={() => move(t, COLS[ci - 1].key)}
                                                                className="text-[10px] text-gray-400 hover:text-white px-1.5 py-0.5 rounded border border-transparent hover:border-[#555] bg-[#333]"
                                                            >
                                                                ← Atrás
                                                            </button>
                                                        )}
                                                        {ci < 2 && (
                                                            <button
                                                                onClick={() => move(t, COLS[ci + 1].key)}
                                                                className="text-[10px] text-blue-400 hover:text-blue-300 px-1.5 py-0.5 rounded border border-transparent hover:border-blue-900 bg-[#333]"
                                                            >
                                                                {ci === 0 ? 'Empezar →' : 'Completar →'}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => remove(t)}
                                                        className="text-[10px] text-gray-500 hover:text-red-400"
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
                )}
            </div>
        </div>
    )
}