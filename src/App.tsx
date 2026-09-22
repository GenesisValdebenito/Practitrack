import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import type { Profile, Practice } from './lib/utils'
import Layout from './components/Layout'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Schedule from './pages/Schedule'
import Tasks from './pages/Tasks'
import Logs from './pages/Logs'
import Data from './pages/Data'
import ProfilePage from './pages/ProfilePage'
import ConfigPage from './pages/ConfigPage.tsx';

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [practices, setPractices] = useState<Practice[]>([])
  const [activePracticeId, setActivePracticeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) { setProfile(null); setPractices([]); setActivePracticeId(null); setLoading(false) }
    })
    return () => l.subscription.unsubscribe()
  }, [])

  const loadProfile = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user
    if (!user) return

    let { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()

    if (!data) {
      const newProfile = {
        id: user.id,
        full_name: user.user_metadata?.full_name || '',
        email: user.email || '',
        avatar_url: user.user_metadata?.avatar_url || '',
        onboarded: false
      }
      const { data: inserted } = await supabase.from('profiles').insert(newProfile).select().single()
      data = inserted || newProfile
    }

    setProfile(data as Profile)

    if (data) {
      const { data: pracs } = await supabase.from('practices').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setPractices(pracs || [])
      if (pracs && pracs.length > 0) {
        const active = pracs.find(p => p.is_active) || pracs[0]
        setActivePracticeId(active.id)
      }
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    if (session) loadProfile()
  }, [session, loadProfile])

  if (loading) return <p className="p-6">Cargando...</p>
  if (!session) return <Login />
  if (!profile) return <p className="p-6">Cargando perfil...</p>
  if (!profile.onboarded)
    return (
      <Onboarding
        userId={session.user.id}
        profile={profile}
        googleName={session.user.user_metadata?.full_name ?? ''}
        onDone={loadProfile}
      />
    )

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout profile={profile} refresh={loadProfile} practices={practices} activePracticeId={activePracticeId} setActivePracticeId={setActivePracticeId} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/horario" element={<Schedule />} />
          <Route path="/tareas" element={<Tasks />} />
          <Route path="/bitacora" element={<Logs />} />
          <Route path="/datos" element={<Data />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/configuracion" element={<ConfigPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}