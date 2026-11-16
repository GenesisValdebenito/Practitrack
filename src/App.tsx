import { useCallback, useEffect, useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom'

import type { Session } from '@supabase/supabase-js'

import { supabase } from './lib/supabase'
import {
  applyAllPreferences,
  applyDefaultTheme,
  DEFAULT_THEME_COLOR,
  DEFAULT_THEME_MODE,
  type ThemeMode,
} from './lib/theme'
import {
  clearLastEmail,
  clearSessionStart,
  getLastEmail,
  setLastEmail,
} from './lib/session'
import { useSessionTimeout } from './hooks/useSessionTimeout'
import type { Profile, Practice } from './lib/utils'

import Layout from './components/Layout'
import SessionExpiredScreen from './components/SessionExpiredScreen'

import Login from './pages/Login'
import Register from './pages/Register'
import Landing from './pages/Landing'
import Onboarding from './pages/Onboarding'
import PracticeSelector from './pages/PracticeSelector'
import Terminos from './pages/Terminos'

import Dashboard from './pages/Dashboard'
import Schedule from './pages/Schedule'
import Stickys from './pages/Stickys'
import Tasks from './pages/Tasks'
import Data from './pages/Data'
import ProfilePage from './pages/ProfilePage'
import ConfigPage from './pages/ConfigPage'

function LoadingScreen({
  message,
}: {
  message: string
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-app,#f5f5f5)]">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />

        <p className="text-sm text-[var(--text-secondary,#666666)]">
          {message}
        </p>
      </div>
    </div>
  )
}

function AppRoutes() {
  const navigate = useNavigate()

  const [session, setSession] =
    useState<Session | null>(null)

  const [profile, setProfile] =
    useState<Profile | null>(null)

  const [practices, setPractices] =
    useState<Practice[]>([])

  // null significa que todavía no se ha seleccionado
  // una práctica para entrar al espacio de trabajo.
  const [activePracticeId, setActivePracticeId] =
    useState<string | null>(null)

  const [authLoading, setAuthLoading] =
    useState(true)

  const [profileLoading, setProfileLoading] =
    useState(true)

  const [sessionExpired, setSessionExpired] =
    useState(false)

  const [lastEmail, setLastEmailState] =
    useState<string>(getLastEmail)

  // Inicializar autenticación y escuchar cambios de sesión.
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      const { data, error } =
        await supabase.auth.getSession()

      if (!mounted) return

      if (error) {
        console.error(
          'Error al recuperar sesión:',
          error.message,
        )
      }

      setSession(data.session)
      setAuthLoading(false)

      if (!data.session) {
        setProfileLoading(false)
      }
    }

    void initializeAuth()

    const { data: authListener } =
      supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          if (!mounted) return

          setSession(newSession)

          if (!newSession) {
            setProfile(null)
            setPractices([])
            setActivePracticeId(null)
            setProfileLoading(false)
          }
        },
      )

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  // Cargar el perfil y únicamente las prácticas
  // pertenecientes al usuario autenticado.
  const loadProfile = useCallback(async () => {
    setProfileLoading(true)

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser()

      const user = authData.user

      if (authError || !user) {
        setProfile(null)
        setPractices([])
        setActivePracticeId(null)
        return
      }

      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        const newProfile = {
          id: user.id,
          full_name:
            user.user_metadata?.full_name || '',
          email: user.email || '',
          avatar_url:
            user.user_metadata?.avatar_url || '',
          onboarded: false,
        }

        const {
          data: inserted,
          error: insertError,
        } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single()

        if (insertError) throw insertError

        data = inserted
      }

      // Aplicar el tema guardado del usuario (o el tema por defecto).
      applyAllPreferences({
        mode:
          (data.theme_mode as ThemeMode | null) ??
          DEFAULT_THEME_MODE,
        color: data.theme_color ?? DEFAULT_THEME_COLOR,
      })

      setProfile(data as Profile)

      const {
        data: userPractices,
        error: practicesError,
      } = await supabase
        .from('practices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', {
          ascending: false,
        })

      if (practicesError) {
        throw practicesError
      }

      const loadedPractices =
        (userPractices || []) as Practice[]

      setPractices(loadedPractices)

      // No seleccionar automáticamente la primera práctica.
      // Mantener la selección actual si todavía existe.
      // Si fue eliminada, volver al selector.
      setActivePracticeId(currentId => {
        if (!currentId) return null

        const stillExists =
          loadedPractices.some(
            practice => practice.id === currentId,
          )

        return stillExists ? currentId : null
      })
    } catch (error) {
      console.error(
        'Error al cargar los datos del usuario:',
        error,
      )

      setProfile(null)
      setPractices([])
      setActivePracticeId(null)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  // Recargar información al cambiar la sesión.
  useEffect(() => {
    if (session) {
      void loadProfile()
    } else {
      setProfile(null)
      setPractices([])
      setActivePracticeId(null)
      setProfileLoading(false)

      // Fuera de una sesión iniciada, la app usa siempre el tema por defecto.
      // Se espera a que termine la comprobación inicial para no pisar el tema
      // guardado de un usuario que está recargando la página.
      if (!authLoading) {
        applyDefaultTheme()
        clearSessionStart()
      }
    }
  }, [session?.user.id, authLoading, loadProfile])

  // Guardar el último correo usado (para sugerirlo al volver a entrar).
  useEffect(() => {
    const email = session?.user.email

    if (email) {
      setLastEmail(email)
      setLastEmailState(email)
    }
  }, [session?.user.email])

  const handleSessionExpire = useCallback(() => {
    clearSessionStart()
    setSessionExpired(true)
    void supabase.auth.signOut()
  }, [])

  useSessionTimeout(
    Boolean(session) && !sessionExpired,
    handleSessionExpire,
  )

  // Seleccionar una práctica existente.
  const handleSelectPractice = useCallback(
    (practiceId: string) => {
      const belongsToUser =
        practices.some(
          practice => practice.id === practiceId,
        )

      if (!belongsToUser) {
        console.error(
          'No se puede seleccionar una práctica que no pertenece al usuario.',
        )
        return
      }

      setActivePracticeId(practiceId)
    },
    [practices],
  )

  // Volver al selector sin cerrar sesión.
  // Compatible con el Layout que utiliza
  // setActivePracticeId('') para cambiar de práctica.
  const handleChangePractice = useCallback(
    (practiceId: string) => {
      if (!practiceId) {
        setActivePracticeId(null)
        return
      }

      handleSelectPractice(practiceId)
    },
    [handleSelectPractice],
  )

  const handleExpiredEnter = useCallback(() => {
    setSessionExpired(false)

    navigate(
      lastEmail
        ? `/login?email=${encodeURIComponent(lastEmail)}`
        : '/login',
      { replace: true },
    )
  }, [lastEmail, navigate])

  const handleExpiredChangeEmail = useCallback(() => {
    setSessionExpired(false)
    navigate('/login?cambiar=1', { replace: true })
  }, [navigate])

  const handleExpiredClose = useCallback(() => {
    setSessionExpired(false)
    clearLastEmail()
    setLastEmailState('')
    navigate('/', { replace: true })
  }, [navigate])

  if (authLoading) {
    return (
      <LoadingScreen message="Cargando PractiTrack..." />
    )
  }

  if (sessionExpired) {
    return (
      <SessionExpiredScreen
        email={lastEmail}
        onEnter={handleExpiredEnter}
        onChangeEmail={handleExpiredChangeEmail}
        onClose={handleExpiredClose}
      />
    )
  }

  // Rutas públicas.
  if (!session) {
    return (
      <Routes>
        <Route
          path="/"
          element={<Landing />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/registro"
          element={<Register />}
        />

        <Route
          path="/terminos"
          element={<Terminos />}
        />

        <Route
          path="*"
          element={
            <Navigate to="/" replace />
          }
        />
      </Routes>
    )
  }

  if (profileLoading || !profile) {
    return (
      <LoadingScreen message="Preparando tu espacio..." />
    )
  }

  // Configuración inicial de la cuenta.
  if (!profile.onboarded) {
    return (
      <Routes>
        <Route
          path="/bienvenida"
          element={
            <Onboarding
              userId={session.user.id}
              profile={profile}
              googleName={
                session.user.user_metadata
                  ?.full_name ?? ''
              }
              onDone={loadProfile}
            />
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/bienvenida"
              replace
            />
          }
        />
      </Routes>
    )
  }

  // Antes de entrar a cualquier módulo,
  // exigir una práctica seleccionada.
  if (!activePracticeId) {
    return (
      <Routes>
        <Route
          path="/seleccionar-practica"
          element={
            <PracticeSelector
              practices={practices}
              onSelect={handleSelectPractice}
            />
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/seleccionar-practica"
              replace
            />
          }
        />
      </Routes>
    )
  }

  // Rutas privadas dentro de la práctica seleccionada.
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />

      <Route
        path="/login"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />

      <Route
        path="/registro"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />

      <Route
        path="/bienvenida"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />

      <Route
        path="/seleccionar-practica"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />

      <Route
        element={
          <Layout
            profile={profile}
            refresh={loadProfile}
            practices={practices}
            activePracticeId={activePracticeId}
            setActivePracticeId={handleChangePractice}
          />
        }
      >
        <Route
          path="/dashboard"
          element={
            <Dashboard
              activePracticeId={activePracticeId}
            />
          }
        />

        <Route
          path="/horario"
          element={
            <Schedule
              activePracticeId={activePracticeId}
            />
          }
        />

        <Route
          path="/tareas"
          element={
            <Tasks
              activePracticeId={activePracticeId}
            />
          }
        />

        <Route
          path="/datos"
          element={
            <Data
              activePracticeId={activePracticeId}
            />
          }
        />

        <Route
          path="/pizarra"
          element={<Stickys />}
        />

        <Route
          path="/perfil"
          element={<ProfilePage />}
        />

        <Route
          path="/configuracion"
          element={<ConfigPage />}
        />
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />
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
