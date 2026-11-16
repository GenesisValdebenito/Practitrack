
import * as XLSX from 'xlsx'

export const IMPORT_SECTIONS = [
  { sheet: 'Prácticas', fields: ['name', 'institution', 'career', 'company', 'supervisor', 'start_date', 'required_hours', 'weekly_hours_target'] },
  { sheet: 'Épicas', fields: ['name', 'description', 'category'] },
  { sheet: 'Sprints', fields: ['name', 'description', 'start_date', 'end_date', 'status'] },
  { sheet: 'Actividades', fields: ['title', 'description', 'activity_date', 'status', 'sprint', 'epic'] },
  { sheet: 'Tareas', fields: ['title', 'status', 'due_date', 'planned_hours', 'category', 'is_in_person', 'activity'] },
  { sheet: 'Horario', fields: ['title', 'day_of_week', 'start_time', 'end_time', 'break_minutes', 'modality', 'effective_from', 'effective_to'] },
  { sheet: 'Bitácora', fields: ['fecha', 'horas', 'descripcion', 'categoria', 'presencial'] },
  { sheet: 'Disponibilidad', fields: ['start_date', 'end_date', 'hours_per_week', 'description'] },
  { sheet: 'Planificación', fields: ['task', 'planned_date', 'planned_hours', 'notes'] },
] as const

export type ImportRow = {
  id: string
  sheet: string
  line: number
  values: Record<string, string>
  included: boolean
  errors: string[]
}

export type ParsedWorkbook = {
  filename: string
  rows: ImportRow[]
  sections: string[]
}

function normalize(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function cellValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

const required: Record<string, string[]> = {
  'Prácticas': ['name'],
  'Épicas': ['name', 'category'],
  'Sprints': ['name', 'start_date', 'end_date'],
  'Actividades': ['title'],
  'Tareas': ['title'],
  'Horario': ['title', 'day_of_week', 'start_time', 'end_time'],
  'Bitácora': ['fecha', 'horas', 'descripcion'],
  'Disponibilidad': ['start_date', 'hours_per_week'],
  'Planificación': ['task', 'planned_date'],
}

const dateFields = new Set([
  'start_date', 'end_date', 'due_date', 'activity_date',
  'effective_from', 'effective_to', 'planned_date', 'fecha',
])

function normalizeDate(value: string): string {
  if (!value) return ''

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return value

  const chile = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (chile) {
    return `${chile[3]}-${chile[2]}-${chile[1]}`
  }

  return value
}

export function validateRow(row: ImportRow): string[] {
  const errors: string[] = []

  for (const field of required[row.sheet] ?? []) {
    if (!row.values[field]?.trim()) {
      errors.push(`Falta ${field}`)
    }
  }

  for (const [field, value] of Object.entries(row.values)) {
    if (!value || !dateFields.has(field)) continue

    const normalized = normalizeDate(value)
    const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/)

    if (!match) {
      errors.push(`Fecha inválida: ${field}`)
      continue
    }

    const [, year, month, day] = match
    const date = new Date(Date.UTC(+year, +month - 1, +day))

    if (
      date.getUTCFullYear() !== +year ||
      date.getUTCMonth() + 1 !== +month ||
      date.getUTCDate() !== +day
    ) {
      errors.push(`Fecha inválida: ${field}`)
    }
  }

  const numericFields = [
    'horas', 'planned_hours', 'required_hours',
    'weekly_hours_target', 'hours_per_week', 'break_minutes',
  ]

  for (const field of numericFields) {
    const value = row.values[field]
    if (!value) continue

    const number = Number(value.replace(',', '.'))

    if (!Number.isFinite(number) || number < 0) {
      errors.push(`Número inválido: ${field}`)
    }
  }

  if (row.sheet === 'Bitácora') {
    const hours = Number((row.values.horas ?? '').replace(',', '.'))
    if (Number.isFinite(hours) && hours <= 0) {
      errors.push('Las horas deben ser mayores que cero')
    }
  }

  if (row.sheet === 'Sprints') {
    const start = normalizeDate(row.values.start_date ?? '')
    const end = normalizeDate(row.values.end_date ?? '')
    if (start && end && start > end) {
      errors.push('El sprint termina antes de comenzar')
    }
  }

  return errors
}

export async function parsePractiTrackFile(
  file: File,
): Promise<ParsedWorkbook> {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension !== 'xlsx' && extension !== 'xls') {
    throw new Error('Selecciona un archivo Excel .xlsx o .xls')
  }

  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: 'array',
    cellDates: false,
  })

  const rows: ImportRow[] = []
  const sections: string[] = []

  for (const section of IMPORT_SECTIONS) {
    const sheetName = workbook.SheetNames.find(
      name => normalize(name) === normalize(section.sheet),
    )

    if (!sheetName) continue

    sections.push(section.sheet)

    const worksheet = workbook.Sheets[sheetName]
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
    })

    if (matrix.length === 0) continue

    const headers = (matrix[0] ?? []).map(normalize)
    const expected = section.fields as readonly string[]

    const missing = expected.filter(
      field => !headers.includes(normalize(field)),
    )

    if (missing.length > 0) {
      throw new Error(
        `La hoja "${section.sheet}" no contiene estas columnas: ${missing.join(', ')}`,
      )
    }

    matrix.slice(1).forEach((cells, index) => {
      const values: Record<string, string> = {}

      expected.forEach(field => {
        const position = headers.indexOf(normalize(field))
        const raw = cellValue(cells[position])
        values[field] = dateFields.has(field)
          ? normalizeDate(raw)
          : raw
      })

      if (Object.values(values).every(value => !value)) return

      const row: ImportRow = {
        id: `${section.sheet}-${index + 2}`,
        sheet: section.sheet,
        line: index + 2,
        values,
        included: true,
        errors: [],
      }

      row.errors = validateRow(row)
      rows.push(row)
    })
  }

  if (sections.length === 0) {
    throw new Error(
      'No se encontraron hojas compatibles con PractiTrack.',
    )
  }

  return { filename: file.name, rows, sections }
}

export function downloadPractiTrackTemplate() {
  const workbook = XLSX.utils.book_new()

  const guide = XLSX.utils.aoa_to_sheet([
    ['PLANTILLA PRACTITRACK'],
    ['Completa únicamente las hojas que necesites.'],
    ['No es obligatorio utilizar todas las secciones.'],
    ['No modifiques los nombres de las columnas.'],
    ['Fechas: AAAA-MM-DD o DD/MM/AAAA.'],
    ['No incluyas contraseñas ni identificadores de usuario.'],
    ['Los vínculos entre entidades se revisarán antes de importar.'],
    ['Esta plantilla no modifica datos por sí sola.'],
  ])

  guide['!cols'] = [{ wch: 85 }]
  XLSX.utils.book_append_sheet(workbook, guide, 'Instrucciones')

  for (const section of IMPORT_SECTIONS) {
    const fields = [...section.fields]
    const sheet = XLSX.utils.aoa_to_sheet([fields])

    sheet['!cols'] = fields.map(field => ({
      wch: Math.max(18, field.length + 8),
    }))

    XLSX.utils.book_append_sheet(
      workbook,
      sheet,
      section.sheet,
    )
  }

  XLSX.writeFile(workbook, 'Plantilla_PractiTrack.xlsx')
}
