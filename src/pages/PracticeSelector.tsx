
import { useNavigate } from 'react-router-dom'
import { BriefcaseBusiness, ChevronRight, GraduationCap } from 'lucide-react'
import type { Practice } from '../lib/utils'

type Props = {
  practices: Practice[]
  onSelect: (practiceId: string) => void
}

export default function PracticeSelector({
  practices,
  onSelect,
}: Props) {
  const navigate = useNavigate()

  const handleSelect = (practiceId: string) => {
    onSelect(practiceId)
    navigate('/dashboard', { replace: true })
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-8"
      style={{
        background: 'var(--bg-app)',
        color: 'var(--text-primary, #1a1a1a)',
      }}
    >
      <section
        className="w-full max-w-[440px] overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          background: 'var(--bg-card, #ffffff)',
          borderColor: 'var(--border-soft, #dddddd)',
        }}
      >
        <header className="px-6 pb-4 pt-7">
          <div
            className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl"
            style={{
              background: 'var(--bg-subtle, #eaeaea)',
            }}
          >
            <BriefcaseBusiness size={21} strokeWidth={1.8} />
          </div>

          <h1 className="text-xl font-semibold tracking-tight">
            ¿En qué práctica deseas trabajar?
          </h1>

          <p
            className="mt-2 text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary, #666666)' }}
          >
            Selecciona un espacio de trabajo para continuar
            en PractiTrack.
          </p>
        </header>

        <div className="px-3 pb-3">
          <div
            className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-muted, #999999)' }}
          >
            Tus prácticas
          </div>

          {practices.length === 0 ? (
            <div
              className="rounded-lg px-4 py-8 text-center text-sm"
              style={{ color: 'var(--text-secondary, #666666)' }}
            >
              No tienes prácticas registradas.
            </div>
          ) : (
            <div className="space-y-1">
              {practices.map((practice) => (
                <button
                  key={practice.id}
                  type="button"
                  onClick={() => handleSelect(practice.id)}
                  className="group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: 'var(--bg-subtle, #eaeaea)',
                    }}
                  >
                    <GraduationCap size={19} strokeWidth={1.8} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {practice.name}
                    </div>

                    <div
                      className="mt-0.5 truncate text-xs"
                      style={{
                        color: 'var(--text-secondary, #666666)',
                      }}
                    >
                      {practice.company || 'Espacio personal'}
                    </div>
                  </div>

                  <ChevronRight
                    size={17}
                    className="shrink-0 opacity-40 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <footer
          className="flex items-center justify-between border-t px-6 py-4"
          style={{
            borderColor: 'var(--border-soft, #dddddd)',
          }}
        >
          <span
            className="text-xs"
            style={{ color: 'var(--text-muted, #999999)' }}
          >
            PractiTrack
          </span>
        </footer>
      </section>
    </main>
  )
}
