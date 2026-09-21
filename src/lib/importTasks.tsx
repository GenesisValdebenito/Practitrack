import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { norm, parseDate } from './importLogs'

export type TaskStatus = 'todo' | 'doing' | 'done'
export type TaskRow = { line: number; title: string; due: string | null; status: TaskStatus }

const STATUS: Record<string, TaskStatus> = {
    'por hacer': 'todo', todo: 'todo', pendiente: 'todo',
    'en curso': 'doing', doing: 'doing',
    hecho: 'done', done: 'done', listo: 'done',
}

const pick = (row: Record<string, unknown>, keys: string[]) => {
    for (const k of Object.keys(row)) if (keys.includes(norm(k))) return row[k]
    return ''
}

function toRows(rows: Record<string, unknown>[]): TaskRow[] {
    return rows
        .map((r, i) => ({
            line: i + 2,
            title: String(pick(r, ['tarea', 'titulo', 'title', 'task']) ?? '').trim(),
            due: parseDate(pick(r, ['fecha_limite', 'fecha limite', 'fecha', 'due'])),
            status: STATUS[norm(pick(r, ['estado', 'status']))] ?? 'todo',
        }))
        .filter((r) => r.title)
}

export async function parseTasksFile(file: File): Promise<TaskRow[]> {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'csv') {
        const text = (await file.text()).replace(/^\uFEFF/, '')
        return toRows(Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true }).data)
    }
    if (ext === 'xlsx' || ext === 'xls') {
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
        return toRows(XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '' }))
    }
    throw new Error('Formato no soportado. Sube un archivo .csv o .xlsx')
}