import { supabase } from '../lib/supabase'

export type WorkLog = {
    id: string
    date: string
    hours_worked: number
    task_description: string
    category: string
    is_in_person: boolean
}

export default function LogList({ logs, onChanged }: { logs: WorkLog[]; onChanged: () => void }) {
    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar este registro?')) return
        await supabase.from('work_logs').delete().eq('id', id)
        onChanged()
    }

    if (logs.length === 0) {
        return <p className="text-gray-500 text-sm">Aún no hay registros. ¡Agrega el primero!</p>
    }

    return (
        <ul className="space-y-2">
            {logs.map((log) => (
                <li key={log.id} className="bg-white p-3 rounded-xl shadow flex justify-between gap-3">
                    <div>
                        <p className="text-sm text-gray-500">
                            {log.date} · {log.category} · {log.is_in_person ? '🏢 Presencial' : '🏠 Remoto'}
                        </p>
                        <p>{log.task_description}</p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="font-bold">{log.hours_worked} h</p>
                        <button onClick={() => handleDelete(log.id)} className="text-xs text-red-600">
                            Eliminar
                        </button>
                    </div>
                </li>
            ))}
        </ul>
    )
}