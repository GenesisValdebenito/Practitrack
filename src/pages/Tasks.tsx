import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Task = { id: string; title: string; status: 'todo' | 'doing' | 'done'; due_date: string | null }

const COLS: { key: Task['status']; label: string }[] = [
    { key: 'todo', label: 'Por hacer' },
    { key: 'doing', label: 'En curso' },
    { key: 'done', label: 'Hecho' },
]

export default function Tasks() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [title, setTitle] = useState('')
    const [due, setDue] = useState('')

    const load = useCallback(async () => {
        const { data } = await supabase.from('tasks').select('*').order('created_at')
        setTasks(data ?? [])
    }, [])
    useEffect(() => { load() }, [load])

    const add = async (e: React.FormEvent) => {
        e.preventDefault()
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('tasks').insert({ user_id: user!.id, title, due_date: due || null })
        setTitle(''); setDue(''); load()
    }
    const move = async (t: Task, status: Task['status']) => {
        await supabase.from('tasks').update({ status }).eq('id', t.id)
        load()
    }
    const remove = async (id: string) => {
        await supabase.from('tasks').delete().eq('id', id)
        load()
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Tareas</h1>

            <form onSubmit={add} className="bg-white p-4 rounded-xl shadow flex flex-col md:flex-row gap-3">
                <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nueva tarea..." className="flex-1 border rounded-lg px-3 py-2" />
                <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="border rounded-lg px-3 py-2" />
                <button className="bg-blue-600 text-white rounded-lg px-5 py-2">Agregar</button>
            </form>

            <div className="grid md:grid-cols-3 gap-4">
                {COLS.map((col, ci) => (
                    <div key={col.key} className="bg-gray-100 rounded-xl p-3">
                        <p className="font-semibold text-sm mb-3">
                            {col.label} ({tasks.filter((t) => t.status === col.key).length})
                        </p>
                        <div className="space-y-2">
                            {tasks.filter((t) => t.status === col.key).map((t) => (
                                <div key={t.id} className="bg-white rounded-lg p-3 shadow-sm">
                                    <p className={`text-sm ${t.status === 'done' ? 'line-through text-gray-400' : ''}`}>{t.title}</p>
                                    {t.due_date && <p className="text-xs text-gray-500">📆 {t.due_date}</p>}
                                    <div className="flex justify-between mt-2 text-xs">
                                        <span>
                                            {ci > 0 && <button onClick={() => move(t, COLS[ci - 1].key)} className="mr-2 text-blue-600">←</button>}
                                            {ci < 2 && <button onClick={() => move(t, COLS[ci + 1].key)} className="text-blue-600">→</button>}
                                        </span>
                                        <button onClick={() => remove(t.id)} className="text-red-600">Eliminar</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}