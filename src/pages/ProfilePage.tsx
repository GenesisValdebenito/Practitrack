
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Profile, Practice } from '../lib/utils'

type PaymentFrequency =
    | 'por_horas'
    | 'diario'
    | 'cada_5_dias'
    | 'semanal'
    | 'quincenal'
    | 'mensual'
    | 'dia_fijo'
    | 'intervalo_dias'

type PracticeForm = {
    name: string
    institution: string
    career: string
    company: string
    supervisor: string
    start_date: string
    required_hours: number
    weekly_hours_target: number
    payment_enabled: boolean
    payment_frequency: PaymentFrequency
    payment_amount: string
    payment_currency: string
    payment_start_date: string
    payment_day: string
    payment_interval_days: string
    payment_interval_hours: string
}

const inputClass =
    'w-full bg-[var(--bg-app)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm focus:border-gray-500 outline-none'

const initialPracticeForm = (practice?: Practice): PracticeForm => {
    const p = practice as (Practice & {
        payment_enabled?: boolean
        payment_frequency?: PaymentFrequency
        payment_amount?: number | string | null
        payment_currency?: string
        payment_start_date?: string | null
        payment_day?: number | null
        payment_interval_days?: number | null
        payment_interval_hours?: number | null
    }) | undefined

    return {
        name: p?.name || '',
        institution: p?.institution || '',
        career: p?.career || '',
        company: p?.company || '',
        supervisor: p?.supervisor || '',
        start_date: p?.start_date || '',
        required_hours: p?.required_hours || 360,
        weekly_hours_target: p?.weekly_hours_target || 30,
        payment_enabled: p?.payment_enabled ?? false,
        payment_frequency: p?.payment_frequency || 'mensual',
        payment_amount: p?.payment_amount == null ? '' : String(p.payment_amount),
        payment_currency: p?.payment_currency || 'CLP',
        payment_start_date: p?.payment_start_date || '',
        payment_day: p?.payment_day == null ? '30' : String(p.payment_day),
        payment_interval_days: p?.payment_interval_days == null ? '5' : String(p.payment_interval_days),
        payment_interval_hours: p?.payment_interval_hours == null ? '120' : String(p.payment_interval_hours),
    }
}

export default function ProfilePage() {
    const {
        profile,
        practices = [],
        activePracticeId,
        refresh,
    } = useOutletContext<{
        profile: Profile
        practices: Practice[]
        activePracticeId: string
        refresh: () => void
    }>()

    const activePractice = practices.find((practice) => practice.id === activePracticeId)

    const [savingProfile, setSavingProfile] = useState(false)
    const [savingPractice, setSavingPractice] = useState(false)
    const [saved, setSaved] = useState('')
    const [error, setError] = useState('')

    const [profileForm, setProfileForm] = useState({
        full_name: profile.full_name || '',
        email: profile.email || '',
    })

    const [practiceForm, setPracticeForm] = useState<PracticeForm>(
        () => initialPracticeForm(activePractice)
    )

    useEffect(() => {
        setProfileForm({
            full_name: profile.full_name || '',
            email: profile.email || '',
        })
    }, [profile.full_name, profile.email])

    useEffect(() => {
        setPracticeForm(initialPracticeForm(activePractice))
    }, [activePractice])

    const saveProfile = async () => {
        setError('')
        setSavingProfile(true)

        const { error: saveError } = await supabase
            .from('profiles')
            .update({ full_name: profileForm.full_name.trim() })
            .eq('id', profile.id)

        setSavingProfile(false)

        if (saveError) {
            setError(`No se pudo guardar la cuenta: ${saveError.message}`)
            return
        }

        setSaved('profile')
        refresh()
        window.setTimeout(() => setSaved(''), 2500)
    }

    const savePractice = async () => {
        if (!activePractice) return

        setError('')

        const amount = practiceForm.payment_amount.trim() === ''
            ? null
            : Number(practiceForm.payment_amount)

        const paymentDay = practiceForm.payment_day.trim() === ''
            ? null
            : Number(practiceForm.payment_day)

        const intervalDays = practiceForm.payment_interval_days.trim() === ''
            ? null
            : Number(practiceForm.payment_interval_days)

        const intervalHours = practiceForm.payment_interval_hours.trim() === ''
            ? null
            : Number(practiceForm.payment_interval_hours)

        if (practiceForm.required_hours <= 0 || practiceForm.weekly_hours_target <= 0) {
            setError('Las metas de horas deben ser mayores que cero.')
            return
        }

        if (practiceForm.payment_enabled && (amount === null || !Number.isFinite(amount) || amount < 0)) {
            setError('Ingresa un monto de pago válido, igual o mayor que cero.')
            return
        }

        if (practiceForm.payment_enabled && !practiceForm.payment_start_date) {
            setError('Indica desde qué fecha se aplica la configuración de pago.')
            return
        }

        if (
            practiceForm.payment_enabled &&
            practiceForm.payment_frequency === 'dia_fijo' &&
            (!paymentDay || paymentDay < 1 || paymentDay > 31)
        ) {
            setError('El día fijo debe estar entre 1 y 31.')
            return
        }

        if (
            practiceForm.payment_enabled &&
            practiceForm.payment_frequency === 'intervalo_dias' &&
            (!intervalDays || intervalDays < 1)
        ) {
            setError('El intervalo de días debe ser un número mayor que cero.')
            return
        }

        if (
            practiceForm.payment_enabled &&
            practiceForm.payment_frequency === 'por_horas' &&
            (!intervalHours || intervalHours <= 0)
        ) {
            setError('El intervalo de horas debe ser mayor que cero.')
            return
        }

        const payload = {
            name: practiceForm.name.trim(),
            institution: practiceForm.institution.trim(),
            career: practiceForm.career.trim(),
            company: practiceForm.company.trim(),
            supervisor: practiceForm.supervisor.trim(),
            start_date: practiceForm.start_date || null,
            required_hours: practiceForm.required_hours,
            weekly_hours_target: practiceForm.weekly_hours_target,
            payment_enabled: practiceForm.payment_enabled,
            payment_frequency: practiceForm.payment_frequency,
            payment_amount: amount,
            payment_currency: practiceForm.payment_currency,
            payment_start_date: practiceForm.payment_start_date || null,
            payment_day: practiceForm.payment_frequency === 'dia_fijo' ? paymentDay : null,
            payment_interval_days: practiceForm.payment_frequency === 'intervalo_dias' ? intervalDays : null,
            payment_interval_hours: practiceForm.payment_frequency === 'por_horas' ? intervalHours : null,
        }

        setSavingPractice(true)

        const { error: saveError } = await supabase
            .from('practices')
            .update(payload)
            .eq('id', activePractice.id)

        setSavingPractice(false)

        if (saveError) {
            setError(`No se pudo guardar la práctica. Comprueba que ejecutaste la migración SQL. Detalle: ${saveError.message}`)
            return
        }

        setSaved('practice')
        refresh()
        window.setTimeout(() => setSaved(''), 2500)
    }

    const initials = (profile.full_name || 'U')
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()

    const avatarImg = profile.avatar_url || ''

    return (
        <div className="animate-fade-in text-[var(--text-primary)] pb-12 space-y-6">
            <h1 className="text-2xl font-semibold pl-1">Perfil</h1>

            {error && (
                <div role="alert" className="rounded-lg border border-red-300 bg-red-50 text-red-700 p-3 text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-lg p-5 space-y-5">
                    <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        Tu cuenta
                    </h2>

                    <div className="flex items-center gap-4">
                        {avatarImg ? (
                            <img src={avatarImg} alt="Avatar de perfil"
                                className="w-14 h-14 rounded-full object-cover border border-[var(--border-strong)]" />
                        ) : (
                            <div className="w-14 h-14 rounded-full bg-brand-600 text-white font-semibold flex items-center justify-center text-xl">
                                {initials}
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-sm font-medium">{profile.full_name}</p>
                            <p className="text-xs text-[var(--text-muted)] break-all">{profile.email}</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-[var(--text-muted)] mb-1">Nombre completo</label>
                        <input value={profileForm.full_name}
                            onChange={(event) => setProfileForm({ ...profileForm, full_name: event.target.value })}
                            className={inputClass} required />
                    </div>

                    <div>
                        <label className="block text-xs text-[var(--text-muted)] mb-1">Correo electrónico</label>
                        <input value={profileForm.email} className={inputClass} readOnly disabled />
                        <p className="text-[11px] text-[var(--text-muted)] mt-1">
                            El correo vinculado a la cuenta no se modifica desde esta pantalla.
                        </p>
                    </div>

                    <div className="flex justify-between items-center gap-3 pt-2">
                        <span className="text-xs text-brand-500">{saved === 'profile' ? '✓ Guardado' : ''}</span>
                        <button type="button" onClick={() => void saveProfile()} disabled={savingProfile}
                            className="bg-[var(--border-strong)] hover:bg-[#444] px-4 py-2 rounded text-sm transition-colors disabled:opacity-50">
                            {savingProfile ? 'Guardando…' : 'Guardar cuenta'}
                        </button>
                    </div>
                </section>

                <section className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-lg p-5">
                    <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
                        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                            Práctica activa
                        </h2>
                        <span className="text-xs bg-[var(--bg-subtle)] px-2 py-1 rounded border border-[var(--border-strong)]">
                            {activePractice?.name || 'Ninguna'}
                        </span>
                    </div>

                    {!activePractice ? (
                        <p className="text-sm text-[var(--text-muted)]">
                            No hay ninguna práctica seleccionada. Selecciona o crea una práctica antes de editar su configuración.
                        </p>
                    ) : (
                        <form onSubmit={(event) => { event.preventDefault(); void savePractice() }} className="space-y-4">
                            <div>
                                <label className="block text-xs text-[var(--text-muted)] mb-1">Nombre de la práctica</label>
                                <input value={practiceForm.name}
                                    onChange={(event) => setPracticeForm({ ...practiceForm, name: event.target.value })}
                                    className={inputClass} required />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-[var(--text-muted)] mb-1">Institución</label>
                                    <input value={practiceForm.institution}
                                        onChange={(event) => setPracticeForm({ ...practiceForm, institution: event.target.value })}
                                        className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-xs text-[var(--text-muted)] mb-1">Carrera</label>
                                    <input value={practiceForm.career}
                                        onChange={(event) => setPracticeForm({ ...practiceForm, career: event.target.value })}
                                        className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-xs text-[var(--text-muted)] mb-1">Empresa</label>
                                    <input value={practiceForm.company}
                                        onChange={(event) => setPracticeForm({ ...practiceForm, company: event.target.value })}
                                        className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-xs text-[var(--text-muted)] mb-1">Supervisor</label>
                                    <input value={practiceForm.supervisor}
                                        onChange={(event) => setPracticeForm({ ...practiceForm, supervisor: event.target.value })}
                                        className={inputClass} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs text-[var(--text-muted)] mb-1">Fecha de inicio</label>
                                    <input type="date" value={practiceForm.start_date}
                                        onChange={(event) => setPracticeForm({ ...practiceForm, start_date: event.target.value })}
                                        className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-xs text-[var(--text-muted)] mb-1">Meta total (h)</label>
                                    <input type="number" min="1" value={practiceForm.required_hours}
                                        onChange={(event) => setPracticeForm({ ...practiceForm, required_hours: Number(event.target.value) })}
                                        className={inputClass} required />
                                </div>
                                <div>
                                    <label className="block text-xs text-[var(--text-muted)] mb-1">Meta semanal (h)</label>
                                    <input type="number" min="1" value={practiceForm.weekly_hours_target}
                                        onChange={(event) => setPracticeForm({ ...practiceForm, weekly_hours_target: Number(event.target.value) })}
                                        className={inputClass} required />
                                </div>
                            </div>

                            <div className="border-t border-[var(--border-strong)] pt-5 space-y-4">
                                <div>
                                    <h3 className="font-semibold text-sm">Configuración de pago</h3>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">
                                        Define el monto y la frecuencia de pago acordados para esta práctica.
                                    </p>
                                </div>

                                <label className="flex items-center gap-3 text-sm">
                                    <input type="checkbox" checked={practiceForm.payment_enabled}
                                        onChange={(event) => setPracticeForm({ ...practiceForm, payment_enabled: event.target.checked })}
                                        className="h-4 w-4 accent-[var(--color-brand)]" />
                                    Registrar que esta práctica contempla pagos
                                </label>

                                {practiceForm.payment_enabled && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-[var(--text-muted)] mb-1">Monto por pago</label>
                                                <input type="number" min="0" step="1" value={practiceForm.payment_amount}
                                                    onChange={(event) => setPracticeForm({ ...practiceForm, payment_amount: event.target.value })}
                                                    className={inputClass} placeholder="Ej. 250000" required />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-[var(--text-muted)] mb-1">Moneda</label>
                                                <select value={practiceForm.payment_currency}
                                                    onChange={(event) => setPracticeForm({ ...practiceForm, payment_currency: event.target.value })}
                                                    className={inputClass}>
                                                    <option value="CLP">CLP — Peso chileno</option>
                                                    <option value="USD">USD — Dólar estadounidense</option>
                                                    <option value="EUR">EUR — Euro</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs text-[var(--text-muted)] mb-1">Frecuencia de pago</label>
                                            <select value={practiceForm.payment_frequency}
                                                onChange={(event) => setPracticeForm({
                                                    ...practiceForm,
                                                    payment_frequency: event.target.value as PaymentFrequency,
                                                })}
                                                className={inputClass}>
                                                <option value="por_horas">Cada cierta cantidad de horas</option>
                                                <option value="diario">Diario</option>
                                                <option value="cada_5_dias">Cada 5 días</option>
                                                <option value="semanal">Semanal</option>
                                                <option value="quincenal">Quincenal (cada 15 días)</option>
                                                <option value="mensual">Mensual</option>
                                                <option value="dia_fijo">Día fijo de cada mes</option>
                                                <option value="intervalo_dias">Intervalo personalizado en días</option>
                                            </select>
                                        </div>

                                        {practiceForm.payment_frequency === 'por_horas' && (
                                            <div>
                                                <label className="block text-xs text-[var(--text-muted)] mb-1">Pagar cada cuántas horas</label>
                                                <input type="number" min="0.1" step="0.1"
                                                    value={practiceForm.payment_interval_hours}
                                                    onChange={(event) => setPracticeForm({ ...practiceForm, payment_interval_hours: event.target.value })}
                                                    className={inputClass} required />
                                                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                                                    Por ejemplo, 120 significa un pago por cada 120 horas trabajadas.
                                                </p>
                                            </div>
                                        )}

                                        {practiceForm.payment_frequency === 'dia_fijo' && (
                                            <div>
                                                <label className="block text-xs text-[var(--text-muted)] mb-1">Día del mes</label>
                                                <input type="number" min="1" max="31"
                                                    value={practiceForm.payment_day}
                                                    onChange={(event) => setPracticeForm({ ...practiceForm, payment_day: event.target.value })}
                                                    className={inputClass} required />
                                                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                                                    Si el mes no tiene ese día, la fecha deberá ajustarse según el acuerdo de pago.
                                                </p>
                                            </div>
                                        )}

                                        {practiceForm.payment_frequency === 'intervalo_dias' && (
                                            <div>
                                                <label className="block text-xs text-[var(--text-muted)] mb-1">Pagar cada cuántos días</label>
                                                <input type="number" min="1"
                                                    value={practiceForm.payment_interval_days}
                                                    onChange={(event) => setPracticeForm({ ...practiceForm, payment_interval_days: event.target.value })}
                                                    className={inputClass} required />
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-xs text-[var(--text-muted)] mb-1">Fecha desde la que se aplica</label>
                                            <input type="date" value={practiceForm.payment_start_date}
                                                onChange={(event) => setPracticeForm({ ...practiceForm, payment_start_date: event.target.value })}
                                                className={inputClass} required />
                                        </div>

                                        <div className="rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-strong)] p-3 text-xs text-[var(--text-secondary)]">
                                            Esta sección guarda la configuración del pago. No ejecuta transferencias ni calcula automáticamente pagos efectuados.
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
                                <span className="text-xs text-brand-500">{saved === 'practice' ? '✓ Guardado' : ''}</span>
                                <button type="submit" disabled={savingPractice}
                                    className="bg-[var(--border-strong)] hover:bg-[#444] px-4 py-2 rounded text-sm transition-colors disabled:opacity-50">
                                    {savingPractice ? 'Guardando…' : 'Guardar práctica y pago'}
                                </button>
                            </div>
                        </form>
                    )}
                </section>
            </div>
        </div>
    )
}
