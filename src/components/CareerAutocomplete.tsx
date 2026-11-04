
import { useEffect, useMemo, useRef, useState } from 'react'

export const CAREERS = [
    'INGENIER. EN INFRAESTRUCTURA TECNOLÓGICA',
    'ING. EN INFRAEST. Y PLATAFORMAS TECN.',
    'INGENIERÍA EN CONECTIVIDAD Y REDES',
    'INGENIERÍA EN INFORMÁTICA',
    'INGENIERÍA EN REDES Y TELECOMUNICACIONES',
    'ANALISTA PROGRAMADOR',
    'TÉCNICO EN REDES Y TELECOMUNICACIONES',
    'ADMIN. DE REDES Y TELECOMUNICACIONES',
    'TURISMO Y HOTELERÍA',
    'GASTRONOMÍA INTERNACIONAL',
    'GASTRONOMÍA',
    'ADMINISTRACIÓN EN TURISMO Y HOSPITALIDAD',
    'TÉCNICO EN TURISMO Y HOSPITALIDAD',
    'DISEÑO GRÁFICO',
    'DISEÑO INDUSTRIAL',
    'DISEÑO INDUSTRIAL E INNOV. DE PRODUCTOS',
    'DISEÑO DE AMBIENTES',
    'ANALISTA PROGRAMADOR COMPUTACIONAL',
    'INGENIERÍA EN COMERCIO EXTERIOR',
    'TÉCNICO EN GESTIÓN LOGÍSTICA',
    'ING.EN ADMIN.MENCIÓN GESTIÓN DE PERSONAS',
    'INGENIERÍA EN GESTIÓN LOGÍSTICA',
    'INGENIERÍA EN MARKETING DIGITAL',
    'DISEÑO DE VESTUARIO',
    'TÉCNICO EN DISEÑO INDUSTRIAL',
    'ILUSTRACIÓN',
    'DESARROLLO Y DISEÑO WEB',
    'TÉCNICO EN PRODUCCIÓN GRÁFICA',
    'TÉCNICO EN DISEÑO DE VESTUARIO',
    'TÉCNICO EN AMBIENTACIÓN',
    'ING. EN ADMINISTRACIÓN MENCIÓN FINANZAS',
    'INGENIERÍA EN ADMINIST. MENCIÓN FINANZAS',
    'CONT.GENERAL MENCIÓN LEGISLACIÓN TRIBUT.',
    'TÉCNICO EN GESTIÓN DE PERSONAS',
    'COMERCIO EXTERIOR',
    'AUDITORÍA',
    'TÉCNICO EN ADMINISTRACIÓN',
]

type CareerAutocompleteProps = {
    value: string
    onChange: (value: string) => void
    label?: string
    placeholder?: string
    required?: boolean
    disabled?: boolean
}

function normalize(value: string) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('es')
        .trim()
}

export default function CareerAutocomplete({
    value,
    onChange,
    label = 'Carrera',
    placeholder = 'Escribe para buscar tu carrera...',
    required = false,
    disabled = false,
}: CareerAutocompleteProps) {
    const [open, setOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)
    const wrapperRef = useRef<HTMLDivElement>(null)

    const suggestions = useMemo(() => {
        const query = normalize(value)

        if (!query) return CAREERS.slice(0, 8)

        return CAREERS
            .filter((career) => normalize(career).includes(query))
            .sort((a, b) => {
                const normalizedA = normalize(a)
                const normalizedB = normalize(b)

                const startsA = normalizedA.startsWith(query)
                const startsB = normalizedB.startsWith(query)

                if (startsA && !startsB) return -1
                if (!startsA && startsB) return 1

                return normalizedA.localeCompare(normalizedB, 'es')
            })
            .slice(0, 8)
    }, [value])

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(event.target as Node)
            ) {
                setOpen(false)
            }
        }

        document.addEventListener('mousedown', handleOutsideClick)

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick)
        }
    }, [])

    const selectCareer = (career: string) => {
        onChange(career)
        setOpen(false)
        setActiveIndex(0)
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown' && suggestions.length > 0) {
            event.preventDefault()
            setOpen(true)
            setActiveIndex((current) =>
                Math.min(current + 1, suggestions.length - 1)
            )
        }

        if (event.key === 'ArrowUp' && suggestions.length > 0) {
            event.preventDefault()
            setActiveIndex((current) => Math.max(current - 1, 0))
        }

        if (event.key === 'Enter' && open && suggestions[activeIndex]) {
            event.preventDefault()
            selectCareer(suggestions[activeIndex])
        }

        if (event.key === 'Escape') {
            setOpen(false)
        }
    }

    const hasExactMatch = CAREERS.some(
        (career) => normalize(career) === normalize(value)
    )

    return (
        <div className="w-full" ref={wrapperRef}>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {label}
            </label>

            <div className="relative">
                <input
                    type="text"
                    value={value}
                    required={required}
                    disabled={disabled}
                    autoComplete="off"
                    placeholder={placeholder}
                    onFocus={() => setOpen(true)}
                    onChange={(event) => {
                        onChange(event.target.value)
                        setActiveIndex(0)
                        setOpen(true)
                    }}
                    onKeyDown={handleKeyDown}
                    aria-expanded={open}
                    aria-autocomplete="list"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100"
                />

                <svg
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                </svg>

                {open && !disabled && (
                    <div className="absolute z-30 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                        {suggestions.length > 0 ? (
                            <>
                                <p className="px-4 py-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase bg-slate-50">
                                    Carreras coincidentes
                                </p>

                                <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
                                    {suggestions.map((career, index) => (
                                        <li key={career} role="option" aria-selected={index === activeIndex}>
                                            <button
                                                type="button"
                                                onMouseEnter={() => setActiveIndex(index)}
                                                onClick={() => selectCareer(career)}
                                                className={`w-full text-left px-4 py-3 text-sm transition ${
                                                    index === activeIndex
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : 'text-slate-700 hover:bg-slate-50'
                                                }`}
                                            >
                                                {career}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        ) : (
                            <div className="px-4 py-4">
                                <p className="text-sm font-medium text-slate-700">
                                    No encontramos coincidencias.
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Puedes continuar escribiendo tu carrera manualmente.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <p className="text-xs text-slate-500 mt-2">
                {value.trim()
                    ? hasExactMatch
                        ? 'Carrera incluida en el catálogo.'
                        : 'Si no aparece, puedes ingresar el nombre manualmente.'
                    : 'Busca tu carrera o escribe su nombre si no está en la lista.'}
            </p>
        </div>
    )
}
