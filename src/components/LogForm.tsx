import { useState } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIES = ['Análisis', 'Base de datos', 'Frontend', 'Backend', 'QA', 'Documentación', 'Otro']

export default function LogForm({ onSaved }: { onSaved: () => void }) {
    const today = new Date().toISOString().slice(0, 10)
    const [date, setDate] = useState(today)
    const [hours, setHours] = useState('')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState(CATEGORIES[0])
    const [inPerson, setInPerson] = useState(false)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSaving(true)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setError('Sesión no válida')
            setSaving(false)
            return
        }

        const { error } = await supabase.from('work_logs').insert({
            user_id: user.id,
            date,
            hours_worked: parseFloat(hours),
            task_description: description,
            category,
            is_in_person: inPerson,
        })

        if (error) {
            setError(error.message)
        } else {
            setHours('')
            setDescription('')
            onSaved()
        }
        setSaving(false)
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow space-y-3">
            <h2 className="font-semibold">Registrar horas</h2>

            <div className="grid grid-cols-2 gap-3">
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="border rounded-lg px-3 py-2"
                />
                <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="24"
                    placeholder="Horas (ej. 6.5)"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    required
                    className="border rounded-lg px-3 py-2"
                />
            </div>

            <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
            >
                {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                ))}
            </select>

            <textarea
                placeholder="¿Qué hiciste hoy?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={3}
                className="w-full border rounded-lg px-3 py-2"
            />

            <label className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={inPerson}
                    onChange={(e) => setInPerson(e.target.checked)}
                />
                Día presencial
            </label>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium disabled:opacity-50"
            >
                {saving ? 'Guardando...' : 'Guardar'}
            </button>
        </form>
    )
}