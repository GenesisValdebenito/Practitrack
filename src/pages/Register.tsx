
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Register() {
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError('')

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.')
            return
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.')
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
            },
        })

        setLoading(false)

        if (signUpError) {
            setError(
                signUpError.message.toLowerCase().includes('already registered')
                    ? 'No se pudo crear la cuenta con esos datos. Si ya tienes una cuenta, intenta iniciar sesión.'
                    : signUpError.message
            )
            return
        }

        // Si Supabase devuelve una sesión, App.tsx continuará con el onboarding.
        // Si requiere confirmación de correo, mostramos el mensaje correspondiente.
        if (data.session) {
            setSuccess(false)
        } else {
            setSuccess(true)
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
                    {success ? (
                        <div className="text-center py-5">
                            <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
                                <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M5 12.5 9.5 17 19 7.5" />
                                    <circle cx="12" cy="12" r="10" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-[#101F3A]">
                                ¡Ya casi estás!
                            </h1>
                            <p className="text-sm text-slate-500 mt-3 leading-6">
                                Te enviamos un correo para confirmar tu cuenta. Revisa tu bandeja de entrada y también la carpeta de spam.
                            </p>
                            <Link
                                to="/login"
                                className="inline-flex mt-7 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 text-sm transition"
                            >
                                Ir a iniciar sesión
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="mb-7">
                                <p className="text-sm font-semibold text-orange-600 mb-2">
                                    COMIENZA TU EXPERIENCIA
                                </p>
                                <h1 className="text-2xl font-bold text-[#101F3A]">
                                    Crea tu cuenta
                                </h1>
                                <p className="text-sm text-slate-500 mt-2">
                                    Primero creemos tu espacio. Luego podrás configurar tu práctica paso a paso.
                                </p>
                            </div>

                            <form onSubmit={submit} className="space-y-5">
                                <div>
                                    <label htmlFor="register-name" className="block text-sm font-medium text-slate-700 mb-1.5">
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
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="register-email" className="block text-sm font-medium text-slate-700 mb-1.5">
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
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="register-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Contraseña
                                    </label>
                                    <input
                                        id="register-password"
                                        type="password"
                                        autoComplete="new-password"
                                        required
                                        minLength={6}
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="register-confirm" className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Confirmar contraseña
                                    </label>
                                    <input
                                        id="register-confirm"
                                        type="password"
                                        autoComplete="new-password"
                                        required
                                        minLength={6}
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        placeholder="Repite tu contraseña"
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    />
                                </div>

                                {error && (
                                    <div role="alert" className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 transition"
                                >
                                    {loading ? 'Creando tu cuenta...' : 'Crear mi cuenta'}
                                </button>
                            </form>

                            <p className="text-center text-sm text-slate-500 mt-7">
                                ¿Ya tienes una cuenta?{' '}
                                <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
                                    Inicia sesión
                                </Link>
                            </p>
                        </>
                    )}
                </section>

                <p className="text-center text-xs text-slate-400 mt-6">
                    PractiTrack · Tu práctica, más organizada.
                </p>
            </div>
        </main>
    )
}
