import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fmt } from '../lib/utils'

// Eventos globales para comunicarse con el resto de la app sin tocar su estado
export const LOGS_CHANGED_EVENT = 'worklogs:changed'
export const OPEN_QUICKLOG_EVENT = 'quicklog:open'

const CATEGORIES = ['Desarrollo', 'Reunión', 'Documentación', 'Investigación', 'Testing', 'Otro']

// Rutas donde el botón flotante NO se muestra
const HIDDEN_ON = ['/configuracion', '/perfil']

const emptyForm = () => ({
    date: fmt(new Date()),
    hours_worked: 1,
    task_description: '',
    category: 'Desarrollo',
    is_in_person: false,
})

export default function QuickLogWidget() {
    const { pathname } = useLocation()
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [savedMsg, setSavedMsg] = useState(false)
    const [form, setForm] = useState(emptyForm)

    const hidden = HIDDEN_ON.some((p) => pathname.startsWith(p))

    // Permite abrir el bloque desde otros lugares (ej. Dashboard)
    useEffect(() => {
        const onOpen = () => setOpen(true)
        window.addEventListener(OPEN_QUICKLOG_EVENT, onOpen)
        return () => window.removeEventListener(OPEN_QUICKLOG_EVENT, onOpen)
    }, [])

    // Esc cierra el bloque
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open])

    useEffect(() => {
        if (!savedMsg) return
        const t = setTimeout(() => setSavedMsg(false), 2000)
        return () => clearTimeout(t)
    }, [savedMsg])

    if (hidden) return null

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSaving(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setSaving(false)
            return setError('Sesión no válida')
        }
        const { error } = await supabase.from('work_logs').insert({ user_id: user.id, ...form })
        setSaving(false)
        if (error) return setError(error.message)

        // Mantiene fecha, categoría y modalidad para registrar varias actividades seguidas
        setForm({ ...form, task_description: '', hours_worked: 1 })
        setSavedMsg(true)
        window.dispatchEvent(new Event(LOGS_CHANGED_EVENT))
    }

    return (
        // El contenedor no captura clics: solo el botón y el panel son interactivos,
        // así el resto de la plataforma sigue usable mientras el bloque está abierto.
        <div className="fixed bottom-[4.5rem] right-4 md:bottom-6 md:right-6 z-40 flex flex-col items-end gap-3 pointer-events-none">
            {open && (
                <form
                    onSubmit={submit}
                    className="pointer-events-auto w-[min(22rem,calc(100vw-2rem))] max-h-[calc(100vh-10rem)] overflow-y-auto bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-soft)] rounded-xl shadow-2xl p-4 space-y-3 animate-slide-up"
                    role="dialog"
                    aria-label="Agregar actividad"
                >
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-sm">Agregar actividad</h2>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg leading-none px-1"
                            aria-label="Cerrar"
                        >
                            ×
                        </button>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Descripción</label>
                        <input
                            value={form.task_description}
                            onChange={(e) => setForm({ ...form, task_description: e.target.value })}
                            className="input-base"
                            placeholder="¿Qué hiciste?"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Fecha</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                                className="input-base"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Horas</label>
                            <input
                                type="number"
                                step="0.25"
                                min="0.25"
                                max="24"
                                value={form.hours_worked}
                                onChange={(e) => setForm({ ...form, hours_worked: Number(e.target.value) })}
                                className="input-base"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Categoría</label>
                        <select
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                            className="input-base"
                        >
                            {CATEGORIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-2">
                        {[true, false].map((v) => (
                            <button
                                key={String(v)}
                                type="button"
                                onClick={() => setForm({ ...form, is_in_person: v })}
                                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${form.is_in_person === v
                                    ? 'bg-brand-600 text-white'
                                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                                    }`}
                            >
                                {v ? 'Presencial' : 'Remoto'}
                            </button>
                        ))}
                    </div>

                    {error && (
                        <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
                    )}

                    <button type="submit" disabled={saving} className="btn-primary w-full">
                        {saving ? 'Guardando...' : savedMsg ? '✓ Guardado' : 'Guardar actividad'}
                    </button>
                </form>
            )}

            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="pointer-events-auto flex items-center gap-2 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-lg px-4 py-3 text-sm font-medium transition-colors"
                aria-expanded={open}
                aria-label={open ? 'Cerrar bloque de actividades' : 'Agregar actividad'}
            >
                <span className="text-lg leading-none">{open ? '×' : '+'}</span>
                {!open && <span>Actividad</span>}
            </button>
        </div>
    )
}
