
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    Bar,
    BarChart,
    CartesianGrid,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { fmt, weekStart } from '../lib/utils'
import {
    LOGS_CHANGED_EVENT,
    OPEN_QUICKLOG_EVENT,
} from '../components/QuickLogWidget'

type Log = {
    date: string
    hours_worked: number
    task_description: string
}

export default function Dashboard() {
    const { profile, loading } = useProfile()
    const [logs, setLogs] = useState<Log[]>([])
    const [pending, setPending] = useState(0)

    const loadLogs = useCallback(() => {
        supabase
            .from('work_logs')
            .select('date,hours_worked,task_description')
            .order('date', { ascending: false })
            .then(({ data }) => setLogs(data ?? []))
    }, [])

    useEffect(() => {
        window.addEventListener(LOGS_CHANGED_EVENT, loadLogs)

        return () => {
            window.removeEventListener(LOGS_CHANGED_EVENT, loadLogs)
        }
    }, [loadLogs])

    useEffect(() => {
        loadLogs()

        supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .neq('status', 'done')
            .then(({ count }) => setPending(count ?? 0))
    }, [loadLogs])

    const streak = useMemo(() => {
        const days = new Set(logs.map((log) => log.date))
        let count = 0
        const date = new Date()

        while (days.has(fmt(date))) {
            count++
            date.setDate(date.getDate() - 1)
        }

        return count
    }, [logs])

    const heatmap = useMemo(() => {
        const byDay = new Map<string, number>()

        logs.forEach((log) => {
            byDay.set(
                log.date,
                (byDay.get(log.date) ?? 0) + Number(log.hours_worked)
            )
        })

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

            for (let index = 0; index < 7; index++) {
                const key = fmt(cursor)

                week.push({
                    date: key,
                    hours: byDay.get(key) ?? 0,
                })

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
                    {[1, 2, 3, 4].map((item) => (
                        <div
                            key={item}
                            className="h-24 bg-[var(--bg-subtle)] rounded-xl"
                        />
                    ))}
                </div>

                <div className="h-32 bg-[var(--bg-subtle)] rounded-xl" />
            </div>
        )
    }

    const required = profile.required_hours ?? 360

    const todayStr = fmt(new Date())

    const activePeriod = profile.availability_periods?.find(
        (period) =>
            period.start_date <= todayStr &&
            (!period.end_date || period.end_date >= todayStr)
    )

    const target = activePeriod
        ? Number(activePeriod.hours_per_week)
        : (profile.weekly_hours_target ?? 28)

    const total = logs.reduce(
        (sum, log) => sum + Number(log.hours_worked),
        0
    )

    const percent = required > 0
        ? Math.min((total / required) * 100, 100)
        : 0

    const remaining = Math.max(required - total, 0)

    const thisWeek = logs
        .filter((log) => weekStart(log.date) === weekStart(fmt(new Date())))
        .reduce((sum, log) => sum + Number(log.hours_worked), 0)

    const end = new Date()

    if (profile.availability_periods && profile.availability_periods.length > 0) {
        let remainingHours = remaining
        const currentDay = new Date()

        currentDay.setHours(0, 0, 0, 0)

        let safety = 0

        while (remainingHours > 0 && safety < 1000) {
            safety++

            const currentStr = fmt(currentDay)

            const active = profile.availability_periods.find(
                (period) =>
                    period.start_date <= currentStr &&
                    (!period.end_date || period.end_date >= currentStr)
            )

            const dailyHours = active
                ? Number(active.hours_per_week) / 7
                : target / 7

            remainingHours -= dailyHours

            if (remainingHours > 0) {
                currentDay.setDate(currentDay.getDate() + 1)
            }
        }

        end.setTime(currentDay.getTime())
    } else {
        end.setDate(
            end.getDate() + Math.ceil(remaining / Math.max(target, 1)) * 7
        )
    }

    const weeks = Array.from({ length: 8 }, (_, index) => {
        const date = new Date()

        date.setDate(date.getDate() - (7 - index) * 7 + 7)

        const key = weekStart(fmt(date))

        return {
            semana: key.slice(5),
            horas: logs
                .filter((log) => weekStart(log.date) === key)
                .reduce((sum, log) => sum + Number(log.hours_worked), 0),
        }
    })

    const getHeatLevel = (hours: number) => {
        if (hours === 0) return 0
        if (hours < 2) return 1
        if (hours < 4) return 2
        if (hours < 6) return 3
        return 4
    }

    const StatCard = ({
        label,
        value,
        sub,
    }: {
        label: string
        value: string
        sub?: string
    }) => (
        <div className="card animate-fade-in">
            <p className="text-xs text-muted font-medium">{label}</p>
            <p className="text-2xl font-semibold tracking-tight mt-1 text-primary">
                {value}
            </p>
            {sub && (
                <p className="text-xs text-muted mt-0.5">{sub}</p>
            )}
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

            <div className="card">
                <div className="flex justify-between items-baseline mb-3">
                    <span className="text-sm font-medium text-primary">
                        {total.toFixed(1)}{' '}
                        <span className="text-muted">de {required} h</span>
                    </span>

                    <span className="text-lg font-semibold text-brand-600 dark:text-brand-400">
                        {percent.toFixed(1)}%
                    </span>
                </div>

                <div className="w-full bg-[var(--bg-subtle)] rounded-full h-3 overflow-hidden">
                    <div
                        className="h-3 rounded-full transition-all duration-500"
                        style={{
                            width: `${percent}%`,
                            background:
                                'linear-gradient(90deg, var(--color-brand-500), var(--color-brand-400))',
                        }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label="Horas restantes"
                    value={remaining.toFixed(1)}
                />

                <StatCard
                    label="Esta semana"
                    value={`${thisWeek.toFixed(1)} h`}
                    sub={`Meta: ${target} h`}
                />

                <StatCard
                    label="Término estimado"
                    value={
                        remaining === 0
                            ? '¡Listo!'
                            : end.toLocaleDateString('es-CL')
                    }
                    sub="A tu ritmo objetivo"
                />

                <StatCard
                    label="Tareas pendientes"
                    value={String(pending)}
                    sub={`Racha: ${streak} días 🔥`}
                />
            </div>

            <div className="card">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold text-sm text-primary">
                        Últimos 365 días
                    </h2>

                    <div className="flex items-center gap-2 text-xs text-muted">
                        <span>Menos</span>

                        <div className="flex gap-0.5">
                            <div className="w-3 h-3 rounded-sm bg-[var(--bg-subtle)]" />
                            <div
                                className="w-3 h-3 rounded-sm"
                                style={{
                                    backgroundColor: 'var(--color-brand-500)',
                                    opacity: 0.25,
                                }}
                            />
                            <div
                                className="w-3 h-3 rounded-sm"
                                style={{
                                    backgroundColor: 'var(--color-brand-500)',
                                    opacity: 0.5,
                                }}
                            />
                            <div
                                className="w-3 h-3 rounded-sm"
                                style={{
                                    backgroundColor: 'var(--color-brand-500)',
                                    opacity: 0.75,
                                }}
                            />
                            <div
                                className="w-3 h-3 rounded-sm"
                                style={{
                                    backgroundColor: 'var(--color-brand-500)',
                                    opacity: 1,
                                }}
                            />
                        </div>

                        <span>Más</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <div className="flex gap-1 min-w-max">
                        {heatmap.map((week, weekIndex) => (
                            <div
                                key={weekIndex}
                                className="flex flex-col gap-1"
                            >
                                {week.map((day) => {
                                    const level = getHeatLevel(day.hours)

                                    return (
                                        <div
                                            key={day.date}
                                            title={`${day.date}: ${day.hours.toFixed(1)} h`}
                                            className="w-3 h-3 rounded-sm transition-all hover:ring-2 hover:ring-brand-400"
                                            style={
                                                level === 0
                                                    ? {
                                                        backgroundColor:
                                                            'var(--bg-subtle)',
                                                    }
                                                    : {
                                                        backgroundColor:
                                                            'var(--color-brand-500)',
                                                        opacity: [
                                                            0,
                                                            0.25,
                                                            0.5,
                                                            0.75,
                                                            1,
                                                        ][level],
                                                    }
                                            }
                                        />
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="card">
                <h2 className="font-semibold text-sm mb-4 text-primary">
                    Horas por semana
                </h2>

                <div className="h-56">
                    <ResponsiveContainer>
                        <BarChart data={weeks}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="var(--border-soft)"
                            />

                            <XAxis
                                dataKey="semana"
                                stroke="var(--text-muted)"
                                fontSize={12}
                            />

                            <YAxis
                                stroke="var(--text-muted)"
                                fontSize={12}
                            />

                            <Tooltip
                                contentStyle={{
                                    borderRadius: 8,
                                    border: '1px solid var(--border-soft)',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-primary)',
                                    fontSize: 12,
                                }}
                            />

                            <ReferenceLine
                                y={target}
                                stroke="var(--color-brand-400)"
                                strokeDasharray="4 4"
                            />

                            <Bar
                                dataKey="horas"
                                fill="var(--color-brand-500)"
                                radius={[6, 6, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <p className="text-xs text-muted mt-2">
                    La línea punteada es tu meta semanal de {target} h.
                </p>
            </div>

            <div className="card">
                <h2 className="font-semibold text-sm mb-4 text-primary">
                    Últimos registros
                </h2>

                {logs.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-sm text-muted mb-3">
                            Aún no hay registros.
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                window.dispatchEvent(
                                    new Event(OPEN_QUICKLOG_EVENT)
                                )
                            }
                            className="inline-block text-xs btn-primary"
                        >
                            Registrar mi primera hora
                        </button>
                    </div>
                ) : (
                    <ul className="space-y-0">
                        {logs.slice(0, 5).map((log, index) => (
                            <li
                                key={`${log.date}-${index}`}
                                className="flex items-center justify-between py-3 border-b border-[var(--border-soft)] last:border-0"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 flex items-center justify-center text-xs font-semibold shrink-0">
                                        {log.date.slice(8, 10)}
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-sm truncate text-primary">
                                            {log.task_description}
                                        </p>
                                        <p className="text-xs text-muted">
                                            {log.date}
                                        </p>
                                    </div>
                                </div>

                                <span className="text-sm font-medium text-secondary shrink-0 ml-3">
                                    +{log.hours_worked} h
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
