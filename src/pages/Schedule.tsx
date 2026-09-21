import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { DAYS } from '../lib/utils'

type Block = { id: string; day_of_week: number; start_time: string; end_time: string; is_in_person: boolean }

const toMin = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3, 5)

export default function Schedule() {
    const { profile } = useProfile()
    const [blocks, setBlocks] = useState<Block[]>([])
    const [adding, setAdding] = useState<number | null>(null)
    const [start, setStart] = useState('09:00')
    const [end, setEnd] = useState('17:00')
    const [inPerson, setInPerson] = useState(false)
    const [error, setError] = useState('')

    const load = useCallback(async () => {
        const { data } = await supabase.from('schedules').select('*').order('start_time')
        setBlocks(data ?? [])
    }, [])
    useEffect(() => { load() }, [load])

    const add = async (day: number) => {
        if (toMin(end) <= toMin(start)) return setError('La hora de término debe ser mayor a la de inicio')
        const { data: { user } } = await supabase.auth.getUser()
        const { error } = await supabase.from('schedules').insert({
            user_id: user!.id, day_of_week: day, start_time: start, end_time: end, is_in_person: inPerson,
        })
        if (error) return setError(error.message)
        setError(''); setAdding(null); load()
    }

    const toggle = async (b: Block) => {
        await supabase.from('schedules').update({ is_in_person: !b.is_in_person }).eq('id', b.id)
        load()
    }
    const remove = async (id: string) => {
        await supabase.from('schedules').delete().eq('id', id)
        load()
    }

    const hours = (b: Block) => (toMin(b.end_time) - toMin(b.start_time)) / 60
    const weekly = blocks.reduce((s, b) => s + hours(b), 0)
    const presencial = blocks.filter((b) => b.is_in_person).reduce((s, b) => s + hours(b), 0)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Mi horario semanal</h1>
                <p className="text-gray-500 text-sm">
                    {weekly.toFixed(1)} h planificadas de {profile.weekly_hours_target} h de meta
                    ({presencial.toFixed(1)} h presenciales)
                </p>
                {weekly !== profile.weekly_hours_target && (
                    <p className="text-xs text-amber-600 mt-1">
                        {weekly < profile.weekly_hours_target
                            ? `Te faltan ${(profile.weekly_hours_target - weekly).toFixed(1)} h para llegar a tu meta.`
                            : `Superas tu meta por ${(weekly - profile.weekly_hours_target).toFixed(1)} h.`}
                    </p>
                )}
            </div>

            <div className="grid gap-3 md:grid-cols-7">
                {DAYS.map((name, i) => {
                    const day = i + 1
                    const list = blocks.filter((b) => b.day_of_week === day)
                    return (
                        <div key={day} className="bg-white rounded-xl shadow p-3 min-h-40">
                            <p className="font-semibold text-sm mb-2">{name}</p>
                            <div className="space-y-2">
                                {list.map((b) => (
                                    <div key={b.id} className={`rounded-lg p-2 text-xs ${b.is_in_person ? 'bg-green-100' : 'bg-blue-100'}`}>
                                        <p className="font-medium">{b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}</p>
                                        <p>{hours(b)} h</p>
                                        <div className="flex justify-between mt-1">
                                            <button onClick={() => toggle(b)} title="Cambiar modalidad">{b.is_in_person ? '🏢' : '🏠'}</button>
                                            <button onClick={() => remove(b.id)} className="text-red-600">✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {adding === day ? (
                                <div className="mt-2 space-y-1 text-xs">
                                    <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-full border rounded px-1 py-1" />
                                    <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full border rounded px-1 py-1" />
                                    <label className="flex items-center gap-1">
                                        <input type="checkbox" checked={inPerson} onChange={(e) => setInPerson(e.target.checked)} /> Presencial
                                    </label>
                                    {error && <p className="text-red-600">{error}</p>}
                                    <div className="flex gap-1">
                                        <button onClick={() => add(day)} className="flex-1 bg-blue-600 text-white rounded py-1">Guardar</button>
                                        <button onClick={() => { setAdding(null); setError('') }} className="flex-1 border rounded py-1">Cancelar</button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => setAdding(day)} className="mt-2 w-full text-xs text-blue-600 border border-dashed rounded py-1">
                                    + Bloque
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>

            <p className="text-xs text-gray-500">🏢 Presencial (verde) · 🏠 Remoto (azul). Toca el ícono de un bloque para cambiar su modalidad.</p>
        </div>
    )
}