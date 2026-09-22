import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Profile, Shortcut, AvatarMode } from '../lib/utils'
import { renderAvatarSvgUri } from '../lib/avatar'
import { resetTheme } from '../lib/theme'

const DEFAULT_SHORTCUTS: Shortcut[] = [
    { id: 'duoc', label: 'Portal Duoc', url: 'https://www.duoc.cl', icon: 'school' },
    { id: 'github', label: 'GitHub', url: 'https://github.com', icon: 'github' },
    { id: 'drive', label: 'Drive', url: 'https://drive.google.com', icon: 'drive' },
]

function getShortcuts(): Shortcut[] {
    try {
        const raw = localStorage.getItem('practitrack:shortcuts')
        if (raw) return JSON.parse(raw)
    } catch { }
    return DEFAULT_SHORTCUTS
}
function saveShortcuts(s: Shortcut[]) {
    localStorage.setItem('practitrack:shortcuts', JSON.stringify(s))
}

function Icon({ name, className = '' }: { name?: string; className?: string }) {
    const common = { className, width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
    switch (name) {
        case 'school': return <svg {...common}><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
        case 'github': return <svg {...common}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></svg>
        case 'drive': return <svg {...common}><path d="M8 2h8l6 10-4 7H6l-4-7z" /><path d="M8 2l6 10m2 0h8M14 12l-4 7" /></svg>
        case 'external': return <svg {...common}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
        case 'user': return <svg {...common}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        case 'logout': return <svg {...common}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
        case 'plus': return <svg {...common}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        case 'database': return <svg {...common}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>
        case 'palette': return <svg {...common}><circle cx="13.5" cy="6.5" r=".5" /><circle cx="17.5" cy="10.5" r=".5" /><circle cx="8.5" cy="7.5" r=".5" /><circle cx="6.5" cy="12.5" r=".5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /></svg>
        case 'check': return <svg {...common}><polyline points="20 6 9 17 4 12" /></svg>
        case 'chevron-right': return <svg {...common}><polyline points="9 18 15 12 9 6" /></svg>
        case 'chevron-left': return <svg {...common}><polyline points="15 18 9 12 15 6" /></svg>
        case 'sun': return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
        case 'moon': return <svg {...common}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
        case 'monitor': return <svg {...common}><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
        default: return <svg {...common}><circle cx="12" cy="12" r="10" /></svg>
    }
}

// === Avatar (soporta notion con DiceBear) ===
function AvatarDisplay({ profile, size = 'md' }: { profile: Profile; size?: 'sm' | 'md' | 'lg' }) {
    const sizeCls = size === 'sm' ? 'w-8 h-8 text-[10px]' : size === 'lg' ? 'w-16 h-16 text-xl' : 'w-10 h-10 text-sm'
    const mode: AvatarMode = profile.avatar_mode || (profile.avatar_url ? 'google' : 'initials')

    const notionSvg = useMemo(() => {
        if (mode !== 'notion' || !profile.avatar_config) return null
        try {
            return renderAvatarSvgUri(profile.id, profile.avatar_config)
        } catch {
            return null
        }
    }, [mode, profile.avatar_config, profile.id])

    if (notionSvg) {
        return <img src={notionSvg} alt={profile.full_name} className={`${sizeCls} rounded-full object-cover shrink-0`} />
    }
    if ((mode === 'google' || mode === 'custom') && profile.avatar_url) {
        return <img src={profile.avatar_url} alt={profile.full_name} className={`${sizeCls} rounded-full object-cover shrink-0`} />
    }
    const initials = (profile.full_name || 'U').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    return (
        <span className={`${sizeCls} rounded-full bg-brand-600 text-[var(--color-brand-contrast)] font-semibold flex items-center justify-center shrink-0`}>
            {initials}
        </span>
    )
}

// === Mini panel de apariencia (link a Perfil) ===
function MiniAppearancePanel({ onNavigate }: { onNavigate: () => void }) {
    return (
        <div className="px-3 py-3 space-y-3">
            <p className="text-xs text-muted">
                Personaliza el tema, la tipografía y el tamaño desde tu perfil.
            </p>
            <Link
                to="/perfil"
                onClick={onNavigate}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-sm bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] transition-colors text-primary"
            >
                <span className="flex items-center gap-2">
                    <span className="text-muted"><Icon name="palette" /></span>
                    Ir a Apariencia
                </span>
                <span className="text-muted"><Icon name="chevron-right" /></span>
            </Link>
        </div>
    )
}

// === Componente principal ===
export default function UserMenu({ profile, onUpdateProfile }: { profile: Profile; onUpdateProfile?: (patch: Partial<Profile>) => void }) {
    const [open, setOpen] = useState(false)
    const [section, setSection] = useState<'main' | 'appearance'>('main')
    const [shortcuts, setShortcuts] = useState<Shortcut[]>(getShortcuts())
    const [showAddShortcut, setShowAddShortcut] = useState(false)
    const [newShortcut, setNewShortcut] = useState({ label: '', url: '' })
    const [provider, setProvider] = useState<string | null>(null)
    const ref = useRef<HTMLDivElement>(null)

    void onUpdateProfile

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setProvider(data.user?.app_metadata?.provider ?? null)
        })
    }, [])

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
                setShowAddShortcut(false)
                setSection('main')
            }
        }
        document.addEventListener('mousedown', onClick)
        return () => document.removeEventListener('mousedown', onClick)
    }, [])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        resetTheme()
        await new Promise((r) => setTimeout(r, 50))
        window.location.href = '/'
    }

    const addShortcut = (e: React.FormEvent) => {
        e.preventDefault()
        let url = newShortcut.url.trim()
        if (!url) return
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url
        const updated = [...shortcuts, { id: crypto.randomUUID(), label: newShortcut.label.trim() || 'Atajo', url }]
        setShortcuts(updated)
        saveShortcuts(updated)
        setNewShortcut({ label: '', url: '' })
        setShowAddShortcut(false)
    }

    const removeShortcut = (id: string) => {
        const updated = shortcuts.filter((s) => s.id !== id)
        setShortcuts(updated)
        saveShortcuts(updated)
    }

    const hasGoogle = provider === 'google'

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => { setOpen((v) => !v); setSection('main') }}
                className="flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--bg-card)] hover:bg-[var(--bg-subtle)] transition-colors p-0.5 pr-3"
            >
                <AvatarDisplay profile={profile} size="sm" />
                <span className="hidden sm:block text-xs font-medium max-w-[120px] truncate text-primary">
                    {profile.full_name?.split(' ')[0] || 'Usuario'}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-xl shadow-lg shadow-black/5 overflow-hidden z-50 animate-slide-up">
                    {section === 'main' && (
                        <>
                            <div className="p-4 border-b border-[var(--border-soft)]">
                                <div className="flex items-center gap-3">
                                    <AvatarDisplay profile={profile} size="md" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold truncate text-primary">{profile.full_name || 'Usuario'}</p>
                                        <p className="text-xs text-muted truncate">
                                            {profile.email || 'Sin correo vinculado'}
                                        </p>
                                    </div>
                                </div>

                                {hasGoogle && (
                                    <div className="mt-3 flex items-center gap-2 text-xs text-secondary bg-[var(--bg-subtle)] rounded-lg px-2.5 py-1.5">
                                        <svg width="14" height="14" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        <span className="truncate">Cuenta Google vinculada</span>
                                    </div>
                                )}
                            </div>

                            <div className="p-2">
                                <button
                                    onClick={() => setSection('appearance')}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-[var(--bg-subtle)] transition-colors text-primary"
                                >
                                    <span className="text-muted"><Icon name="palette" /></span>
                                    <span className="flex-1 text-left">Apariencia</span>
                                    <span className="text-muted"><Icon name="chevron-right" /></span>
                                </button>
                            </div>

                            <div className="border-t border-[var(--border-soft)]" />

                            <div className="p-2">
                                <div className="flex items-center justify-between px-2 py-1.5">
                                    <p className="text-[10px] font-medium text-muted uppercase tracking-wide">
                                        Accesos directos
                                    </p>
                                    <button
                                        onClick={() => setShowAddShortcut((v) => !v)}
                                        className="text-muted hover:text-brand-600 transition-colors"
                                        title="Añadir atajo"
                                    >
                                        <Icon name="plus" />
                                    </button>
                                </div>

                                {shortcuts.length === 0 && !showAddShortcut && (
                                    <p className="text-xs text-muted px-3 py-2">
                                        Aún no hay atajos. Añade uno con el botón +
                                    </p>
                                )}

                                {shortcuts.map((s) => (
                                    <div key={s.id} className="group flex items-center">
                                        <a
                                            href={s.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-[var(--bg-subtle)] transition-colors text-primary"
                                        >
                                            <span className="text-muted"><Icon name={s.icon} /></span>
                                            <span className="truncate flex-1">{s.label}</span>
                                            <span className="text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Icon name="external" />
                                            </span>
                                        </a>
                                        <button
                                            onClick={() => removeShortcut(s.id)}
                                            className="text-muted hover:text-red-500 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Eliminar"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                        </button>
                                    </div>
                                ))}

                                {showAddShortcut && (
                                    <form onSubmit={addShortcut} className="px-2 pb-2 pt-1 space-y-2">
                                        <input
                                            autoFocus
                                            value={newShortcut.label}
                                            onChange={(e) => setNewShortcut({ ...newShortcut, label: e.target.value })}
                                            placeholder="Nombre (ej: Portal Duoc)"
                                            className="input-base text-xs"
                                        />
                                        <input
                                            value={newShortcut.url}
                                            onChange={(e) => setNewShortcut({ ...newShortcut, url: e.target.value })}
                                            placeholder="URL (ej: duoc.cl)"
                                            className="input-base text-xs"
                                            required
                                        />
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setShowAddShortcut(false)} className="btn-ghost flex-1 text-xs">
                                                Cancelar
                                            </button>
                                            <button type="submit" className="btn-primary flex-1 text-xs">
                                                Añadir
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>

                            <div className="border-t border-[var(--border-soft)]" />

                            <div className="p-2">
                                <Link
                                    to="/perfil"
                                    onClick={() => setOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-[var(--bg-subtle)] transition-colors text-primary"
                                >
                                    <span className="text-muted"><Icon name="user" /></span>
                                    Mi perfil
                                </Link>
                                <Link
                                    to="/datos"
                                    onClick={() => setOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-[var(--bg-subtle)] transition-colors text-primary"
                                >
                                    <span className="text-muted"><Icon name="database" /></span>
                                    Importar / Exportar
                                </Link>
                            </div>

                            <div className="border-t border-[var(--border-soft)]" />

                            <div className="p-2">
                                <button
                                    onClick={handleSignOut}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors text-primary"
                                >
                                    <span><Icon name="logout" /></span>
                                    Cerrar sesión
                                </button>
                            </div>
                        </>
                    )}

                    {section === 'appearance' && (
                        <>
                            <div className="p-2 flex items-center gap-2 border-b border-[var(--border-soft)]">
                                <button
                                    onClick={() => setSection('main')}
                                    className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-muted transition-colors"
                                >
                                    <Icon name="chevron-left" />
                                </button>
                                <p className="text-sm font-semibold text-primary">Apariencia</p>
                            </div>
                            <MiniAppearancePanel onNavigate={() => setOpen(false)} />
                        </>
                    )}
                </div>
            )}
        </div>
    )
}