import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [mode, setMode] = useState<'signin' | 'signup'>('signin')

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        const fn = mode === 'signin'
            ? supabase.auth.signInWithPassword({ email, password })
            : supabase.auth.signUp({ email, password })
        const { error } = await fn
        setLoading(false)
        if (error) setError(error.message)
    }

    const google = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin },
        })
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
            <div className="w-full max-w-sm animate-slide-up">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold">
                        P
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight">PractiTrack</h1>
                </div>

                <div className="card">
                    <h2 className="text-lg font-semibold mb-1">
                        {mode === 'signin' ? 'Inicia sesión' : 'Crea tu cuenta'}
                    </h2>
                    <p className="text-sm text-slate-500 mb-6">
                        {mode === 'signin'
                            ? 'Continúa registrando tus horas de práctica.'
                            : 'Comienza a organizar tu práctica profesional.'}
                    </p>

                    <form onSubmit={submit} className="space-y-3">
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">
                                Correo electrónico
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@correo.cl"
                                className="input-base"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="input-base"
                            />
                        </div>

                        {error && (
                            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                {error}
                            </p>
                        )}

                        <button type="submit" disabled={loading} className="btn-primary w-full">
                            {loading ? 'Cargando...' : mode === 'signin' ? 'Entrar' : 'Crear cuenta'}
                        </button>
                    </form>

                    <div className="relative my-5">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-white px-2 text-xs text-slate-400">o</span>
                        </div>
                    </div>

                    <button
                        onClick={google}
                        className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continuar con Google
                    </button>

                    <p className="text-xs text-center text-slate-500 mt-6">
                        {mode === 'signin' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
                        <button
                            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                            className="text-brand-600 hover:underline font-medium"
                        >
                            {mode === 'signin' ? 'Regístrate' : 'Inicia sesión'}
                        </button>
                    </p>
                </div>

                <p className="text-xs text-center text-slate-400 mt-6">
                    PractiTrack · Práctica profesional
                </p>
            </div>
        </div>
    )
}