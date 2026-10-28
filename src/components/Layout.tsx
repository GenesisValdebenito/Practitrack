import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import type { Profile, Practice } from '../lib/utils'
import { fmt } from '../lib/utils'
import { supabase } from '../lib/supabase'
import UserMenu from './UserMenu'
import QuickLogWidget, { LOGS_CHANGED_EVENT } from './QuickLogWidget'

const NAV = [
    { to: '/', label: 'Dashboard', icon: IconDashboard },
    { to: '/horario', label: 'Horario', icon: IconCalendar },
    { to: '/pizarra', label: 'Pizarra', icon: IconPizarra },
    { to: '/tareas', label: 'Tareas', icon: IconCheck },
    { to: '/datos', label: 'Datos', icon: IconFolder },
]

// 4 pestañas directas en móvil (a los lados del botón central 'Más')
const MOBILE_MAIN_NAV = [
    { to: '/', label: 'Dashboard', icon: IconDashboard },
    { to: '/horario', label: 'Horario', icon: IconCalendar },
    { to: '/pizarra', label: 'Pizarra', icon: IconPizarra },
    { to: '/tareas', label: 'Tareas', icon: IconCheck },
]

function IconMore({ className = '' }: { className?: string }) {
    return (
        <svg
            className={className}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
            <circle cx="5" cy="12" r="1.5" />
        </svg>
    )
}

function ProgressRing({
    percentage,
    size = 48,
    strokeWidth = 3.5,
    value,
    color = 'var(--color-brand-600)',
    trackColor = 'var(--border-soft)',
}: {
    percentage: number
    size?: number
    strokeWidth?: number
    value: string | number
    color?: string
    trackColor?: string
}) {
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const clampedPct = Math.min(100, Math.max(0, percentage))
    const strokeDashoffset = circumference - (clampedPct / 100) * circumference

    return (
        <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Track de fondo */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={trackColor}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                {/* Arco de progreso que se va llenando */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-bold text-primary leading-none tracking-tight">
                    {value}
                </span>
            </div>
        </div>
    )
}

function IconDashboard({ className = '' }: { className?: string }) {
    return (
        <svg
            className={className}
            width="16" height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" />
            <rect x="14" y="3" width="7" height="5" />
            <rect x="14" y="12" width="7" height="9" />
            <rect x="3" y="16" width="7" height="5" />
        </svg>
    )
}
function IconCalendar({ className = '' }: { className?: string }) {
    return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
}
function IconPizarra({ className = '' }: { className?: string }) {
    return (
        <svg
            className={className}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="3" y="3" width="18" height="14" rx="2" />
            <path d="M8 21l4-4 4 4" />
            <path d="M8 8h8M8 11h5" />
        </svg>
    )
}
function IconCheck({ className = '' }: { className?: string }) {
    return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
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
    const location = useLocation()
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [mobileMoreOpen, setMobileMoreOpen] = useState(false)
    const activePractice = practices.find(p => p.id === activePracticeId)

    // Indica si la ruta activa actual está dentro de las opciones de 'Más'
    const isMoreActive = ['/datos', '/configuracion', '/perfil'].some(path => location.pathname.startsWith(path))
    // En el Dashboard ('/') ya se muestran estas métricas en detalle, por lo que se ocultan del encabezado
    const isDashboard = location.pathname === '/'

    // Métricas en tiempo real para el encabezado superior
    const [headerStats, setHeaderStats] = useState({
        totalHours: 0,
        percent: 0,
        daysLeft: 0,
    })

    const loadStats = async () => {
        const { data: logs } = await supabase.from('work_logs').select('date,hours_worked')
        const items = logs ?? []
        const total = items.reduce((sum, l) => sum + Number(l.hours_worked || 0), 0)
        const required = profile.required_hours || 360
        const pct = required > 0 ? Math.min(Math.round((total / required) * 100), 100) : 0
        const remaining = Math.max(0, required - total)

        // Calcular días restantes estimados
        const todayStr = fmt(new Date())
        const activePeriod = profile.availability_periods?.find(
            (p) => p.start_date <= todayStr && (!p.end_date || p.end_date >= todayStr)
        )
        const weeklyTarget = activePeriod
            ? Number(activePeriod.hours_per_week)
            : (profile.weekly_hours_target || 28)
        const dailyTarget = Math.max(1, weeklyTarget) / 7
        const days = remaining > 0 ? Math.ceil(remaining / dailyTarget) : 0

        setHeaderStats({
            totalHours: Math.round(total * 10) / 10,
            percent: pct,
            daysLeft: days,
        })
    }

    useEffect(() => {
        loadStats()
        window.addEventListener(LOGS_CHANGED_EVENT, loadStats)
        return () => window.removeEventListener(LOGS_CHANGED_EVENT, loadStats)
    }, [profile])

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
                {/* Header (Móvil) con información y métricas */}
                <header className="md:hidden sticky top-0 z-30 bg-[var(--bg-app)] border-b border-[var(--border-soft)]">
                    <div className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm tracking-tight text-primary">PractiTrack</span>
                            <span className="text-muted text-xs">·</span>
                            <span className="text-xs font-medium text-secondary truncate max-w-[130px]">
                                {activePractice?.name || 'Práctica Activa'}
                            </span>
                        </div>
                        <UserMenu profile={profile} onUpdateProfile={onUpdateProfile} />
                    </div>

                    {/* Barra de indicadores móviles en tiempo real con arcos de progreso (oculto en Dashboard) */}
                    {!isDashboard && (
                        <div className="flex items-center justify-around border-t border-[var(--border-soft)] bg-[var(--bg-card)] py-2 px-3 text-center animate-fade-in">
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-10 h-10 rounded-full border border-[var(--border-soft)] flex items-center justify-center bg-[var(--bg-subtle)]">
                                    <span className="text-xs font-bold text-primary">
                                        {headerStats.daysLeft}
                                    </span>
                                </div>
                                <span className="text-[9px] text-muted tracking-wider uppercase font-medium">
                                    Días rest.
                                </span>
                            </div>

                            <div className="flex flex-col items-center gap-1">
                                <ProgressRing
                                    percentage={headerStats.percent}
                                    size={40}
                                    strokeWidth={3.5}
                                    value={`${headerStats.percent}%`}
                                    color="var(--color-brand-600)"
                                />
                                <span className="text-[9px] text-muted tracking-wider uppercase font-medium">
                                    Avance
                                </span>
                            </div>

                            <div className="flex flex-col items-center gap-1">
                                <ProgressRing
                                    percentage={headerStats.percent}
                                    size={40}
                                    strokeWidth={3.5}
                                    value={`${headerStats.totalHours}h`}
                                    color="var(--color-brand-500)"
                                />
                                <span className="text-[9px] text-muted tracking-wider uppercase font-medium">
                                    Completadas
                                </span>
                            </div>
                        </div>
                    )}
                </header>

                <main className="flex-1 w-full flex flex-col h-screen overflow-hidden">
                    {/* Header Desktop con indicadores circulares de arco */}
                    <div className="hidden md:flex items-center justify-between px-8 py-4 w-full shrink-0 border-b border-[var(--border-soft)] bg-[var(--bg-app)]">
                        <div className="flex items-center gap-2 relative">
                            <h2
                                className="text-sm font-semibold text-primary cursor-pointer flex items-center gap-1.5 hover:text-brand-600 transition"
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                            >
                                <span>{activePractice?.name || 'Práctica Activa'}</span>
                                <span className="text-[10px] text-muted">▼</span>
                            </h2>
                            {dropdownOpen && (
                                <div className="absolute top-full left-0 mt-2 w-56 bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-xl shadow-xl py-1 z-50 animate-slide-up">
                                    {practices.map(p => (
                                        <button
                                            key={p.id}
                                            className={`w-full text-left px-4 py-2 text-xs hover:bg-[var(--bg-hover)] transition-colors ${p.id === activePracticeId ? 'text-brand-600 font-semibold' : 'text-primary'}`}
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
                                            className="w-full text-left px-4 py-2 text-xs text-muted hover:text-primary hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2"
                                            onClick={() => {
                                                setDropdownOpen(false)
                                            }}
                                        >
                                            + Nueva Práctica
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Indicadores con arcos de progreso circulares dinámicos (oculto en Dashboard) */}
                        <div className="flex items-center gap-7">
                            {!isDashboard && (
                                <>
                                    <div className="flex flex-col items-center">
                                        <span className="text-xl font-bold text-primary leading-tight">
                                            {headerStats.daysLeft}
                                        </span>
                                        <span className="text-[10px] text-muted tracking-wider uppercase font-semibold mt-1">
                                            Días restantes
                                        </span>
                                    </div>

                                    <div className="flex flex-col items-center">
                                        <ProgressRing
                                            percentage={headerStats.percent}
                                            size={48}
                                            strokeWidth={4}
                                            value={`${headerStats.percent}%`}
                                            color="var(--color-brand-600)"
                                        />
                                        <span className="text-[10px] text-muted tracking-wider uppercase font-semibold mt-1">
                                            Avance
                                        </span>
                                    </div>

                                    <div className="flex flex-col items-center">
                                        <ProgressRing
                                            percentage={headerStats.percent}
                                            size={48}
                                            strokeWidth={4}
                                            value={`${headerStats.totalHours}h`}
                                            color="var(--color-brand-500)"
                                        />
                                        <span className="text-[10px] text-muted tracking-wider uppercase font-semibold mt-1">
                                            Completadas
                                        </span>
                                    </div>

                                    <div className="h-9 w-px bg-[var(--border-soft)] mx-2" />
                                </>
                            )}

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

            {/* Popover / Menú desplegable para 'Más' en móvil (Diseño espacioso y pulido) */}
            {mobileMoreOpen && (
                <div
                    className="md:hidden fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex flex-col justify-end p-3 animate-fade-in"
                    onClick={() => setMobileMoreOpen(false)}
                >
                    <div
                        className="bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-3xl p-5 mb-16 space-y-4 shadow-2xl animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-soft)]">
                            <div>
                                <span className="text-xs font-bold text-primary tracking-wide">Más Opciones</span>
                                <p className="text-[11px] text-muted">Accesos rápidos y configuración</p>
                            </div>
                            <button
                                onClick={() => setMobileMoreOpen(false)}
                                className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] text-secondary hover:text-primary flex items-center justify-center text-sm font-bold transition"
                                aria-label="Cerrar"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-2.5">
                            <NavLink
                                to="/datos"
                                onClick={() => setMobileMoreOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center justify-between p-3.5 rounded-2xl border transition ${
                                        isActive
                                            ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-500/50 text-brand-600 dark:text-brand-400'
                                            : 'bg-[var(--bg-subtle)] border-[var(--border-soft)] text-primary hover:bg-[var(--bg-hover)]'
                                    }`
                                }
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                                        <IconFolder />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold">Datos y Reportes</p>
                                        <p className="text-xs text-muted">Gestión de bitácora, importación e informes</p>
                                    </div>
                                </div>
                                <span className="text-muted text-xs">→</span>
                            </NavLink>

                            <NavLink
                                to="/configuracion"
                                onClick={() => setMobileMoreOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center justify-between p-3.5 rounded-2xl border transition ${
                                        isActive
                                            ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-500/50 text-brand-600 dark:text-brand-400'
                                            : 'bg-[var(--bg-subtle)] border-[var(--border-soft)] text-primary hover:bg-[var(--bg-hover)]'
                                    }`
                                }
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-soft)] text-secondary flex items-center justify-center shrink-0">
                                        <IconSettings />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold">Configuración</p>
                                        <p className="text-xs text-muted">Tema, apariencia y preferencias</p>
                                    </div>
                                </div>
                                <span className="text-muted text-xs">→</span>
                            </NavLink>

                            <NavLink
                                to="/perfil"
                                onClick={() => setMobileMoreOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center justify-between p-3.5 rounded-2xl border transition ${
                                        isActive
                                            ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-500/50 text-brand-600 dark:text-brand-400'
                                            : 'bg-[var(--bg-subtle)] border-[var(--border-soft)] text-primary hover:bg-[var(--bg-hover)]'
                                    }`
                                }
                            >
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-soft)] text-secondary flex items-center justify-center shrink-0">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                    </div>
                                    <div className="text-left min-w-0">
                                        <p className="text-sm font-semibold truncate">{profile.full_name || 'Mi Perfil'}</p>
                                        <p className="text-xs text-muted truncate">{profile.career || 'Datos de práctica profesional'}</p>
                                    </div>
                                </div>
                                <span className="text-muted text-xs">→</span>
                            </NavLink>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom nav móvil con 4 pestañas fijas + botón central 'Más' */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[var(--bg-card)] border-t border-[var(--border-soft)] flex items-center justify-around py-1.5 px-1 z-40 shadow-lg">
                {/* Lado izquierdo: Dashboard y Horario */}
                {MOBILE_MAIN_NAV.slice(0, 2).map((n) => {
                    const Icon = n.icon
                    return (
                        <NavLink
                            key={n.to}
                            to={n.to}
                            end={n.to === '/'}
                            onClick={() => setMobileMoreOpen(false)}
                            className={({ isActive }) =>
                                `flex-1 flex flex-col items-center gap-0.5 py-1 text-[10px] font-medium transition-colors ${
                                    isActive
                                        ? 'text-brand-600 dark:text-brand-400 font-semibold'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`
                            }
                        >
                            <Icon />
                            <span>{n.label}</span>
                        </NavLink>
                    )
                })}

                {/* Botón Central: Más */}
                <div className="flex-1 flex justify-center">
                    <button
                        type="button"
                        onClick={() => setMobileMoreOpen(!mobileMoreOpen)}
                        className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition text-[10px] font-medium ${
                            mobileMoreOpen || isMoreActive
                                ? 'text-brand-600 dark:text-brand-400 font-semibold'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                        aria-expanded={mobileMoreOpen}
                        aria-label="Abrir más opciones"
                    >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                            mobileMoreOpen || isMoreActive
                                ? 'bg-brand-600 text-white shadow-sm'
                                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                        }`}>
                            <IconMore />
                        </div>
                        <span>Más</span>
                    </button>
                </div>

                {/* Lado derecho: Pizarra y Tareas */}
                {MOBILE_MAIN_NAV.slice(2, 4).map((n) => {
                    const Icon = n.icon
                    return (
                        <NavLink
                            key={n.to}
                            to={n.to}
                            end={n.to === '/'}
                            onClick={() => setMobileMoreOpen(false)}
                            className={({ isActive }) =>
                                `flex-1 flex flex-col items-center gap-0.5 py-1 text-[10px] font-medium transition-colors ${
                                    isActive
                                        ? 'text-brand-600 dark:text-brand-400 font-semibold'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`
                            }
                        >
                            <Icon />
                            <span>{n.label}</span>
                        </NavLink>
                    )
                })}
            </nav>

            {/* Bloque flotante para agregar actividades (se oculta en perfil y configuración) */}
            <QuickLogWidget />
        </div>
    )
}