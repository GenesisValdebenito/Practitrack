import { useState } from 'react'
import ThemePicker from './ThemePicker'
import {
    COLOR_THEMES,
    FONT_FAMILIES,
    FONT_SIZES,
    CONTENT_WIDTHS,
    applyAllPreferences,
    getStoredMode,
    getStoredColor,
    getStoredFont,
    getStoredFontSize,
    getStoredContentWidth,
    type ThemeMode,
    type FontFamily,
    type FontSize,
    type ContentWidth,
} from '../lib/theme'

export default function AppearancePanel() {
    const [mode, setMode] = useState<ThemeMode>(getStoredMode())
    const [color, setColor] = useState(getStoredColor())
    const [font, setFont] = useState<FontFamily>(getStoredFont())
    const [size, setSize] = useState<FontSize>(getStoredFontSize())
    const [width, setWidth] = useState<ContentWidth>(getStoredContentWidth())

    const update = (patch: Partial<{
        mode: ThemeMode
        color: string
        font: FontFamily
        size: FontSize
        width: ContentWidth
    }>) => {
        if (patch.mode !== undefined) setMode(patch.mode)
        if (patch.color !== undefined) setColor(patch.color)
        if (patch.font !== undefined) setFont(patch.font)
        if (patch.size !== undefined) setSize(patch.size)
        if (patch.width !== undefined) setWidth(patch.width)
        applyAllPreferences(patch)
    }

    return (
        <div className="space-y-8">
            {/* === Tema (previews) === */}
            <div>
                <h3 className="text-sm font-semibold text-primary mb-1">Tema</h3>
                <p className="text-xs text-muted mb-4">
                    Elige un tema predefinido. Cada uno combina modo claro/oscuro con un color.
                </p>
                <ThemePicker
                    currentMode={mode}
                    currentColor={color}
                    onSelect={(_, m, c) => update({ mode: m, color: c })}
                />
            </div>

            {/* === Color personalizado === */}
            <div>
                <h3 className="text-sm font-semibold text-primary mb-1">Color personalizado</h3>
                <p className="text-xs text-muted mb-3">
                    Ajusta el color de acento a tu gusto.
                </p>
                <div className="flex flex-wrap gap-3">
                    {COLOR_THEMES.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => update({ color: t.id })}
                            title={t.name}
                            className={`w-9 h-9 rounded-full transition-transform hover:scale-110 relative ${color === t.id
                                    ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900'
                                    : ''
                                }`}
                            style={{ backgroundColor: t.preview }}
                        >
                            {color === t.id && (
                                <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold drop-shadow">
                                    ✓
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* === Fuente === */}
            <div>
                <h3 className="text-sm font-semibold text-primary mb-1">Fuente</h3>
                <p className="text-xs text-muted mb-3">
                    Elige la tipografía de la interfaz.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(Object.keys(FONT_FAMILIES) as FontFamily[]).map((key) => (
                        <button
                            key={key}
                            onClick={() => update({ font: key })}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border-2 ${font === key
                                    ? 'bg-brand-600 text-[var(--color-brand-contrast)] border-brand-600'
                                    : 'bg-[var(--bg-subtle)] text-secondary border-transparent hover:border-brand-300'
                                }`}
                            style={{ fontFamily: FONT_FAMILIES[key].value }}
                        >
                            {FONT_FAMILIES[key].label}
                        </button>
                    ))}
                </div>
            </div>

            {/* === Tamaño de fuente === */}
            <div>
                <h3 className="text-sm font-semibold text-primary mb-1">Tamaño de fuente</h3>
                <p className="text-xs text-muted mb-3">
                    Ajusta el tamaño de todo el texto de la app.
                </p>
                <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(FONT_SIZES) as FontSize[]).map((key) => (
                        <button
                            key={key}
                            onClick={() => update({ size: key })}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border-2 ${size === key
                                    ? 'bg-brand-600 text-[var(--color-brand-contrast)] border-brand-600'
                                    : 'bg-[var(--bg-subtle)] text-secondary border-transparent hover:border-brand-300'
                                }`}
                        >
                            {FONT_SIZES[key].label}
                        </button>
                    ))}
                </div>
            </div>

            {/* === Ancho de contenido === */}
            <div>
                <h3 className="text-sm font-semibold text-primary mb-1">Ancho de contenido</h3>
                <p className="text-xs text-muted mb-3">
                    Ajusta el ancho máximo del contenido principal.
                </p>
                <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(CONTENT_WIDTHS) as ContentWidth[]).map((key) => (
                        <button
                            key={key}
                            onClick={() => update({ width: key })}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border-2 ${width === key
                                    ? 'bg-brand-600 text-[var(--color-brand-contrast)] border-brand-600'
                                    : 'bg-[var(--bg-subtle)] text-secondary border-transparent hover:border-brand-300'
                                }`}
                        >
                            {CONTENT_WIDTHS[key].label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}