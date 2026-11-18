import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
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
    const [showPassword, setShowPassword] = useState(false)

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
                <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-brand-400">
                    QUÉ BUENO TENERTE DE VUELTA
                </p>
                <h1 className="text-xl font-bold text-white">
                    Inicia sesión
                </h1>
                <p className="mt-1.5 text-[13px] leading-5 text-slate-400">
                    Accede a tu espacio y continúa organizando tu práctica profesional.
                </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label htmlFor="login-email" className="mb-1.5 block text-[13px] font-medium text-slate-200">
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
                        className="w-full rounded-xl border border-white/15 bg-[#131c31] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20"
                    />
                </div>

                <div>
                    <div className="mb-1.5 flex items-center justify-between">
                        <label htmlFor="login-password" className="block text-[13px] font-medium text-slate-200">
                            Contraseña
                        </label>
                        <button
                            type="button"
                            onClick={() => void recoverPassword()}
                            disabled={loading}
                            className="text-xs font-semibold text-brand-400 hover:text-brand-300"
                        >
                            ¿Olvidaste tu contraseña?
                        </button>
                    </div>
                    <div className="relative">
                        <input
                            id="login-password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Ingresa tu contraseña"
                            className="w-full rounded-xl border border-white/15 bg-[#131c31] px-3.5 py-2.5 pr-11 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                    </div>
                </div>

                <Turnstile key={turnstileKey} onToken={handleTurnstileToken} />

                {error && (
                    <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-400">
                        {error}
                    </div>
                )}

                {message && (
                    <div role="status" className="rounded-xl border border-green-500/30 bg-green-500/10 px-3.5 py-2.5 text-[13px] text-green-400">
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
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-slate-400">O continúa con</span>
                <div className="h-px flex-1 bg-white/10" />
            </div>

            <GoogleAuthButton
                disabled={loading}
                onError={setError}
            />

            <p className="mt-5 text-center text-[13px] text-slate-400">
                ¿Todavía no tienes cuenta?{' '}
                <Link to="/registro" className="font-semibold text-brand-400 hover:text-brand-300">
                    Crear cuenta
                </Link>
            </p>

            <p className="mt-3 text-center text-[11px] leading-4 text-slate-400">
                Al iniciar sesión aceptas nuestros{' '}
                <Link to="/terminos" className="underline hover:text-white">
                    Términos y Condiciones
                </Link>
                .
            </p>
        </AuthLayout>
    )
}