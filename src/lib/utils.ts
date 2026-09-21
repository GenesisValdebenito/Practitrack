export type Profile = {
    id: string
    full_name: string | null
    institution: string | null
    career: string | null
    required_hours: number
    weekly_hours_target: number
    onboarded: boolean
}

export const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function weekStart(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00')
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return fmt(d)
}

export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']