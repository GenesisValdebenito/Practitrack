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

        const { data: row } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()

        const meta = user.user_metadata || {}
        const provider = user.app_metadata?.provider

        const googleAvatar =
            meta.avatar_url ||
            meta.picture ||
            (provider === 'google' ? meta.picture : null)

        const googleFullName =
            meta.full_name ||
            meta.name ||
            user.email?.split('@')[0] ||
            'Usuario'

        const merged: Profile = {
            id: user.id,
            full_name: row?.full_name?.trim() || googleFullName,
            career: row?.career?.trim() || '',
            institution: row?.institution?.trim() || '',
            required_hours: row?.required_hours ?? 360,
            weekly_hours_target: row?.weekly_hours_target ?? 28,
            onboarded: row?.onboarded ?? false,
            company: row?.company?.trim() || null,
            supervisor: row?.supervisor?.trim() || null,
            start_date: row?.start_date || null,
            // 👇 clave: usar || en vez de ?? para ignorar strings vacíos
            email: row?.email?.trim() || user.email || null,
            avatar_url: row?.avatar_url || googleAvatar || null,
            avatar_mode: row?.avatar_mode || (googleAvatar ? 'google' : 'initials'),
            avatar_config: row?.avatar_config || null,
        }

        setProfile(merged)
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    return { profile: profile as Profile, loading, refresh: load }
}