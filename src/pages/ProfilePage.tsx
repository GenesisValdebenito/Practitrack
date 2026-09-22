import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { AvatarBuilder } from '../components/AvatarBuilder'
import { Accordion } from '../components/Accordion'
import AppearancePanel from '../components/AppearancePanel'
import { renderAvatarSvgUri } from '../lib/avatar'
import { COLOR_THEMES, getStoredMode, getStoredColor } from '../lib/theme'
import type { Profile } from '../lib/utils'

type Tab = 'apariencia' | 'cuenta' | 'practica' | 'metas'

export default function ProfilePage() {
    const { profile, loading, refresh } = useProfile()
    const [tab, setTab] = useState<Tab>('apariencia')

    if (loading || !profile) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 w-48 bg-[var(--bg-subtle)] rounded" />
                <div className="h-12 bg-[var(--bg-subtle)] rounded" />
                <div className="h-64 bg-[var(--bg-subtle)] rounded-xl" />
            </div>
        )
    }

    const tabs: { id: Tab; label: string }[] = [
        { id: 'apariencia', label: 'Apariencia' },
        { id: 'cuenta', label: 'Cuenta' },
        { id: 'practica', label: 'Práctica' },
        { id: 'metas', label: 'Metas' },
    ]

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-primary">Perfil</h1>
                <p className="text-sm text-secondary mt-1">
                    Personaliza tu cuenta y tus datos de práctica.
                </p>
            </div>

            <div className="border-b border-[var(--border-soft)]">
                <div className="flex gap-6 overflow-x-auto">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`pb-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${tab === t.id
                                    ? 'border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400'
                                    : 'border-transparent text-muted hover:text-primary'
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {tab === 'apariencia' && <AparienciaTab profile={profile} refresh={refresh} />}
            {tab === 'cuenta' && <CuentaTab profile={profile} refresh={refresh} />}
            {tab === 'practica' && <PracticaTab profile={profile} refresh={refresh} />}
            {tab === 'metas' && <MetasTab profile={profile} refresh={refresh} />}
        </div>
    )
}

function AparienciaTab({ profile, refresh }: { profile: Profile; refresh: () => void }) {
    const avatarMode = profile.avatar_mode || 'initials'
    const avatarConfig = profile.avatar_config || null

    const avatarSummary = (
        <div className="flex items-center gap-3">
            <AvatarMini profile={profile} />
            <span className="text-xs text-muted">
                {avatarMode === 'notion' && avatarConfig && 'Avatar personalizado'}
                {avatarMode === 'google' && 'Foto de Google'}
                {avatarMode === 'custom' && 'Foto subida'}
                {avatarMode === 'initials' && 'Iniciales'}
            </span>
        </div>
    )

    const themeSummary = (
        <div className="flex items-center gap-2 text-xs text-muted">
            <span>
                {getStoredMode() === 'dark' ? '🌙 Oscuro' : getStoredMode() === 'light' ? '☀️ Claro' : '💻 Sistema'}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
                <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLOR_THEMES.find((t) => t.id === getStoredColor())?.preview }}
                />
                {COLOR_THEMES.find((t) => t.id === getStoredColor())?.name}
            </span>
        </div>
    )

    return (
        <div className="space-y-3">
            <Accordion title="Avatar" summary={avatarSummary}>
                <AvatarBuilder profile={profile} onUpdate={refresh} />
            </Accordion>

            <Accordion title="Apariencia" summary={themeSummary}>
                <AppearancePanel />
            </Accordion>
        </div>
    )
}

function AvatarMini({ profile }: { profile: Profile }) {
    const mode = profile.avatar_mode || (profile.avatar_url ? 'google' : 'initials')
    const initials = (profile.full_name || 'U').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

    if (mode === 'notion' && profile.avatar_config) {
        try {
            const uri = renderAvatarSvgUri(profile.id, profile.avatar_config)
            return <img src={uri} alt="" className="w-8 h-8 rounded-full" />
        } catch { }
    }
    if ((mode === 'google' || mode === 'custom') && profile.avatar_url) {
        return <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
    }
    return (
        <span className="w-8 h-8 rounded-full bg-brand-600 text-[var(--color-brand-contrast)] font-semibold flex items-center justify-center text-[10px]">
            {initials}
        </span>
    )
}

function CuentaTab({ profile, refresh }: { profile: Profile; refresh: () => void }) {
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [form, setForm] = useState({
        full_name: profile.full_name ?? '',
        email: profile.email ?? '',
    })

    const save = async () => {
        setSaving(true)
        setSaved(false)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            await supabase.from('profiles').update(form).eq('id', user.id)
        }
        setSaving(false)
        setSaved(true)
        refresh()
        setTimeout(() => setSaved(false), 2500)
    }

    return (
        <div className="space-y-4">
            <section className="card space-y-4">
                <h2 className="font-semibold text-sm text-primary">Datos de la cuenta</h2>
                <Field label="Nombre completo" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} placeholder="Génesis Valdebenito" />
                <Field label="Correo electrónico" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="tu@correo.cl" type="email" />
            </section>
            <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-muted">{saved ? '✓ Cambios guardados' : 'Los cambios se aplican a tu cuenta.'}</p>
                <button onClick={save} disabled={saving} className="btn-primary">
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
            </div>
        </div>
    )
}

function PracticaTab({ profile, refresh }: { profile: Profile; refresh: () => void }) {
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [form, setForm] = useState({
        career: profile.career ?? '',
        institution: profile.institution ?? '',
        company: profile.company ?? '',
        supervisor: profile.supervisor ?? '',
        start_date: profile.start_date ?? '',
    })

    const save = async () => {
        setSaving(true)
        setSaved(false)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            await supabase.from('profiles').update(form).eq('id', user.id)
        }
        setSaving(false)
        setSaved(true)
        refresh()
        setTimeout(() => setSaved(false), 2500)
    }

    return (
        <div className="space-y-4">
            <section className="card space-y-4">
                <h2 className="font-semibold text-sm text-primary">Datos académicos</h2>
                <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Carrera" value={form.career} onChange={(v) => setForm({ ...form, career: v })} placeholder="Ingeniería en Informática" />
                    <Field label="Institución" value={form.institution} onChange={(v) => setForm({ ...form, institution: v })} placeholder="Duoc UC" />
                </div>
            </section>
            <section className="card space-y-4">
                <h2 className="font-semibold text-sm text-primary">Datos de la práctica</h2>
                <Field label="Empresa o institución" value={form.company} onChange={(v) => setForm({ ...form, company: v })} placeholder="Nombre de la empresa" />
                <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Supervisor" value={form.supervisor} onChange={(v) => setForm({ ...form, supervisor: v })} placeholder="Nombre del supervisor" />
                    <Field label="Fecha de inicio" type="date" value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} />
                </div>
            </section>
            <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-muted">{saved ? '✓ Cambios guardados' : 'Los cambios se aplican a tu práctica.'}</p>
                <button onClick={save} disabled={saving} className="btn-primary">
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
            </div>
        </div>
    )
}

function MetasTab({ profile, refresh }: { profile: Profile; refresh: () => void }) {
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [form, setForm] = useState({
        required_hours: profile.required_hours ?? 360,
        weekly_hours_target: profile.weekly_hours_target ?? 28,
    })

    const save = async () => {
        setSaving(true)
        setSaved(false)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            await supabase.from('profiles').update(form).eq('id', user.id)
        }
        setSaving(false)
        setSaved(true)
        refresh()
        setTimeout(() => setSaved(false), 2500)
    }

    return (
        <div className="space-y-4">
            <section className="card space-y-4">
                <h2 className="font-semibold text-sm text-primary">Metas de práctica</h2>
                <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Horas totales requeridas" type="number" value={form.required_hours} onChange={(v) => setForm({ ...form, required_hours: Number(v) })} />
                    <Field label="Meta semanal (h)" type="number" value={form.weekly_hours_target} onChange={(v) => setForm({ ...form, weekly_hours_target: Number(v) })} />
                </div>
            </section>
            <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-muted">{saved ? '✓ Cambios guardados' : 'Los cambios se aplican a tu dashboard.'}</p>
                <button onClick={save} disabled={saving} className="btn-primary">
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
            </div>
        </div>
    )
}

function Field({
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
}: {
    label: string
    value: string | number
    onChange: (v: string) => void
    type?: string
    placeholder?: string
}) {
    return (
        <div>
            <label className="text-xs font-medium text-secondary mb-1 block">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="input-base"
            />
        </div>
    )
}