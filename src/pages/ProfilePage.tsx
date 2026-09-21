import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import {
    COLOR_THEMES,
    applyColorTheme,
    applyThemeMode,
    getStoredColor,
    getStoredMode,
    AVATAR_EMOJIS,
    type ThemeMode,
} from '../lib/theme'
import type { AvatarMode, Profile } from '../lib/utils'

export default function ProfilePage() {
    const { profile, loading, refresh } = useProfile()
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    // Guardia de carga: no renderizamos hasta tener profile
    if (loading || !profile) {
        return (
            <div className="space-y-6 max-w-2xl animate-pulse">
                <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            </div>
        )
    }

    return <ProfileContent profile={profile} refresh={refresh} saving={saving} setSaving={setSaving} saved={saved} setSaved={setSaved} />
}

// Componente separado para que los hooks se declaren siempre después de la guardia
function ProfileContent({
    profile,
    refresh,
    saving,
    setSaving,
    saved,
    setSaved,
}: {
    profile: Profile
    refresh: () => void
    saving: boolean
    setSaving: (v: boolean) => void
    saved: boolean
    setSaved: (v: boolean) => void
}) {
    const [form, setForm] = useState({
        full_name: profile.full_name ?? '',
        career: profile.career ?? '',
        institution: profile.institution ?? '',
        company: profile.company ?? '',
        supervisor: profile.supervisor ?? '',
        start_date: profile.start_date ?? '',
        required_hours: profile.required_hours ?? 360,
        weekly_hours_target: profile.weekly_hours_target ?? 28,
    })

    const set = (k: keyof typeof form, v: string | number) =>
        setForm((f) => ({ ...f, [k]: v }))

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
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
                <p className="text-sm text-secondary mt-1">
                    Personaliza tu cuenta y tus datos de práctica.
                </p>
            </div>

            {/* === SECCIÓN AVATAR === */}
            <section className="card">
                <h2 className="font-semibold text-sm mb-4">Avatar</h2>
                <AvatarSection profile={profile} refresh={refresh} />
            </section>

            {/* === SECCIÓN APARIENCIA === */}
            <section className="card">
                <h2 className="font-semibold text-sm mb-4">Apariencia</h2>
                <AppearanceSection />
            </section>

            {/* === DATOS PERSONALES === */}
            <section className="card space-y-4">
                <h2 className="font-semibold text-sm">Datos personales</h2>
                <Field
                    label="Nombre completo"
                    value={form.full_name}
                    onChange={(v) => set('full_name', v)}
                    placeholder="Génesis Valdebenito"
                />
                <div className="grid md:grid-cols-2 gap-4">
                    <Field
                        label="Carrera"
                        value={form.career}
                        onChange={(v) => set('career', v)}
                        placeholder="Ingeniería en Informática"
                    />
                    <Field
                        label="Institución"
                        value={form.institution}
                        onChange={(v) => set('institution', v)}
                        placeholder="Duoc UC"
                    />
                </div>
            </section>

            {/* === DATOS DE LA PRÁCTICA === */}
            <section className="card space-y-4">
                <h2 className="font-semibold text-sm">Datos de la práctica</h2>
                <Field
                    label="Empresa o institución"
                    value={form.company}
                    onChange={(v) => set('company', v)}
                    placeholder="Nombre de la empresa"
                />
                <div className="grid md:grid-cols-2 gap-4">
                    <Field
                        label="Supervisor"
                        value={form.supervisor}
                        onChange={(v) => set('supervisor', v)}
                        placeholder="Nombre del supervisor"
                    />
                    <Field
                        label="Fecha de inicio"
                        type="date"
                        value={form.start_date}
                        onChange={(v) => set('start_date', v)}
                    />
                </div>
            </section>

            {/* === METAS === */}
            <section className="card space-y-4">
                <h2 className="font-semibold text-sm">Metas</h2>
                <div className="grid md:grid-cols-2 gap-4">
                    <Field
                        label="Horas totales requeridas"
                        type="number"
                        value={form.required_hours}
                        onChange={(v) => set('required_hours', Number(v))}
                    />
                    <Field
                        label="Meta semanal (h)"
                        type="number"
                        value={form.weekly_hours_target}
                        onChange={(v) => set('weekly_hours_target', Number(v))}
                    />
                </div>
            </section>

            {/* Guardar */}
            <div className="flex items-center justify-between gap-4 sticky bottom-4">
                <p className="text-xs text-muted">
                    {saved ? '✓ Cambios guardados' : 'Los cambios se aplican a tu cuenta.'}
                </p>
                <button onClick={save} disabled={saving} className="btn-primary shadow-lg">
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
            </div>
        </div>
    )
}

// === Editor de avatar ===
function AvatarSection({ profile, refresh }: { profile: Profile; refresh: () => void }) {
    const mode: AvatarMode = profile.avatar_mode || (profile.avatar_url ? 'google' : 'initials')
    const initials = (profile.full_name || 'U').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

    const update = async (patch: Partial<Profile>) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            await supabase.from('profiles').update(patch).eq('id', user.id)
            refresh()
        }
    }

    const uploadAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => update({ avatar_url: reader.result as string, avatar_mode: 'custom' })
        reader.readAsDataURL(file)
    }

    return (
        <div className="space-y-5">
            {/* Vista previa grande */}
            <div className="flex items-center gap-5">
                <div className="shrink-0">
                    {mode === 'emoji' && profile.avatar_emoji ? (
                        <div className="w-20 h-20 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-4xl">
                            {profile.avatar_emoji}
                        </div>
                    ) : (mode === 'google' || mode === 'custom') && profile.avatar_url ? (
                        <img
                            src={profile.avatar_url}
                            alt={profile.full_name}
                            className="w-20 h-20 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-brand-600 text-white font-semibold text-2xl flex items-center justify-center">
                            {initials}
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{profile.full_name || 'Usuario'}</p>
                    <p className="text-xs text-muted truncate">{profile.email || 'Sin correo'}</p>
                    <p className="text-xs text-muted mt-1">
                        {mode === 'google' && 'Foto de Google'}
                        {mode === 'custom' && 'Foto personalizada'}
                        {mode === 'emoji' && 'Personaje'}
                        {mode === 'initials' && 'Iniciales'}
                    </p>
                </div>
            </div>

            {/* Opciones */}
            <div className="space-y-2">
                {profile.avatar_url && mode !== 'custom' && (
                    <button
                        onClick={() => update({ avatar_mode: 'google' })}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${mode === 'google'
                            ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                    >
                        <span className="text-muted">✓</span>
                        Usar foto de Google
                    </button>
                )}

                <label className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                    <span className="text-muted">↑</span>
                    Subir imagen propia
                    <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
                </label>

                <button
                    onClick={() => update({ avatar_mode: 'initials' })}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${mode === 'initials'
                        ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                >
                    <span className="text-muted">Aa</span>
                    Usar iniciales ({initials})
                </button>

                {(profile.avatar_url || profile.avatar_emoji) && (
                    <button
                        onClick={() => update({ avatar_url: null, avatar_emoji: null, avatar_mode: 'initials' })}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                        <span>✕</span>
                        Eliminar avatar
                    </button>
                )}
            </div>

            {/* Emojis */}
            <div>
                <p className="text-xs font-medium text-secondary mb-2">Elegir personaje</p>
                <div className="grid grid-cols-8 gap-2">
                    {AVATAR_EMOJIS.map((e) => (
                        <button
                            key={e}
                            onClick={() => update({ avatar_emoji: e, avatar_mode: 'emoji' })}
                            className={`aspect-square rounded-lg text-xl flex items-center justify-center transition-all ${profile.avatar_emoji === e && mode === 'emoji'
                                ? 'bg-brand-100 dark:bg-brand-900/40 ring-2 ring-brand-500 scale-105'
                                : 'bg-slate-50 dark:bg-slate-800 hover:scale-110'
                                }`}
                        >
                            {e}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

// === Sección de apariencia ===
function AppearanceSection() {
    const [mode, setMode] = useState<ThemeMode>(getStoredMode())
    const [color, setColor] = useState(getStoredColor())

    const changeMode = (m: ThemeMode) => {
        setMode(m)
        applyThemeMode(m)
    }
    const changeColor = (id: string) => {
        setColor(id)
        applyColorTheme(id)
    }

    const modes: { id: ThemeMode; label: string }[] = [
        { id: 'light', label: 'Claro' },
        { id: 'dark', label: 'Oscuro' },
        { id: 'system', label: 'Sistema' },
    ]

    return (
        <div className="space-y-5">
            {/* Tema */}
            <div>
                <p className="text-xs font-medium text-secondary mb-2">Tema</p>
                <div className="grid grid-cols-3 gap-2">
                    {modes.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => changeMode(m.id)}
                            className={`py-2 rounded-lg text-sm font-medium transition-colors ${mode === m.id
                                ? 'bg-brand-600 text-[var(--color-brand-contrast)]'
                                : 'bg-slate-100 dark:bg-slate-800 text-secondary hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Color */}
            <div>
                <p className="text-xs font-medium text-secondary mb-2">Color principal</p>
                <div className="grid grid-cols-5 gap-3">
                    {COLOR_THEMES.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => changeColor(t.id)}
                            title={t.name}
                            className={`aspect-square rounded-full transition-transform hover:scale-110 relative ${color === t.id ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900' : ''
                                }`}
                            style={{ backgroundColor: t.preview }}
                        >
                            {color === t.id && (
                                <span className="absolute inset-0 flex items-center justify-center text-white text-lg font-bold drop-shadow">
                                    ✓
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-muted mt-2">
                    {COLOR_THEMES.find((t) => t.id === color)?.name}
                </p>
            </div>
        </div>
    )
}

// === Campo de formulario ===
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