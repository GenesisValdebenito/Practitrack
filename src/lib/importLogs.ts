import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { fmt } from './utils'

export type ParsedRow = {
    line: number
    date: string | null
    hours: number | null
    description: string
    category: string
    inPerson: boolean
    errors: string[]
}

export const norm = (s: unknown) =>
    String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

const ALIASES = {
    date: ['fecha', 'date', 'dia'],
    hours: ['horas', 'hours', 'hrs', 'horas trabajadas'],
    description: ['descripcion', 'tarea', 'actividad', 'detalle', 'description', 'task'],
    category: ['categoria', 'category', 'area'],
    inPerson: ['presencial', 'modalidad', 'en persona'],
} as const

function pick(row: Record<string, unknown>, keys: readonly string[]) {
    for (const k of Object.keys(row)) if (keys.includes(norm(k))) return row[k]
    return ''
}

const build = (y: number, m: number, d: number) => {
    const dt = new Date(y, m - 1, d)
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? fmt(dt) : null
}

export function parseDate(v: unknown): string | null {
    // Fecha de Excel guardada como número de serie
    if (typeof v === 'number') {
        if (v < 20000) return null
        const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000)
        return build(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
    }
    const s = String(v ?? '').trim()
    // AAAA-MM-DD o AAAA/MM/DD
    let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
    if (m) return build(+m[1], +m[2], +m[3])
    // DD/MM/AAAA (formato chileno)
    m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/)
    if (m) return build(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1])
    return null
}

function parseHours(v: unknown): number | null {
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

const YES = ['si', 's', '1', 'true', 'yes', 'y', 'x', 'presencial']
const parseBool = (v: unknown) => YES.includes(norm(v))

function toParsed(rows: Record<string, unknown>[]): ParsedRow[] {
    return rows.map((r, i) => {
        const date = parseDate(pick(r, ALIASES.date))
        const hours = parseHours(pick(r, ALIASES.hours))
        const description = String(pick(r, ALIASES.description) ?? '').trim()
        const category = String(pick(r, ALIASES.category) ?? '').trim() || 'Otro'

        const errors: string[] = []
        if (!date) errors.push('Fecha inválida')
        if (hours === null || hours <= 0 || hours > 24) errors.push('Horas inválidas (0 a 24)')
        if (!description) errors.push('Falta descripción')

        return {
            line: i + 2, // la fila 1 son los encabezados
            date,
            hours,
            description,
            category,
            inPerson: parseBool(pick(r, ALIASES.inPerson)),
            errors,
        }
    })
}

export async function parseFile(file: File): Promise<ParsedRow[]> {
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'csv' || ext === 'txt') {
        let text = await file.text()
        // CSV guardado con codificación de Windows: reintenta para no perder tildes
        if (text.includes('\uFFFD')) {
            text = new TextDecoder('windows-1252').decode(await file.arrayBuffer())
        }
        text = text.replace(/^\uFEFF/, '')
        const res = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true })
        return toParsed(res.data)
    }

    if (ext === 'xlsx' || ext === 'xls') {
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        return toParsed(XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' }))
    }

    throw new Error('Formato no soportado. Sube un archivo .csv o .xlsx')
}

// Plantilla en Excel (evita problemas de separadores y decimales del CSV)
export function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
        ['fecha', 'horas', 'descripcion', 'categoria', 'presencial'],
        ['2026-09-21', 6.5, 'Diseño de tablas en Supabase', 'Base de datos', 'no'],
        ['2026-09-22', 7, 'Reunión con tutor y análisis de requerimientos', 'Análisis', 'si'],
    ])
    ws['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 50 }, { wch: 16 }, { wch: 12 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Bitácora')
    XLSX.writeFile(wb, 'plantilla-practitrack.xlsx')
}