import { NavLink, Outlet } from 'react-router-dom'
import type { Profile } from '../lib/utils'
import UserMenu from './UserMenu'

const NAV = [
    { to: '/', label: 'Dashboard', icon: IconDashboard },
    { to: '/horario', label: 'Horario', icon: IconCalendar },
    { to: '/tareas', label: 'Tareas', icon: IconCheck },
    { to: '/bitacora', label: 'Bitácora', icon: IconBook },
    { to: '/datos', label: 'Datos', icon: IconFolder },
]

function IconDashboard({ className = '' }: { className?: string }) {
    return <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg>
}
function IconCalendar({ className = '' }: { className?: string }) {
    return <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
}
function IconCheck({ className = '' }: { className?: string }) {
    return <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
}
function IconBook({ className = '' }: { className?: string }) {
    return <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
}
function IconFolder({ className = '' }: { className?: string }) {
    return <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
}

type LayoutProps = {
    profile: Profile
    refresh: () => void
    onUpdateProfile?: (patch: Partial<Profile>) => void
}

export default function Layout({ profile, refresh, onUpdateProfile }: LayoutProps) {
    void refresh

    const link = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
            ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
            : 'text-secondary hover:bg-[var(--bg-subtle)] hover:text-primary'
        }`

    return (
        <div className="min-h-screen bg-[var(--bg-app)] md:flex">
            {/* Sidebar */}
            <aside className="hidden md:flex md:w-60 flex-col bg-[var(--bg-card)] border-r border-[var(--border-soft)] p-4 sticky top-0 h-screen shrink-0">
                <div className="flex items-center gap-2 mb-8">
                    <div className="w-8 h-8 rounded-lg bg-brand-600 text-[var(--color-brand-contrast)] flex items-center justify-center font-bold text-sm">
                        P
                    </div>
                    <h1 className="text-lg font-semibold tracking-tight text-primary">PractiTrack</h1>
                </div>

                <nav className="space-y-1 flex-1">
                    {NAV.map((n) => {
                        const Icon = n.icon
                        return (
                            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={link}>
                                <Icon />
                                {n.label}
                            </NavLink>
                        )
                    })}
                </nav>

                <div className="text-xs text-muted">
                    {profile.career} · {profile.institution}
                </div>
            </aside>

            {/* Contenido principal */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="sticky top-0 z-30 bg-[var(--bg-app)]/80 backdrop-blur-sm border-b border-[var(--border-soft)]">
                    <div className="flex items-center justify-between px-4 md:px-6 py-3">
                        <div className="md:hidden flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-brand-600 text-[var(--color-brand-contrast)] flex items-center justify-center font-bold text-xs">
                                P
                            </div>
                            <span className="font-semibold text-sm text-primary">PractiTrack</span>
                        </div>
                        <div className="hidden md:block" />
                        <UserMenu profile={profile} onUpdateProfile={onUpdateProfile} />
                    </div>
                </header>

                {/* El main usa .app-content que respeta --app-content-width */}
                <main className="flex-1 w-full px-4 md:px-8 py-6 pb-24 md:pb-8">
                    <div className="app-content">
                        <Outlet context={{ profile, refresh }} />
                    </div>
                </main>
            </div>

            {/* Bottom nav móvil */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[var(--bg-card)] border-t border-[var(--border-soft)] flex justify-around py-2 z-40">
                {NAV.map((n) => {
                    const Icon = n.icon
                    return (
                        <NavLink
                            key={n.to}
                            to={n.to}
                            end={n.to === '/'}
                            className={({ isActive }) =>
                                `flex flex-col items-center gap-0.5 text-[10px] ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-muted'
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