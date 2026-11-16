import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { resetTheme } from '../lib/theme'
import { getLastEmail, setLastEmail } from '../lib/session'
import AuthLayout from '../components/AuthLayout'
import GoogleAuthButton from '../components/GoogleAuthButton'
import Turnstile from '../components/Turnstile'

export default function Login() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const [email, setEmail] = useState(() => {
        if (searchParams.has('cambiar')) return ''

        const fromUrl = searchParams.get('email')

        if (fromUrl) return fromUrl

        return getLastEmail()
    })
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
    const [turnstileKey, setTurnstileKey] = useState(0)

    useEffect(() => {
        resetTheme()
    }, [])

    const handleTurnstileToken = useCallback((token: string | null) => {
        setTurnstileToken(token)
    }, [])

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError('')
        setMessage('')

        if (!turnstileToken) {
            setError('Completa la verificación de seguridad para continuar.')
            return
        }

        setLoading(true)

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
            options: {
                captchaToken: turnstileToken,
            },
        })

        setLoading(false)

        if (signInError) {
            setError(
                signInError.message === 'Invalid login credentials'
                    ? 'El correo o la contraseña no son correctos.'
                    : signInError.message
            )
            setTurnstileToken(null)
            setTurnstileKey(key => key + 1)
            return
        }

        setLastEmail(email.trim())
        navigate('/dashboard', { replace: true })
    }

    const recoverPassword = async () => {
        setError('')
        setMessage('')

        if (!email.trim()) {
            setError('Escribe tu correo electrónico para enviarte el enlace.')
            return
        }

        if (!turnstileToken) {
            setError('Completa la verificación de seguridad para continuar.')
            return
        }

        setLoading(true)

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
            email.trim(),
            {
                redirectTo: `${window.location.origin}/login`,
                captchaToken: turnstileToken,
            }
        )

        setLoading(false)

        if (resetError) {
            setError(resetError.message)
            setTurnstileToken(null)
            setTurnstileKey(key => key + 1)
        } else {
            setMessage('Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.')
        }
    }

    return (
        <AuthLayout
            footer={
                <span>
                    PractiTrack ·{' '}
                    <Link to="/" className="underline hover:text-white">
                        Volver al inicio
                    </Link>
                </span>
            }
        >
            <div className="mb-5">
                <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-brand-600">
                    QUÉ BUENO TENERTE DE VUELTA
                </p>
                <h1 className="text-xl font-bold text-[#101F3A]">
                    Inicia sesión
                </h1>
                <p className="mt-1.5 text-[13px] leading-5 text-slate-500">
                    Accede a tu espacio y continúa organizando tu práctica profesional.
                </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label htmlFor="login-email" className="mb-1.5 block text-[13px] font-medium text-slate-700">
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
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                    />
                </div>

                <div>
                    <div className="mb-1.5 flex items-center justify-between">
                        <label htmlFor="login-password" className="block text-[13px] font-medium text-slate-700">
                            Contraseña
                        </label>
                        <button
                            type="button"
                            onClick={() => void recoverPassword()}
                            disabled={loading}
                            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
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
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                    />
                </div>

                <Turnstile key={turnstileKey} onToken={handleTurnstileToken} />

                {error && (
                    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
                        {error}
                    </div>
                )}

                {message && (
                    <div role="status" className="rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-[13px] text-green-700">
                        {message}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                >
                    {loading ? 'Ingresando...' : 'Iniciar sesión'}
                </button>
            </form>

            <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-400">O continúa con</span>
                <div className="h-px flex-1 bg-slate-200" />
            </div>

            <GoogleAuthButton
                disabled={loading}
                onError={setError}
            />

            <p className="mt-5 text-center text-[13px] text-slate-500">
                ¿Todavía no tienes cuenta?{' '}
                <Link to="/registro" className="font-semibold text-brand-600 hover:text-brand-700">
                    Crear cuenta
                </Link>
            </p>

            <p className="mt-3 text-center text-[11px] leading-4 text-slate-400">
                Al iniciar sesión aceptas nuestros{' '}
                <Link to="/terminos" className="underline hover:text-slate-600">
                    Términos y Condiciones
                </Link>
                .
            </p>
        </AuthLayout>
    )
}
