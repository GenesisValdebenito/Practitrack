import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DAYS } from '../lib/utils'

type Block = {
    id: string
    day_of_week: number
    start_time: string
    end_time: string
    title: string
    is_in_person: boolean
}

export default function Schedule() {
    const [blocks, setBlocks] = useState<Block[]>([])
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        day_of_week: 1,
        start_time: '09:00',
        end_time: '13:00',
        title: '',
        is_in_person: true,
    })

    const load = useCallback(async () => {
        const { data } = await supabase
            .from('schedule_blocks')
            .select('*')
            .order('day_of_week')
            .order('start_time')
        setBlocks(data ?? [])
    }, [])
    useEffect(() => { load() }, [load])

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const { data: { user } } = await supabase.auth.getUser()
        const { error } = await supabase.from('schedule_blocks').insert({
            user_id: user!.id,
            ...form,
        })
        setSaving(false)
        if (error) return alert(error.message)
        setForm({ ...form, title: '' })
        setShowForm(false)
        load()
    }

    const remove = async (id: string) => {
        await supabase.from('schedule_blocks').delete().eq('id', id)
        load()
    }

    const totalWeeklyHours = blocks.reduce((s, b) => {
        const [sh, sm] = b.start_time.split(':').map(Number)
        const [eh, em] = b.end_time.split(':').map(Number)
        return s + (eh + em / 60) - (sh + sm / 60)
    }, 0)

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Horario semanal</h1>
                    <p className="text-sm text-secondary mt-1">
                        {blocks.length} bloques · {totalWeeklyHours.toFixed(1)} h planificadas por semana
                    </p>
                </div>
                <button onClick={() => setShowForm((v) => !v)} className="btn-primary shrink-0">
                    {showForm ? 'Cancelar' : '+ Nuevo bloque'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={submit} className="card animate-slide-up space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-secondary mb-1 block">Día</label>
                            <select
                                value={form.day_of_week}
                                onChange={(e) => setForm({ ...form, day_of_week: Number(e.target.value) })}
                                className="input-base"
                            >
                                {DAYS.map((d, i) => (
                                    <option key={i} value={i + 1}>{d}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-secondary mb-1 block">Actividad</label>
                            <input
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                className="input-base"
                                placeholder="Ej: Desarrollo de módulo"
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-secondary mb-1 block">Inicio</label>
                            <input
                                type="time"
                                value={form.start_time}
                                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                                className="input-base"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-secondary mb-1 block">Fin</label>
                            <input
                                type="time"
                                value={form.end_time}
                                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                                className="input-base"
                                required
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, is_in_person: true })}
                            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${form.is_in_person
                                    ? 'bg-brand-600 text-[var(--color-brand-contrast)]'
                                    : 'bg-[var(--bg-subtle)] text-secondary hover:bg-[var(--bg-hover)]'
                                }`}
                        >
                            Presencial
                        </button>
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, is_in_person: false })}
                            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${!form.is_in_person
                                    ? 'bg-brand-600 text-[var(--color-brand-contrast)]'
                                    : 'bg-[var(--bg-subtle)] text-secondary hover:bg-[var(--bg-hover)]'
                                }`}
                        >
                            Remoto
                        </button>
                    </div>
                    <button type="submit" disabled={saving} className="btn-primary w-full">
                        {saving ? 'Guardando...' : 'Agregar bloque'}
                    </button>
                </form>
            )}

            <div className="grid md:grid-cols-7 gap-3">
                {DAYS.map((day, i) => {
                    const dayBlocks = blocks.filter((b) => b.day_of_week === i + 1)
                    return (
                        <div
                            key={i}
                            className="bg-[var(--bg-subtle)] border border-[var(--border-soft)] rounded-xl p-3 min-h-[200px]"
                        >
                            <p className="text-xs font-medium text-secondary mb-3">{day}</p>
                            <div className="space-y-2">
                                {dayBlocks.length === 0 && (
                                    <p className="text-[10px] text-muted text-center py-4">Sin bloques</p>
                                )}
                                {dayBlocks.map((b) => (
                                    <div
                                        key={b.id}
                                        className={`rounded-lg p-2.5 group cursor-default ${b.is_in_person
                                                ? 'bg-brand-100 border-l-2 border-brand-500 dark:bg-brand-900/40 dark:border-brand-400'
                                                : 'bg-emerald-100 border-l-2 border-emerald-500 dark:bg-emerald-900/40 dark:border-emerald-400'
                                            }`}
                                    >
                                        <p className="text-xs font-semibold text-primary">
                                            {b.start_time} – {b.end_time}
                                        </p>
                                        <p className="text-[11px] text-secondary truncate mt-0.5">
                                            {b.title}
                                        </p>
                                        <div className="flex justify-between items-center mt-1.5">
                                            <span className="text-[9px] uppercase tracking-wide text-muted">
                                                {b.is_in_person ? 'Presencial' : 'Remoto'}
                                            </span>
                                            <button
                                                onClick={() => remove(b.id)}
                                                className="text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="flex gap-4 text-xs text-secondary">
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-brand-100 dark:bg-brand-900/40 border-l-2 border-brand-500" /> Presencial
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-emerald-100 dark:bg-emerald-900/40 border-l-2 border-emerald-500" /> Remoto
                </span>
            </div>
        </div>
    )
}