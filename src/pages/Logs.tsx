import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import LogForm from '../components/LogForm'
import LogList, { type WorkLog } from '../components/LogList'

export default function Logs() {
    const [logs, setLogs] = useState<WorkLog[]>([])
    const load = useCallback(async () => {
        const { data } = await supabase.from('work_logs').select('*').order('date', { ascending: false })
        setLogs(data ?? [])
    }, [])
    useEffect(() => { load() }, [load])

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Bitácora</h1>
            <LogForm onSaved={load} />
            <LogList logs={logs} onChanged={load} />
        </div>
    )
}