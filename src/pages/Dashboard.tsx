import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { fmt, weekStart } from '../lib/utils'

type Log = { date: string; hours_worked: number; task_description: string }

export default function Dashboard() {
    const { profile } = useProfile()
    const [logs, setLogs] = useState<Log[]>([])
    const [pending, setPending] = useState(0)

    useEffect(() => {
        supabase.from('work_logs').select('date,hours_worked,task_description').order('date', { ascending: false })
            .then(({ data }) => setLogs(data ?? []))
        supabase.from('tasks').select('id', { count: 'exact', head: true }).neq('status', 'done')
            .then(({ count }) => setPending(count ?? 0))
    }, [])

    const required = profile.required_hours
    const target = profile.weekly_hours_target
    const total = logs.reduce((s, l) => s + Number(l.hours_worked), 0)
    const percent = Math.min((total / required) * 100, 100)
    const remaining = Math.max(required - total, 0)
    const thisWeek = logs.filter((l) => weekStart(l.date) === weekStart(fmt(new Date())))
        .reduce((s, l) => s + Number(l.hours_worked), 0)

    const end = new Date()
    end.setDate(end.getDate() + Math.ceil(remaining / Math.max(target, 1)) * 7)

    const weeks = Array.from({ length: 8 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (7 - i) * 7 + 7)
        const key = weekStart(fmt(d))
        return {
            semana: key.slice(5),
            horas: logs.filter((l) => weekStart(l.date) === key).reduce((s, l) => s + Number(l.hours_worked), 0),
        }
    })

    const Card = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
        <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
    )

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Hola, {profile.full_name?.split(' ')[0]} 👋</h1>
                <p className="text-gray-500 text-sm">{profile.career} · {profile.institution}</p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow">
                <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">{total.toFixed(1)} h de {required} h</span>
                    <span>{percent.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className="bg-blue-600 h-4 rounded-full transition-all" style={{ width: `${percent}%` }} />
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card label="Horas restantes" value={remaining.toFixed(1)} />
                <Card label="Esta semana" value={`${thisWeek.toFixed(1)} h`} sub={`Meta: ${target} h`} />
                <Card label="Término estimado" value={remaining === 0 ? '¡Listo!' : end.toLocaleDateString('es-CL')} sub="A tu ritmo objetivo" />
                <Card label="Tareas pendientes" value={String(pending)} />
            </div>

            <div className="bg-white p-5 rounded-xl shadow">
                <h2 className="font-semibold mb-3">Horas por semana</h2>
                <div className="h-64">
                    <ResponsiveContainer>
                        <BarChart data={weeks}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="semana" />
                            <YAxis />
                            <Tooltip />
                            <ReferenceLine y={target} stroke="#dc2626" strokeDasharray="4 4" />
                            <Bar dataKey="horas" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-400">La línea roja es tu meta semanal.</p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow">
                <h2 className="font-semibold mb-3">Últimos registros</h2>
                {logs.slice(0, 5).map((l, i) => (
                    <div key={i} className="flex justify-between text-sm py-2 border-b last:border-0">
                        <span className="truncate pr-4">{l.date} · {l.task_description}</span>
                        <span className="font-medium">{l.hours_worked} h</span>
                    </div>
                ))}
                {logs.length === 0 && <p className="text-sm text-gray-500">Aún no hay registros.</p>}
            </div>
        </div>
    )
}