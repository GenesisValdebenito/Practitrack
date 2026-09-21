export type ThemeMode = 'light' | 'dark' | 'system'

export type ColorTheme = {
    id: string
    name: string
    /** Escala de colores [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] */
    scale: [string, string, string, string, string, string, string, string, string, string]
    /** Color de vista previa (el 500 o 600) */
    preview: string
    /** Indica si la escala es "clara" (para ajustar contraste en modo oscuro) */
    isLight?: boolean
}

export const COLOR_THEMES: ColorTheme[] = [
    {
        id: 'indigo',
        name: 'Índigo',
        scale: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'],
        preview: '#4f46e5',
    },
    {
        id: 'blue',
        name: 'Azul',
        scale: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
        preview: '#2563eb',
    },
    {
        id: 'emerald',
        name: 'Esmeralda',
        scale: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'],
        preview: '#059669',
    },
    {
        id: 'rose',
        name: 'Rosa',
        scale: ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337'],
        preview: '#e11d48',
    },
    {
        id: 'violet',
        name: 'Violeta',
        scale: ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'],
        preview: '#7c3aed',
    },
    {
        id: 'amber',
        name: 'Ámbar',
        scale: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'],
        preview: '#d97706',
        isLight: true,
    },
    {
        id: 'pink',
        name: 'Rosado',
        scale: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'],
        preview: '#db2777',
    },
    {
        id: 'cyan',
        name: 'Cian',
        scale: ['#ecfeff', '#cffafe', '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'],
        preview: '#0891b2',
    },
    {
        id: 'orange',
        name: 'Naranja',
        scale: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'],
        preview: '#ea580c',
    },
    {
        id: 'slate',
        name: 'Grafito',
        scale: ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a'],
        preview: '#475569',
    },
]

const STORAGE_KEYS = {
    mode: 'practitrack:theme-mode',
    color: 'practitrack:theme-color',
}

/**
 * Devuelve true si un color hexadecimal es "claro" (luminancia > 0.6).
 * Sirve para decidir si el texto encima debe ser negro o blanco.
 */
function isLightColor(hex: string): boolean {
    const h = hex.replace('#', '')
    const r = parseInt(h.slice(0, 2), 16) / 255
    const g = parseInt(h.slice(2, 4), 16) / 255
    const b = parseInt(h.slice(4, 6), 16) / 255
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return lum > 0.6
}

export function applyColorTheme(themeId: string) {
    const theme = COLOR_THEMES.find((t) => t.id === themeId) ?? COLOR_THEMES[0]
    const root = document.documentElement
    const names = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']
    names.forEach((n, i) => {
        root.style.setProperty(`--color-brand-${n}`, theme.scale[i])
    })
    // Color de texto que contrasta con el color 600 (para botones)
    root.style.setProperty(
        '--color-brand-contrast',
        isLightColor(theme.scale[6]) ? '#0f172a' : '#ffffff'
    )
    // Color de fondo sutil para estados activos en modo oscuro
    root.style.setProperty('--color-brand-soft', isLightColor(theme.scale[5]) ? theme.scale[8] : theme.scale[3])
    localStorage.setItem(STORAGE_KEYS.color, theme.id)
}

export function applyThemeMode(mode: ThemeMode) {
    const root = document.documentElement
    const shouldBeDark =
        mode === 'dark' ||
        (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    root.classList.toggle('dark', shouldBeDark)
    localStorage.setItem(STORAGE_KEYS.mode, mode)
}

export function getStoredMode(): ThemeMode {
    return (localStorage.getItem(STORAGE_KEYS.mode) as ThemeMode) || 'system'
}

export function getStoredColor(): string {
    return localStorage.getItem(STORAGE_KEYS.color) || 'indigo'
}

export function initTheme() {
    applyColorTheme(getStoredColor())
    applyThemeMode(getStoredMode())

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', () => {
        if (getStoredMode() === 'system') applyThemeMode('system')
    })
}

/** Lista de emojis disponibles para el avatar */
export const AVATAR_EMOJIS = [
    '🦊', '🐼', '🐸', '🦉', '🐙', '🦄', '🐳', '🦁',
    '🐨', '🐯', '🐧', '🦋', '🌟', '🚀', '🎯', '💡',
    '🌱', '🎨', '🧠', '⚡', '🔥', '🎓', '💼', '📚',
]