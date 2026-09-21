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
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
        }`

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 md:flex">
            <aside className="hidden md:flex md:w-60 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 sticky top-0 h-screen">
                <div className="flex items-center gap-2 mb-8">
                    <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-sm">
                        P
                    </div>
                    <h1 className="text-lg font-semibold tracking-tight dark:text-slate-100">PractiTrack</h1>
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

                <div className="text-xs text-slate-400 dark:text-slate-500">
                    {profile.career} · {profile.institution}
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0">
                {/* Header con UserMenu */}
                <header className="sticky top-0 z-30 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm border-b border-slate-200/60 dark:border-slate-800/60">
                    <div className="max-w-5xl mx-auto flex items-center justify-between px-4 md:px-8 py-3">
                        <div className="md:hidden flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-xs">
                                P
                            </div>
                            <span className="font-semibold text-sm dark:text-slate-100">PractiTrack</span>
                        </div>
                        <div className="hidden md:block" />
                        <UserMenu profile={profile} onUpdateProfile={onUpdateProfile} />
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-5xl w-full mx-auto">
                    <Outlet context={{ profile, refresh }} />
                </main>
            </div>

            <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around py-2 z-40">
                {NAV.map((n) => {
                    const Icon = n.icon
                    return (
                        <NavLink
                            key={n.to}
                            to={n.to}
                            end={n.to === '/'}
                            className={({ isActive }) =>
                                `flex flex-col items-center gap-0.5 text-[10px] ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'
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