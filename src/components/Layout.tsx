
import { useCallback, useEffect, useState } from 'react'
import {
    NavLink,
    Outlet,
    useLocation,
    useNavigate,
} from 'react-router-dom'
import {
    CalendarDays,
    CheckSquare,
    ChevronRight,
    FolderOpen,
    GraduationCap,
    LayoutDashboard,
    Menu,
    MoreHorizontal,
    Settings,
    StickyNote,
    UserRound,
    X,
} from 'lucide-react'

import type { Profile, Practice } from '../lib/utils'
import { fmt } from '../lib/utils'
import { supabase } from '../lib/supabase'
import UserMenu from './UserMenu'
import QuickLogWidget, {
    LOGS_CHANGED_EVENT,
} from './QuickLogWidget'

type LayoutProps = {
    profile: Profile
    refresh: () => void
    onUpdateProfile?: (patch: Partial<Profile>) => void
    practices?: Practice[]
    activePracticeId?: string | null
    setActivePracticeId?: (id: string) => void
}

const NAV = [
    {
        to: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
    },
    {
        to: '/horario',
        label: 'Horario',
        icon: CalendarDays,
    },
    {
        to: '/pizarra',
        label: 'Pizarra',
        icon: StickyNote,
    },
    {
        to: '/tareas',
        label: 'Tareas',
        icon: CheckSquare,
    },
    {
        to: '/datos',
        label: 'Datos',
        icon: FolderOpen,
    },
]

const MOBILE_MAIN_NAV = NAV.slice(0, 4)

type HeaderStats = {
    totalHours: number
    percent: number
    daysLeft: number
}

function ProgressRing({
    percentage,
    size = 44,
    strokeWidth = 3.5,
    value,
}: {
    percentage: number
    size?: number
    strokeWidth?: number
    value: string | number
}) {
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const clamped = Math.min(
        100,
        Math.max(0, percentage),
    )
    const offset =
        circumference -
        (clamped / 100) * circumference

    return (
        <div
            className="relative inline-flex shrink-0 items-center justify-center"
            style={{ width: size, height: size }}
        >
            <svg
                width={size}
                height={size}
                className="-rotate-90"
                aria-hidden="true"
            >
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="var(--border-soft)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />

                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="var(--color-brand-600)"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700 ease-out"
                />
            </svg>

            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-primary">
                {value}
            </span>
        </div>
    )
}

export default function Layout({
    profile,
    refresh,
    onUpdateProfile,
    practices = [],
    activePracticeId,
    setActivePracticeId,
}: LayoutProps) {
    const navigate = useNavigate()
    const location = useLocation()

    const [mobileMoreOpen, setMobileMoreOpen] =
        useState(false)

    const [sidebarCollapsed, setSidebarCollapsed] =
        useState(false)

    const [headerStats, setHeaderStats] =
        useState<HeaderStats>({
            totalHours: 0,
            percent: 0,
            daysLeft: 0,
        })

    const activePractice = practices.find(
        practice => practice.id === activePracticeId,
    )

    const practiceLabel =
        activePractice?.name || 'Sin práctica seleccionada'

    const isDashboard =
        location.pathname === '/' ||
        location.pathname === '/dashboard'

    const isMoreActive = [
        '/datos',
        '/configuracion',
        '/perfil',
    ].some(path => location.pathname.startsWith(path))

    // Un único cambio de práctica, desde UserMenu.
    const changePractice = () => {
        setMobileMoreOpen(false)

        setActivePracticeId?.('')

        navigate('/seleccionar-practica', {
            replace: true,
        })
    }

    const loadStats = useCallback(async () => {
        if (!activePracticeId) {
            setHeaderStats({
                totalHours: 0,
                percent: 0,
                daysLeft: 0,
            })
            return
        }

        const { data: authData, error: authError } =
            await supabase.auth.getUser()

        const user = authData.user

        if (authError || !user) {
            console.error(
                'Error al obtener el usuario:',
                authError,
            )
            return
        }

        const { data: logs, error } = await supabase
            .from('work_logs')
            .select('date,hours_worked')
            .eq('user_id', user.id)
            .eq('practice_id', activePracticeId)

        if (error) {
            console.error(
                'Error al cargar estadísticas:',
                error,
            )
            return
        }

        const total = (logs ?? []).reduce(
            (sum, log) =>
                sum + Number(log.hours_worked || 0),
            0,
        )

        const required =
            Number(activePractice?.required_hours) ||
            Number(profile.required_hours) ||
            360

        const percent =
            required > 0
                ? Math.min(
                    Math.round((total / required) * 100),
                    100,
                )
                : 0

        const remaining = Math.max(
            0,
            required - total,
        )

        const todayStr = fmt(new Date())

        const activePeriod =
            profile.availability_periods?.find(
                period =>
                    period.start_date <= todayStr &&
                    (!period.end_date ||
                        period.end_date >= todayStr),
            )

        const weeklyTarget = activePeriod
            ? Number(activePeriod.hours_per_week)
            : Number(profile.weekly_hours_target) || 28

        const dailyTarget =
            Math.max(1, weeklyTarget) / 7

        const daysLeft =
            remaining > 0
                ? Math.ceil(remaining / dailyTarget)
                : 0

        setHeaderStats({
            totalHours: Math.round(total * 10) / 10,
            percent,
            daysLeft,
        })
    }, [
        activePracticeId,
        activePractice?.required_hours,
        profile,
    ])

    useEffect(() => {
        void loadStats()

        const handleLogsChanged = () => {
            void loadStats()
        }

        window.addEventListener(
            LOGS_CHANGED_EVENT,
            handleLogsChanged,
        )

        return () => {
            window.removeEventListener(
                LOGS_CHANGED_EVENT,
                handleLogsChanged,
            )
        }
    }, [loadStats])

    useEffect(() => {
        setMobileMoreOpen(false)
    }, [location.pathname])

    const navLinkClass = ({
        isActive,
    }: {
        isActive: boolean
    }) =>
        [
            'flex min-h-10 items-center gap-3 rounded-lg',
            'px-3 py-2 text-sm font-medium',
            'transition-colors',
            isActive
                ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
        ].join(' ')

    return (
        <div className="min-h-screen bg-[var(--bg-app)] font-sans text-[var(--text-primary)] md:flex">

            {/* BARRA LATERAL ESCRITORIO */}
            <aside
                className={[
                    'sticky top-0 hidden h-screen shrink-0',
                    'flex-col border-r border-[var(--border-soft)]',
                    'bg-[var(--bg-app)] p-3',
                    'transition-[width] duration-200 md:flex',
                    sidebarCollapsed
                        ? 'w-[72px]'
                        : 'w-[220px]',
                ].join(' ')}
            >
                {/* Marca y control lateral */}
                <div className="mb-5 flex h-11 items-center justify-between gap-2 px-2">
                    {!sidebarCollapsed && (
                        <span className="truncate text-sm font-bold tracking-tight">
                            PractiTrack
                        </span>
                    )}

                    <button
                        type="button"
                        onClick={() =>
                            setSidebarCollapsed(
                                value => !value,
                            )
                        }
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                        aria-label={
                            sidebarCollapsed
                                ? 'Expandir barra lateral'
                                : 'Contraer barra lateral'
                        }
                        title={
                            sidebarCollapsed
                                ? 'Expandir menú'
                                : 'Contraer menú'
                        }
                    >
                        <Menu size={18} />
                    </button>
                </div>

                {/* Navegación */}
                <nav
                    className="flex-1 space-y-1"
                    aria-label="Navegación principal"
                >
                    {NAV.map(item => {
                        const Icon = item.icon

                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={navLinkClass}
                                title={
                                    sidebarCollapsed
                                        ? item.label
                                        : undefined
                                }
                            >
                                <Icon
                                    size={18}
                                    className="shrink-0"
                                />

                                {!sidebarCollapsed && (
                                    <span className="truncate">
                                        {item.label}
                                    </span>
                                )}
                            </NavLink>
                        )
                    })}
                </nav>

                {/* Configuración */}
                <div className="mt-auto border-t border-[var(--border-soft)] pt-3">
                    <NavLink
                        to="/configuracion"
                        className={navLinkClass}
                        title={
                            sidebarCollapsed
                                ? 'Configuración'
                                : undefined
                        }
                    >
                        <Settings
                            size={18}
                            className="shrink-0"
                        />

                        {!sidebarCollapsed && (
                            <span>Configuración</span>
                        )}
                    </NavLink>
                </div>
            </aside>

            {/* ÁREA PRINCIPAL */}
            <div className="flex min-w-0 flex-1 flex-col bg-[var(--bg-app)]">

                {/* HEADER MÓVIL */}
                <header className="sticky top-0 z-30 border-b border-[var(--border-soft)] bg-[var(--bg-app)] md:hidden">
                    <div className="flex min-h-[64px] items-center justify-between gap-3 px-4 py-3">

                        {/* Nombre, sin selector duplicado */}
                        <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card)]">
                                <GraduationCap size={17} />
                            </div>

                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">
                                    {practiceLabel}
                                </p>

                                <p className="truncate text-[11px] text-muted">
                                    Espacio actual
                                </p>
                            </div>
                        </div>

                        <div className="shrink-0">
                            <UserMenu
                                profile={profile}
                                onUpdateProfile={onUpdateProfile}
                                onChangePractice={changePractice}
                            />
                        </div>
                    </div>

                    {/* Estadísticas móviles */}
                    {!isDashboard && (
                        <div className="flex items-center justify-around border-t border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-2">
                            <div className="flex min-w-0 flex-col items-center gap-1">
                                <span className="text-sm font-bold">
                                    {headerStats.daysLeft}
                                </span>

                                <span className="text-[9px] uppercase tracking-wide text-muted">
                                    Días rest.
                                </span>
                            </div>

                            <div className="flex min-w-0 flex-col items-center gap-1">
                                <ProgressRing
                                    percentage={
                                        headerStats.percent
                                    }
                                    size={40}
                                    value={`${headerStats.percent}%`}
                                />

                                <span className="text-[9px] uppercase tracking-wide text-muted">
                                    Avance
                                </span>
                            </div>

                            <div className="flex min-w-0 flex-col items-center gap-1">
                                <ProgressRing
                                    percentage={
                                        headerStats.percent
                                    }
                                    size={40}
                                    value={`${headerStats.totalHours}h`}
                                />

                                <span className="text-[9px] uppercase tracking-wide text-muted">
                                    Completadas
                                </span>
                            </div>
                        </div>
                    )}
                </header>

                <main className="flex min-h-0 w-full flex-1 flex-col">

                    {/* HEADER ESCRITORIO */}
                    <div className="hidden min-h-[88px] w-full shrink-0 items-center justify-between gap-6 border-b border-[var(--border-soft)] bg-[var(--bg-app)] px-8 py-4 md:flex">

                        {/* Práctica activa, sin botón Cambiar */}
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)]">
                                <GraduationCap size={19} />
                            </div>

                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-primary">
                                    {practiceLabel}
                                </p>

                                <p className="mt-0.5 truncate text-[11px] text-muted">
                                    Espacio de trabajo actual
                                </p>
                            </div>
                        </div>


                        {/* Indicadores y menú de usuario */}
                        <div className="flex shrink-0 items-center gap-3">

                            {!isDashboard && (
                                <>
                                    <div className="flex items-center gap-4">

                                        {/* Días restantes */}
                                        <div className="flex items-center gap-2">
                                            <ProgressRing
                                                percentage={0}
                                                size={36}
                                                strokeWidth={2.5}
                                                value={headerStats.daysLeft}
                                            />
                                            <span className="text-[10px] font-medium text-muted">
                                                Días
                                            </span>
                                        </div>

                                        {/* Avance */}
                                        <div className="flex items-center gap-2">
                                            <ProgressRing
                                                percentage={headerStats.percent}
                                                size={36}
                                                strokeWidth={2.5}
                                                value={`${headerStats.percent}%`}
                                            />
                                            <span className="text-[10px] font-medium text-muted">
                                                Avance
                                            </span>
                                        </div>

                                        {/* Horas completadas */}
                                        <div className="flex items-center gap-2">
                                            <ProgressRing
                                                percentage={headerStats.percent}
                                                size={36}
                                                strokeWidth={2.5}
                                                value={`${headerStats.totalHours}h`}
                                            />
                                            <span className="text-[10px] font-medium text-muted">
                                                Horas
                                            </span>
                                        </div>

                                    </div>

                                    {/* Separador */}
                                    <div className="h-6 w-px bg-[var(--border-soft)]" />
                                </>
                            )}

                            {/* Menú de usuario */}
                            <UserMenu
                                profile={profile}
                                onUpdateProfile={onUpdateProfile}
                                onChangePractice={changePractice}
                            />

                        </div>

                    </div>

                    {/* CONTENIDO DE CADA PÁGINA */}
                    <div className="flex min-h-0 flex-1 justify-center overflow-y-auto px-4 pb-24 pt-6 md:px-8 md:pb-8 md:pt-8">
                        <div
                            className="w-full min-w-0 transition-all duration-300"
                            style={{
                                maxWidth:
                                    'var(--app-content-width, 72rem)',
                            }}
                        >
                            <Outlet
                                context={{
                                    profile,
                                    refresh,
                                    practices,
                                    activePracticeId,
                                }}
                            />
                        </div>
                    </div>
                </main>
            </div>

            {/* MENÚ MÁS EN MÓVIL */}
            {mobileMoreOpen && (
                <div
                    className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60 p-3 backdrop-blur-sm md:hidden"
                    onClick={() =>
                        setMobileMoreOpen(false)
                    }
                >
                    <div
                        className="mb-16 space-y-3 rounded-3xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-5 shadow-2xl"
                        onClick={event =>
                            event.stopPropagation()
                        }
                    >
                        <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-3">
                            <div>
                                <p className="text-sm font-bold">
                                    Más opciones
                                </p>

                                <p className="mt-1 text-xs text-muted">
                                    Accesos rápidos y configuración
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setMobileMoreOpen(false)
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-secondary"
                                aria-label="Cerrar menú"
                            >
                                <X size={17} />
                            </button>
                        </div>

                        <div className="space-y-1">
                            <NavLink
                                to="/datos"
                                onClick={() =>
                                    setMobileMoreOpen(false)
                                }
                                className="flex items-center gap-3 rounded-xl p-3 text-sm transition-colors hover:bg-[var(--bg-hover)]"
                            >
                                <FolderOpen size={19} />

                                <div className="flex-1">
                                    <p className="font-semibold">
                                        Datos y reportes
                                    </p>

                                    <p className="text-xs text-muted">
                                        Bitácora, importación e informes
                                    </p>
                                </div>

                                <ChevronRight size={16} />
                            </NavLink>

                            <NavLink
                                to="/configuracion"
                                onClick={() =>
                                    setMobileMoreOpen(false)
                                }
                                className="flex items-center gap-3 rounded-xl p-3 text-sm transition-colors hover:bg-[var(--bg-hover)]"
                            >
                                <Settings size={19} />

                                <div className="flex-1">
                                    <p className="font-semibold">
                                        Configuración
                                    </p>

                                    <p className="text-xs text-muted">
                                        Tema, apariencia y preferencias
                                    </p>
                                </div>

                                <ChevronRight size={16} />
                            </NavLink>

                            <NavLink
                                to="/perfil"
                                onClick={() =>
                                    setMobileMoreOpen(false)
                                }
                                className="flex items-center gap-3 rounded-xl p-3 text-sm transition-colors hover:bg-[var(--bg-hover)]"
                            >
                                <UserRound size={19} />

                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold">
                                        {profile.full_name ||
                                            'Mi perfil'}
                                    </p>

                                    <p className="truncate text-xs text-muted">
                                        {profile.career ||
                                            'Datos de práctica profesional'}
                                    </p>
                                </div>

                                <ChevronRight size={16} />
                            </NavLink>
                        </div>

                        <p className="border-t border-[var(--border-soft)] pt-3 text-xs text-muted">
                            Para cambiar de práctica, abre
                            tu menú de usuario en la parte
                            superior.
                        </p>
                    </div>
                </div>
            )}

            {/* NAVEGACIÓN INFERIOR MÓVIL */}
            <nav
                className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-[var(--border-soft)] bg-[var(--bg-card)] px-1 py-1.5 shadow-lg md:hidden"
                aria-label="Navegación móvil"
            >
                {MOBILE_MAIN_NAV.slice(0, 2).map(item => {
                    const Icon = item.icon

                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() =>
                                setMobileMoreOpen(false)
                            }
                            className={({ isActive }) =>
                                [
                                    'flex flex-1 flex-col items-center gap-1 py-1',
                                    'text-[10px] font-medium transition-colors',
                                    isActive
                                        ? 'font-semibold text-brand-600 dark:text-brand-400'
                                        : 'text-[var(--text-secondary)]',
                                ].join(' ')
                            }
                        >
                            <Icon size={19} />
                            <span>{item.label}</span>
                        </NavLink>
                    )
                })}

                <div className="flex flex-1 justify-center">
                    <button
                        type="button"
                        onClick={() =>
                            setMobileMoreOpen(
                                value => !value,
                            )
                        }
                        className={[
                            'flex flex-col items-center gap-1 rounded-xl px-3 py-1',
                            'text-[10px] font-medium transition-colors',
                            mobileMoreOpen || isMoreActive
                                ? 'text-brand-600 dark:text-brand-400'
                                : 'text-[var(--text-secondary)]',
                        ].join(' ')}
                        aria-label="Abrir más opciones"
                        aria-expanded={mobileMoreOpen}
                    >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-subtle)]">
                            <MoreHorizontal size={19} />
                        </div>

                        <span>Más</span>
                    </button>
                </div>

                {MOBILE_MAIN_NAV.slice(2, 4).map(item => {
                    const Icon = item.icon

                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() =>
                                setMobileMoreOpen(false)
                            }
                            className={({ isActive }) =>
                                [
                                    'flex flex-1 flex-col items-center gap-1 py-1',
                                    'text-[10px] font-medium transition-colors',
                                    isActive
                                        ? 'font-semibold text-brand-600 dark:text-brand-400'
                                        : 'text-[var(--text-secondary)]',
                                ].join(' ')
                            }
                        >
                            <Icon size={19} />
                            <span>{item.label}</span>
                        </NavLink>
                    )
                })}
            </nav>

            {/* REGISTRO RÁPIDO EXISTENTE */}
            <QuickLogWidget />
        </div>
    )
}
