import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Eye, EyeOff, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { setLastEmail } from '../lib/session'
import AuthLayout from '../components/AuthLayout'
import GoogleAuthButton from '../components/GoogleAuthButton'
import Turnstile from '../components/Turnstile'

export default function Register() {
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [acceptedTerms, setAcceptedTerms] = useState(false)
    const [confirmedData, setConfirmedData] = useState(false)
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
    const [turnstileKey, setTurnstileKey] = useState(0)
    const [loading, setLoading] = useState(false)
    const [resending, setResending] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [resendMessage, setResendMessage] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    const passwordChecks = [
        { label: 'Al menos 8 caracteres', ok: password.length >= 8 },
        { label: 'Una letra mayúscula', ok: /[A-Z]/.test(password) },
        { label: 'Un número', ok: /\d/.test(password) },
        {
            label: 'Las contraseñas coinciden',
            ok: password.length > 0 && password === confirmPassword,
        },
    ]

    const passwordValid = passwordChecks.every(check => check.ok)

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError('')

        if (!passwordValid) {
            setError('Completa todos los requisitos de la contraseña.')
            return
        }

        if (!acceptedTerms || !confirmedData) {
            setError('Debes aceptar los términos y confirmar tus datos para continuar.')
            return
        }

        if (!turnstileToken) {
            setError('Completa la verificación de seguridad para continuar.')
            return
        }

        setLoading(true)

        const { data, error: signUpError } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: {
                    full_name: fullName.trim(),
                },
                emailRedirectTo: `${window.location.origin}/`,
                captchaToken: turnstileToken,
            },
        })

        setLoading(false)

        if (signUpError) {
            setError(
                signUpError.message.toLowerCase().includes('already registered')
                    ? 'No se pudo crear la cuenta con esos datos. Si ya tienes una cuenta, intenta iniciar sesión.'
                    : signUpError.message
            )
            setTurnstileToken(null)
            setTurnstileKey(key => key + 1)
            return
        }

        setLastEmail(email.trim())

        if (data.session) {
            setSuccess(false)
        } else {
            setSuccess(true)
        }
    }

    const resendVerification = async () => {
        setError('')
        setResendMessage('')
        setResending(true)

        const { error: resendError } = await supabase.auth.resend({
            type: 'signup',
            email: email.trim(),
            options: {
                emailRedirectTo: `${window.location.origin}/`,
            },
        })

        setResending(false)

        if (resendError) {
            setError(resendError.message)
        } else {
            setResendMessage('Te reenviamos el correo de verificación. Revisa tu bandeja de entrada y spam.')
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
            {success ? (
                <div className="py-2 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12.5 9.5 17 19 7.5" />
                            <circle cx="12" cy="12" r="10" />
                        </svg>
                    </div>

                    <h1 className="text-xl font-bold text-white">
                        ¡Ya casi estás!
                    </h1>

                    <p className="mt-2.5 text-[13px] leading-5 text-slate-300">
                        Te enviamos un correo a <strong className="text-white">{email.trim()}</strong> para
                        verificar tu cuenta. Revisa tu bandeja de entrada y también la carpeta de spam.
                    </p>

                    {resendMessage && (
                        <div role="status" className="mt-3 rounded-xl border border-green-500/30 bg-green-500/10 px-3.5 py-2.5 text-[13px] text-green-400">
                            {resendMessage}
                        </div>
                    )}

                    {error && (
                        <div role="alert" className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-400">
                            {error}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => void resendVerification()}
                        disabled={resending}
                        className="mt-4 w-full rounded-xl border border-white/10 bg-[#131c31] py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a2540] disabled:opacity-60"
                    >
                        {resending ? 'Reenviando...' : 'Reenviar correo de verificación'}
                    </button>

                    <Link
                        to="/login"
                        className="mt-2.5 inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                    >
                        Ir a iniciar sesión
                    </Link>
                </div>
            ) : (
                <>
                    <div className="mb-5">
                        <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-brand-400">
                            COMIENZA TU EXPERIENCIA
                        </p>
                        <h1 className="text-xl font-bold text-white">
                            Crea tu cuenta
                        </h1>
                        <p className="mt-1.5 text-[13px] leading-5 text-slate-400">
                            Primero creemos tu espacio. Luego podrás configurar tu práctica paso a paso.
                        </p>
                    </div>

                    <GoogleAuthButton
                        label="Registrarme con Google"
                        disabled={loading}
                        onError={setError}
                    />

                    <div className="my-4 flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-xs text-slate-400">O regístrate con tu correo</span>
                        <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <form onSubmit={submit} className="space-y-3">
                        <div>
                            <label htmlFor="register-name" className="mb-1.5 block text-[13px] font-medium text-slate-200">
                                Nombre completo
                            </label>
                            <input
                                id="register-name"
                                type="text"
                                autoComplete="name"
                                required
                                maxLength={100}
                                value={fullName}
                                onChange={(event) => setFullName(event.target.value)}
                                placeholder="¿Cómo te llamas?"
                                className="w-full rounded-xl border border-white/15 bg-[#131c31] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20"
                            />
                        </div>

                        <div>
                            <label htmlFor="register-email" className="mb-1.5 block text-[13px] font-medium text-slate-200">
                                Correo electrónico
                            </label>
                            <input
                                id="register-email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="tu@correo.cl"
                                className="w-full rounded-xl border border-white/15 bg-[#131c31] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20"
                            />
                            <p className="mt-1.5 text-[11px] text-slate-400">
                                Te enviaremos un correo para verificar tu cuenta.
                            </p>
                        </div>

                        <div>
                            <label htmlFor="register-password" className="mb-1.5 block text-[13px] font-medium text-slate-200">
                                Contraseña
                            </label>
                            <div className="relative">
                                <input
                                    id="register-password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    required
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder="Crea una contraseña segura"
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

                        <div>
                            <label htmlFor="register-confirm" className="mb-1.5 block text-[13px] font-medium text-slate-200">
                                Confirmar contraseña
                            </label>
                            <div className="relative">
                                <input
                                    id="register-confirm"
                                    type={showConfirm ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    required
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    placeholder="Repite tu contraseña"
                                    className="w-full rounded-xl border border-white/15 bg-[#131c31] px-3.5 py-2.5 pr-11 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                >
                                    {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                                </button>
                            </div>
                        </div>

                        {/* Caja de requisitos ahora 100% oscura */}
                        <div className="rounded-xl border border-white/10 bg-[#131c31]/80 px-3.5 py-2.5">
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Requisitos de la contraseña
                            </p>
                            <ul className="grid grid-cols-2 gap-x-2 gap-y-1">
                                {passwordChecks.map(check => (
                                    <li key={check.label} className="flex items-start gap-1.5 text-[11px] leading-4">
                                        {check.ok ? (
                                            <Check size={13} className="mt-px shrink-0 text-green-400" />
                                        ) : (
                                            <X size={13} className="mt-px shrink-0 text-slate-500" />
                                        )}
                                        <span className={check.ok ? 'text-slate-200' : 'text-slate-400'}>
                                            {check.label}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="space-y-2 pt-1">
                            <label className="flex items-start gap-2.5 text-[11px] leading-4 text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={acceptedTerms}
                                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-white/20 bg-[#131c31] accent-brand-500"
                                />
                                <span>
                                    Acepto los{' '}
                                    <Link to="/terminos" className="font-semibold text-brand-400 underline hover:text-brand-300">
                                        Términos y Condiciones
                                    </Link>{' '}
                                    de PractiTrack.
                                </span>
                            </label>

                            <label className="flex items-start gap-2.5 text-[11px] leading-4 text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={confirmedData}
                                    onChange={(event) => setConfirmedData(event.target.checked)}
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-white/20 bg-[#131c31] accent-brand-500"
                                />
                                <span>
                                    Confirmo que la información ingresada es verídica y que usaré PractiTrack
                                    para mi práctica académica o profesional.
                                </span>
                            </label>
                        </div>

                        {/* Turnstile en modo oscuro */}
                        <div className="flex justify-center pt-1">
                            <Turnstile key={turnstileKey} onToken={setTurnstileToken} />
                        </div>

                        {error && (
                            <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-400">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                        >
                            {loading ? 'Creando tu cuenta...' : 'Crear mi cuenta'}
                        </button>
                    </form>

                    <p className="mt-4 text-center text-[13px] text-slate-400">
                        ¿Ya tienes una cuenta?{' '}
                        <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300">
                            Inicia sesión
                        </Link>
                    </p>
                </>
            )}
        </AuthLayout>
    )
}