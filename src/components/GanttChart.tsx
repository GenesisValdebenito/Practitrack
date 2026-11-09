
import { useMemo, useState } from 'react'

type TaskStatus = 'todo' | 'doing' | 'done'

export type GanttTask = {
    id: string
    title: string
    status: TaskStatus
    due_date: string | null
    created_at?: string
}

type Props = {
    tasks: GanttTask[]
}

const DAY_MS = 24 * 60 * 60 * 1000

function parseDate(value: string): Date {
    const date = value.slice(0, 10)
    const [year, month, day] = date.split('-').map(Number)
    return new Date(year, month - 1, day, 12)
}

function addDays(date: Date, days: number): Date {
    const next = new Date(date)
    next.setDate(next.getDate() + days)
    return next
}

function monday(date: Date): Date {
    const next = new Date(date)
    const day = (next.getDay() + 6) % 7
    return addDays(next, -day)
}

function dateKey(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

function shortDate(date: Date): string {
    return date.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'short',
    })
}

function dayDiff(a: Date, b: Date): number {
    return Math.round(
        (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
            Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / DAY_MS,
    )
}

export default function GanttChart({ tasks }: Props) {
    const [offset, setOffset] = useState(0)
    const [weeks, setWeeks] = useState(12)

    const start = useMemo(
        () => addDays(monday(new Date()), offset * 7),
        [offset],
    )

    const end = addDays(start, weeks * 7)
    const today = new Date()

    const columns = Array.from(
        { length: weeks },
        (_, index) => addDays(start, index * 7),
    )

    const planned = useMemo(() => {
        return tasks
            .filter((task) => task.due_date)
            .map((task) => {
                const finish = parseDate(task.due_date!)
                const created = task.created_at
                    ? parseDate(task.created_at)
                    : finish

                // Inicio provisional: creación de la tarea.
                // No se interpreta como fecha real de inicio.
                const begin = created <= finish ? created : finish

                return { ...task, begin, finish }
            })
            .sort((a, b) => a.finish.getTime() - b.finish.getTime())
    }, [tasks])

    const visible = planned.filter(
        (task) => task.finish >= start && task.begin < end,
    )

    const unplanned = tasks.filter((task) => !task.due_date)

    const statusLabel: Record<TaskStatus, string> = {
        todo: 'Por hacer',
        doing: 'En curso',
        done: 'Hecho',
    }

    const statusColor: Record<TaskStatus, string> = {
        todo: 'var(--text-muted)',
        doing: 'var(--color-brand-500)',
        done: '#16a34a',
    }

    const weekWidth = 76
    const chartWidth = weeks * weekWidth

    return (
        <section className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold">
                        Carta Gantt
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        Planificación de tareas según sus fechas.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setOffset(0)}
                        className="btn-ghost border border-[var(--border-soft)]"
                    >
                        Hoy
                    </button>

                    <button
                        type="button"
                        onClick={() => setOffset((value) => value - weeks)}
                        className="btn-ghost border border-[var(--border-soft)]"
                        aria-label="Periodo anterior"
                    >
                        ←
                    </button>

                    <button
                        type="button"
                        onClick={() => setOffset((value) => value + weeks)}
                        className="btn-ghost border border-[var(--border-soft)]"
                        aria-label="Periodo siguiente"
                    >
                        →
                    </button>

                    <select
                        aria-label="Semanas visibles"
                        value={weeks}
                        onChange={(event) => setWeeks(Number(event.target.value))}
                        className="input-base w-auto"
                    >
                        <option value={4}>4 semanas</option>
                        <option value={8}>8 semanas</option>
                        <option value={12}>12 semanas</option>
                        <option value={16}>16 semanas</option>
                    </select>
                </div>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
                Las barras comienzan provisionalmente en la fecha de creación
                de cada tarea y terminan en su fecha límite. No representan
                fechas de inicio verificadas.
            </p>

            <div className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)]">
                <div className="overflow-x-auto">
                    <div
                        className="grid"
                        style={{
                            gridTemplateColumns: `220px ${chartWidth}px`,
                            minWidth: 220 + chartWidth,
                        }}
                    >
                        <div className="sticky left-0 z-20 border-b border-r border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3 text-xs font-semibold">
                            Tarea
                        </div>

                        <div
                            className="grid border-b border-[var(--border-soft)]"
                            style={{
                                gridTemplateColumns: `repeat(${weeks}, ${weekWidth}px)`,
                            }}
                        >
                            {columns.map((date) => (
                                <div
                                    key={dateKey(date)}
                                    className="border-r border-[var(--border-soft)] bg-[var(--bg-subtle)] p-2 text-center text-xs text-[var(--text-secondary)]"
                                >
                                    {shortDate(date)}
                                </div>
                            ))}
                        </div>

                        {visible.map((task) => {
                            const begin = Math.max(
                                0,
                                dayDiff(start, task.begin),
                            )
                            const finish = Math.min(
                                weeks * 7,
                                dayDiff(start, task.finish) + 1,
                            )

                            const left = (begin / 7) * weekWidth
                            const width = Math.max(
                                4,
                                ((finish - begin) / 7) * weekWidth,
                            )

                            const todayX =
                                (dayDiff(start, today) / 7) * weekWidth

                            return (
                                <div
                                    key={task.id}
                                    className="contents"
                                >
                                    <div className="sticky left-0 z-10 min-w-0 border-b border-r border-[var(--border-soft)] bg-[var(--bg-card)] p-3">
                                        <p
                                            className="break-words text-xs font-medium"
                                            title={task.title}
                                        >
                                            {task.title}
                                        </p>
                                        <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                                            {statusLabel[task.status]}
                                        </p>
                                    </div>

                                    <div
                                        className="relative min-h-16 border-b border-[var(--border-soft)]"
                                        style={{
                                            backgroundImage:
                                                'linear-gradient(to right, var(--border-soft) 1px, transparent 1px)',
                                            backgroundSize: `${weekWidth}px 100%`,
                                        }}
                                    >
                                        {todayX >= 0 &&
                                            todayX <= chartWidth && (
                                                <div
                                                    className="absolute inset-y-0 z-10 w-px bg-red-500"
                                                    style={{ left: todayX }}
                                                    title="Hoy"
                                                />
                                            )}

                                        <div
                                            className="absolute top-5 h-5 rounded-md"
                                            style={{
                                                left,
                                                width,
                                                backgroundColor:
                                                    statusColor[task.status],
                                            }}
                                            title={`${task.title}: ${shortDate(task.begin)} a ${shortDate(task.finish)} (inicio provisional)`}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {visible.length === 0 && (
                    <p className="p-6 text-center text-sm text-[var(--text-secondary)]">
                        No hay tareas con fechas dentro de este periodo.
                        Usa las flechas para explorar otras semanas.
                    </p>
                )}
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-[var(--text-secondary)]">
                {(['todo', 'doing', 'done'] as const).map((status) => (
                    <span key={status} className="flex items-center gap-2">
                        <span
                            className="h-3 w-3 rounded-sm"
                            style={{ background: statusColor[status] }}
                        />
                        {statusLabel[status]}
                    </span>
                ))}
            </div>

            {unplanned.length > 0 && (
                <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4">
                    <h3 className="font-semibold">
                        Sin fecha límite ({unplanned.length})
                    </h3>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        Estas tareas todavía no pueden ubicarse en el calendario.
                    </p>
                    <div className="mt-3 space-y-2">
                        {unplanned.map((task) => (
                            <p key={task.id} className="break-words text-sm">
                                {task.title}
                            </p>
                        ))}
                    </div>
                </div>
            )}
        </section>
    )
}
