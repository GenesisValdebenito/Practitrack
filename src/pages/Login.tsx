import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin },
        })
        if (error) setError(error.message)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        const { error } = isSignUp
            ? await supabase.auth.signUp({ email, password })
            : await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
        setLoading(false)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-sm bg-white p-6 rounded-xl shadow space-y-4">
                <h1 className="text-2xl font-bold text-center">⏱️ PractiTrack</h1>
                <p className="text-center text-gray-500 text-sm">
                    Planifica y valida tus horas de práctica profesional
                </p>

                <button
                    type="button"
                    onClick={handleGoogle}
                    className="w-full border rounded-lg py-2 font-medium hover:bg-gray-50"
                >
                    Continuar con Google
                </button>

                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="flex-1 h-px bg-gray-200" /> o con correo <div className="flex-1 h-px bg-gray-200" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                        type="email"
                        placeholder="Correo"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full border rounded-lg px-3 py-2"
                    />
                    <input
                        type="password"
                        placeholder="Contraseña (mín. 6 caracteres)"
                        autoComplete={isSignUp ? 'new-password' : 'current-password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full border rounded-lg px-3 py-2"
                    />
                    {error && <p className="text-red-600 text-sm">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium disabled:opacity-50"
                    >
                        {loading ? 'Cargando...' : isSignUp ? 'Registrarme' : 'Entrar'}
                    </button>
                </form>

                <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="w-full text-sm text-blue-600"
                >
                    {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
                </button>
            </div>
        </div>
    )
}