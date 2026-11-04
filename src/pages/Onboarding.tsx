
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/utils'
import CareerAutocomplete from '../components/CareerAutocomplete'

type OnboardingProps = {
    userId?: string
    profile?: Profile | null
    googleName?: string
    onDone?: () => void | Promise<void>
}

export default function Onboarding({
    userId,
    profile,
    googleName,
    onDone,
}: OnboardingProps = {}) {
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const [form, setForm] = useState({
        name: 'Mi práctica profesional',
        institution: profile?.institution ?? '',
        career: profile?.career ?? '',
        required_hours: profile?.required_hours ?? 360,
        weekly_hours_target: profile?.weekly_hours_target ?? 30,
        start_date: '',
    })

    const set = (
        key: keyof typeof form,
        value: string | number
    ) => {
        setForm((current) => ({
            ...current,
            [key]: value,
        }))
    }

    const finish = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError('')

        if (!form.institution.trim()) {
            setError('Ingresa el nombre de tu institución.')
            return
        }

        if (!form.career.trim()) {
            setError('Ingresa o selecciona tu carrera.')
            return
        }

        if (form.required_hours <= 0 || form.weekly_hours_target <= 0) {
            setError('Las metas de horas deben ser mayores que cero.')
            return
        }

        setSaving(true)

        try {
            const { data: authData, error: authError } =
                await supabase.auth.getUser()

            if (authError) throw authError

            const uid = userId || authData.user?.id

            if (!uid) {
                throw new Error('No se pudo identificar tu cuenta. Inicia sesión nuevamente.')
            }

            const { error: practiceError } = await supabase
                .from('practices')
                .insert({
                    user_id: uid,
                    name: form.name.trim(),
                    institution: form.institution.trim(),
                    career: form.career.trim(),
                    required_hours: form.required_hours,
                    weekly_hours_target: form.weekly_hours_target,
                    start_date: form.start_date || null,
                    is_active: true,
                })

            if (practiceError) throw practiceError

            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name:
                        profile?.full_name ||
                        googleName ||
                        authData.user?.user_metadata?.full_name ||
                        '',
                    institution: form.institution.trim(),
                    career: form.career.trim(),
                    required_hours: form.required_hours,
                    weekly_hours_target: form.weekly_hours_target,
                    start_date: form.start_date || null,
                    onboarded: true,
                })
                .eq('id', uid)

            if (profileError) throw profileError

            await onDone?.()
        } catch (err) {
            console.error('Error al configurar la práctica:', err)

            setError(
                err instanceof Error
                    ? err.message
                    : 'No pudimos guardar tu configuración. Inténtalo nuevamente.'
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 text-slate-800 px-4 py-10 sm:py-16">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-9">
                    <img
                        src="/icon-practitrack.png"
                        alt=""
                        className="w-14 h-14 object-contain mx-auto mb-5"
                    />

                    <p className="text-sm font-bold tracking-widest text-blue-600 uppercase">
                        Tu espacio está listo
                    </p>

                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#101F3A] mt-3">
                        ¡Bienvenido a PractiTrack!
                    </h1>

                    <p className="text-slate-500 mt-3 leading-7 max-w-lg mx-auto">
                        Vamos a preparar tu espacio de trabajo. Cuéntanos un poco sobre tu práctica para adaptar el seguimiento a tus necesidades.
                    </p>
                </div>

                <form
                    onSubmit={finish}
                    className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-9"
                >
                    <div className="mb-7">
                        <h2 className="text-xl font-bold text-[#101F3A]">
                            Configura tu práctica
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Podrás modificar esta información más adelante.
                        </p>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label htmlFor="practice-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                                Nombre de tu práctica
                            </label>
                            <input
                                id="practice-name"
                                type="text"
                                required
                                maxLength={100}
                                value={form.name}
                                onChange={(event) => set('name', event.target.value)}
                                placeholder="Ej. Práctica profesional"
                                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>

                        <div>
                            <label htmlFor="institution" className="block text-sm font-medium text-slate-700 mb-1.5">
                                Institución educativa
                            </label>
                            <input
                                id="institution"
                                type="text"
                                required
                                maxLength={150}
                                value={form.institution}
                                onChange={(event) => set('institution', event.target.value)}
                                placeholder="Ej. DUOC UC"
                                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>

                        <CareerAutocomplete
                            value={form.career}
                            onChange={(value) => set('career', value)}
                            required
                        />

                        <div>
                            <label htmlFor="start-date" className="block text-sm font-medium text-slate-700 mb-1.5">
                                Fecha de inicio
                            </label>
                            <input
                                id="start-date"
                                type="date"
                                value={form.start_date}
                                onChange={(event) => set('start_date', event.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>

                        <div className="border-t border-slate-100 pt-6">
                            <h3 className="font-semibold text-[#101F3A]">
                                Tus metas de horas
                            </h3>
                            <p className="text-sm text-slate-500 mt-1 mb-5">
                                Indica cuántas horas debes completar y cuál será tu objetivo semanal.
                            </p>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="required-hours" className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Horas totales requeridas
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="required-hours"
                                            type="number"
                                            min="1"
                                            max="10000"
                                            required
                                            value={form.required_hours}
                                            onChange={(event) => set('required_hours', Number(event.target.value))}
                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                                            horas
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="weekly-hours" className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Meta semanal
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="weekly-hours"
                                            type="number"
                                            min="1"
                                            max="168"
                                            required
                                            value={form.weekly_hours_target}
                                            onChange={(event) => set('weekly_hours_target', Number(event.target.value))}
                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                                            h/sem
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div role="alert" className="mt-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3.5 transition"
                        >
                            {saving ? 'Guardando tu configuración...' : 'Guardar y entrar a PractiTrack'}
                        </button>

                        <p className="text-center text-xs text-slate-400 mt-4">
                            No te preocupes, podrás actualizar estos datos más adelante.
                        </p>
                    </div>
                </form>

                <p className="text-center text-xs text-slate-400 mt-6">
                    PractiTrack · Organiza tu práctica, registra tu progreso.
                </p>
            </div>
        </main>
    )
}
