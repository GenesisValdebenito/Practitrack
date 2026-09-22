import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Profile, Practice } from '../lib/utils'

export default function ProfilePage() {
    const { profile, practices = [], activePracticeId, refresh } = useOutletContext<{ profile: Profile, practices: Practice[], activePracticeId: string, refresh: () => void }>()
    const activePractice = practices.find(p => p.id === activePracticeId)
    
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState('')

    const [profileForm, setProfileForm] = useState({
        full_name: profile.full_name || '',
        email: profile.email || '',
    })

    const [practiceForm, setPracticeForm] = useState({
        name: activePractice?.name || '',
        institution: activePractice?.institution || '',
        career: activePractice?.career || '',
        company: activePractice?.company || '',
        supervisor: activePractice?.supervisor || '',
        start_date: activePractice?.start_date || '',
        required_hours: activePractice?.required_hours || 360,
        weekly_hours_target: activePractice?.weekly_hours_target || 30,
    })

    useEffect(() => {
        if (activePractice) {
            setPracticeForm({
                name: activePractice.name || '',
                institution: activePractice.institution || '',
                career: activePractice.career || '',
                company: activePractice.company || '',
                supervisor: activePractice.supervisor || '',
                start_date: activePractice.start_date || '',
                required_hours: activePractice.required_hours || 360,
                weekly_hours_target: activePractice.weekly_hours_target || 30,
            })
        }
    }, [activePractice])

    const saveProfile = async () => {
        setSaving(true)
        await supabase.from('profiles').update(profileForm).eq('id', profile.id)
        setSaving(false)
        setSaved('profile')
        refresh()
        setTimeout(() => setSaved(''), 2500)
    }

    const savePractice = async () => {
        if (!activePractice) return
        setSaving(true)
        await supabase.from('practices').update(practiceForm).eq('id', activePractice.id)
        setSaving(false)
        setSaved('practice')
        refresh()
        setTimeout(() => setSaved(''), 2500)
    }

    const initials = (profile.full_name || 'U').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    const avatarImg = profile.avatar_url || ''

    return (
        <div className="animate-fade-in text-[var(--text-primary)] pb-12">
            <h1 className="text-2xl font-semibold mb-8 pl-1">Perfil</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Columna Izquierda: Perfil y Avatar */}
                <div className="space-y-6">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-lg p-5">
                        <h2 className="text-sm font-semibold mb-5 text-[var(--text-secondary)] uppercase tracking-wider">Tu Cuenta</h2>
                        
                        <div className="flex items-center gap-4 mb-6">
                            {avatarImg ? (
                                <img src={avatarImg} alt="" className="w-14 h-14 rounded-full object-cover border border-[var(--border-strong)]" />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-brand-600 text-white font-semibold flex items-center justify-center text-xl">
                                    {initials}
                                </div>
                            )}
                            <div className="flex-1">
                                <p className="text-sm text-[var(--text-primary)] font-medium">{profile.full_name}</p>
                                <p className="text-xs text-[var(--text-muted)]">{profile.email}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-[var(--text-muted)] mb-1">Nombre Completo</label>
                                <input 
                                    value={profileForm.full_name} 
                                    onChange={e => setProfileForm({...profileForm, full_name: e.target.value})}
                                    className="w-full bg-[var(--bg-app)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm focus:border-gray-500 outline-none"
                                />
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-xs text-brand-500">{saved === 'profile' ? '✓ Guardado' : ''}</span>
                                <button onClick={saveProfile} disabled={saving} className="bg-[var(--border-strong)] hover:bg-[#444] px-4 py-1.5 rounded text-sm transition-colors">
                                    Guardar Cuenta
                                </button>
                            </div>
                        </div>
                    </div>


                </div>

                {/* Columna Derecha: Práctica Activa */}
                <div className="space-y-6">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-lg p-5">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Práctica Activa</h2>
                            <span className="text-xs bg-[var(--bg-subtle)] px-2 py-1 rounded text-[var(--text-primary)] border border-[var(--border-strong)]">
                                {activePractice?.name || 'Ninguna'}
                            </span>
                        </div>
                        
                        {!activePractice ? (
                            <p className="text-sm text-[var(--text-muted)]">No hay ninguna práctica seleccionada.</p>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-[var(--text-muted)] mb-1">Nombre de la Práctica (Semestre/Periodo)</label>
                                    <input 
                                        value={practiceForm.name} 
                                        onChange={e => setPracticeForm({...practiceForm, name: e.target.value})}
                                        className="w-full bg-[var(--bg-app)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm focus:border-gray-500 outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-[var(--text-muted)] mb-1">Institución</label>
                                        <input 
                                            value={practiceForm.institution} 
                                            onChange={e => setPracticeForm({...practiceForm, institution: e.target.value})}
                                            className="w-full bg-[var(--bg-app)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm focus:border-gray-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[var(--text-muted)] mb-1">Carrera</label>
                                        <input 
                                            value={practiceForm.career} 
                                            onChange={e => setPracticeForm({...practiceForm, career: e.target.value})}
                                            className="w-full bg-[var(--bg-app)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm focus:border-gray-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-[var(--text-muted)] mb-1">Empresa</label>
                                        <input 
                                            value={practiceForm.company} 
                                            onChange={e => setPracticeForm({...practiceForm, company: e.target.value})}
                                            className="w-full bg-[var(--bg-app)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm focus:border-gray-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[var(--text-muted)] mb-1">Supervisor</label>
                                        <input 
                                            value={practiceForm.supervisor} 
                                            onChange={e => setPracticeForm({...practiceForm, supervisor: e.target.value})}
                                            className="w-full bg-[var(--bg-app)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm focus:border-gray-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs text-[var(--text-muted)] mb-1">Fecha Inicio</label>
                                        <input 
                                            type="date"
                                            value={practiceForm.start_date} 
                                            onChange={e => setPracticeForm({...practiceForm, start_date: e.target.value})}
                                            className="w-full bg-[var(--bg-app)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm focus:border-gray-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[var(--text-muted)] mb-1">Meta Total (h)</label>
                                        <input 
                                            type="number"
                                            value={practiceForm.required_hours} 
                                            onChange={e => setPracticeForm({...practiceForm, required_hours: Number(e.target.value)})}
                                            className="w-full bg-[var(--bg-app)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm focus:border-gray-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[var(--text-muted)] mb-1">Meta Semanal</label>
                                        <input 
                                            type="number"
                                            value={practiceForm.weekly_hours_target} 
                                            onChange={e => setPracticeForm({...practiceForm, weekly_hours_target: Number(e.target.value)})}
                                            className="w-full bg-[var(--bg-app)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm focus:border-gray-500 outline-none"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-xs text-brand-500">{saved === 'practice' ? '✓ Guardado' : ''}</span>
                                    <button onClick={savePractice} disabled={saving} className="bg-[var(--border-strong)] hover:bg-[#444] px-4 py-1.5 rounded text-sm transition-colors">
                                        Guardar Práctica
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}