import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/utils'

const STEPS = [
    { icon: '👋', title: '¡Bienvenido a PractiTrack!', text: 'Una plataforma para planificar tu práctica profesional, registrar tus horas y saber en todo momento cuánto te falta para completarla.' },
    { icon: '📅', title: 'Define tu horario', text: 'En "Horario" armas tu semana: qué días y en qué bloques trabajas, y cuáles son presenciales o remotos.' },
    { icon: '📝', title: 'Registra tu avance', text: 'Cada día anota en la "Bitácora" cuántas horas trabajaste y qué hiciste. En "Tareas" organizas lo pendiente.' },
    { icon: '📊', title: 'Mide tu progreso', text: 'El Dashboard te muestra el porcentaje de avance, las horas por semana y una fecha estimada de término.' },
]

type Props = {
    userId: string
    profile: Profile
    googleName: string
    onDone: () => void
}

export default function Onboarding({ userId, profile, googleName, onDone }: Props) {
    // Si ya tiene datos guardados, solo mostramos el tutorial (sin formulario)
    const hasSetup = !!profile.full_name

    const [step, setStep] = useState(0)
    const [form, setForm] = useState({
        full_name: profile.full_name ?? googleName,
        institution: profile.institution ?? '',
        career: profile.career ?? '',
        required_hours: profile.required_hours ?? 360,
        weekly_hours_target: profile.weekly_hours_target ?? 30,
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const isLastStep = step === STEPS.length - 1
    const isForm = !hasSetup && step === STEPS.length
    const totalBars = hasSetup ? STEPS.length : STEPS.length + 1

    // Solo marca el tutorial como visto (no toca tus datos)
    const markSeen = async () => {
        setSaving(true)
        const { error } = await supabase.from('profiles').update({ onboarded: true }).eq('id', userId)
        if (error) { setError(error.message); setSaving(false) } else onDone()
    }

    // Guarda datos + marca como visto (solo usuarios nuevos)
    const finish = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError('')
        const { error } = await supabase.from('profiles').upsert({ id: userId, ...form, onboarded: true })
        if (error) { setError(error.message); setSaving(false) } else onDone()
    }

    // Saltar: usuario existente termina; usuario nuevo va al formulario
    const skip = () => (hasSetup ? markSeen() : setStep(STEPS.length))

    const next = () => (hasSetup && isLastStep ? markSeen() : setStep(step + 1))

    const input = 'w-full border rounded-lg px-3 py-2'

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow p-8">
                <div className="flex gap-1 mb-6">
                    {Array.from({ length: totalBars }).map((_, i) => (
                        <div key={i} className={`h-1 flex-1 rounded ${i <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
                    ))}
                </div>

                {!isForm ? (
                    <div className="text-center">
                        <div className="text-5xl mb-4">{STEPS[step].icon}</div>
                        <h2 className="text-xl font-bold mb-2">{STEPS[step].title}</h2>
                        <p className="text-gray-600 mb-8">{STEPS[step].text}</p>

                        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

                        <div className="flex justify-between">
                            <button
                                disabled={step === 0}
                                onClick={() => setStep(step - 1)}
                                className="text-gray-500 disabled:opacity-0"
                            >
                                Atrás
                            </button>
                            <button
                                onClick={next}
                                disabled={saving}
                                className="bg-blue-600 text-white px-5 py-2 rounded-lg disabled:opacity-50"
                            >
                                {hasSetup && isLastStep ? (saving ? 'Guardando...' : 'Entendido ✅') : 'Siguiente'}
                            </button>
                        </div>

                        <button onClick={skip} disabled={saving} className="text-xs text-gray-400 mt-4">
                            {hasSetup ? 'Cerrar tutorial' : 'Saltar tutorial'}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={finish} className="space-y-3">
                        <h2 className="text-xl font-bold">Configura tu práctica</h2>
                        <input className={input} placeholder="Tu nombre" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                        <input className={input} placeholder="Institución" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
                        <input className={input} placeholder="Carrera" value={form.career} onChange={(e) => setForm({ ...form, career: e.target.value })} />
                        <label className="text-sm text-gray-600">Horas totales requeridas</label>
                        <input className={input} type="number" min={1} required value={form.required_hours} onChange={(e) => setForm({ ...form, required_hours: +e.target.value })} />
                        <label className="text-sm text-gray-600">Meta de horas por semana</label>
                        <input className={input} type="number" min={1} required value={form.weekly_hours_target} onChange={(e) => setForm({ ...form, weekly_hours_target: +e.target.value })} />
                        {error && <p className="text-red-600 text-sm">{error}</p>}
                        <div className="flex justify-between pt-2">
                            <button type="button" onClick={() => setStep(step - 1)} className="text-gray-500">Atrás</button>
                            <button disabled={saving} className="bg-blue-600 text-white px-5 py-2 rounded-lg disabled:opacity-50">
                                {saving ? 'Guardando...' : 'Empezar 🚀'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}