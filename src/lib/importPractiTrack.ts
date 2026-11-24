
import * as XLSX from 'xlsx'

export const IMPORT_SECTIONS = [
  { sheet: 'Épicas', fields: ['name', 'description', 'category'] },
  { sheet: 'Sprints', fields: ['name', 'description', 'start_date', 'end_date', 'status'] },
  { sheet: 'Actividades', fields: ['title', 'sprint', 'epic'] },
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

export const EPIC_CATEGORIES = [
  'Análisis', 'Base de datos', 'Backend', 'Frontend',
  'Automatización', 'Calidad', 'Gestión',
]

export const LOG_CATEGORIES = [
  'Desarrollo', 'Reunión', 'Documentación', 'Investigación', 'Testing', 'Otro',
]

// Valores admitidos por la base de datos y alias frecuentes del archivo.
const EPIC_CATEGORY_ALIASES: Record<string, string> = {
  analisis: 'Análisis',
  basedatos: 'Base de datos', basededatos: 'Base de datos', bd: 'Base de datos', database: 'Base de datos',
  backend: 'Backend', seguridad: 'Backend', infraestructura: 'Backend',
  frontend: 'Frontend', diseno: 'Frontend', disenoui: 'Frontend',
  automatizacion: 'Automatización', integracion: 'Automatización', correo: 'Automatización',
  calidad: 'Calidad', testing: 'Calidad', qa: 'Calidad', pruebas: 'Calidad',
  gestion: 'Gestión', management: 'Gestión', documentacion: 'Gestión', planificacion: 'Gestión',
}

const LOG_CATEGORY_ALIASES: Record<string, string> = {
  desarrollo: 'Desarrollo', programacion: 'Desarrollo', codigo: 'Desarrollo',
  reunion: 'Reunión', reuniones: 'Reunión',
  documentacion: 'Documentación',
  investigacion: 'Investigación',
  testing: 'Testing', pruebas: 'Testing', calidad: 'Testing', qa: 'Testing',
  otro: 'Otro', otros: 'Otro', general: 'Otro',
}

const TASK_STATUS_ALIASES: Record<string, string> = {
  todo: 'todo', pendiente: 'todo', porhacer: 'todo',
  doing: 'doing', encurso: 'doing', enprogreso: 'doing', haciendo: 'doing', procesando: 'doing',
  done: 'done', hecha: 'done', hecho: 'done', completada: 'done', completado: 'done',
  terminada: 'done', terminado: 'done', finalizada: 'done', finalizado: 'done',
}

const SPRINT_STATUS_ALIASES: Record<string, string> = {
  open: 'open', abierto: 'open', abierta: 'open', activo: 'open',
  planificado: 'open', planificada: 'open', planeado: 'open', encurso: 'open',
  closed: 'closed', cerrado: 'closed', cerrada: 'closed',
  finalizado: 'closed', finalizada: 'closed', completado: 'closed', completada: 'closed',
}

const TRUE_VALUES = new Set(['si', 'true', '1', 'presencial', 'yes', 'x', 'verdadero', 'v'])
const FALSE_VALUES = new Set(['no', 'false', '0', 'remoto', 'remote', 'virtual', 'falso', 'f'])

const DAY_ALIASES: Record<string, number> = {
  lunes: 1, lun: 1,
  martes: 2, mar: 2,
  miercoles: 3, mier: 3,
  jueves: 4, jue: 4,
  viernes: 5, vie: 5,
  sabado: 6, sab: 6,
  domingo: 7, dom: 7,
}

/** Normaliza nombres para vincular filas de hojas distintas. */
export function normalizeLabel(value: unknown): string {
  return normalize(value).replace(/[^a-z0-9]/g, '')
}

function fromAliases(aliases: Record<string, string>, value: string): string | null {
  return aliases[normalizeLabel(value)] ?? null
}

export function normalizeEpicCategory(value: string): string | null {
  return fromAliases(EPIC_CATEGORY_ALIASES, value)
}

export function normalizeLogCategory(value: string): string | null {
  return fromAliases(LOG_CATEGORY_ALIASES, value)
}

export function normalizeTaskStatus(value: string): string | null {
  return fromAliases(TASK_STATUS_ALIASES, value)
}

export function normalizeSprintStatus(value: string): string | null {
  return fromAliases(SPRINT_STATUS_ALIASES, value)
}

export function parseBooleanValue(value: string): boolean | null {
  const key = normalize(value)
  if (TRUE_VALUES.has(key)) return true
  if (FALSE_VALUES.has(key)) return false
  return null
}

export function parseDayValue(value: string): number | null {
  const key = normalize(value)
  if (DAY_ALIASES[key]) return DAY_ALIASES[key]
  const parsed = Number(key)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 7 ? parsed : null
}

export function parseTimeValue(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match || +match[1] > 23 || +match[2] > 59) return null
  return `${match[1].padStart(2, '0')}:${match[2]}`
}

const required: Record<string, string[]> = {
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
    if (row.values.status && !normalizeSprintStatus(row.values.status)) {
      errors.push(`Estado inválido: ${row.values.status}. Usa open/closed (o abierto/cerrado, planificado/finalizado)`)
    }
  }

  if (row.sheet === 'Épicas' &&
      row.values.category &&
      !normalizeEpicCategory(row.values.category)) {
    errors.push(`Categoría inválida: ${row.values.category}. Usa una de: ${EPIC_CATEGORIES.join(', ')}`)
  }

  if (row.sheet === 'Tareas') {
    if (row.values.status && !normalizeTaskStatus(row.values.status)) {
      errors.push(`Estado inválido: ${row.values.status}. Usa todo/doing/done (o pendiente/en curso/hecha)`)
    }
    if (row.values.is_in_person &&
        parseBooleanValue(row.values.is_in_person) === null) {
      errors.push(`Valor inválido en is_in_person: ${row.values.is_in_person}. Usa sí/no`)
    }
  }

  if (row.sheet === 'Horario') {
    if (parseDayValue(row.values.day_of_week ?? '') === null) {
      errors.push('Día inválido. Usa 1-7 o lunes…domingo')
    }
    const start = parseTimeValue(row.values.start_time ?? '')
    const end = parseTimeValue(row.values.end_time ?? '')
    if (!start || !end) {
      errors.push('Hora inválida. Usa HH:MM (por ejemplo 09:00)')
    } else if (end <= start) {
      errors.push('La hora de término debe ser posterior a la de inicio')
    }
    if (row.values.modality &&
        parseBooleanValue(row.values.modality) === null) {
      errors.push(`Modalidad inválida: ${row.values.modality}. Usa presencial/remoto`)
    }
    const breakMinutes = Number((row.values.break_minutes ?? '').replace(',', '.'))
    if (Number.isFinite(breakMinutes) && breakMinutes > 300) {
      errors.push('La colación debe estar entre 0 y 300 minutos')
    }
  }

  if (row.sheet === 'Bitácora') {
    if (row.values.categoria && !normalizeLogCategory(row.values.categoria)) {
      errors.push(`Categoría inválida: ${row.values.categoria}. Usa una de: ${LOG_CATEGORIES.join(', ')}`)
    }
    if (row.values.presencial &&
        parseBooleanValue(row.values.presencial) === null) {
      errors.push(`Valor inválido en presencial: ${row.values.presencial}. Usa sí/no`)
    }
  }

  if (row.sheet === 'Planificación') {
    const hours = Number((row.values.planned_hours ?? '').replace(',', '.'))
    if (Number.isFinite(hours) && hours > 24) {
      errors.push('Las horas planificadas deben estar entre 0 y 24')
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
    ['PLANTILLA PRACTITRACK — IMPORTACIÓN DE DATOS'],
    [''],
    ['1. Completa solo las hojas que necesites; deja vacías las demás.'],
    ['2. No modifiques los nombres de las columnas ni su orden.'],
    ['3. Fechas: AAAA-MM-DD o DD/MM/AAAA. Horas: HH:MM (por ejemplo 09:00).'],
    ['4. El destino de la importación (la práctica) se elige DENTRO de la plataforma al confirmar. No escribas prácticas en este archivo.'],
    ['5. En Actividades, Tareas y Planificación, los vínculos (sprint, epic, activity, task) deben coincidir con el nombre exacto usado en su hoja.'],
    ['6. Mira la hoja "Ejemplos" para ver una fila de cada sección.'],
    ['7. Los campos vacíos no borran datos existentes. Si el registro ya existe (mismo nombre o fecha), se actualiza.'],
    [''],
    ['VALORES PERMITIDOS'],
    [`Épicas > category: ${EPIC_CATEGORIES.join(', ')}`],
    ['Sprints > status: open o closed (también se aceptan abierto, planificado, cerrado, finalizado)'],
    ['Tareas > status: todo, doing o done (también pendiente, en curso, hecha)'],
    ['Tareas > is_in_person y Bitácora > presencial: sí o no (también presencial o remoto)'],
    ['Horario > day_of_week: 1-7 o lunes, martes, miércoles, jueves, viernes, sábado, domingo'],
    ['Horario > modality: presencial o remoto'],
    [`Bitácora > categoria: ${LOG_CATEGORIES.join(', ')}`],
    ['Planificación > planned_hours: entre 0 y 24'],
  ])

  guide['!cols'] = [{ wch: 105 }]
  XLSX.utils.book_append_sheet(workbook, guide, 'Instrucciones')

  const examples = XLSX.utils.aoa_to_sheet([
    ['Ejemplos - borra o ignora esta hoja al importar'],
    [],
    ['Épicas', ...IMPORT_SECTIONS[0].fields],
    ['', 'Autenticación y roles', 'Altas, login y permisos', 'Backend'],
    [],
    ['Sprints', ...IMPORT_SECTIONS[1].fields],
    ['', 'Sprint 1 - Base de datos', 'Modelado y migraciones', '2026-01-05', '2026-01-18', 'open'],
    [],
    ['Actividades', ...IMPORT_SECTIONS[2].fields],
    ['', 'Diseñar esquema inicial', 'Sprint 1 - Base de datos', 'Autenticación y roles'],
    [],
    ['Tareas', ...IMPORT_SECTIONS[3].fields],
    ['', 'Crear tabla users', 'todo', '2026-01-06', '4', 'Backend', 'no', 'Diseñar esquema inicial'],
    [],
    ['Horario', ...IMPORT_SECTIONS[4].fields],
    ['', 'Jornada de desarrollo', '1', '09:00', '13:00', '30', 'remoto', '2026-01-05', '2026-03-31'],
    [],
    ['Bitácora', ...IMPORT_SECTIONS[5].fields],
    ['', '2026-01-06', '4', 'Modelado de entidades', 'Desarrollo', 'no'],
    [],
    ['Disponibilidad', ...IMPORT_SECTIONS[6].fields],
    ['', '2026-01-05', '2026-03-31', '20', 'Práctica laboral'],
    [],
    ['Planificación', ...IMPORT_SECTIONS[7].fields],
    ['', 'Crear tabla users', '2026-01-06', '2', 'Avance inicial'],
  ])

  examples['!cols'] = [{ wch: 20 }, { wch: 34 }, { wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 22 }]
  XLSX.utils.book_append_sheet(workbook, examples, 'Ejemplos')

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
