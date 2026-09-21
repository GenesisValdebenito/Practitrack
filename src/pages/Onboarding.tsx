import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/utils'

const STEPS = [
    { id: 1, label: 'Datos personales' },
    { id: 2, label: 'Datos de la práctica' },
    { id: 3, label: 'Meta de horas' },
    { id: 4, label: 'Listo' },
]

type OnboardingProps = {
    userId?: string
    profile?: Profile | null
    googleName?: string
    onDone?: () => void
}

export default function Onboarding({ userId, profile, googleName, onDone }: OnboardingProps = {}) {
    const [step, setStep] = useState(1)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        full_name: profile?.full_name || googleName || '',
        career: profile?.career ?? '',
        institution: profile?.institution ?? '',
        company: profile?.company ?? '',
        supervisor: profile?.supervisor ?? '',
        start_date: profile?.start_date ?? '',
        required_hours: profile?.required_hours ?? 360,
        weekly_hours_target: profile?.weekly_hours_target ?? 28,
    })

    const set = (k: keyof typeof form, v: string | number) =>
        setForm((f) => ({ ...f, [k]: v }))

    const next = () => setStep((s) => Math.min(s + 1, 4))
    const prev = () => setStep((s) => Math.max(s - 1, 1))

    const finish = async () => {
        setSaving(true)
        const uid = userId || (await supabase.auth.getUser()).data.user?.id
        if (uid) {
            await supabase
                .from('profiles')
                .update({ ...form, onboarded: true })
                .eq('id', uid)
        }
        setSaving(false)
        onDone?.()
    }

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Stepper lateral (desktop) */}
            <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 p-8 flex-col">
                <div className="flex items-center gap-2 mb-10">
                    <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-sm">
                        P
                    </div>
                    <span className="font-semibold">PractiTrack</span>
                </div>

                <p className="text-xs text-slate-400 uppercase tracking-wide mb-4">Configuración</p>

                <ol className="space-y-4 flex-1">
                    {STEPS.map((s) => {
                        const active = s.id === step
                        const done = s.id < step
                        return (
                            <li key={s.id} className="flex items-start gap-3">
                                <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition-colors ${done
                                        ? 'bg-emerald-500 text-white'
                                        : active
                                            ? 'bg-brand-600 text-white'
                                            : 'bg-slate-100 text-slate-400'
                                        }`}
                                >
                                    {done ? '✓' : s.id}
                                </div>
                                <div className="pt-0.5">
                                    <p className={`text-sm font-medium ${active ? 'text-slate-900' : 'text-slate-500'}`}>
                                        {s.label}
                                    </p>
                                </div>
                            </li>
                        )
                    })}
                </ol>

                <p className="text-xs text-slate-400">Puedes cambiar esto luego desde Perfil.</p>
            </aside>

            {/* Contenido */}
            <main className="flex-1 flex flex-col">
                <div className="md:hidden p-4 border-b bg-white">
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold">Configuración</span>
                        <span className="text-xs text-slate-400">Paso {step} de 4</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                            className="h-1.5 rounded-full bg-brand-600 transition-all"
                            style={{ width: `${(step / 4) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-6 md:p-12">
                    <div className="w-full max-w-lg animate-slide-up">
                        {step === 1 && (
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight mb-1">
                                    Cuéntanos sobre ti
                                </h1>
                                <p className="text-sm text-slate-500 mb-8">
                                    Esta información aparecerá en tu informe final.
                                </p>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 mb-1 block">
                                            Nombre completo
                                        </label>
                                        <input
                                            value={form.full_name}
                                            onChange={(e) => set('full_name', e.target.value)}
                                            className="input-base"
                                            placeholder="Génesis Valdebenito"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 mb-1 block">
                                            Carrera
                                        </label>
                                        <input
                                            value={form.career}
                                            onChange={(e) => set('career', e.target.value)}
                                            className="input-base"
                                            placeholder="Ingeniería en Informática"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 mb-1 block">
                                            Institución
                                        </label>
                                        <input
                                            value={form.institution}
                                            onChange={(e) => set('institution', e.target.value)}
                                            className="input-base"
                                            placeholder="Duoc UC"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight mb-1">
                                    ¿Dónde harás tu práctica?
                                </h1>
                                <p className="text-sm text-slate-500 mb-8">
                                    Datos de la empresa o institución donde practicarás.
                                </p>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 mb-1 block">
                                            Empresa o institución
                                        </label>
                                        <input
                                            value={form.company}
                                            onChange={(e) => set('company', e.target.value)}
                                            className="input-base"
                                            placeholder="Nombre de la empresa"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 mb-1 block">
                                            Supervisor de práctica
                                        </label>
                                        <input
                                            value={form.supervisor}
                                            onChange={(e) => set('supervisor', e.target.value)}
                                            className="input-base"
                                            placeholder="Nombre del supervisor"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 mb-1 block">
                                            Fecha de inicio
                                        </label>
                                        <input
                                            type="date"
                                            value={form.start_date}
                                            onChange={(e) => set('start_date', e.target.value)}
                                            className="input-base"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight mb-1">
                                    Define tu meta
                                </h1>
                                <p className="text-sm text-slate-500 mb-8">
                                    PractiTrack usará estos números para calcular tu progreso.
                                </p>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 mb-1 block">
                                            Horas totales requeridas
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={form.required_hours}
                                            onChange={(e) => set('required_hours', Number(e.target.value))}
                                            className="input-base"
                                        />
                                        <p className="text-xs text-slate-400 mt-1">
                                            Por defecto 360 h para práctica profesional.
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 mb-1 block">
                                            Meta semanal de horas
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={40}
                                            value={form.weekly_hours_target}
                                            onChange={(e) => set('weekly_hours_target', Number(e.target.value))}
                                            className="input-base"
                                        />
                                        <p className="text-xs text-slate-400 mt-1">
                                            Recomendado: entre 20 y 30 h para jornada parcial.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl mx-auto mb-6">
                                    ✓
                                </div>
                                <h1 className="text-2xl font-semibold tracking-tight mb-2">
                                    ¡Todo listo, {form.full_name?.split(' ')[0] || 'practicante'}!
                                </h1>
                                <p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto">
                                    Ya puedes empezar a registrar tus horas, planificar tareas y ver tu progreso hacia las {form.required_hours} horas.
                                </p>
                                <div className="card text-left text-sm space-y-2 mb-6">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Carrera</span>
                                        <span className="font-medium">{form.career || '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Institución</span>
                                        <span className="font-medium">{form.institution || '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Meta total</span>
                                        <span className="font-medium">{form.required_hours} h</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Meta semanal</span>
                                        <span className="font-medium">{form.weekly_hours_target} h</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Botones de navegación */}
                        <div className="flex justify-between items-center mt-10">
                            <button
                                onClick={prev}
                                disabled={step === 1}
                                className="btn-ghost disabled:opacity-30"
                            >
                                ← Volver
                            </button>
                            {step < 4 ? (
                                <button onClick={next} className="btn-primary">
                                    Siguiente →
                                </button>
                            ) : (
                                <button onClick={finish} disabled={saving} className="btn-primary">
                                    {saving ? 'Guardando...' : 'Empezar a usar PractiTrack'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}