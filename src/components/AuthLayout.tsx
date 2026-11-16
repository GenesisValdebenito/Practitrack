import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import iconPractitrack from '../assets/practitrack-logo.png'
import authStudents from '../assets/auth-students.jpg'

type AuthLayoutProps = {
    children: ReactNode
    footer?: ReactNode
    wide?: boolean
}

export default function AuthLayout({
    children,
    footer,
    wide = false,
}: AuthLayoutProps) {
    return (
        <main className="relative flex min-h-screen w-full overflow-hidden bg-[#070b14]">
            {/* LADO IZQUIERDO: Panel visual institucional */}
            <div className="relative hidden w-1/2 lg:flex flex-col justify-between p-12 overflow-hidden border-r border-white/10">
                <img
                    src={authStudents}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover opacity-20"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[#0b1220]/95 via-[#101F3A]/90 to-[#070b14]/95" />

                <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-brand-500/15 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-orange-500/15 blur-3xl" />

                <div className="relative z-10">
                    <Link to="/" className="inline-flex items-center gap-3 transition hover:opacity-90">
                        <img
                            src={iconPractitrack}
                            alt="PractiTrack"
                            className="h-10 w-10 object-contain drop-shadow-md"
                        />
                        <span className="text-xl font-bold tracking-tight text-white">
                            PractiTrack
                        </span>
                    </Link>
                </div>

                <div className="relative z-10 my-auto max-w-lg space-y-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-brand-400 backdrop-blur-md">
                        <span className="h-2 w-2 rounded-full bg-brand-400 animate-pulse" />
                        GESTIÓN DE PRÁCTICAS PROFESIONALES
                    </div>
                    
                    <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl leading-tight">
                        Cada hora cuenta para tu futuro profesional.
                    </h1>
                    
                    <p className="text-base leading-relaxed text-slate-300">
                        Organiza tus bitácoras, registra tus avances y mantén el control total de tu práctica académica o laboral en un solo lugar.
                    </p>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl shadow-2xl">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-slate-200">Progreso de Práctica</span>
                            <span className="rounded-md bg-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-400">En curso</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-slate-300">
                                <span>Horas completadas</span>
                                <span className="font-semibold text-white">320 / 450 hrs</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800/80">
                                <div className="h-full w-[70%] rounded-full bg-gradient-to-r from-brand-500 to-orange-500" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-xs text-slate-400">
                    {footer ?? 'PractiTrack · Tu práctica, más organizada.'}
                </div>
            </div>

            {/* LADO DERECHO: Tarjeta de Autenticación compacta */}
            <div className="flex w-full lg:w-1/2 flex-col justify-between p-6 sm:p-12 overflow-y-auto">
                <div className="flex justify-between items-center lg:hidden mb-6">
                    <Link to="/" className="inline-flex items-center gap-2.5">
                        <img src={iconPractitrack} alt="" className="h-8 w-8 object-contain" />
                        <span className="text-lg font-bold text-white">PractiTrack</span>
                    </Link>
                </div>

                <div className="my-auto mx-auto w-full max-w-[24rem] py-4">
                    <div className="rounded-3xl border border-white/10 bg-[#0b1322]/95 p-8 shadow-2xl shadow-black/50 backdrop-blur-2xl">
                        {children}
                    </div>
                </div>

                <div className="text-center text-xs text-slate-500 lg:hidden mt-6">
                    {footer ?? 'PractiTrack · Tu práctica, más organizada.'}
                </div>
            </div>
        </main>
    )
}