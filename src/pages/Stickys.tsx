import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react'
import type {
    ClipboardEvent,
    DragEvent,
    FormEvent,
    PointerEvent as ReactPointerEvent,
    WheelEvent,
} from 'react'
import { supabase } from '../lib/supabase'
import './Stickys.css'


type BoardNote = {
    id: string
    title: string
    content: string
    color: string
    x: number
    y: number
    width: number
    height: number
    image_url: string | null
    link_url: string | null
    created_at?: string
}

type NoteForm = {
    title: string
    content: string
    color: string
    image_url: string
    link_url: string
    width: number
    height: number
}

type Point = {
    x: number
    y: number
}

const COLORS = [
    { name: 'Amarillo', value: '#fff1a8' },
    { name: 'Rosa', value: '#ffd7e5' },
    { name: 'Celeste', value: '#cceaff' },
    { name: 'Verde', value: '#d8f5c5' },
    { name: 'Lila', value: '#e6d9ff' },
    { name: 'Blanco', value: '#ffffff' },
    { name: 'Durazno', value: '#ffdfc2' },
]

const DEFAULT_FORM: NoteForm = {
    title: '',
    content: '',
    color: '#fff1a8',
    image_url: '',
    link_url: '',
    width: 260,
    height: 220,
}

const TABLE = 'pizarra_notes'

function makeId() {
    return crypto.randomUUID()
}

function isWebUrl(value: string) {
    try {
        const url = new URL(value)
        return url.protocol === 'https:' || url.protocol === 'http:'
    } catch {
        return false
    }
}

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
        reader.readAsDataURL(file)
    })
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
}

export default function Stickys() {
    const boardRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLDivElement>(null)

    const dragRef = useRef<{
        pointerId: number
        startX: number
        startY: number
        originalX: number
        originalY: number
        noteId: string
    } | null>(null)

    const panRef = useRef<{
        pointerId: number
        startX: number
        startY: number
        originalX: number
        originalY: number
    } | null>(null)

    const movedRef = useRef(false)
    const saveTimerRef = useRef<number | null>(null)

    const [notes, setNotes] = useState<BoardNote[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [userId, setUserId] = useState<string | null>(null)
    const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [editingNote, setEditingNote] = useState<BoardNote | null>(null)
    const [form, setForm] = useState<NoteForm>({ ...DEFAULT_FORM })
    const [saving, setSaving] = useState(false)
    const [search, setSearch] = useState('')

    const loadNotes = useCallback(async () => {
        setLoading(true)
        setError('')

        const { data: authData, error: authError } =
            await supabase.auth.getUser()

        if (authError || !authData.user) {
            setError('Inicia sesión para guardar y recuperar tu pizarra.')
            setLoading(false)
            return
        }

        setUserId(authData.user.id)

        const { data, error: queryError } = await supabase
            .from(TABLE)
            .select('*')
            .eq('user_id', authData.user.id)
            .order('created_at', { ascending: true })

        if (queryError) {
            setError(
                `No se pudo cargar la pizarra. Ejecuta la migración SQL. ${queryError.message}`,
            )
        } else {
            setNotes((data ?? []) as BoardNote[])
        }

        setLoading(false)
    }, [])

    useEffect(() => {
        void loadNotes()
    }, [loadNotes])

    useEffect(() => {
        return () => {
            if (saveTimerRef.current !== null) {
                window.clearTimeout(saveTimerRef.current)
            }
        }
    }, [])

    const persistNote = useCallback(async (
        note: BoardNote,
        showError = true,
    ) => {
        if (!userId) return false

        const payload = {
            id: note.id,
            user_id: userId,
            title: note.title,
            content: note.content,
            color: note.color,
            x: note.x,
            y: note.y,
            width: note.width,
            height: note.height,
            image_url: note.image_url,
            link_url: note.link_url,
        }

        const { error: saveError } = await supabase
            .from(TABLE)
            .upsert(payload, { onConflict: 'id' })

        if (saveError) {
            if (showError) {
                setError(`No se pudo guardar la nota: ${saveError.message}`)
            }
            return false
        }

        return true
    }, [userId])

    const scheduleSave = useCallback((note: BoardNote) => {
        if (saveTimerRef.current !== null) {
            window.clearTimeout(saveTimerRef.current)
        }

        saveTimerRef.current = window.setTimeout(() => {
            void persistNote(note)
        }, 450)
    }, [persistNote])

    function canvasPoint(clientX: number, clientY: number): Point {
        const rect = boardRef.current?.getBoundingClientRect()
        if (!rect) return { x: 100, y: 100 }

        return {
            x: (clientX - rect.left - offset.x) / zoom,
            y: (clientY - rect.top - offset.y) / zoom,
        }
    }

    function addNoteAt(point: Point, initial?: Partial<NoteForm>) {
        if (loading || !userId) {
            setError('Espera a que la pizarra termine de cargar e inicia sesión.')
            return
        }

        const note: BoardNote = {
            id: makeId(),
            title: initial?.title ?? '',
            content: initial?.content ?? '',
            color: initial?.color ?? COLORS[
                Math.floor(Math.random() * COLORS.length)
            ].value,
            x: Math.max(0, point.x),
            y: Math.max(0, point.y),
            width: initial?.width ?? DEFAULT_FORM.width,
            height: initial?.height ?? DEFAULT_FORM.height,
            image_url: initial?.image_url ?? null,
            link_url: initial?.link_url ?? null,
        }

        setNotes((current) => [...current, note])
        setSelectedId(note.id)
        setEditingNote(note)
        setForm({
            title: note.title,
            content: note.content,
            color: note.color,
            image_url: note.image_url ?? '',
            link_url: note.link_url ?? '',
            width: note.width,
            height: note.height,
        })

        void persistNote(note)
    }

    function openEditor(note: BoardNote) {
        setSelectedId(note.id)
        setEditingNote(note)
        setForm({
            title: note.title,
            content: note.content,
            color: note.color,
            image_url: note.image_url ?? '',
            link_url: note.link_url ?? '',
            width: note.width,
            height: note.height,
        })
        setError('')
    }

    async function saveEditor(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!editingNote) return

        if (form.link_url.trim() && !isWebUrl(form.link_url.trim())) {
            setError('El enlace debe comenzar con http:// o https://.')
            return
        }

        if (form.image_url.trim() && !(
            isWebUrl(form.image_url.trim()) ||
            form.image_url.trim().startsWith('data:image/')
        )) {
            setError('La imagen debe ser una URL web válida o una imagen pegada.')
            return
        }

        const updated: BoardNote = {
            ...editingNote,
            title: form.title.trim(),
            content: form.content,
            color: form.color,
            image_url: form.image_url.trim() || null,
            link_url: form.link_url.trim() || null,
            width: clamp(Number(form.width) || 260, 180, 700),
            height: clamp(Number(form.height) || 220, 140, 900),
        }

        setSaving(true)
        setError('')
        setNotes((current) => current.map((note) =>
            note.id === updated.id ? updated : note,
        ))

        const ok = await persistNote(updated)
        setSaving(false)

        if (ok) {
            setEditingNote(null)
        }
    }

    async function deleteNote(note: BoardNote) {
        if (!window.confirm('¿Quieres eliminar esta nota de la pizarra?')) return

        const { error: deleteError } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', note.id)

        if (deleteError) {
            setError(`No se pudo eliminar la nota: ${deleteError.message}`)
            return
        }

        setNotes((current) => current.filter((item) => item.id !== note.id))
        if (selectedId === note.id) setSelectedId(null)
        if (editingNote?.id === note.id) setEditingNote(null)
    }

    function duplicateNote(note: BoardNote) {
        addNoteAt(
            { x: note.x + 35, y: note.y + 35 },
            {
                title: note.title ? `${note.title} (copia)` : '',
                content: note.content,
                color: note.color,
                image_url: note.image_url ?? '',
                link_url: note.link_url ?? '',
                width: note.width,
                height: note.height,
            },
        )
    }

    function onBoardPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
        const target = event.target as HTMLElement
        const clickedBoard =
            target === boardRef.current ||
            target === canvasRef.current ||
            target.dataset.boardBackground === 'true'

        if (!clickedBoard || event.button !== 0) return

        panRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originalX: offset.x,
            originalY: offset.y,
        }

        movedRef.current = false
        event.currentTarget.setPointerCapture(event.pointerId)
    }

    function onBoardPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
        const pan = panRef.current
        if (!pan || pan.pointerId !== event.pointerId) return

        const dx = event.clientX - pan.startX
        const dy = event.clientY - pan.startY

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            movedRef.current = true
        }

        setOffset({
            x: pan.originalX + dx,
            y: pan.originalY + dy,
        })
    }

    function onBoardPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
        const pan = panRef.current
        if (!pan || pan.pointerId !== event.pointerId) return

        if (!movedRef.current) {
            addNoteAt(canvasPoint(event.clientX, event.clientY))
        }

        panRef.current = null
    }

    function startNoteDrag(
        event: ReactPointerEvent<HTMLElement>,
        note: BoardNote,
    ) {
        if (event.button !== 0) return

        const target = event.target as HTMLElement
        if (target.closest('button, a, input, textarea, [contenteditable="true"]')) {
            return
        }

        event.stopPropagation()

        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originalX: note.x,
            originalY: note.y,
            noteId: note.id,
        }

        movedRef.current = false
        setSelectedId(note.id)
        event.currentTarget.setPointerCapture(event.pointerId)
    }

    function moveNote(event: ReactPointerEvent<HTMLElement>) {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId) return

        const dx = (event.clientX - drag.startX) / zoom
        const dy = (event.clientY - drag.startY) / zoom

        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            movedRef.current = true
        }

        const nextX = Math.max(0, drag.originalX + dx)
        const nextY = Math.max(0, drag.originalY + dy)

        setNotes((current) => current.map((note) => {
            if (note.id !== drag.noteId) return note
            return { ...note, x: nextX, y: nextY }
        }))
    }

    function finishNoteDrag(event: ReactPointerEvent<HTMLElement>) {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId) return

        dragRef.current = null

        const note = notes.find((item) => item.id === drag.noteId)
        if (note) {
            const dx = (event.clientX - drag.startX) / zoom
            const dy = (event.clientY - drag.startY) / zoom

            scheduleSave({
                ...note,
                x: Math.max(0, drag.originalX + dx),
                y: Math.max(0, drag.originalY + dy),
            })
        }
    }

    function onWheel(event: WheelEvent<HTMLDivElement>) {
        if (!event.ctrlKey && !event.metaKey) return

        event.preventDefault()
        setZoom((current) => clamp(
            current * (event.deltaY < 0 ? 1.08 : 0.92),
            0.25,
            2,
        ))
    }

    function zoomBy(amount: number) {
        setZoom((current) => clamp(current + amount, 0.25, 2))
    }

    function resetView() {
        setOffset({ x: 0, y: 0 })
        setZoom(1)
    }

    async function handlePaste(event: ClipboardEvent<HTMLElement>) {
        const clipboard = event.clipboardData
        const imageItem = Array.from(clipboard.items).find((item) =>
            item.type.startsWith('image/'),
        )

        const boardRect = boardRef.current?.getBoundingClientRect()
        const point = canvasPoint(
            (boardRect?.left ?? 0) + 140,
            (boardRect?.top ?? 0) + 140,
        )

        if (imageItem) {
            const file = imageItem.getAsFile()
            if (!file) return

            event.preventDefault()

            if (file.size > 2 * 1024 * 1024) {
                setError('La imagen pegada supera 2 MB. Usa una imagen más pequeña.')
                return
            }

            try {
                const image = await fileToDataUrl(file)
                addNoteAt(point, {
                    title: 'Imagen',
                    image_url: image,
                    content: '',
                    color: '#ffffff',
                    width: 300,
                    height: 300,
                })
            } catch {
                setError('No se pudo leer la imagen del portapapeles.')
            }

            return
        }

        const text = clipboard.getData('text/plain').trim()
        if (!text) return

        event.preventDefault()
        const isUrl = isWebUrl(text)

        addNoteAt(point, {
            title: isUrl ? 'Enlace' : 'Nota',
            content: isUrl ? '' : text,
            link_url: isUrl ? text : '',
        })
    }

    async function handleDrop(event: DragEvent<HTMLElement>) {
        event.preventDefault()

        const files = Array.from(event.dataTransfer.files)
        const point = canvasPoint(event.clientX, event.clientY)
        const imageFile = files.find((file) => file.type.startsWith('image/'))

        if (imageFile) {
            if (imageFile.size > 2 * 1024 * 1024) {
                setError('La imagen supera 2 MB. Para imágenes grandes, configura Supabase Storage.')
                return
            }

            try {
                const image = await fileToDataUrl(imageFile)
                addNoteAt(point, {
                    title: imageFile.name || 'Imagen',
                    image_url: image,
                    color: '#ffffff',
                    width: 300,
                    height: 300,
                })
            } catch {
                setError('No se pudo abrir el archivo de imagen.')
            }

            return
        }

        const text = event.dataTransfer.getData('text/plain').trim()
        if (text) {
            const isUrl = isWebUrl(text)
            addNoteAt(point, {
                title: isUrl ? 'Enlace' : 'Nota',
                content: isUrl ? '' : text,
                link_url: isUrl ? text : '',
            })
        }
    }

    const filteredNotes = search.trim()
        ? notes.filter((note) =>
            `${note.title} ${note.content} ${note.link_url ?? ''}`
                .toLowerCase()
                .includes(search.trim().toLowerCase()),
        )
        : notes

    return (
        <main className="pizarra-page">
            <header className="pizarra-header">
                <div className="pizarra-heading">
                    <div className="pizarra-heading-icon" aria-hidden="true">✳</div>
                    <div>
                        <h1>Pizarra</h1>
                        <p>Un espacio libre para tus ideas, referencias y apuntes.</p>
                    </div>
                </div>

                <div className="pizarra-header-actions">
                    <input
                        aria-label="Buscar notas"
                        className="pizarra-search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar notas..."
                    />
                    <button
                        type="button"
                        className="pizarra-button pizarra-button-primary"
                        onClick={() => addNoteAt({
                            x: (boardRef.current?.clientWidth ?? 800) / 2 / zoom,
                            y: (boardRef.current?.clientHeight ?? 600) / 2 / zoom,
                        })}
                    >
                        + Nueva nota
                    </button>
                </div>
            </header>

            <div className="pizarra-help">
                <span><b>Clic</b> en un espacio vacío para crear una nota</span>
                <span><b>Arrastra</b> para moverte o desplazar notas</span>
                <span><b>Ctrl + rueda</b> para acercar o alejar</span>
                <span><b>Ctrl + V</b> para pegar texto o imágenes</span>
            </div>

            {error && (
                <div className="pizarra-error" role="alert">
                    <span>{error}</span>
                    <button type="button" onClick={() => setError('')} aria-label="Cerrar aviso">
                        ×
                    </button>
                </div>
            )}

            <section
                className="pizarra-board"
                ref={boardRef}
                aria-label="Canvas infinito de notas"
                onPointerDown={onBoardPointerDown}
                onPointerMove={onBoardPointerMove}
                onPointerUp={onBoardPointerUp}
                onPointerCancel={() => { panRef.current = null }}
                onWheel={onWheel}
                onPaste={handlePaste}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                tabIndex={0}
            >
                <div
                    className="pizarra-canvas"
                    ref={canvasRef}
                    data-board-background="true"
                    style={{
                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    }}
                >
                    {filteredNotes.map((note) => (
                        <article
                            key={note.id}
                            className={`pizarra-note ${selectedId === note.id ? 'is-selected' : ''}`}
                            style={{
                                left: note.x,
                                top: note.y,
                                width: note.width,
                                minHeight: note.height,
                                backgroundColor: note.color,
                            }}
                            onPointerDown={(event) => startNoteDrag(event, note)}
                            onPointerMove={moveNote}
                            onPointerUp={finishNoteDrag}
                            onPointerCancel={() => { dragRef.current = null }}
                            onDoubleClick={() => openEditor(note)}
                        >
                            <div className="pizarra-note-toolbar">
                                <span className="pizarra-note-grip" title="Arrastra para mover">⠿</span>
                                <div className="pizarra-note-actions">
                                    <button
                                        type="button"
                                        title="Editar nota"
                                        aria-label="Editar nota"
                                        onPointerDown={(event) => event.stopPropagation()}
                                        onClick={() => openEditor(note)}
                                    >
                                        ✎
                                    </button>
                                    <button
                                        type="button"
                                        title="Duplicar nota"
                                        aria-label="Duplicar nota"
                                        onPointerDown={(event) => event.stopPropagation()}
                                        onClick={() => duplicateNote(note)}
                                    >
                                        ⧉
                                    </button>
                                    <button
                                        type="button"
                                        title="Eliminar nota"
                                        aria-label="Eliminar nota"
                                        onPointerDown={(event) => event.stopPropagation()}
                                        onClick={() => void deleteNote(note)}
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>

                            {note.title && (
                                <h2 className="pizarra-note-title">{note.title}</h2>
                            )}

                            {note.image_url && (
                                <img
                                    className="pizarra-note-image"
                                    src={note.image_url}
                                    alt={note.title || 'Imagen en la pizarra'}
                                    draggable={false}
                                />
                            )}

                            {note.content && (
                                <p className="pizarra-note-content">{note.content}</p>
                            )}

                            {note.link_url && (
                                <a
                                    className="pizarra-note-link"
                                    href={note.link_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    onPointerDown={(event) => event.stopPropagation()}
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    <span aria-hidden="true">↗</span>
                                    <span>{note.link_url}</span>
                                </a>
                            )}

                            {!note.title && !note.content && !note.image_url && !note.link_url && (
                                <button
                                    type="button"
                                    className="pizarra-note-empty"
                                    onPointerDown={(event) => event.stopPropagation()}
                                    onClick={() => openEditor(note)}
                                >
                                    Escribe tu idea…
                                </button>
                            )}
                        </article>
                    ))}
                </div>

                {loading && (
                    <div className="pizarra-empty-state">
                        <div className="pizarra-loader" />
                        <p>Cargando tu pizarra…</p>
                    </div>
                )}

                {!loading && notes.length === 0 && (
                    <div className="pizarra-empty-state">
                        <div className="pizarra-empty-icon">✳</div>
                        <h2>Tu pizarra está lista</h2>
                        <p>Haz clic en cualquier lugar para crear tu primera nota.</p>
                        <button
                            type="button"
                            className="pizarra-button pizarra-button-primary"
                            onClick={() => addNoteAt({ x: 120, y: 100 })}
                        >
                            Crear primera nota
                        </button>
                    </div>
                )}

                {!loading && search && filteredNotes.length === 0 && notes.length > 0 && (
                    <div className="pizarra-empty-state">
                        <h2>No encontramos notas</h2>
                        <p>Prueba con otra palabra de búsqueda.</p>
                    </div>
                )}

                <div
                    className="pizarra-zoom-controls"
                    onPointerDown={(event) => event.stopPropagation()}
                >
                    <button type="button" onClick={() => zoomBy(-0.1)} aria-label="Alejar">−</button>
                    <span>{Math.round(zoom * 100)}%</span>
                    <button type="button" onClick={() => zoomBy(0.1)} aria-label="Acercar">+</button>
                    <span className="pizarra-zoom-divider" />
                    <button type="button" onClick={resetView} title="Restablecer vista">⤢</button>
                </div>
            </section>

            {editingNote && (
                <div
                    className="pizarra-modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setEditingNote(null)
                            setError('')
                        }
                    }}
                >
                    <form className="pizarra-editor" onSubmit={saveEditor}>
                        <header className="pizarra-editor-header">
                            <div>
                                <p className="pizarra-editor-eyebrow">PERSONALIZAR</p>
                                <h2>{editingNote.title ? 'Editar nota' : 'Nueva nota'}</h2>
                            </div>
                            <button
                                type="button"
                                className="pizarra-editor-close"
                                onClick={() => {
                                    setEditingNote(null)
                                    setError('')
                                }}
                                aria-label="Cerrar editor"
                            >
                                ×
                            </button>
                        </header>

                        <label className="pizarra-field">
                            <span>Título</span>
                            <input
                                value={form.title}
                                onChange={(event) => setForm({ ...form, title: event.target.value })}
                                placeholder="Ponle un título a tu idea"
                                maxLength={160}
                            />
                        </label>

                        <label className="pizarra-field">
                            <span>Contenido</span>
                            <textarea
                                value={form.content}
                                onChange={(event) => setForm({ ...form, content: event.target.value })}
                                placeholder="Escribe tus ideas, pega texto o añade apuntes…"
                                rows={6}
                            />
                        </label>

                        <div className="pizarra-field">
                            <span>Color de la nota</span>
                            <div className="pizarra-color-options">
                                {COLORS.map((color) => (
                                    <button
                                        key={color.value}
                                        type="button"
                                        title={color.name}
                                        aria-label={color.name}
                                        aria-pressed={form.color === color.value}
                                        className={`pizarra-color-swatch ${form.color === color.value ? 'is-active' : ''}`}
                                        style={{ backgroundColor: color.value }}
                                        onClick={() => setForm({ ...form, color: color.value })}
                                    />
                                ))}
                            </div>
                        </div>

                        <label className="pizarra-field">
                            <span>Imagen (URL o imagen pegada)</span>
                            <input
                                value={form.image_url}
                                onChange={(event) => setForm({ ...form, image_url: event.target.value })}
                                placeholder="https://…"
                            />
                        </label>

                        {form.image_url && (
                            <div className="pizarra-image-preview">
                                <img src={form.image_url} alt="Vista previa de la imagen" />
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, image_url: '' })}
                                >
                                    Quitar imagen
                                </button>
                            </div>
                        )}

                        <label className="pizarra-field">
                            <span>Enlace web</span>
                            <input
                                type="url"
                                value={form.link_url}
                                onChange={(event) => setForm({ ...form, link_url: event.target.value })}
                                placeholder="https://ejemplo.com"
                            />
                        </label>

                        <div className="pizarra-size-fields">
                            <label className="pizarra-field">
                                <span>Ancho (px)</span>
                                <input
                                    type="number"
                                    min={180}
                                    max={700}
                                    value={form.width}
                                    onChange={(event) => setForm({ ...form, width: Number(event.target.value) })}
                                />
                            </label>
                            <label className="pizarra-field">
                                <span>Alto mínimo (px)</span>
                                <input
                                    type="number"
                                    min={140}
                                    max={900}
                                    value={form.height}
                                    onChange={(event) => setForm({ ...form, height: Number(event.target.value) })}
                                />
                            </label>
                        </div>

                        <p className="pizarra-editor-tip">
                            También puedes pegar texto o una imagen directamente en el canvas con Ctrl + V.
                        </p>

                        {error && <p className="pizarra-error-inline" role="alert">{error}</p>}

                        <footer className="pizarra-editor-footer">
                            <button
                                type="button"
                                className="pizarra-button"
                                onClick={() => {
                                    setEditingNote(null)
                                    setError('')
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="pizarra-button pizarra-button-primary"
                                disabled={saving}
                            >
                                {saving ? 'Guardando…' : 'Guardar nota'}
                            </button>
                        </footer>
                    </form>
                </div>
            )}
        </main>
    )
}
