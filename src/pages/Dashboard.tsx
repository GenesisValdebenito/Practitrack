import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState,
} from 'react'
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

type HeatDay = { date: string; hours: number }

// Anchos del contenido (no de la ventana) donde cambia la distribución
const WIDE_BREAKPOINT = 1050 // tarjetas a la izquierda + heatmap a la derecha
const FOUR_COLUMNS_BREAKPOINT = 640 // 4 tarjetas en una fila

const HEAT_OPACITY = [0, 0.25, 0.5, 0.75, 1]

const getHeatLevel = (hours: number) => {
    if (hours === 0) return 0
    if (hours < 2) return 1
    if (hours < 4) return 2
    if (hours < 6) return 3
    return 4
}

function StatCard({
    label,
    value,
    sub,
}: {
    label: string
    value: string
    sub?: string
}) {
    return (
        <div className="card animate-fade-in min-w-0">
            <p className="text-xs font-medium text-muted">{label}</p>
            <p className="mt-1 break-words text-2xl font-semibold tracking-tight text-primary">
                {value}
            </p>
            {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
        </div>
    )
}

function Heatmap({ weeks }: { weeks: HeatDay[][] }) {
    return (
        <div className="card flex h-full min-w-0 flex-col">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-primary">
                    Últimos 365 días
                </h2>

                <div className="flex items-center gap-2 text-xs text-muted">
                    <span>Menos</span>
                    <div className="flex gap-0.5">
                        <div className="h-3 w-3 rounded-sm bg-[var(--bg-subtle)]" />
                        {[0.25, 0.5, 0.75, 1].map((opacity) => (
                            <div
                                key={opacity}
                                className="h-3 w-3 rounded-sm"
                                style={{
                                    backgroundColor: 'var(--color-brand-500)',
                                    opacity,
                                }}
                            />
                        ))}
                    </div>
                    <span>Más</span>
                </div>
            </div>

            {/* Las celdas se estiran para llenar todo el ancho de la tarjeta.
                Si el espacio es muy chico, hace scroll horizontal. */}
            <div className="flex flex-1 items-center overflow-x-auto p-[2px]">
                <div
                    className="grid w-full min-w-[560px] grid-flow-col gap-[3px]"
                    style={{
                        gridTemplateRows: 'repeat(7, auto)',
                        gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`,
                    }}
                >
                    {weeks.flat().map((day) => {
                        const level = getHeatLevel(day.hours)

                        return (
                            <div
                                key={day.date}
                                title={`${day.date}: ${day.hours.toFixed(1)} h`}
                                className="aspect-square w-full rounded-sm transition-all hover:ring-2 hover:ring-brand-400"
                                style={
                                    level === 0
                                        ? { backgroundColor: 'var(--bg-subtle)' }
                                        : {
                                            backgroundColor:
                                                'var(--color-brand-500)',
                                            opacity: HEAT_OPACITY[level],
                                        }
                                }
                            />
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default function Dashboard() {
    const { profile, loading } = useProfile()
    const [logs, setLogs] = useState<Log[]>([])
    const [pending, setPending] = useState(0)

    // Mide el ancho real del contenido (no el de la ventana).
    // Se usa un ref en forma de función para que funcione aunque el contenedor
    // aparezca después del esqueleto de carga.
    const [layoutEl, setLayoutEl] = useState<HTMLDivElement | null>(null)
    const [layoutWidth, setLayoutWidth] = useState(0)

    useLayoutEffect(() => {
        if (!layoutEl) return

        setLayoutWidth(layoutEl.getBoundingClientRect().width)

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0]
            if (entry) setLayoutWidth(entry.contentRect.width)
        })

        observer.observe(layoutEl)

        return () => observer.disconnect()
    }, [layoutEl])

    const wideContent = layoutWidth >= WIDE_BREAKPOINT
    const fourColumns = layoutWidth >= FOUR_COLUMNS_BREAKPOINT

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
                (byDay.get(log.date) ?? 0) + Number(log.hours_worked),
            )
        })

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const start = new Date(today)
        start.setDate(start.getDate() - 364)

        const startDay = start.getDay()
        start.setDate(start.getDate() - ((startDay + 6) % 7))

        const weeks: HeatDay[][] = []
        const cursor = new Date(start)

        while (cursor <= today) {
            const week: HeatDay[] = []

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
                <div className="h-8 w-64 rounded bg-[var(--bg-subtle)]" />
                <div className="h-20 rounded-xl bg-[var(--bg-subtle)]" />

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {[1, 2, 3, 4].map((item) => (
                        <div
                            key={item}
                            className="h-24 rounded-xl bg-[var(--bg-subtle)]"
                        />
                    ))}
                </div>

                <div className="h-32 rounded-xl bg-[var(--bg-subtle)]" />
            </div>
        )
    }

    const required = profile.required_hours ?? 360
    const todayStr = fmt(new Date())

    const activePeriod = profile.availability_periods?.find(
        (period) =>
            period.start_date <= todayStr &&
            (!period.end_date || period.end_date >= todayStr),
    )

    const target = activePeriod
        ? Number(activePeriod.hours_per_week)
        : (profile.weekly_hours_target ?? 28)

    const total = logs.reduce(
        (sum, log) => sum + Number(log.hours_worked),
        0,
    )

    const percent =
        required > 0 ? Math.min((total / required) * 100, 100) : 0

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
                    (!period.end_date || period.end_date >= currentStr),
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
            end.getDate() + Math.ceil(remaining / Math.max(target, 1)) * 7,
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

    // Las 4 tarjetas se escriben una sola vez; solo cambia el contenedor.
    const statCards = (
        <>
            <StatCard label="Horas restantes" value={remaining.toFixed(1)} />
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
        </>
    )

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-primary">
                    Hola, {profile.full_name?.split(' ')[0] || 'practicante'} 👋
                </h1>

                <p className="text-sm text-secondary">
                    {profile.career} · {profile.institution}
                </p>
            </div>

            <div className="card">
                <div className="mb-3 flex items-baseline justify-between">
                    <span className="text-sm font-medium text-primary">
                        {total.toFixed(1)}{' '}
                        <span className="text-muted">de {required} h</span>
                    </span>

                    <span className="text-lg font-semibold text-brand-600 dark:text-brand-400">
                        {percent.toFixed(1)}%
                    </span>
                </div>

                <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
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

            {/* Ancho grande: tarjetas a la izquierda + heatmap a la derecha.
                Ancho estrecho/medio: tarjetas arriba + heatmap debajo. */}
            <div ref={setLayoutEl} className="min-w-0">
                <div
                    className={
                        wideContent ? 'grid grid-cols-5 gap-4' : 'space-y-4'
                    }
                >
                    <div
                        className={
                            wideContent
                                ? 'col-span-2 grid min-w-0 grid-cols-2 gap-4'
                                : fourColumns
                                    ? 'grid grid-cols-4 gap-4'
                                    : 'grid grid-cols-2 gap-4'
                        }
                    >
                        {statCards}
                    </div>

                    <div className={wideContent ? 'col-span-3 min-w-0' : 'min-w-0'}>
                        <Heatmap weeks={heatmap} />
                    </div>
                </div>
            </div>

            <div className="card">
                <h2 className="mb-4 text-sm font-semibold text-primary">
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

                <p className="mt-2 text-xs text-muted">
                    La línea punteada es tu meta semanal de {target} h.
                </p>
            </div>

            <div className="card">
                <h2 className="mb-4 text-sm font-semibold text-primary">
                    Últimos registros
                </h2>

                {logs.length === 0 ? (
                    <div className="py-8 text-center">
                        <p className="mb-3 text-sm text-muted">
                            Aún no hay registros.
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                window.dispatchEvent(
                                    new Event(OPEN_QUICKLOG_EVENT),
                                )
                            }
                            className="btn-primary inline-block text-xs"
                        >
                            Registrar mi primera hora
                        </button>
                    </div>
                ) : (
                    <ul className="space-y-0">
                        {logs.slice(0, 5).map((log, index) => (
                            <li
                                key={`${log.date}-${index}`}
                                className="flex items-center justify-between border-b border-[var(--border-soft)] py-3 last:border-0"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-semibold text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                                        {log.date.slice(8, 10)}
                                    </div>

                                    <div className="min-w-0">
                                        <p className="truncate text-sm text-primary">
                                            {log.task_description}
                                        </p>
                                        <p className="text-xs text-muted">
                                            {log.date}
                                        </p>
                                    </div>
                                </div>

                                <span className="ml-3 shrink-0 text-sm font-medium text-secondary">
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