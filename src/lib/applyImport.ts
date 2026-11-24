import { supabase } from './supabase'
import {
  normalizeLabel,
  normalizeEpicCategory,
  normalizeLogCategory,
  normalizeTaskStatus,
  normalizeSprintStatus,
  parseBooleanValue,
  parseDayValue,
  parseTimeValue,
  type ImportRow,
} from './importPractiTrack'

// Motor de importación: toma las filas válidas de la revisión y las persiste
// en Supabase. Los registros nuevos se crean y los existentes (misma clave
// natural dentro del usuario/práctica) se actualizan, sin duplicar.

export type SectionOutcome = {
  sheet: string
  created: number
  updated: number
  failed: number
  errors: string[]
}

export type ImportOutcome = {
  sections: SectionOutcome[]
  created: number
  updated: number
  failed: number
}

type Existing = { id: string; [key: string]: unknown }

// Única sección que no depende de la práctica elegida como destino.
const USER_SCOPED = new Set(['Disponibilidad'])

export function sectionNeedsPractice(sheet: string): boolean {
  return !USER_SCOPED.has(sheet)
}

// Orden de escritura: primero las entidades referenciadas por las demás.
const SECTION_ORDER = [
  'Épicas',
  'Sprints',
  'Actividades',
  'Tareas',
  'Horario',
  'Bitácora',
  'Disponibilidad',
  'Planificación',
]

function num(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function parseBool(value: string, field: string): boolean {
  const parsed = parseBooleanValue(value)
  if (parsed === null) {
    throw new Error(`Valor inválido en ${field}: «${value}» (usa sí/no)`)
  }
  return parsed
}

function parseDay(value: string): number {
  const parsed = parseDayValue(value)
  if (parsed === null) {
    throw new Error(`Día inválido: «${value}» (usa 1-7 o lunes…domingo)`)
  }
  return parsed
}

function parseTime(value: string): string {
  const parsed = parseTimeValue(value)
  if (parsed === null) {
    throw new Error(`Hora inválida: «${value}» (usa HH:MM)`)
  }
  return parsed
}

function parseTaskStatus(value: string): string {
  const parsed = normalizeTaskStatus(value)
  if (parsed === null) {
    throw new Error(`Estado inválido: «${value}» (usa todo/doing/done)`)
  }
  return parsed
}

function parseSprintStatus(value: string): string {
  const parsed = normalizeSprintStatus(value)
  if (parsed === null) {
    throw new Error(`Estado inválido: «${value}» (usa open/closed)`)
  }
  return parsed
}

function parseEpicCategory(value: string): string {
  const parsed = normalizeEpicCategory(value)
  if (parsed === null) {
    throw new Error(`Categoría inválida: «${value}»`)
  }
  return parsed
}

function canonicalCategory(value: string): string {
  const parsed = normalizeLogCategory(value)
  if (parsed === null) {
    throw new Error(`Categoría inválida: «${value}»`)
  }
  return parsed
}

export async function applyImport(
  rows: ImportRow[],
  practiceId: string | null,
): Promise<ImportOutcome> {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) {
    throw new Error('Tu sesión no está disponible. Inicia sesión de nuevo.')
  }
  const userId = auth.user.id

  const needsPractice = rows.some(row => sectionNeedsPractice(row.sheet))
  if (needsPractice && !practiceId) {
    throw new Error('Selecciona una práctica de destino antes de importar.')
  }

  if (practiceId) {
    const { data: practice, error } = await supabase
      .from('practices')
      .select('id')
      .eq('id', practiceId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error || !practice) {
      throw new Error('La práctica seleccionada no pertenece a tu cuenta o ya no existe.')
    }
  }

  const sheets = new Set(rows.map(row => row.sheet))

  async function fetchExisting(table: string, scoped: boolean): Promise<Existing[]> {
    let query = supabase.from(table).select('*').eq('user_id', userId)
    if (scoped && practiceId) query = query.eq('practice_id', practiceId)
    const { data, error } = await query
    if (error) throw new Error(`No se pudo leer ${table}: ${error.message}`)
    return (data ?? []) as Existing[]
  }

  // Carga solo las tablas necesarias para comparar contra lo existente.
  const [
    epicRows,
    sprintRows,
    activityRows,
    taskRows,
    blockRows,
    logRows,
    availabilityRows,
    planningRows,
  ] = await Promise.all([
    sheets.has('Épicas') || sheets.has('Actividades') ? fetchExisting('epics', true) : Promise.resolve([]),
    sheets.has('Sprints') || sheets.has('Actividades') ? fetchExisting('sprints', true) : Promise.resolve([]),
    sheets.has('Actividades') || sheets.has('Tareas') ? fetchExisting('activities', true) : Promise.resolve([]),
    sheets.has('Tareas') || sheets.has('Planificación')
      ? (async () => {
          let query = supabase.from('tasks').select('*')
            .eq('user_id', userId).is('deleted_at', null)
          if (practiceId) query = query.eq('practice_id', practiceId)
          const { data, error } = await query
          if (error) throw new Error(`No se pudo leer tasks: ${error.message}`)
          return (data ?? []) as Existing[]
        })()
      : Promise.resolve([]),
    sheets.has('Horario') ? fetchExisting('schedule_blocks', true) : Promise.resolve([]),
    sheets.has('Bitácora') ? fetchExisting('work_logs', true) : Promise.resolve([]),
    sheets.has('Disponibilidad') ? fetchExisting('availability_periods', false) : Promise.resolve([]),
    sheets.has('Planificación') ? fetchExisting('task_planning', true) : Promise.resolve([]),
  ])

  const epics = new Map(epicRows.map(row => [normalizeLabel(row.name), row]))
  const sprints = new Map(sprintRows.map(row => [normalizeLabel(row.name), row]))
  const activities = new Map(activityRows.map(row => [normalizeLabel(row.title), row]))
  const tasks = new Map(taskRows.map(row => [normalizeLabel(row.title), row]))
  const blocks = new Map(blockRows.map(row => [
    `${row.day_of_week}|${String(row.start_time).slice(0, 5)}`,
    row,
  ]))
  const logs = new Map(logRows.map(row => [
    `${row.date}|${normalizeLabel(row.task_description)}`,
    row,
  ]))
  const availability = new Map(availabilityRows.map(row => [
    `${row.start_date}|${row.end_date ?? ''}`,
    row,
  ]))
  const planning = new Map(planningRows.map(row => [
    `${row.task_id}|${row.planned_date}`,
    row,
  ]))

  async function writeRow(
    table: string,
    existing: Existing | undefined,
    payload: Record<string, unknown>,
    scoped: boolean,
  ): Promise<{ id: string; created: boolean }> {
    if (existing) {
      let query = supabase.from(table).update(payload)
        .eq('id', existing.id).eq('user_id', userId)
      if (scoped && practiceId) query = query.eq('practice_id', practiceId)
      const { data, error } = await query.select('id')
      if (error) throw new Error(error.message)
      if (!data?.length) {
        throw new Error('El registro ya no existe o no tienes permiso para editarlo.')
      }
      return { id: existing.id, created: false }
    }

    const insertPayload = {
      ...payload,
      user_id: userId,
      ...(scoped && practiceId ? { practice_id: practiceId } : {}),
    }
    const { data, error } = await supabase
      .from(table).insert(insertPayload).select('id').single()
    if (error) throw new Error(error.message)
    return { id: data.id as string, created: true }
  }

  const outcomes: SectionOutcome[] = []

  for (const sheet of SECTION_ORDER) {
    const sheetRows = rows.filter(row => row.sheet === sheet)
    if (sheetRows.length === 0) continue

    const outcome: SectionOutcome = {
      sheet,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    }

    for (const row of sheetRows) {
      const v = row.values

      try {
        let result: { id: string; created: boolean }

        switch (sheet) {
          case 'Épicas': {
            const name = v.name.trim()
            const existing = epics.get(normalizeLabel(name))
            const payload: Record<string, unknown> = {
              name,
              category: parseEpicCategory(v.category),
            }
            if (v.description) payload.description = v.description
            if (!existing) payload.description ??= null

            result = await writeRow('epics', existing, payload, true)
            epics.set(normalizeLabel(name), { ...existing, ...payload, id: result.id })
            break
          }

          case 'Sprints': {
            const name = v.name.trim()
            const existing = sprints.get(normalizeLabel(name))
            const payload: Record<string, unknown> = {
              name,
              start_date: v.start_date,
              end_date: v.end_date,
            }
            if (v.description) payload.description = v.description
            if (v.status) payload.status = parseSprintStatus(v.status)
            if (!existing) {
              payload.status ??= 'open'
              payload.description ??= null
            }

            result = await writeRow('sprints', existing, payload, true)
            sprints.set(normalizeLabel(name), { ...existing, ...payload, id: result.id })
            break
          }

          case 'Actividades': {
            const title = v.title.trim()
            const existing = activities.get(normalizeLabel(title))

            let epicId: string | null = null
            if (v.epic) {
              const epic = epics.get(normalizeLabel(v.epic))
              if (!epic) {
                throw new Error(`La épica «${v.epic}» no existe. Inclúyela en la hoja Épicas o créala en el backlog.`)
              }
              epicId = epic.id
            }

            let sprintId: string | null = null
            if (v.sprint) {
              const sprint = sprints.get(normalizeLabel(v.sprint))
              if (!sprint) {
                throw new Error(`El sprint «${v.sprint}» no existe. Inclúyelo en la hoja Sprints o créalo en el backlog.`)
              }
              sprintId = sprint.id
            }

            // description/activity_date/status de la plantilla no se guardan:
            // la plataforma todavía no usa esas columnas en actividades.
            const payload: Record<string, unknown> = {
              title,
              epic_id: epicId,
              sprint_id: sprintId,
            }

            result = await writeRow('activities', existing, payload, true)
            activities.set(normalizeLabel(title), { ...existing, ...payload, id: result.id })
            break
          }

          case 'Tareas': {
            const title = v.title.trim()
            const existing = tasks.get(normalizeLabel(title))

            let activityId: string | null = null
            if (v.activity) {
              const activity = activities.get(normalizeLabel(v.activity))
              if (!activity) {
                throw new Error(`La actividad «${v.activity}» no existe. Inclúyela en la hoja Actividades o créala en el backlog.`)
              }
              activityId = activity.id
            }

            const payload: Record<string, unknown> = { title }
            if (v.status) payload.status = parseTaskStatus(v.status)
            if (v.due_date) payload.due_date = v.due_date
            const plannedHours = num(v.planned_hours)
            if (plannedHours !== null) payload.planned_hours = plannedHours
            if (v.category) payload.category = v.category.trim()
            if (v.is_in_person) payload.is_in_person = parseBool(v.is_in_person, 'is_in_person')
            if (v.activity) payload.activity_id = activityId

            if (!existing) {
              payload.status ??= 'todo'
              payload.due_date ??= null
              payload.planned_hours ??= null
              payload.category ??= null
              payload.is_in_person ??= false
              payload.activity_id ??= null
            }

            result = await writeRow('tasks', existing, payload, true)
            tasks.set(normalizeLabel(title), { ...existing, ...payload, id: result.id })
            break
          }

          case 'Horario': {
            const day = parseDay(v.day_of_week)
            const startTime = parseTime(v.start_time)
            const endTime = parseTime(v.end_time)
            if (endTime <= startTime) {
              throw new Error('La hora de término debe ser posterior a la de inicio.')
            }
            const breakMinutes = num(v.break_minutes) ?? 0
            if (breakMinutes < 0 || breakMinutes > 300) {
              throw new Error('La colación debe estar entre 0 y 300 minutos.')
            }

            const key = `${day}|${startTime}`
            const existing = blocks.get(key)
            const payload: Record<string, unknown> = {
              title: v.title.trim(),
              day_of_week: day,
              start_time: startTime,
              end_time: endTime,
              break_minutes: breakMinutes,
              is_in_person: v.modality ? parseBool(v.modality, 'modality') : false,
            }
            if (v.effective_from) payload.effective_from = v.effective_from
            if (v.effective_to) payload.effective_to = v.effective_to
            if (!existing) {
              payload.effective_from ??= null
              payload.effective_to ??= null
            }

            result = await writeRow('schedule_blocks', existing, payload, true)
            blocks.set(key, { ...existing, ...payload, id: result.id })
            break
          }

          case 'Bitácora': {
            const date = v.fecha
            const description = v.descripcion.trim()
            const key = `${date}|${normalizeLabel(description)}`
            const existing = logs.get(key)

            const payload: Record<string, unknown> = {
              date,
              hours_worked: num(v.horas),
              task_description: description,
            }
            if (v.categoria) payload.category = canonicalCategory(v.categoria)
            if (v.presencial) payload.is_in_person = parseBool(v.presencial, 'presencial')
            if (!existing) {
              payload.category ??= 'Otro'
              payload.is_in_person ??= false
            }

            result = await writeRow('work_logs', existing, payload, true)
            logs.set(key, { ...existing, ...payload, id: result.id })
            break
          }

          case 'Disponibilidad': {
            if (v.end_date && v.end_date < v.start_date) {
              throw new Error('El período termina antes de comenzar.')
            }
            const key = `${v.start_date}|${v.end_date || ''}`
            const existing = availability.get(key)

            const payload: Record<string, unknown> = {
              start_date: v.start_date,
              hours_per_week: num(v.hours_per_week),
            }
            if (v.end_date) payload.end_date = v.end_date
            if (v.description) payload.description = v.description
            if (!existing) {
              payload.end_date ??= null
              payload.description ??= ''
            }

            result = await writeRow('availability_periods', existing, payload, false)
            availability.set(key, { ...existing, ...payload, id: result.id })
            break
          }

          case 'Planificación': {
            const task = tasks.get(normalizeLabel(v.task))
            if (!task) {
              throw new Error(`La tarea «${v.task}» no existe. Inclúyela en la hoja Tareas o créala en la plataforma.`)
            }

            let plannedHours = num(v.planned_hours)
            if (plannedHours === null) plannedHours = 1
            if (plannedHours < 0 || plannedHours > 24) {
              throw new Error('Las horas planificadas deben estar entre 0 y 24.')
            }

            const key = `${task.id}|${v.planned_date}`
            const existing = planning.get(key)
            const payload: Record<string, unknown> = {
              task_id: task.id,
              planned_date: v.planned_date,
              planned_hours: plannedHours,
              notes: v.notes ?? '',
              updated_at: new Date().toISOString(),
            }

            result = await writeRow('task_planning', existing, payload, true)
            planning.set(key, { ...existing, ...payload, id: result.id })
            break
          }

          default:
            throw new Error(`Sección no soportada: ${sheet}`)
        }

        if (result.created) outcome.created += 1
        else outcome.updated += 1
      } catch (err) {
        outcome.failed += 1
        outcome.errors.push(
          `Fila ${row.line}: ${err instanceof Error ? err.message : 'Error desconocido.'}`,
        )
      }
    }

    outcomes.push(outcome)
  }

  return {
    sections: outcomes,
    created: outcomes.reduce((total, section) => total + section.created, 0),
    updated: outcomes.reduce((total, section) => total + section.updated, 0),
    failed: outcomes.reduce((total, section) => total + section.failed, 0),
  }
}