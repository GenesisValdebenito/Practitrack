import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import type { Profile, Practice } from '../lib/utils'
import UserMenu from './UserMenu'

const NAV = [
    { to: '/', label: 'Dashboard', icon: IconDashboard },
    { to: '/horario', label: 'Horario', icon: IconCalendar },
    { to: '/tareas', label: 'Stickys', icon: IconCheck },
    { to: '/bitacora', label: 'Registros', icon: IconBook },
    { to: '/datos', label: 'Datos', icon: IconFolder },
]

function IconDashboard({ className = '' }: { className?: string }) {
    return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg>
}
function IconCalendar({ className = '' }: { className?: string }) {
    return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
}
function IconCheck({ className = '' }: { className?: string }) {
    return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
}
function IconBook({ className = '' }: { className?: string }) {
    return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
}
function IconFolder({ className = '' }: { className?: string }) {
    return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
}
function IconSettings({ className = '' }: { className?: string }) {
    return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
}
function IconMenu({ className = '' }: { className?: string }) {
    return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
}

type LayoutProps = {
    profile: Profile
    refresh: () => void
    onUpdateProfile?: (patch: Partial<Profile>) => void
    practices?: Practice[]
    activePracticeId?: string | null
    setActivePracticeId?: (id: string) => void
}

export default function Layout({ profile, refresh, onUpdateProfile, practices = [], activePracticeId, setActivePracticeId }: LayoutProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const activePractice = practices.find(p => p.id === activePracticeId)
    
    void refresh

    const link = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${isActive
            ? 'text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`

    return (
        <div className="min-h-screen bg-[var(--bg-app)] md:flex font-sans">
            {/* Sidebar */}
            <aside className="hidden md:flex md:w-[220px] flex-col bg-[var(--bg-app)] text-[var(--text-primary)] p-4 sticky top-0 h-screen shrink-0 border-r border-[var(--border-soft)]">
                <div className="flex items-center gap-3 mb-10 mt-1 pl-1">
                    <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                        <IconMenu />
                    </button>
                </div>

                <nav className="space-y-1 flex-1">
                    {NAV.map((n) => {
                        const Icon = n.icon
                        return (
                            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={link}>
                                {({ isActive }) => (
                                    <>
                                        <Icon className={isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'} />
                                        {n.label}
                                    </>
                                )}
                            </NavLink>
                        )
                    })}
                </nav>
                
                <div className="mt-auto">
                    <NavLink to="/configuracion" className={link}>
                        {({ isActive }) => (
                            <>
                                <IconSettings className={isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'} />
                                Configuración
                            </>
                        )}
                    </NavLink>
                </div>
            </aside>

            {/* Contenido principal */}
            <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-app)] text-[var(--text-primary)]">
                {/* Header (Móvil) */}
                <header className="md:hidden sticky top-0 z-30 bg-[var(--bg-app)] border-b border-[var(--border-soft)]">
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">PractiTrack</span>
                        </div>
                        <UserMenu profile={profile} onUpdateProfile={onUpdateProfile} />
                    </div>
                </header>

                <main className="flex-1 w-full flex flex-col h-screen overflow-hidden">
                    {/* Header Desktop (simula el top bar de la imagen) */}
                    <div className="hidden md:flex items-start justify-between px-8 py-6 w-full shrink-0 relative">
                        <div className="flex items-center gap-1 relative">
                            <h2 
                                className="text-md font-medium text-[var(--text-secondary)] cursor-pointer flex items-center gap-1 hover:text-[var(--text-primary)]"
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                            >
                                {activePractice?.name || 'Selecciona una Práctica'} <span className="text-xs">▼</span>
                            </h2>
                            {dropdownOpen && (
                                <div className="absolute top-full left-0 mt-1 w-56 bg-[var(--bg-card)] border border-[var(--border-soft)] rounded shadow-xl py-1 z-50">
                                    {practices.map(p => (
                                        <button 
                                            key={p.id}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-hover)] transition-colors ${p.id === activePracticeId ? 'text-brand-500 font-medium' : 'text-[var(--text-primary)]'}`}
                                            onClick={() => {
                                                setActivePracticeId?.(p.id)
                                                setDropdownOpen(false)
                                            }}
                                        >
                                            {p.name}
                                        </button>
                                    ))}
                                    <div className="border-t border-[var(--border-soft)] mt-1">
                                        <button 
                                            className="w-full text-left px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2"
                                            onClick={() => {
                                                // Aquí podríamos ir a una vista de Crear Práctica
                                                setDropdownOpen(false)
                                            }}
                                        >
                                            + Nueva Práctica
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col items-center">
                                <span className="text-xl font-medium">0</span>
                                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Days Left</span>
                            </div>
                            <div className="w-12 h-12 rounded-full border-4 border-[var(--border-soft)] flex items-center justify-center relative">
                                <span className="text-xs font-medium">0.00</span>
                                <span className="absolute -bottom-4 text-[10px] text-[var(--text-muted)] uppercase">GPA</span>
                            </div>
                            <div className="w-12 h-12 rounded-full border-4 border-[var(--text-muted)] flex items-center justify-center relative">
                                <span className="text-xs font-medium">100%</span>
                                <span className="absolute -bottom-4 text-[10px] text-[var(--text-muted)] uppercase">Attend</span>
                            </div>
                        </div>
                        
                        <div className="ml-8">
                            <UserMenu profile={profile} onUpdateProfile={onUpdateProfile} />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-24 md:pb-8 flex justify-center">
                        <div className="w-full transition-all duration-300" style={{ maxWidth: 'var(--app-content-width, 72rem)' }}>
                            <Outlet context={{ profile, refresh }} />
                        </div>
                    </div>
                </main>
            </div>

            {/* Bottom nav móvil */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#1c1c1c] border-t border-[#333] flex justify-around py-2 z-40">
                {NAV.map((n) => {
                    const Icon = n.icon
                    return (
                        <NavLink
                            key={n.to}
                            to={n.to}
                            end={n.to === '/'}
                            className={({ isActive }) =>
                                `flex flex-col items-center gap-0.5 text-[10px] ${isActive ? 'text-white' : 'text-gray-500'
                                }`
                            }
                        >
                            <Icon />
                            {n.label}
                        </NavLink>
                    )
                })}
            </nav>
        </div>
    )
}