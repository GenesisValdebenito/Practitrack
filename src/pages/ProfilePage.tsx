import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'

type Account = { email: string; avatar: string | null; providers: string[] }

export default function ProfilePage() {
    const { profile, refresh } = useProfile()
    const [form, setForm] = useState(profile)
    const [account, setAccount] = useState<Account | null>(null)
    const [saving, setSaving] = useState(false)
    const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            setAccount({
                email: user.email ?? '',
                avatar: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
                providers: user.app_metadata?.providers ?? [user.app_metadata?.provider ?? 'email'],
            })
        })
    }, [])

    const dirty =
        form.full_name !== profile.full_name ||
        form.institution !== profile.institution ||
        form.career !== profile.career ||
        form.required_hours !== profile.required_hours ||
        form.weekly_hours_target !== profile.weekly_hours_target

    const save = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setStatus(null)
        const { error } = await supabase.from('profiles').update({
            full_name: form.full_name,
            institution: form.institution,
            career: form.career,
            required_hours: form.required_hours,
            weekly_hours_target: form.weekly_hours_target,
        }).eq('id', profile.id)
        setSaving(false)
        if (error) return setStatus({ ok: false, text: error.message })
        setStatus({ ok: true, text: 'Cambios guardados' })
        refresh()
        setTimeout(() => setStatus(null), 3000)
    }

    const replayTutorial = async () => {
        await supabase.from('profiles').update({ onboarded: false }).eq('id', profile.id)
        refresh()
    }

    const initial = (profile.full_name ?? account?.email ?? '?').charAt(0).toUpperCase()
    const hasGoogle = account?.providers.includes('google')
    const label = 'block text-xs font-medium text-gray-500 mb-1'
    const input = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

    return (
        <div className="max-w-2xl space-y-6">
            <h1 className="text-2xl font-bold">Perfil</h1>

            {/* Tarjeta de cuenta */}
            <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
                {account?.avatar ? (
                    <img src={account.avatar} alt="" referrerPolicy="no-referrer" className="w-16 h-16 rounded-full" />
                ) : (
                    <div className="w-16 h-16 rounded-full bg-blue-600 text-white text-2xl font-bold flex items-center justify-center">
                        {initial}
                    </div>
                )}
                <div className="min-w-0">
                    <p className="font-semibold truncate">{profile.full_name || 'Sin nombre'}</p>
                    <p className="text-sm text-gray-500 truncate">{account?.email}</p>
                    <div className="flex gap-2 mt-2">
                        {hasGoogle && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                ✓ Cuenta de Google vinculada
                            </span>
                        )}
                        {account?.providers.includes('email') && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                Correo y contraseña
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <form onSubmit={save} className="space-y-6">
                {/* Datos personales */}
                <section className="bg-white rounded-xl shadow p-5">
                    <h2 className="font-semibold mb-4">Datos personales</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label className={label}>Nombre completo</label>
                            <input className={input} value={form.full_name ?? ''} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                        </div>
                        <div>
                            <label className={label}>Institución</label>
                            <input className={input} value={form.institution ?? ''} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
                        </div>
                        <div>
                            <label className={label}>Carrera</label>
                            <input className={input} value={form.career ?? ''} onChange={(e) => setForm({ ...form, career: e.target.value })} />
                        </div>
                    </div>
                </section>

                {/* Práctica */}
                <section className="bg-white rounded-xl shadow p-5">
                    <h2 className="font-semibold mb-4">Mi práctica</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className={label}>Horas totales requeridas</label>
                            <input className={input} type="number" min={1} value={form.required_hours} onChange={(e) => setForm({ ...form, required_hours: +e.target.value })} />
                        </div>
                        <div>
                            <label className={label}>Meta semanal (horas)</label>
                            <input className={input} type="number" min={1} value={form.weekly_hours_target} onChange={(e) => setForm({ ...form, weekly_hours_target: +e.target.value })} />
                        </div>
                    </div>
                </section>

                {/* Barra de guardado: solo aparece si hay cambios */}
                <div className="flex items-center gap-3 min-h-10">
                    {dirty && (
                        <>
                            <button
                                disabled={saving}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-5 py-2 disabled:opacity-50"
                            >
                                {saving ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setForm(profile)}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                Descartar
                            </button>
                        </>
                    )}
                    {status && (
                        <span className={`text-sm ${status.ok ? 'text-green-600' : 'text-red-600'}`}>
                            {status.ok ? '✅ ' : ''}{status.text}
                        </span>
                    )}
                </div>
            </form>

            {/* Ayuda y sesión */}
            <section className="bg-white rounded-xl shadow p-5 space-y-3">
                <h2 className="font-semibold">Ayuda</h2>
                <button type="button" onClick={replayTutorial} className="text-sm text-blue-600">
                    Ver tutorial de nuevo
                </button>
                <hr />
                <button type="button" onClick={() => supabase.auth.signOut()} className="text-sm text-red-600">
                    Cerrar sesión
                </button>
            </section>
        </div>
    )
}