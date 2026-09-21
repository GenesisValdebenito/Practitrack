import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { weekStart, type Profile } from './utils'

export type ExportLog = {
    date: string
    hours_worked: number
    task_description: string
    category: string
    is_in_person: boolean
}

const round = (n: number) => Math.round(n * 100) / 100
const sumHours = (logs: ExportLog[]) => logs.reduce((s, l) => s + Number(l.hours_worked), 0)
const today = () => new Date().toLocaleDateString('es-CL')

export function exportExcel(profile: Profile, logs: ExportLog[]) {
    const total = sumHours(logs)
    const presencial = sumHours(logs.filter((l) => l.is_in_person))
    const pct = ((total / profile.required_hours) * 100).toFixed(1)

    const resumen = XLSX.utils.aoa_to_sheet([
        ['Informe de práctica profesional'],
        [],
        ['Nombre', profile.full_name ?? ''],
        ['Institución', profile.institution ?? ''],
        ['Carrera', profile.career ?? ''],
        ['Generado el', today()],
        [],
        ['Horas registradas', round(total)],
        ['Horas requeridas', profile.required_hours],
        ['Avance', `${pct}%`],
        ['Horas presenciales', round(presencial)],
        ['Horas remotas', round(total - presencial)],
    ])
    resumen['!cols'] = [{ wch: 22 }, { wch: 40 }]

    const bitacora = XLSX.utils.json_to_sheet(
        logs.map((l) => ({
            Fecha: l.date,
            Horas: Number(l.hours_worked),
            Categoría: l.category,
            Descripción: l.task_description,
            Modalidad: l.is_in_person ? 'Presencial' : 'Remoto',
        }))
    )
    bitacora['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 18 }, { wch: 70 }, { wch: 12 }]

    const byWeek = new Map<string, number>()
    logs.forEach((l) => {
        const k = weekStart(l.date)
        byWeek.set(k, (byWeek.get(k) ?? 0) + Number(l.hours_worked))
    })
    const semanas = XLSX.utils.json_to_sheet(
        [...byWeek.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([semana, horas]) => ({ 'Semana (lunes)': semana, Horas: round(horas) }))
    )
    semanas['!cols'] = [{ wch: 16 }, { wch: 10 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, resumen, 'Resumen')
    XLSX.utils.book_append_sheet(wb, bitacora, 'Bitácora')
    XLSX.utils.book_append_sheet(wb, semanas, 'Por semana')
    XLSX.writeFile(wb, 'informe-practica.xlsx')
}

export function exportPdf(profile: Profile, logs: ExportLog[]) {
    const total = sumHours(logs)
    const pct = ((total / profile.required_hours) * 100).toFixed(1)
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text('Informe de práctica profesional', 14, 18)
    doc.setFontSize(10)
    doc.text(`Nombre: ${profile.full_name ?? ''}`, 14, 28)
    doc.text(`Institución: ${profile.institution ?? ''}`, 14, 34)
    doc.text(`Carrera: ${profile.career ?? ''}`, 14, 40)
    doc.text(`Horas registradas: ${round(total)} de ${profile.required_hours} (${pct}%)`, 14, 46)
    doc.text(`Generado el ${today()}`, 14, 52)

    autoTable(doc, {
        startY: 58,
        head: [['Fecha', 'Categoría', 'Descripción', 'Modalidad', 'Horas']],
        body: logs.map((l) => [
            l.date,
            l.category,
            l.task_description,
            l.is_in_person ? 'Presencial' : 'Remoto',
            String(l.hours_worked),
        ]),
        foot: [['', '', '', 'Total', String(round(total))]],
        headStyles: { fillColor: [37, 99, 235] },
        footStyles: { fillColor: [243, 244, 246], textColor: 20 },
        styles: { fontSize: 9 },
        columnStyles: { 2: { cellWidth: 80 } },
    })

    doc.save('informe-practica.pdf')
}