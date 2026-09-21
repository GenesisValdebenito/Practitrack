import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/utils'

const NAV = [
    { to: '/', label: 'Dashboard', icon: '📊' },
    { to: '/horario', label: 'Horario', icon: '📅' },
    { to: '/tareas', label: 'Tareas', icon: '✅' },
    { to: '/bitacora', label: 'Bitácora', icon: '📝' },
    { to: '/perfil', label: 'Perfil', icon: '👤' },
]

export default function Layout({ profile, refresh }: { profile: Profile; refresh: () => void }) {
    const link = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
        }`

    return (
        <div className="min-h-screen bg-gray-50 md:flex">
            <aside className="hidden md:flex md:w-60 flex-col bg-white border-r p-4 sticky top-0 h-screen">
                <h1 className="text-xl font-bold mb-6">⏱️ PractiTrack</h1>
                <nav className="space-y-1 flex-1">
                    {NAV.map((n) => (
                        <NavLink key={n.to} to={n.to} end={n.to === '/'} className={link}>
                            <span>{n.icon}</span>{n.label}
                        </NavLink>
                    ))}
                </nav>
                <p className="text-xs text-gray-500 truncate mb-2">{profile.full_name}</p>
                <button onClick={() => supabase.auth.signOut()} className="text-sm text-red-600 text-left">
                    Cerrar sesión
                </button>
            </aside>

            <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-5xl w-full mx-auto">
                <Outlet context={{ profile, refresh }} />
            </main>

            <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t flex justify-around py-2">
                {NAV.map((n) => (
                    <NavLink
                        key={n.to}
                        to={n.to}
                        end={n.to === '/'}
                        className={({ isActive }) =>
                            `flex flex-col items-center text-xs ${isActive ? 'text-blue-700' : 'text-gray-500'}`
                        }
                    >
                        <span className="text-lg">{n.icon}</span>{n.label}
                    </NavLink>
                ))}
            </nav>
        </div>
    )
}