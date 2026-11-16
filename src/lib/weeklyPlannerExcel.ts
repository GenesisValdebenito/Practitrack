    
import * as XLSX from 'xlsx'

export type ExportTask = {
  id: string
  title: string
  status: 'todo' | 'doing' | 'done'
  due_date: string | null
  category: string | null
}

export type ExportEntry = {
  task_id: string
  planned_date: string
  planned_hours: number
  notes: string
}

type ExportOptions = {
  sprintName: string
  weekStart: string
  weekEnd: string
  tasks: ExportTask[]
  entries: ExportEntry[]
}

const DAYS = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves',
  'Viernes', 'Sábado', 'Domingo',
]

const STATUS = {
  todo: 'Por hacer',
  doing: 'En curso',
  done: 'Hecho',
}

function formatDate(value: string) {
  const [y, m, d] = value.split('-')
  return `${d}/${m}/${y}`
}

function nextDate(value: string, days: number) {
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d + days, 12)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function exportWeeklyPlannerExcel({
  sprintName,
  weekStart,
  weekEnd,
  tasks,
  entries,
}: ExportOptions) {
  const workbook = XLSX.utils.book_new()
  const taskMap = new Map(tasks.map(task => [task.id, task]))

  const rows: (string | number)[][] = [
    ['PRACTITRACK · PLANIFICADOR SEMANAL'],
    [`Sprint: ${sprintName}`],
    [`Semana: ${formatDate(weekStart)} al ${formatDate(weekEnd)}`],
    [],
    [
      'Día / fecha',
      'Tarea',
      'Categoría',
      'Estado',
      'Horas previstas',
      'Fecha límite',
      'Notas',
    ],
  ]

  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
  ]

  let totalHours = 0

  DAYS.forEach((day, index) => {
    const date = nextDate(weekStart, index)
    const dayEntries = entries.filter(
      entry => entry.planned_date === date &&
        taskMap.has(entry.task_id),
    )

    const firstRow = rows.length

    if (dayEntries.length === 0) {
      rows.push([`${day} ${formatDate(date)}`, '', '', '', '', '', ''])
    } else {
      dayEntries.forEach(entry => {
        const task = taskMap.get(entry.task_id)!
        const hours = Number(entry.planned_hours)
        totalHours += hours

        rows.push([
          `${day} ${formatDate(date)}`,
          task.title,
          task.category ?? '',
          STATUS[task.status],
          hours,
          task.due_date ? formatDate(task.due_date) : '',
          entry.notes ?? '',
        ])
      })
    }

    if (dayEntries.length > 1) {
      merges.push({
        s: { r: firstRow, c: 0 },
        e: { r: rows.length - 1, c: 0 },
      })
    }
  })

  rows.push([])
  rows.push(['TOTAL SEMANAL', '', '', '', totalHours])

  const sheet = XLSX.utils.aoa_to_sheet(rows)

  sheet['!merges'] = merges
  sheet['!cols'] = [
    { wch: 25 },
    { wch: 45 },
    { wch: 22 },
    { wch: 18 },
    { wch: 19 },
    { wch: 19 },
    { wch: 48 },
  ]

  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    'Planificador semanal',
  )

  XLSX.writeFile(
    workbook,
    `PractiTrack_Planificador_${weekStart}.xlsx`,
  )
}
