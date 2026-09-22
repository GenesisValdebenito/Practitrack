import { THEME_PRESETS, COLOR_THEMES, type ThemeMode } from '../lib/theme'

type Props = {
    currentMode: ThemeMode
    currentColor: string
    onSelect: (presetId: string, mode: ThemeMode, color: string) => void
}

/**
 * Mini preview de la app en un theme dado.
 * Se ve como una tarjeta con sidebar + contenido + acentos.
 */
function ThemePreview({ mode, color }: { mode: ThemeMode; color: string }) {
    const theme = COLOR_THEMES.find((t) => t.id === color) ?? COLOR_THEMES[0]
    const isDark = mode === 'dark'

    const bg = isDark ? '#0f172a' : '#ffffff'
    const bgSubtle = isDark ? '#1e293b' : '#f1f5f9'
    const border = isDark ? '#334155' : '#e2e8f0'
    const text = isDark ? '#f1f5f9' : '#0f172a'
    const textMuted = isDark ? '#64748b' : '#94a3b8'
    const accent = theme.preview
    const accentSoft = isDark ? theme.scale[8] : theme.scale[2]

    return (
        <div
            className="w-full aspect-[4/3] rounded-lg overflow-hidden flex border"
            style={{ background: bg, borderColor: border }}
        >
            {/* Sidebar */}
            <div
                className="w-1/5 p-2 flex flex-col gap-1.5"
                style={{ background: bgSubtle, borderRight: `1px solid ${border}` }}
            >
                <div className="w-4 h-4 rounded" style={{ background: accent }} />
                <div className="w-full h-1.5 rounded" style={{ background: border }} />
                <div className="w-2/3 h-1.5 rounded" style={{ background: border }} />
                <div
                    className="w-full h-1.5 rounded mt-2"
                    style={{ background: accent }}
                />
                <div className="w-2/3 h-1.5 rounded" style={{ background: border }} />
                <div className="w-2/3 h-1.5 rounded" style={{ background: border }} />
            </div>

            {/* Contenido */}
            <div className="flex-1 p-2.5 flex flex-col gap-2">
                <div className="w-3/5 h-2 rounded" style={{ background: text }} />
                <div className="w-2/5 h-1.5 rounded" style={{ background: textMuted }} />

                {/* Barra de progreso */}
                <div
                    className="w-full h-2 rounded-full mt-1 overflow-hidden"
                    style={{ background: bgSubtle }}
                >
                    <div className="h-full w-3/5 rounded-full" style={{ background: accent }} />
                </div>

                {/* Tarjetas de stats */}
                <div className="grid grid-cols-3 gap-1 mt-1">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="rounded p-1.5"
                            style={{ background: bgSubtle, border: `1px solid ${border}` }}
                        >
                            <div className="w-2/3 h-1 rounded mb-1" style={{ background: textMuted }} />
                            <div className="w-1/2 h-1.5 rounded" style={{ background: text }} />
                        </div>
                    ))}
                </div>

                {/* Botón de acento */}
                <div
                    className="w-1/2 h-3 rounded mt-auto"
                    style={{ background: accent }}
                />

                {/* Puntos de acento sutil */}
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-sm" style={{ background: accentSoft }} />
                    <div className="w-1.5 h-1.5 rounded-sm" style={{ background: accentSoft }} />
                    <div className="w-1.5 h-1.5 rounded-sm" style={{ background: accentSoft }} />
                </div>
            </div>
        </div>
    )
}

export default function ThemePicker({ currentMode, currentColor, onSelect }: Props) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {THEME_PRESETS.map((preset) => {
                const active = currentMode === preset.mode && currentColor === preset.color
                return (
                    <button
                        key={preset.id}
                        onClick={() => onSelect(preset.id, preset.mode, preset.color)}
                        className={`text-left rounded-xl p-2 border-2 transition-all hover:scale-[1.02] ${active
                                ? 'border-brand-500 ring-2 ring-brand-500/30'
                                : 'border-[var(--border-soft)] hover:border-brand-300'
                            }`}
                        style={{ background: 'var(--bg-card)' }}
                    >
                        <ThemePreview mode={preset.mode} color={preset.color} />
                        <div className="mt-2 px-1 flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-primary truncate">
                                    {preset.label}
                                </p>
                                <p className="text-[10px] text-muted truncate">
                                    {preset.description}
                                </p>
                            </div>
                            <div
                                className="w-5 h-5 rounded-full border border-[var(--border-soft)] shrink-0 mt-0.5"
                                style={{ background: COLOR_THEMES.find((t) => t.id === preset.color)?.preview }}
                            />
                        </div>
                    </button>
                )
            })}
        </div>
    )
}