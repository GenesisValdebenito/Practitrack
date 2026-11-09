import { useCallback, useEffect, useState } from 'react'
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
    //useLocation,
} from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'

import { supabase } from './lib/supabase'
import type { Profile, Practice } from './lib/utils'

import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Landing from './pages/Landing'
import Onboarding from './pages/Onboarding'

import Dashboard from './pages/Dashboard'
import Schedule from './pages/Schedule'
import Stickys from './pages/Stickys'
import Tasks from './pages/Tasks'
import Data from './pages/Data'
import ProfilePage from './pages/ProfilePage'
import ConfigPage from './pages/ConfigPage'

function AppRoutes() {
    const [session, setSession] = useState<Session | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [practices, setPractices] = useState<Practice[]>([])
    const [activePracticeId, setActivePracticeId] = useState<string | null>(null)

    const [authLoading, setAuthLoading] = useState(true)
    const [profileLoading, setProfileLoading] = useState(false)

    //const location = useLocation()

    // Obtener la sesión existente y escuchar cambios de autenticación.
    useEffect(() => {
        let mounted = true

        const initializeAuth = async () => {
            const { data, error } = await supabase.auth.getSession()

            if (!mounted) return

            if (error) {
                console.error('Error al recuperar sesión:', error.message)
            }

            setSession(data.session)
            setAuthLoading(false)
        }

        initializeAuth()

        const { data: authListener } = supabase.auth.onAuthStateChange(
            (_event, newSession) => {
                if (!mounted) return

                setSession(newSession)

                if (!newSession) {
                    setProfile(null)
                    setPractices([])
                    setActivePracticeId(null)
                    setProfileLoading(false)
                }
            }
        )

        return () => {
            mounted = false
            authListener.subscription.unsubscribe()
        }
    }, [])

    // Recuperar perfil y prácticas del usuario autenticado.
    const loadProfile = useCallback(async () => {
        const { data: authData, error: authError } = await supabase.auth.getUser()
        const user = authData.user

        if (authError || !user) {
            setProfile(null)
            setPractices([])
            setProfileLoading(false)
            return
        }

        setProfileLoading(true)

        try {
            let { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle()

            if (error) throw error

            if (!data) {
                const newProfile = {
                    id: user.id,
                    full_name: user.user_metadata?.full_name || '',
                    email: user.email || '',
                    avatar_url: user.user_metadata?.avatar_url || '',
                    onboarded: false,
                }

                const { data: inserted, error: insertError } = await supabase
                    .from('profiles')
                    .insert(newProfile)
                    .select()
                    .single()

                if (insertError) throw insertError

                data = inserted
            }

            setProfile(data as Profile)

            const { data: userPractices, error: practicesError } = await supabase
                .from('practices')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (practicesError) throw practicesError

            const loadedPractices = userPractices || []

            setPractices(loadedPractices)

            if (loadedPractices.length > 0) {
                const active =
                    loadedPractices.find((practice) => practice.is_active) ||
                    loadedPractices[0]

                setActivePracticeId(active.id)
            } else {
                setActivePracticeId(null)
            }
        } catch (error) {
            console.error('Error al cargar los datos del usuario:', error)
            setProfile(null)
        } finally {
            setProfileLoading(false)
        }
    }, [])

    useEffect(() => {
        if (session) {
            loadProfile()
        } else {
            setProfile(null)
            setPractices([])
            setActivePracticeId(null)
        }
    }, [session, loadProfile])

    // Pantalla de carga inicial.
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-slate-500">Cargando PractiTrack...</p>
                </div>
            </div>
        )
    }

    // Rutas públicas.
    if (!session) {
        return (
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Register />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        )
    }

    if (profileLoading || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-slate-500">Preparando tu espacio...</p>
                </div>
            </div>
        )
    }

    // Si inició sesión pero todavía no configura su práctica.
    if (!profile.onboarded) {
        return (
            <Routes>
                <Route
                    path="/bienvenida"
                    element={
                        <Onboarding
                            userId={session.user.id}
                            profile={profile}
                            googleName={session.user.user_metadata?.full_name ?? ''}
                            onDone={loadProfile}
                        />
                    }
                />
                <Route path="*" element={<Navigate to="/bienvenida" replace />} />
            </Routes>
        )
    }

    // El usuario ya completó su configuración.
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="/registro" element={<Navigate to="/dashboard" replace />} />
            <Route path="/bienvenida" element={<Navigate to="/dashboard" replace />} />

            <Route
                element={
                    <Layout
                        profile={profile}
                        refresh={loadProfile}
                        practices={practices}
                        activePracticeId={activePracticeId}
                        setActivePracticeId={setActivePracticeId}
                    />
                }
            >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/horario" element={<Schedule activePracticeId={activePracticeId} />} />
                <Route path="/tareas" element={<Tasks activePracticeId={activePracticeId} />} />
                <Route path="/datos" element={<Data activePracticeId={activePracticeId} />} />
                <Route path="/pizarra" element={<Stickys />} />
                <Route path="/perfil" element={<ProfilePage />} />
                <Route path="/configuracion" element={<ConfigPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    )
}
