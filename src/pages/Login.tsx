
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { resetTheme } from '../lib/theme'

export default function Login() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')

    useEffect(() => {
        resetTheme()
    }, [])

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError('')
        setMessage('')
        setLoading(true)

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        })

        setLoading(false)

        if (signInError) {
            setError(
                signInError.message === 'Invalid login credentials'
                    ? 'El correo o la contraseña no son correctos.'
                    : signInError.message
            )
            return
        }

        navigate('/dashboard', { replace: true })
    }

    const signInWithGoogle = async () => {
        setError('')
        setGoogleLoading(true)

        const { error: googleError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/`,
            },
        })

        if (googleError) {
            setError(googleError.message)
            setGoogleLoading(false)
        }
    }

    const recoverPassword = async () => {
        setError('')
        setMessage('')

        if (!email.trim()) {
            setError('Escribe tu correo electrónico para enviarte el enlace.')
            return
        }

        setLoading(true)

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
            email.trim(),
            {
                redirectTo: `${window.location.origin}/login`,
            }
        )

        setLoading(false)

        if (resetError) {
            setError(resetError.message)
        } else {
            setMessage('Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.')
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-md">
                <Link to="/" className="flex items-center justify-center gap-3 mb-8">
                    <img
                        src="/icon-practitrack.png"
                        alt=""
                        className="w-11 h-11 object-contain"
                    />
                    <span className="text-2xl font-bold tracking-tight text-[#101F3A]">
                        PractiTrack
                    </span>
                </Link>

                <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-7 sm:p-9">
                    <div className="mb-7">
                        <p className="text-sm font-semibold text-blue-600 mb-2">
                            QUÉ BUENO TENERTE DE VUELTA
                        </p>
                        <h1 className="text-2xl font-bold text-[#101F3A]">
                            Inicia sesión
                        </h1>
                        <p className="text-sm text-slate-500 mt-2">
                            Accede a tu espacio y continúa organizando tu práctica profesional.
                        </p>
                    </div>

                    <form onSubmit={submit} className="space-y-5">
                        <div>
                            <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                                Correo electrónico
                            </label>
                            <input
                                id="login-email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="tu@correo.cl"
                                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
                                    Contraseña
                                </label>
                                <button
                                    type="button"
                                    onClick={recoverPassword}
                                    disabled={loading}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>
                            <input
                                id="login-password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder="Ingresa tu contraseña"
                                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>

                        {error && (
                            <div role="alert" className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        {message && (
                            <div role="status" className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || googleLoading}
                            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 transition"
                        >
                            {loading ? 'Ingresando...' : 'Iniciar sesión'}
                        </button>
                    </form>

                    <div className="flex items-center gap-3 my-6">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="text-xs text-slate-400">O continúa con</span>
                        <div className="h-px flex-1 bg-slate-200" />
                    </div>

                    <button
                        type="button"
                        onClick={signInWithGoogle}
                        disabled={googleLoading || loading}
                        className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-300 hover:bg-slate-50 disabled:opacity-60 py-3 text-sm font-semibold text-slate-700 transition"
                    >
                        <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 17.45 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        {googleLoading ? 'Conectando...' : 'Continuar con Google'}
                    </button>

                    <p className="text-center text-sm text-slate-500 mt-7">
                        ¿Todavía no tienes cuenta?{' '}
                        <Link to="/registro" className="font-semibold text-blue-600 hover:text-blue-700">
                            Crear cuenta
                        </Link>
                    </p>
                </section>

                <p className="text-center text-xs text-slate-400 mt-6">
                    PractiTrack · Organiza tu práctica, registra tu progreso.
                </p>
                <p className="text-center text-xs mt-3">
                    <Link to="/" className="text-slate-500 hover:text-blue-600">
                        Volver al inicio
                    </Link>
                </p>
            </div>
        </main>
    )
}
