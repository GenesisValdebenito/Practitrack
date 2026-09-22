import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/utils'

type OnboardingProps = {
    userId?: string
    profile?: Profile | null
    googleName?: string
    onDone?: () => void
}

export default function Onboarding({ userId, profile, onDone }: OnboardingProps = {}) {
    const [saving, setSaving] = useState(false)
    const [showForm, setShowForm] = useState(true) // Start showing form since they have none
    const [form, setForm] = useState({
        name: 'Práctica Profesional',
        start_date: '',
        end_date: '',
        institution: profile?.institution ?? '',
        career: profile?.career ?? '',
        required_hours: 360,
        weekly_hours_target: 30
    })

    const set = (k: keyof typeof form, v: string | number) =>
        setForm((f) => ({ ...f, [k]: v }))

    const finish = async () => {
        setSaving(true)
        const uid = userId || (await supabase.auth.getUser()).data.user?.id
        if (uid) {
            // Create the practice
            await supabase.from('practices').insert({
                user_id: uid,
                name: form.name,
                start_date: form.start_date || null,
                institution: form.institution || null,
                career: form.career || null,
                required_hours: form.required_hours,
                weekly_hours_target: form.weekly_hours_target,
                is_active: true
            })
            
            // Mark user as onboarded
            await supabase
                .from('profiles')
                .update({ onboarded: true })
                .eq('id', uid)
        }
        setSaving(false)
        onDone?.()
    }

    return (
        <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex flex-col items-center justify-center p-4 font-sans">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-semibold mb-2">Bienvenido a PractiTrack</h1>
                <p className="text-[var(--text-secondary)]">configura tu primera práctica</p>
            </div>

            <div className="w-full max-w-xl bg-[#0f0f0f] dark:bg-[#0f0f0f] border border-[var(--border-strong)] rounded overflow-hidden shadow-2xl">
                {/* Header of the box */}
                <div className="bg-[var(--bg-subtle)] px-4 py-3 border-b border-[var(--border-strong)] flex justify-between items-center text-sm font-medium text-[var(--text-secondary)]">
                    <span>Prácticas {showForm ? '/ Nueva Práctica' : ''}</span>
                    {!showForm && (
                        <button onClick={() => setShowForm(true)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-lg leading-none">+</button>
                    )}
                </div>

                {/* Content */}
                <div className="p-4 min-h-[300px]">
                    {showForm ? (
                        <div className="space-y-4 animate-fade-in">
                            <div>
                                <input
                                    value={form.name}
                                    onChange={(e) => set('name', e.target.value)}
                                    placeholder="Nombre (ej: Práctica Analista)"
                                    className="w-full bg-[var(--bg-app)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-secondary)]"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={form.start_date}
                                    onChange={(e) => set('start_date', e.target.value)}
                                    className="flex-1 bg-[var(--bg-app)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm text-[var(--text-secondary)] focus:outline-none focus:border-[var(--text-secondary)]"
                                />
                                <span className="text-[var(--text-muted)] text-sm">a</span>
                                <input
                                    type="date"
                                    value={form.end_date}
                                    onChange={(e) => set('end_date', e.target.value)}
                                    className="flex-1 bg-[var(--bg-app)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm text-[var(--text-secondary)] focus:outline-none focus:border-[var(--text-secondary)]"
                                />
                            </div>

                            <div className="bg-[var(--bg-subtle)] rounded p-3 text-sm text-[var(--text-secondary)] flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-[var(--text-primary)]">Metas de horas</p>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Total y Semanal</p>
                                </div>
                                <span>{form.required_hours}h / {form.weekly_hours_target}h/sem</span>
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={form.required_hours}
                                    onChange={(e) => set('required_hours', Number(e.target.value))}
                                    placeholder="Meta Total"
                                    className="w-1/2 bg-[var(--bg-app)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-secondary)]"
                                />
                                <input
                                    type="number"
                                    value={form.weekly_hours_target}
                                    onChange={(e) => set('weekly_hours_target', Number(e.target.value))}
                                    placeholder="Meta Semanal"
                                    className="w-1/2 bg-[var(--bg-app)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-secondary)]"
                                />
                            </div>

                            <div className="flex gap-2">
                                <input
                                    value={form.institution}
                                    onChange={(e) => set('institution', e.target.value)}
                                    placeholder="Institución"
                                    className="w-1/2 bg-[var(--bg-app)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-secondary)]"
                                />
                                <input
                                    value={form.career}
                                    onChange={(e) => set('career', e.target.value)}
                                    placeholder="Carrera"
                                    className="w-1/2 bg-[var(--bg-app)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-secondary)]"
                                />
                            </div>

                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center">
                            <p className="text-[var(--border-strong)] font-semibold text-lg">No Practices</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8 flex gap-4">
                <button
                    onClick={finish}
                    disabled={saving || !form.name}
                    className="bg-[var(--border-strong)] hover:bg-[var(--text-muted)] text-[var(--text-primary)] px-8 py-2 rounded text-sm transition-colors disabled:opacity-50"
                >
                    {saving ? 'Guardando...' : 'Listo'}
                </button>
            </div>
        </div>
    )
}