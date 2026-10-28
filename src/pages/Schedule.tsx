
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type Block = {
    id: string
    day_of_week: number
    start_time: string
    end_time: string
    title: string
    is_in_person: boolean
    effective_from: string | null
    effective_to: string | null
    break_minutes: number
}

type CalendarView = 'month' | 'week' | 'day'

type BlockForm = {
    day_of_week: number
    start_time: string
    end_time: string
    title: string
    is_in_person: boolean
    effective_from: string
    effective_to: string
    break_minutes: number
}

const DAYS = [
    'Lunes', 'Martes', 'Miércoles', 'Jueves',
    'Viernes', 'Sábado', 'Domingo',
]

const EMPTY_FORM: BlockForm = {
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    title: '',
    is_in_person: true,
    effective_from: dateToString(new Date()),
    effective_to: '',
    break_minutes: 60,
}

// Usa fechas locales para evitar desfases por zona horaria.
function dateToString(date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// function parseDate(value: string) {
//     const [year, month, day] = value.split('-').map(Number)
//     return new Date(year, month - 1, day, 12)
// }

function addDays(date: Date, amount: number) {
    const result = new Date(date)
    result.setDate(result.getDate() + amount)
    return result
}

function startOfWeek(date: Date) {
    const result = new Date(date)
    result.setHours(12, 0, 0, 0)
    const day = (result.getDay() + 6) % 7
    result.setDate(result.getDate() - day)
    return result
}

function formatDate(date: Date, options?: Intl.DateTimeFormatOptions) {
    return new Intl.DateTimeFormat('es-CL', options ?? {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date)
}

function hoursBetween(start: string, end: string, breakMinutes = 0) {
    const [startHour, startMinute] = start.split(':').map(Number)
    const [endHour, endMinute] = end.split(':').map(Number)
    const minutes = (endHour * 60 + endMinute) -
        (startHour * 60 + startMinute) - breakMinutes
    return Math.max(0, minutes / 60)
}

function blockAppliesOnDate(block: Block, date: Date) {
    const dateString = dateToString(date)
    const weekday = (date.getDay() + 6) % 7 + 1

    return block.day_of_week === weekday &&
        (!block.effective_from || dateString >= block.effective_from) &&
        (!block.effective_to || dateString <= block.effective_to)
}

function monthTitle(date: Date) {
    return new Intl.DateTimeFormat('es-CL', {
        month: 'long',
        year: 'numeric',
    }).format(date)
}

export default function Schedule() {
    const [blocks, setBlocks] = useState<Block[]>([])
    const [view, setView] = useState<CalendarView>('week')
    const [selectedDate, setSelectedDate] = useState(() => new Date())
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState('')
    const [form, setForm] = useState<BlockForm>(() => ({ ...EMPTY_FORM }))

    const load = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('schedule_blocks')
            .select('*')
            .order('day_of_week')
            .order('start_time')

        if (error) {
            setErrorMessage(`No se pudieron cargar las jornadas: ${error.message}`)
        } else {
            setErrorMessage('')
            setBlocks((data ?? []).map((item) => ({
                ...item,
                effective_from: item.effective_from ?? null,
                effective_to: item.effective_to ?? null,
                break_minutes: Number(item.break_minutes ?? 0),
            })) as Block[])
        }

        setLoading(false)
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    const visibleDates = useMemo(() => {
        if (view === 'day') return [new Date(selectedDate)]

        if (view === 'week') {
            const first = startOfWeek(selectedDate)
            return Array.from({ length: 7 }, (_, index) => addDays(first, index))
        }

        const firstOfMonth = new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            1,
            12,
        )
        const first = startOfWeek(firstOfMonth)
        const lastOfMonth = new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth() + 1,
            0,
            12,
        )
        const last = startOfWeek(lastOfMonth)
        const days: Date[] = []

        for (
            let date = first;
            date <= addDays(last, 6);
            date = addDays(date, 1)
        ) {
            days.push(new Date(date))
        }

        return days
    }, [selectedDate, view])

    const weeklyHours = useMemo(() => {
        const first = startOfWeek(selectedDate)
        return Array.from({ length: 7 }, (_, index) => addDays(first, index))
            .reduce((total, date) => total + blocks
                .filter((block) => blockAppliesOnDate(block, date))
                .reduce((sum, block) => sum + hoursBetween(
                    block.start_time,
                    block.end_time,
                    block.break_minutes,
                ), 0), 0)
    }, [blocks, selectedDate])

    const monthlyHours = useMemo(() => {
        const year = selectedDate.getFullYear()
        const month = selectedDate.getMonth()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        let total = 0

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day, 12)
            total += blocks
                .filter((block) => blockAppliesOnDate(block, date))
                .reduce((sum, block) => sum + hoursBetween(
                    block.start_time,
                    block.end_time,
                    block.break_minutes,
                ), 0)
        }

        return total
    }, [blocks, selectedDate])

    function navigate(direction: number) {
        if (view === 'month') {
            setSelectedDate(new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth() + direction,
                1,
                12,
            ))
        } else if (view === 'week') {
            setSelectedDate(addDays(selectedDate, direction * 7))
        } else {
            setSelectedDate(addDays(selectedDate, direction))
        }
    }

    function openNewForm(date?: Date) {
        const nextDate = date ?? selectedDate
        const weekday = (nextDate.getDay() + 6) % 7 + 1

        setEditingId(null)
        setForm({
            ...EMPTY_FORM,
            day_of_week: weekday,
            effective_from: dateToString(nextDate),
        })
        setErrorMessage('')
        setShowForm(true)
    }

    function openEditForm(block: Block) {
        setEditingId(block.id)
        setForm({
            day_of_week: block.day_of_week,
            start_time: block.start_time.slice(0, 5),
            end_time: block.end_time.slice(0, 5),
            title: block.title,
            is_in_person: block.is_in_person,
            effective_from: block.effective_from ?? '',
            effective_to: block.effective_to ?? '',
            break_minutes: block.break_minutes ?? 0,
        })
        setErrorMessage('')
        setShowForm(true)
    }

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setErrorMessage('')

        if (form.end_time <= form.start_time) {
            setErrorMessage('La hora de término debe ser posterior a la hora de inicio.')
            return
        }

        if (
            form.effective_from &&
            form.effective_to &&
            form.effective_to < form.effective_from
        ) {
            setErrorMessage('La fecha de término de vigencia debe ser posterior a la fecha de inicio.')
            return
        }

        const duration = hoursBetween(
            form.start_time,
            form.end_time,
            form.break_minutes,
        )

        if (duration <= 0) {
            setErrorMessage('La jornada debe tener horas de trabajo después de descontar la colación.')
            return
        }

        setSaving(true)

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            setErrorMessage('Debes iniciar sesión para guardar una jornada.')
            setSaving(false)
            return
        }

        const payload = {
            user_id: user.id,
            day_of_week: form.day_of_week,
            start_time: form.start_time,
            end_time: form.end_time,
            title: form.title.trim(),
            is_in_person: form.is_in_person,
            effective_from: form.effective_from || null,
            effective_to: form.effective_to || null,
            break_minutes: Number(form.break_minutes),
        }

        const result = editingId
            ? await supabase
                .from('schedule_blocks')
                .update(payload)
                .eq('id', editingId)
            : await supabase
                .from('schedule_blocks')
                .insert(payload)

        setSaving(false)

        if (result.error) {
            setErrorMessage(
                `No se pudo guardar. Comprueba que ejecutaste la migración SQL. Detalle: ${result.error.message}`,
            )
            return
        }

        setShowForm(false)
        setEditingId(null)
        await load()
    }

    async function removeBlock(block: Block) {
        const confirmed = window.confirm(
            `¿Quieres eliminar la jornada "${block.title}"? Esta acción no se puede deshacer.`,
        )
        if (!confirmed) return

        const { error } = await supabase
            .from('schedule_blocks')
            .delete()
            .eq('id', block.id)

        if (error) {
            setErrorMessage(`No se pudo eliminar la jornada: ${error.message}`)
            return
        }

        await load()
    }

    function blocksForDate(date: Date) {
        return blocks
            .filter((block) => blockAppliesOnDate(block, date))
            .sort((a, b) => a.start_time.localeCompare(b.start_time))
    }

    function renderBlock(block: Block) {
        return (
            <div
                key={block.id}
                className={`group rounded-lg border-l-4 p-2 ${block.is_in_person
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                    }`}
            >
                <p className="text-xs font-semibold text-primary">
                    {block.start_time.slice(0, 5)} – {block.end_time.slice(0, 5)}
                </p>
                <p className="mt-1 break-words text-xs font-medium text-primary">
                    {block.title}
                </p>
                <p className="mt-1 text-[11px] text-secondary">
                    {hoursBetween(
                        block.start_time,
                        block.end_time,
                        block.break_minutes,
                    ).toFixed(1)} h · {block.is_in_person ? 'Presencial' : 'Remoto'}
                </p>
                <div className="mt-2 flex gap-3">
                    <button
                        type="button"
                        onClick={() => openEditForm(block)}
                        className="text-xs font-medium text-blue-700 hover:underline dark:text-blue-300"
                    >
                        Editar
                    </button>
                    <button
                        type="button"
                        onClick={() => void removeBlock(block)}
                        className="text-xs font-medium text-red-600 hover:underline"
                    >
                        Eliminar
                    </button>
                </div>
            </div>
        )
    }

    const calendarHeading = view === 'month'
        ? monthTitle(selectedDate)
        : view === 'week'
            ? `${formatDate(startOfWeek(selectedDate), { day: 'numeric', month: 'short' })} – ${formatDate(addDays(startOfWeek(selectedDate), 6), { day: 'numeric', month: 'short', year: 'numeric' })}`
            : formatDate(selectedDate, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            })

    return (
        <div className="space-y-6">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Calendario de jornada
                    </h1>
                    <p className="mt-1 text-sm text-secondary">
                        Organiza tus horarios y consulta las horas planificadas.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => openNewForm()}
                    className="btn-primary shrink-0"
                >
                    + Nueva jornada
                </button>
            </header>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="card">
                    <p className="text-sm text-secondary">Horas planificadas esta semana</p>
                    <p className="mt-1 text-2xl font-semibold">{weeklyHours.toFixed(1)} h</p>
                </div>
                <div className="card">
                    <p className="text-sm text-secondary">Horas planificadas este mes</p>
                    <p className="mt-1 text-2xl font-semibold">{monthlyHours.toFixed(1)} h</p>
                </div>
            </section>

            <section className="card space-y-4">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm hover:bg-[var(--bg-hover)]"
                                aria-label="Periodo anterior"
                            >
                                ‹
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedDate(new Date())}
                                className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm hover:bg-[var(--bg-hover)]"
                            >
                                Hoy
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate(1)}
                                className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm hover:bg-[var(--bg-hover)]"
                                aria-label="Periodo siguiente"
                            >
                                ›
                            </button>
                        </div>

                        <div className="flex rounded-lg bg-[var(--bg-subtle)] p-1">
                            {([
                                ['month', 'Mes'],
                                ['week', 'Semana'],
                                ['day', 'Día'],
                            ] as const).map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setView(value)}
                                    className={`rounded-md px-3 py-2 text-sm ${view === value
                                        ? 'bg-[var(--bg-card)] font-semibold text-primary shadow-sm'
                                        : 'text-secondary hover:text-primary'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <h2 className="text-lg font-semibold capitalize">{calendarHeading}</h2>
                </div>

                {loading ? (
                    <p className="py-12 text-center text-sm text-secondary">
                        Cargando calendario…
                    </p>
                ) : view === 'month' ? (
                    <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-[var(--border-soft)]">
                        {DAYS.map((day) => (
                            <div
                                key={day}
                                className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)] p-2 text-center text-[10px] font-semibold text-secondary sm:text-xs"
                            >
                                <span className="hidden sm:inline">{day}</span>
                                <span className="sm:hidden">{day.slice(0, 3)}</span>
                            </div>
                        ))}
                        {visibleDates.map((date) => {
                            const inMonth = date.getMonth() === selectedDate.getMonth()
                            const dayBlocks = blocksForDate(date)

                            return (
                                <button
                                    type="button"
                                    key={dateToString(date)}
                                    onClick={() => {
                                        setSelectedDate(date)
                                        setView('day')
                                    }}
                                    className={`min-h-24 border-b border-r border-[var(--border-soft)] p-1 text-left transition-colors hover:bg-[var(--bg-hover)] sm:min-h-32 sm:p-2 ${inMonth ? '' : 'opacity-40'
                                        } ${dateToString(date) === dateToString(new Date())
                                            ? 'bg-blue-50/70 dark:bg-blue-950/20'
                                            : ''
                                        }`}
                                >
                                    <span className="text-xs font-medium">
                                        {date.getDate()}
                                    </span>
                                    <div className="mt-1 space-y-1">
                                        {dayBlocks.slice(0, 2).map((block) => (
                                            <div
                                                key={block.id}
                                                className={`truncate rounded px-1 py-1 text-[9px] sm:text-[10px] ${block.is_in_person
                                                    ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100'
                                                    : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100'
                                                    }`}
                                            >
                                                {block.start_time.slice(0, 5)} {block.title}
                                            </div>
                                        ))}
                                        {dayBlocks.length > 2 && (
                                            <p className="text-[10px] text-secondary">
                                                +{dayBlocks.length - 2} más
                                            </p>
                                        )}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                ) : view === 'week' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
                        {visibleDates.map((date, index) => {
                            const dayBlocks = blocksForDate(date)

                            return (
                                <div
                                    key={dateToString(date)}
                                    className="min-h-40 rounded-xl border border-[var(--border-soft)] p-3"
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedDate(date)
                                            setView('day')
                                        }}
                                        className="mb-3 text-left"
                                    >
                                        <p className="text-xs font-medium text-secondary">
                                            {DAYS[index]}
                                        </p>
                                        <p className={`mt-1 text-lg font-semibold ${dateToString(date) === dateToString(new Date())
                                            ? 'text-blue-600 dark:text-blue-300'
                                            : 'text-primary'
                                            }`}>
                                            {date.getDate()}
                                        </p>
                                    </button>
                                    <div className="space-y-2">
                                        {dayBlocks.length
                                            ? dayBlocks.map(renderBlock)
                                            : <p className="py-3 text-center text-xs text-muted">Sin jornadas</p>}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => openNewForm(date)}
                                        className="mt-3 w-full rounded-lg border border-dashed border-[var(--border-soft)] px-2 py-2 text-xs text-secondary hover:bg-[var(--bg-hover)]"
                                    >
                                        + Añadir
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--bg-subtle)] p-3">
                            <div>
                                <p className="font-medium">{DAYS[(selectedDate.getDay() + 6) % 7]}</p>
                                <p className="text-sm text-secondary">{formatDate(selectedDate)}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => openNewForm(selectedDate)}
                                className="btn-primary text-sm"
                            >
                                + Añadir jornada
                            </button>
                        </div>
                        {blocksForDate(selectedDate).length ? (
                            blocksForDate(selectedDate).map(renderBlock)
                        ) : (
                            <div className="rounded-xl border border-dashed border-[var(--border-soft)] py-12 text-center">
                                <p className="font-medium">No hay jornadas para este día</p>
                                <p className="mt-1 text-sm text-secondary">
                                    Puedes crear una jornada con el botón de arriba.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex flex-wrap gap-4 text-xs text-secondary">
                    <span className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm bg-blue-500" />
                        Presencial
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm bg-emerald-500" />
                        Remoto
                    </span>
                </div>
            </section>

            {errorMessage && (
                <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                    {errorMessage}
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
                    <form
                        onSubmit={submit}
                        className="my-6 w-full max-w-xl space-y-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-5 shadow-xl sm:p-6"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-semibold">
                                    {editingId ? 'Editar jornada' : 'Nueva jornada'}
                                </h2>
                                <p className="mt-1 text-sm text-secondary">
                                    Define el horario y su periodo de vigencia.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="rounded-lg px-3 py-1 text-xl text-secondary hover:bg-[var(--bg-hover)]"
                                aria-label="Cerrar formulario"
                            >
                                ×
                            </button>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">Nombre de la actividad</label>
                            <input
                                value={form.title}
                                onChange={(event) => setForm({ ...form, title: event.target.value })}
                                className="input-base"
                                placeholder="Ej.: Jornada de práctica"
                                required
                                maxLength={120}
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">Día de la semana</label>
                            <select
                                value={form.day_of_week}
                                onChange={(event) => setForm({ ...form, day_of_week: Number(event.target.value) })}
                                className="input-base"
                            >
                                {DAYS.map((day, index) => (
                                    <option key={day} value={index + 1}>{day}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-sm font-medium">Hora de inicio</label>
                                <input
                                    type="time"
                                    value={form.start_time}
                                    onChange={(event) => setForm({ ...form, start_time: event.target.value })}
                                    className="input-base"
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium">Hora de término</label>
                                <input
                                    type="time"
                                    value={form.end_time}
                                    onChange={(event) => setForm({ ...form, end_time: event.target.value })}
                                    className="input-base"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">Colación (minutos)</label>
                            <input
                                type="number"
                                min={0}
                                max={300}
                                step={5}
                                value={form.break_minutes}
                                onChange={(event) => setForm({
                                    ...form,
                                    break_minutes: Number(event.target.value),
                                })}
                                className="input-base"
                                required
                            />
                            <p className="mt-1 text-xs text-secondary">
                                Horas netas estimadas: {hoursBetween(
                                    form.start_time,
                                    form.end_time,
                                    form.break_minutes,
                                ).toFixed(2)} h
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium">Vigente desde</label>
                                <input
                                    type="date"
                                    value={form.effective_from}
                                    onChange={(event) => setForm({ ...form, effective_from: event.target.value })}
                                    className="input-base"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium">Vigente hasta (opcional)</label>
                                <input
                                    type="date"
                                    value={form.effective_to}
                                    onChange={(event) => setForm({ ...form, effective_to: event.target.value })}
                                    className="input-base"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">Modalidad</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, is_in_person: true })}
                                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${form.is_in_person
                                        ? 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200'
                                        : 'border-[var(--border-soft)]'
                                        }`}
                                >
                                    Presencial
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, is_in_person: false })}
                                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${!form.is_in_person
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                                        : 'border-[var(--border-soft)]'
                                        }`}
                                >
                                    Remoto
                                </button>
                            </div>
                        </div>

                        {errorMessage && (
                            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200">
                                {errorMessage}
                            </p>
                        )}

                        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false)
                                    setErrorMessage('')
                                }}
                                className="rounded-lg border border-[var(--border-soft)] px-4 py-2 text-sm font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-primary"
                            >
                                {saving
                                    ? 'Guardando…'
                                    : editingId
                                        ? 'Guardar cambios'
                                        : 'Crear jornada'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}
