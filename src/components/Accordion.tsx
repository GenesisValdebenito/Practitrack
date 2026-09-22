import { useState, type ReactNode } from 'react'

type Props = {
    title: string
    summary: ReactNode
    children: ReactNode
    defaultOpen?: boolean
}

export function Accordion({ title, summary, children, defaultOpen = false }: Props) {
    const [open, setOpen] = useState(defaultOpen)

    return (
        <div className="card overflow-hidden">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-4 text-left"
            >
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary">{title}</p>
                    {!open && (
                        <div className="mt-1">{summary}</div>
                    )}
                </div>
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`text-muted transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <div className="mt-4 animate-fade-in">
                    {children}
                </div>
            )}
        </div>
    )
}