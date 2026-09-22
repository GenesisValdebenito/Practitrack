export type ThemeMode = 'light' | 'dark' | 'system'
export type AvatarMode = 'google' | 'custom' | 'initials' | 'notion'

export type AvatarConfig = {
    skin: string
    hair: string
    hairColor: string
    eyes: string
    eyebrows: string
    mouth: string
    accessories: string
    accessoriesColor: string
    facialHair: string
    facialHairColor: string
    clothe: string
    clothesColor: string
    bgColor: string
}

export type Profile = {
    id: string
    full_name: string
    career: string
    institution: string
    required_hours: number
    weekly_hours_target: number
    onboarded: boolean
    company?: string | null
    supervisor?: string | null
    start_date?: string | null
    email?: string | null
    avatar_url?: string | null
    avatar_mode?: AvatarMode | null
    avatar_config?: AvatarConfig | null
}

export type Shortcut = {
    id: string
    label: string
    url: string
    icon?: string
}

export const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function weekStart(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00')
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return fmt(d)
}

export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']