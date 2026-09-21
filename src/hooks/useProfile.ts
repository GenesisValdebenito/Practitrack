import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/utils'

export function useProfile() {
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            setProfile(null)
            setLoading(false)
            return
        }

        // 1) Fila de profiles (datos propios de PractiTrack)
        const { data: row } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()

        // 2) Metadata del provider (Google, email/password, etc.)
        const meta = user.user_metadata || {}
        const provider = user.app_metadata?.provider

        // 3) Foto de Google (Supabase guarda el campo como 'picture' o 'avatar_url')
        const googleAvatar =
            meta.avatar_url ||
            meta.picture ||
            (provider === 'google' ? meta.picture : null)

        const googleFullName =
            meta.full_name ||
            meta.name ||
            user.email?.split('@')[0] ||
            'Usuario'

        // 4) Combinar: profiles locales > auth
        const merged: Profile = {
            id: user.id,
            full_name: row?.full_name ?? googleFullName,
            career: row?.career ?? '',
            institution: row?.institution ?? '',
            required_hours: row?.required_hours ?? 360,
            weekly_hours_target: row?.weekly_hours_target ?? 28,
            onboarded: row?.onboarded ?? false,
            company: row?.company ?? null,
            supervisor: row?.supervisor ?? null,
            start_date: row?.start_date ?? null,
            email: row?.email ?? user.email ?? null,
            // Avatar: si el usuario guardó uno propio, respétalo. Si no, usa el de Google.
            avatar_url: row?.avatar_url ?? googleAvatar ?? null,
            avatar_mode: row?.avatar_mode ?? (googleAvatar ? 'google' : 'initials'),
            avatar_emoji: row?.avatar_emoji ?? null,
            // Nuevos campos para el builder de avatares tipo Notion
            avatar_config: row?.avatar_config ?? null,
        }

        setProfile(merged)
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    return { profile: profile as Profile, loading, refresh: load }
}