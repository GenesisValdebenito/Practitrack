import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { fmt, weekStart } from '../lib/utils'

type Log = { date: string; hours_worked: number; task_description: string }

export default function Dashboard() {
    const { profile, loading } = useProfile()
    const [logs, setLogs] = useState<Log[]>([])
    const [pending, setPending] = useState(0)

    useEffect(() => {
        supabase.from('work_logs').select('date,hours_worked,task_description').order('date', { ascending: false })
            .then(({ data }) => setLogs(data ?? []))
        supabase.from('tasks').select('id', { count: 'exact', head: true }).neq('status', 'done')
            .then(({ count }) => setPending(count ?? 0))
    }, [])

    const streak = useMemo(() => {
        const days = new Set(logs.map((l) => l.date))
        let count = 0
        const d = new Date()
        while (days.has(fmt(d))) {
            count++
            d.setDate(d.getDate() - 1)
        }
        return count
    }, [logs])

    const heatmap = useMemo(() => {
        const byDay = new Map<string, number>()
        logs.forEach((l) => byDay.set(l.date, (byDay.get(l.date) ?? 0) + Number(l.hours_worked)))

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const start = new Date(today)
        start.setDate(start.getDate() - 364)
        const startDay = start.getDay()
        start.setDate(start.getDate() - ((startDay + 6) % 7))

        const weeks: { date: string; hours: number }[][] = []
        const cursor = new Date(start)
        while (cursor <= today) {
            const week: { date: string; hours: number }[] = []
            for (let i = 0; i < 7; i++) {
                const key = fmt(cursor)
                week.push({ date: key, hours: byDay.get(key) ?? 0 })
                cursor.setDate(cursor.getDate() + 1)
            }
            weeks.push(week)
        }
        return weeks
    }, [logs])

    if (loading || !profile) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 w-64 bg-[var(--bg-subtle)] rounded" />
                <div className="h-20 bg-[var(--bg-subtle)] rounded-xl" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-24 bg-[var(--bg-subtle)] rounded-xl" />
                    ))}
                </div>
                <div className="h-32 bg-[var(--bg-subtle)] rounded-xl" />
            </div>
        )
    }

    const required = profile.required_hours ?? 360
    const target = profile.weekly_hours_target ?? 28
    const total = logs.reduce((s, l) => s + Number(l.hours_worked), 0)
    const percent = required > 0 ? Math.min((total / required) * 100, 100) : 0
    const remaining = Math.max(required - total, 0)
    const thisWeek = logs
        .filter((l) => weekStart(l.date) === weekStart(fmt(new Date())))
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

    // Escala de opacidad según horas: usa el color de marca con distintos niveles
    const getHeatLevel = (h: number) => {
        if (h === 0) return 0
        if (h < 2) return 1
        if (h < 4) return 2
        if (h < 6) return 3
        return 4
    }

    const StatCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
        <div className="card animate-fade-in">
            <p className="text-xs text-muted font-medium">{label}</p>
            <p className="text-2xl font-semibold tracking-tight mt-1 text-primary">{value}</p>
            {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
        </div>
    )

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-primary">
                    Hola, {profile.full_name?.split(' ')[0] || 'practicante'} 👋
                </h1>
                <p className="text-secondary text-sm">
                    {profile.career} · {profile.institution}
                </p>
            </div>

            {/* Barra de progreso principal */}
            <div className="card">
                <div className="flex justify-between items-baseline mb-3">
                    <span className="text-sm font-medium text-primary">
                        {total.toFixed(1)} <span className="text-muted">de {required} h</span>
                    </span>
                    <span className="text-lg font-semibold text-brand-600 dark:text-brand-400">{percent.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-[var(--bg-subtle)] rounded-full h-3 overflow-hidden">
                    <div
                        className="h-3 rounded-full transition-all duration-500"
                        style={{
                            width: `${percent}%`,
                            background: 'linear-gradient(90deg, var(--color-brand-500), var(--color-brand-400))',
                        }}
                    />
                </div>
            </div>

            {/* Tarjetas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Horas restantes" value={remaining.toFixed(1)} />
                <StatCard label="Esta semana" value={`${thisWeek.toFixed(1)} h`} sub={`Meta: ${target} h`} />
                <StatCard
                    label="Término estimado"
                    value={remaining === 0 ? '¡Listo!' : end.toLocaleDateString('es-CL')}
                    sub="A tu ritmo objetivo"
                />
                <StatCard label="Tareas pendientes" value={String(pending)} sub={`Racha: ${streak} días 🔥`} />
            </div>

            {/* Heatmap dinámico con color de marca */}
            <div className="card">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold text-sm text-primary">Últimos 365 días</h2>
                    <div className="flex items-center gap-2 text-xs text-muted">
                        <span>Menos</span>
                        <div className="flex gap-0.5">
                            <div className="w-3 h-3 rounded-sm bg-[var(--bg-subtle)]" />
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--color-brand-500)', opacity: 0.25 }} />
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--color-brand-500)', opacity: 0.5 }} />
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--color-brand-500)', opacity: 0.75 }} />
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--color-brand-500)', opacity: 1 }} />
                        </div>
                        <span>Más</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <div className="flex gap-1 min-w-max">
                        {heatmap.map((week, wi) => (
                            <div key={wi} className="flex flex-col gap-1">
                                {week.map((day) => {
                                    const level = getHeatLevel(day.hours)
                                    return (
                                        <div
                                            key={day.date}
                                            title={`${day.date}: ${day.hours.toFixed(1)} h`}
                                            className="w-3 h-3 rounded-sm transition-all hover:ring-2 hover:ring-brand-400"
                                            style={
                                                level === 0
                                                    ? { backgroundColor: 'var(--bg-subtle)' }
                                                    : { backgroundColor: 'var(--color-brand-500)', opacity: [0, 0.25, 0.5, 0.75, 1][level] }
                                            }
                                        />
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Gráfico semanal */}
            <div className="card">
                <h2 className="font-semibold text-sm mb-4 text-primary">Horas por semana</h2>
                <div className="h-56">
                    <ResponsiveContainer>
                        <BarChart data={weeks}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-soft)" />
                            <XAxis dataKey="semana" stroke="var(--text-muted)" fontSize={12} />
                            <YAxis stroke="var(--text-muted)" fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: 8,
                                    border: '1px solid var(--border-soft)',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-primary)',
                                    fontSize: 12,
                                }}
                            />
                            <ReferenceLine y={target} stroke="var(--color-brand-400)" strokeDasharray="4 4" />
                            <Bar dataKey="horas" fill="var(--color-brand-500)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted mt-2">La línea punteada es tu meta semanal de {target} h.</p>
            </div>

            {/* Últimos registros */}
            <div className="card">
                <h2 className="font-semibold text-sm mb-4 text-primary">Últimos registros</h2>
                {logs.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-sm text-muted mb-3">Aún no hay registros.</p>
                        <a
                            href="/bitacora"
                            className="inline-block text-xs btn-primary"
                        >
                            Registrar mi primera hora
                        </a>
                    </div>
                ) : (
                    <ul className="space-y-0">
                        {logs.slice(0, 5).map((l, i) => (
                            <li
                                key={i}
                                className="flex items-center justify-between py-3 border-b border-[var(--border-soft)] last:border-0"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 flex items-center justify-center text-xs font-semibold shrink-0">
                                        {l.date.slice(8, 10)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm truncate text-primary">{l.task_description}</p>
                                        <p className="text-xs text-muted">{l.date}</p>
                                    </div>
                                </div>
                                <span className="text-sm font-medium text-secondary shrink-0 ml-3">
                                    +{l.hours_worked} h
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}