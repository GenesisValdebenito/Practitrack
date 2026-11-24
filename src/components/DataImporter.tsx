
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  IMPORT_SECTIONS,
  downloadPractiTrackTemplate,
  parsePractiTrackFile,
  validateRow,
  type ImportRow,
  type ParsedWorkbook,
} from '../lib/importPractiTrack'
import {
  applyImport,
  sectionNeedsPractice,
  type ImportOutcome,
} from '../lib/applyImport'
import { LOGS_CHANGED_EVENT } from './QuickLogWidget'

const panel =
  'rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)]'

type DataImporterProps = {
  activePracticeId: string | null
  onImported?: () => void
}

export default function DataImporter({
  activePracticeId,
  onImported,
}: DataImporterProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLDialogElement>(null)

  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [step, setStep] = useState<'select' | 'review' | 'summary' | 'result'>('select')
  const [activeSheet, setActiveSheet] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null)
  const [practices, setPractices] = useState<{ id: string; name: string }[]>([])
  const [targetPracticeId, setTargetPracticeId] = useState<string | null>(
    activePracticeId,
  )
  const [practiceError, setPracticeError] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadPractices = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return

      const { data, error } = await supabase
        .from('practices')
        .select('id, name')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })

      if (cancelled || error) {
        if (!cancelled && error) setPracticeError(error.message)
        return
      }

      const list = (data ?? []) as { id: string; name: string }[]
      setPractices(list)
      setTargetPracticeId(current => {
        if (current && list.some(item => item.id === current)) return current
        if (activePracticeId && list.some(item => item.id === activePracticeId)) {
          return activePracticeId
        }
        return list[0]?.id ?? null
      })
    }

    void loadPractices()
    return () => { cancelled = true }
  }, [activePracticeId])

  const available = useMemo(() => {
    if (!workbook) return []

    return IMPORT_SECTIONS
      .map(section => section.sheet)
      .filter(name => workbook.sections.includes(name))
  }, [workbook])

  const selectedRows = useMemo(
    () => workbook?.rows.filter(
      row => selected.includes(row.sheet),
    ) ?? [],
    [workbook, selected],
  )

  const includedRows = selectedRows.filter(row => row.included)
  const validRows = includedRows.filter(row => row.errors.length === 0)
  const invalidRows = includedRows.filter(row => row.errors.length > 0)

  const activeRows = selectedRows.filter(
    row => row.sheet === activeSheet,
  )

  // Solo Disponibilidad se guarda sin práctica; el resto necesita un destino.
  const needsDestination = validRows.some(row => sectionNeedsPractice(row.sheet))
  const missingDestination = needsDestination && !targetPracticeId

  const runImport = async () => {
    if (validRows.length === 0 || missingDestination) return

    setImporting(true)
    setError('')

    try {
      const result = await applyImport(
        validRows,
        needsDestination ? targetPracticeId : null,
      )
      setOutcome(result)
      setStep('result')
      confirmRef.current?.close()

      // Avisa al resto de la app (dashboard, layout, bitácora).
      window.dispatchEvent(new Event(LOGS_CHANGED_EVENT))
      onImported?.()
    } catch (err) {
      confirmRef.current?.close()
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo completar la importación.',
      )
    } finally {
      setImporting(false)
    }
  }

  const resetImporter = () => {
    setWorkbook(null)
    setSelected([])
    setOutcome(null)
    setError('')
    setStep('select')
  }

  const handleFile = async (file: File) => {
    setLoading(true)
    setError('')

    try {
      const parsed = await parsePractiTrackFile(file)

      const nonEmpty = parsed.sections.filter(name =>
        parsed.rows.some(row => row.sheet === name),
      )

      setWorkbook(parsed)
      setSelected(nonEmpty)
      setActiveSheet(nonEmpty[0] ?? parsed.sections[0] ?? '')
      setStep('select')
    } catch (err) {
      setWorkbook(null)
      setSelected([])
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo leer el archivo.',
      )
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (name: string, checked: boolean) => {
    setSelected(previous =>
      checked
        ? [...previous, name]
        : previous.filter(item => item !== name),
    )
  }

  const updateRow = (
    id: string,
    field: string,
    value: string,
  ) => {
    setWorkbook(previous => {
      if (!previous) return previous

      return {
        ...previous,
        rows: previous.rows.map(row => {
          if (row.id !== id) return row

          const updated: ImportRow = {
            ...row,
            values: { ...row.values, [field]: value },
          }

          updated.errors = validateRow(updated)
          return updated
        }),
      }
    })
  }

  const toggleRow = (id: string, checked: boolean) => {
    setWorkbook(previous => {
      if (!previous) return previous

      return {
        ...previous,
        rows: previous.rows.map(row =>
          row.id === id
            ? { ...row, included: checked }
            : row,
        ),
      }
    })
  }

  const removeRow = (id: string) => {
    setWorkbook(previous => {
      if (!previous) return previous

      return {
        ...previous,
        rows: previous.rows.filter(row => row.id !== id),
      }
    })
  }

  const exportReview = () => {
    if (!workbook) return

    const result = {
      source: workbook.filename,
      generated_at: new Date().toISOString(),
      selected_sections: selected,
      records: validRows.map(row => ({
        section: row.sheet,
        source_line: row.line,
        values: row.values,
      })),
    }

    const blob = new Blob(
      [JSON.stringify(result, null, 2)],
      { type: 'application/json' },
    )

    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'PractiTrack_Revision_Importacion.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const count = (name: string) =>
    workbook?.rows.filter(row => row.sheet === name).length ?? 0

  return (
    <section className={`${panel} min-w-0 space-y-5 p-4 sm:p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            Importar datos
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Selecciona las secciones, revisa los registros
            y corrige los errores antes de importar.
          </p>
        </div>

        <button
          type="button"
          className="btn-ghost border border-[var(--border-soft)]"
          onClick={downloadPractiTrackTemplate}
        >
          Descargar plantilla
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['select', '1. Seleccionar'],
          ['review', '2. Revisar'],
          ['summary', '3. Resumen'],
          ['result', '4. Importar'],
        ].map(([id, label]) => (
          <div
            key={id}
            className={`rounded-lg px-2 py-3 text-center text-xs ${
              step === id
                ? 'bg-[var(--bg-subtle)] font-semibold'
                : 'text-[var(--text-muted)]'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/30 p-3 text-sm text-red-500">
          {error}
        </p>
      )}

      {!workbook && (
        <div
          className="cursor-pointer rounded-xl border-2 border-dashed border-[var(--border-soft)] p-8 text-center"
          onClick={() => inputRef.current?.click()}
          onDragOver={event => event.preventDefault()}
          onDrop={event => {
            event.preventDefault()
            const file = event.dataTransfer.files[0]
            if (file) void handleFile(file)
          }}
        >
          <p className="font-medium">
            {loading ? 'Leyendo archivo…' : 'Seleccionar archivo Excel'}
          </p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Arrastra un archivo .xlsx o .xls, o haz clic aquí.
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={event => {
          const file = event.target.files?.[0]
          if (file) void handleFile(file)
          event.target.value = ''
        }}
      />

      {workbook && (
        <>
          <div className={`${panel} flex flex-wrap items-center justify-between gap-3 p-3`}>
            <div className="min-w-0">
              <p className="break-all text-sm font-medium">
                {workbook.filename}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {workbook.rows.length} registros detectados
              </p>
            </div>

            <button
              type="button"
              className="btn-ghost"
              onClick={() => inputRef.current?.click()}
            >
              Cambiar archivo
            </button>
          </div>

          {step === 'select' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">
                  ¿Qué deseas importar?
                </h3>

                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() => setSelected(
                    selected.length === available.length
                      ? []
                      : [...available],
                  )}
                >
                  {selected.length === available.length
                    ? 'Deseleccionar todo'
                    : 'Seleccionar todo'}
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {available.map(name => (
                  <label
                    key={name}
                    className={`${panel} flex cursor-pointer items-center justify-between gap-3 p-3`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected.includes(name)}
                        onChange={event =>
                          toggleSection(name, event.target.checked)
                        }
                      />
                      <span className="text-sm font-medium">
                        {name}
                      </span>
                    </span>

                    <span className="text-xs text-[var(--text-secondary)]">
                      {count(name)} filas
                    </span>
                  </label>
                ))}
              </div>

              <button
                type="button"
                className="btn-primary"
                disabled={selected.length === 0}
                onClick={() => {
                  setActiveSheet(selected[0])
                  setStep('review')
                }}
              >
                Revisar selección
              </button>
            </div>
          )}

          {step === 'review' && (
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap gap-2">
                {selected.map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setActiveSheet(name)}
                    className={
                      activeSheet === name
                        ? 'btn-primary'
                        : 'btn-ghost border border-[var(--border-soft)]'
                    }
                  >
                    {name}
                  </button>
                ))}
              </div>

              <p className="text-sm text-[var(--text-secondary)]">
                Puedes editar cualquier celda, excluir registros
                o quitarlos de esta revisión.
              </p>

              <div className="max-h-[520px] overflow-auto rounded-xl border border-[var(--border-soft)]">
                <table className="w-full min-w-max text-sm">
                  <thead className="sticky top-0 bg-[var(--bg-subtle)]">
                    <tr>
                      <th className="p-3 text-left">Incluir</th>
                      <th className="p-3 text-left">Fila</th>
                      {(IMPORT_SECTIONS.find(
                        section => section.sheet === activeSheet,
                      )?.fields ?? []).map(field => (
                        <th key={field} className="p-3 text-left">
                          {field}
                        </th>
                      ))}
                      <th className="p-3 text-left">Validación</th>
                      <th className="p-3 text-left">Acción</th>
                    </tr>
                  </thead>

                  <tbody>
                    {activeRows.map(row => (
                      <tr
                        key={row.id}
                        className="border-t border-[var(--border-soft)]"
                      >
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={row.included}
                            onChange={event =>
                              toggleRow(row.id, event.target.checked)
                            }
                          />
                        </td>

                        <td className="p-2 text-xs">
                          {row.line}
                        </td>

                        {Object.keys(row.values).map(field => (
                          <td key={field} className="p-2">
                            <input
                              className="input-base min-w-[140px] w-full"
                              value={row.values[field]}
                              onChange={event =>
                                updateRow(
                                  row.id,
                                  field,
                                  event.target.value,
                                )
                              }
                            />
                          </td>
                        ))}

                        <td className="max-w-[240px] p-2 text-xs">
                          {row.errors.length === 0
                            ? 'Correcto'
                            : row.errors.join(' · ')}
                        </td>

                        <td className="p-2">
                          <button
                            type="button"
                            className="btn-ghost text-red-500"
                            onClick={() => removeRow(row.id)}
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap justify-between gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setStep('select')}
                >
                  Volver
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setStep('summary')}
                >
                  Ver resumen
                </button>
              </div>
            </div>
          )}

          {step === 'summary' && (
            <div className="space-y-4">
              <h3 className="font-semibold">
                Resumen de la revisión
              </h3>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  ['Seleccionados', includedRows.length],
                  ['Válidos', validRows.length],
                  ['Con errores', invalidRows.length],
                ].map(([label, value]) => (
                  <div key={label} className={`${panel} p-4`}>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className={`${panel} space-y-2 p-4`}>
                <h4 className="text-sm font-semibold">
                  Secciones seleccionadas
                </h4>
                {selected.map(name => (
                  <div
                    key={name}
                    className="flex justify-between gap-2 text-sm"
                  >
                    <span>{name}</span>
                    <span>
                      {validRows.filter(
                        row => row.sheet === name,
                      ).length} válidos
                    </span>
                  </div>
                ))}
              </div>

              {invalidRows.length > 0 && (
                <p className="rounded-lg border border-amber-500/40 p-3 text-sm">
                  Hay registros con errores. Vuelve a la revisión
                  para corregirlos o excluirlos.
                </p>
              )}

              {(missingDestination || practiceError) && (
                <p className="rounded-lg border border-amber-500/40 p-3 text-sm">
                  {missingDestination
                    ? 'Crea una práctica antes de importar: el destino se elige al confirmar.'
                    : `No se pudieron cargar tus prácticas: ${practiceError}`}
                </p>
              )}

              <p className="text-sm text-[var(--text-secondary)]">
                Al importar, los registros nuevos se crean y los que ya
                existen (mismo nombre o fecha dentro de tu cuenta) se
                actualizan con los valores del archivo. Los campos
                vacíos no borran información existente.
                {needsDestination &&
                  ' El destino (práctica) se te preguntará al confirmar.'}
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setStep('review')}
                >
                  Volver a editar
                </button>

                <button
                  type="button"
                  className="btn-ghost border border-[var(--border-soft)]"
                  disabled={validRows.length === 0}
                  onClick={exportReview}
                >
                  Descargar revisión
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  disabled={
                    validRows.length === 0 ||
                    missingDestination ||
                    importing
                  }
                  onClick={() => confirmRef.current?.showModal()}
                >
                  Importar a PractiTrack
                </button>
              </div>
            </div>
          )}

          {step === 'result' && outcome && (
            <div className="space-y-4">
              <h3 className="font-semibold">
                Resultado de la importación
              </h3>

              <div className="grid grid-cols-3 gap-3">
                {[
                  ['Creados', outcome.created],
                  ['Actualizados', outcome.updated],
                  ['Con errores', outcome.failed],
                ].map(([label, value]) => (
                  <div key={label} className={`${panel} p-4`}>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className={`${panel} space-y-2 p-4`}>
                <h4 className="text-sm font-semibold">
                  Detalle por sección
                </h4>
                {outcome.sections.map(section => (
                  <div
                    key={section.sheet}
                    className="flex flex-wrap justify-between gap-2 text-sm"
                  >
                    <span>{section.sheet}</span>
                    <span className="text-[var(--text-secondary)]">
                      {section.created} creados · {section.updated} actualizados
                      {section.failed > 0 && ` · ${section.failed} con errores`}
                    </span>
                  </div>
                ))}
              </div>

              {outcome.sections.some(section => section.errors.length > 0) && (
                <div className="max-h-[240px] space-y-1 overflow-auto rounded-lg border border-red-500/30 p-3">
                  {outcome.sections.flatMap(section =>
                    section.errors.map(message => (
                      <p key={`${section.sheet}-${message}`} className="text-xs text-red-500">
                        {section.sheet} · {message}
                      </p>
                    )),
                  )}
                </div>
              )}

              <p className="text-sm text-[var(--text-secondary)]">
                Los datos ya están guardados en la plataforma y las
                vistas se actualizaron. Puedes revisarlos en Tareas,
                Horario, Bitácora y el resto de las secciones.
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={resetImporter}
                >
                  Importar otro archivo
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <dialog
        ref={confirmRef}
        aria-labelledby="import-confirm-title"
        className="fixed inset-0 m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-5 text-[var(--text-primary)] shadow-2xl backdrop:bg-black/50"
        onCancel={event => {
          if (importing) event.preventDefault()
        }}
      >
        <h2 id="import-confirm-title" className="text-lg font-semibold">
          Confirmar importación
        </h2>

        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Se importarán {validRows.length} registros válidos de{' '}
          {workbook?.filename ?? 'tu archivo'}. Los registros nuevos se
          crearán y los existentes se actualizarán.
        </p>

        {needsDestination ? (
          <div className="mt-4 space-y-2">
            <label
              htmlFor="import-target"
              className="block text-sm font-medium"
            >
              Importar en:
            </label>
            <select
              id="import-target"
              className="input-base w-full"
              value={targetPracticeId ?? ''}
              disabled={importing}
              onChange={event => setTargetPracticeId(event.target.value || null)}
            >
              {practices.map(practice => (
                <option key={practice.id} value={practice.id}>
                  {practice.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--text-secondary)]">
              Disponibilidad se guarda en tu cuenta general, sin importar
              la práctica elegida.
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Estos datos se guardarán en tu cuenta general.
          </p>
        )}

        {invalidRows.length > 0 && (
          <p className="mt-2 text-sm text-amber-600">
            {invalidRows.length} registros con errores quedan excluidos.
          </p>
        )}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn-ghost"
            disabled={importing}
            onClick={() => confirmRef.current?.close()}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="btn-primary"
            disabled={importing}
            onClick={() => void runImport()}
          >
            {importing ? 'Importando…' : 'Confirmar importación'}
          </button>
        </div>
      </dialog>
    </section>
  )
}
