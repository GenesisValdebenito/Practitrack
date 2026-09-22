import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile, AvatarConfig } from '../lib/utils'
import { sanitizeAvatarConfig, renderAvatarSvgUri } from '../lib/avatar'

const SKIN_OPTIONS = [
    { value: 'light', label: 'Claro' },
    { value: 'tanned', label: 'Bronceado' },
    { value: 'brown', label: 'Moreno' },
    { value: 'darkBrown', label: 'Moreno oscuro' },
    { value: 'black', label: 'Negro' },
]
const HAIR_OPTIONS = [
    { value: 'noHair', label: 'Sin cabello' },
    { value: 'bigHair', label: 'Largo voluminoso' },
    { value: 'bob', label: 'Bob' },
    { value: 'bun', label: 'Moño' },
    { value: 'curly', label: 'Rizado largo' },
    { value: 'curvy', label: 'Ondulado largo' },
    { value: 'dreads', label: 'Rastas largas' },
    { value: 'fro', label: 'Afro' },
    { value: 'longButNotTooLong', label: 'Media melena' },
    { value: 'miaWallace', label: 'Mia Wallace' },
    { value: 'shortCurly', label: 'Corto rizado' },
    { value: 'shortFlat', label: 'Corto liso' },
    { value: 'shortRound', label: 'Corto redondo' },
    { value: 'shortWaved', label: 'Corto ondulado' },
    { value: 'sides', label: 'Corto con lados' },
    { value: 'theCaesar', label: 'César' },
    { value: 'theCaesarAndSidePart', label: 'César con raya' },
]
const HAIR_COLOR_OPTIONS = [
    { value: 'auburn', label: 'Castaño rojizo' },
    { value: 'black', label: 'Negro' },
    { value: 'blonde', label: 'Rubio' },
    { value: 'blondeGolden', label: 'Rubio dorado' },
    { value: 'brown', label: 'Castaño' },
    { value: 'brownDark', label: 'Castaño oscuro' },
    { value: 'pastelPink', label: 'Rosa pastel' },
    { value: 'platinum', label: 'Platino' },
    { value: 'red', label: 'Rojo' },
    { value: 'silverGray', label: 'Gris plateado' },
]
const EYE_OPTIONS = [
    { value: 'closed', label: 'Cerrados' },
    { value: 'cry', label: 'Llorando' },
    { value: 'default', label: 'Normal' },
    { value: 'xDizzy', label: 'Mareado' },
    { value: 'eyeRoll', label: 'En blanco' },
    { value: 'happy', label: 'Feliz' },
    { value: 'hearts', label: 'Corazones' },
    { value: 'side', label: 'Ladeados' },
    { value: 'squint', label: 'Entrecerrados' },
    { value: 'surprised', label: 'Sorprendido' },
    { value: 'wink', label: 'Guiño' },
    { value: 'winkWacky', label: 'Guiño loco' },
]
const EYEBROW_OPTIONS = [
    { value: 'default', label: 'Normal' },
    { value: 'angry', label: 'Enojadas' },
    { value: 'angryNatural', label: 'Enojadas natural' },
    { value: 'defaultNatural', label: 'Normal natural' },
    { value: 'flatNatural', label: 'Planas' },
    { value: 'frownNatural', label: 'Fruncidas' },
    { value: 'raisedExcited', label: 'Levantadas' },
    { value: 'raisedExcitedNatural', label: 'Levantadas natural' },
    { value: 'sadConcerned', label: 'Tristes' },
    { value: 'sadConcernedNatural', label: 'Tristes natural' },
    { value: 'unibrowNatural', label: 'Uniceja' },
    { value: 'upDown', label: 'Arriba/abajo' },
    { value: 'upDownNatural', label: 'Arriba/abajo natural' },
]
const MOUTH_OPTIONS = [
    { value: 'default', label: 'Normal' },
    { value: 'concerned', label: 'Preocupada' },
    { value: 'disbelief', label: 'Incredulidad' },
    { value: 'eating', label: 'Comiendo' },
    { value: 'grimace', label: 'Mueca' },
    { value: 'sad', label: 'Triste' },
    { value: 'screamOpen', label: 'Grito' },
    { value: 'serious', label: 'Seria' },
    { value: 'smile', label: 'Sonrisa' },
    { value: 'tongue', label: 'Lengua' },
    { value: 'twinkle', label: 'Pícara' },
    { value: 'vomit', label: 'Vómito' },
]
const ACCESSORY_OPTIONS = [
    { value: '', label: 'Sin accesorios' },
    { value: 'round', label: 'Gafas redondas' },
    { value: 'eyepatch', label: 'Parche' },
    { value: 'kurt', label: 'Gafas Kurt' },
    { value: 'prescription01', label: 'Gafas graduadas' },
    { value: 'prescription02', label: 'Gafas graduadas 2' },
    { value: 'sunglasses', label: 'Gafas de sol' },
    { value: 'wayfarers', label: 'Gafas wayfarer' },
]

// 👇 NUEVA constante
const ACCESSORY_COLOR_OPTIONS = [
    { value: 'black', label: 'Negro' },
    { value: 'red', label: 'Rojo' },
    { value: 'blue', label: 'Azul' },
    { value: 'gold', label: 'Dorado' },
    { value: 'silver', label: 'Plateado' },
    { value: 'brown', label: 'Café' },
    { value: 'pink', label: 'Rosa' },
    { value: 'green', label: 'Verde' },
]

const FACIAL_HAIR_OPTIONS = [
    { value: '', label: 'Sin vello facial' },
    { value: 'beardLight', label: 'Barba ligera' },
    { value: 'beardMedium', label: 'Barba media' },
    { value: 'beardMajestic', label: 'Barba majestuosa' },
    { value: 'moustacheFancy', label: 'Bigote elegante' },
    { value: 'moustacheMagnum', label: 'Bigote magnum' },
]
const FACIAL_HAIR_COLOR_OPTIONS = HAIR_COLOR_OPTIONS
const CLOTHE_OPTIONS = [
    { value: 'blazerAndShirt', label: 'Blazer con camisa' },
    { value: 'blazerAndSweater', label: 'Blazer con suéter' },
    { value: 'collarAndSweater', label: 'Suéter con cuello' },
    { value: 'graphicShirt', label: 'Camiseta gráfica' },
    { value: 'hoodie', label: 'Sudadera' },
    { value: 'overall', label: 'Overol' },
    { value: 'shirtCrewNeck', label: 'Camiseta cuello redondo' },
    { value: 'shirtScoopNeck', label: 'Camiseta cuello amplio' },
    { value: 'shirtVNeck', label: 'Camiseta cuello V' },
]
const CLOTHES_COLOR_OPTIONS = [
    { value: 'black', label: 'Negro' },
    { value: 'blue01', label: 'Azul 1' },
    { value: 'blue02', label: 'Azul 2' },
    { value: 'blue03', label: 'Azul 3' },
    { value: 'gray01', label: 'Gris 1' },
    { value: 'gray02', label: 'Gris 2' },
    { value: 'heather', label: 'Jaspeado' },
    { value: 'pastelBlue', label: 'Azul pastel' },
    { value: 'pastelGreen', label: 'Verde pastel' },
    { value: 'pastelOrange', label: 'Naranja pastel' },
    { value: 'pastelRed', label: 'Rojo pastel' },
    { value: 'pastelYellow', label: 'Amarillo pastel' },
    { value: 'pink', label: 'Rosa' },
    { value: 'red', label: 'Rojo' },
    { value: 'white', label: 'Blanco' },
]
const BG_COLORS = [
    { value: 'b6e3f4', label: 'Azul' },
    { value: 'c0aede', label: 'Lila' },
    { value: 'd1d4f9', label: 'Lavanda' },
    { value: 'ffd5dc', label: 'Rosa' },
    { value: 'ffdfbf', label: 'Durazno' },
    { value: 'a5d8a5', label: 'Verde' },
]

type Props = {
    profile: Profile
    onUpdate: () => void
}

export function AvatarBuilder({ profile, onUpdate }: Props) {
    const [local, setLocal] = useState<AvatarConfig>(() =>
        sanitizeAvatarConfig(profile.avatar_config)
    )
    const [saving, setSaving] = useState(false)

    const svgDataUri = useMemo(() => {
        try {
            return renderAvatarSvgUri(profile.id, local)
        } catch {
            return ''
        }
    }, [local, profile.id])

    const set = (key: keyof AvatarConfig, value: string) => {
        setLocal((c) => ({ ...c, [key]: value }))
    }

    const save = async () => {
        setSaving(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            await supabase
                .from('profiles')
                .update({ avatar_config: local, avatar_mode: 'notion' })
                .eq('id', user.id)
            onUpdate()
        }
        setSaving(false)
    }

    // 👇 AQUÍ VA LA FUNCIÓN randomize ACTUALIZADA
    const randomize = () => {
        const pick = <T,>(arr: { value: T }[]) => arr[Math.floor(Math.random() * arr.length)].value
        setLocal({
            skin: pick(SKIN_OPTIONS) as string,
            hair: pick(HAIR_OPTIONS) as string,
            hairColor: pick(HAIR_COLOR_OPTIONS) as string,
            eyes: pick(EYE_OPTIONS) as string,
            eyebrows: pick(EYEBROW_OPTIONS) as string,
            mouth: pick(MOUTH_OPTIONS) as string,
            accessories: pick(ACCESSORY_OPTIONS) as string,
            accessoriesColor: 'black',
            facialHair: pick(FACIAL_HAIR_OPTIONS) as string,
            facialHairColor: pick(FACIAL_HAIR_COLOR_OPTIONS) as string,
            clothe: pick(CLOTHE_OPTIONS) as string,
            clothesColor: pick(CLOTHES_COLOR_OPTIONS) as string,
            bgColor: pick(BG_COLORS) as string,
        })
    }

    const hasHair = local.hair !== 'noHair'
    const hasFacialHair = !!local.facialHair
    const hasAccessories = !!local.accessories

    return (
        <div className="space-y-6">
            <div className="flex flex-col items-center gap-3">
                {svgDataUri ? (
                    <img src={svgDataUri} alt="Avatar preview" className="w-32 h-32 rounded-2xl" />
                ) : (
                    <div className="w-32 h-32 rounded-2xl bg-[var(--bg-subtle)] flex items-center justify-center text-xs text-muted">
                        Error
                    </div>
                )}
                <button onClick={randomize} className="btn-ghost text-xs">🎲 Aleatorio</button>
            </div>

            <div className="space-y-5">
                <Group title="Rostro">
                    <div className="grid grid-cols-2 gap-3">
                        <Select label="Color de piel" value={local.skin} options={SKIN_OPTIONS} onChange={(v) => set('skin', v)} />
                        <Select label="Ojos" value={local.eyes} options={EYE_OPTIONS} onChange={(v) => set('eyes', v)} />
                        <Select label="Cejas" value={local.eyebrows} options={EYEBROW_OPTIONS} onChange={(v) => set('eyebrows', v)} />
                        <Select label="Boca" value={local.mouth} options={MOUTH_OPTIONS} onChange={(v) => set('mouth', v)} />
                    </div>
                </Group>

                <Group title="Cabello">
                    <div className="grid grid-cols-2 gap-3">
                        <Select
                            label="Estilo"
                            value={local.hair}
                            options={HAIR_OPTIONS}
                            onChange={(v) => set('hair', v)}
                        />
                        <Select
                            label="Color"
                            value={local.hairColor}
                            options={HAIR_COLOR_OPTIONS}
                            onChange={(v) => set('hairColor', v)}
                            disabled={!hasHair}
                            hint={!hasHair ? 'Sin cabello' : undefined}
                        />
                    </div>
                </Group>

                <Group title="Vello facial">
                    <div className="grid grid-cols-2 gap-3">
                        <Select
                            label="Tipo"
                            value={local.facialHair || ''}
                            options={FACIAL_HAIR_OPTIONS}
                            onChange={(v) => set('facialHair', v)}
                        />
                        <Select
                            label="Color"
                            value={local.facialHairColor || 'brown'}
                            options={FACIAL_HAIR_COLOR_OPTIONS}
                            onChange={(v) => set('facialHairColor', v)}
                            disabled={!hasFacialHair}
                            hint={!hasFacialHair ? 'Sin vello' : undefined}
                        />
                    </div>
                </Group>

                {/* 👇 Accesorios con color */}
                <Group title="Accesorios">
                    <div className="grid grid-cols-2 gap-3">
                        <Select
                            label="Gafas / accesorio"
                            value={local.accessories || ''}
                            options={ACCESSORY_OPTIONS}
                            onChange={(v) => set('accessories', v)}
                        />
                        <Select
                            label="Color de gafas"
                            value={local.accessoriesColor || 'black'}
                            options={ACCESSORY_COLOR_OPTIONS}
                            onChange={(v) => set('accessoriesColor', v)}
                            disabled={!hasAccessories}
                            hint={!hasAccessories ? 'Sin gafas' : undefined}
                        />
                    </div>
                </Group>

                <Group title="Ropa">
                    <div className="grid grid-cols-2 gap-3">
                        <Select label="Tipo" value={local.clothe || 'shirtCrewNeck'} options={CLOTHE_OPTIONS} onChange={(v) => set('clothe', v)} />
                        <Select label="Color" value={local.clothesColor || 'blue03'} options={CLOTHES_COLOR_OPTIONS} onChange={(v) => set('clothesColor', v)} />
                    </div>
                </Group>

                <Group title="Fondo">
                    <div className="flex flex-wrap gap-2">
                        {BG_COLORS.map((c) => (
                            <button
                                key={c.value}
                                onClick={() => set('bgColor', c.value)}
                                title={c.label}
                                className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${local.bgColor === c.value
                                        ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-[var(--bg-card)]'
                                        : ''
                                    }`}
                                style={{ backgroundColor: `#${c.value}` }}
                            />
                        ))}
                    </div>
                </Group>
            </div>

            <div className="flex justify-end">
                <button onClick={save} disabled={saving} className="btn-primary">
                    {saving ? 'Guardando...' : 'Guardar avatar'}
                </button>
            </div>
        </div>
    )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">{title}</p>
            {children}
        </div>
    )
}

function Select({
    label,
    value,
    options,
    onChange,
    disabled = false,
    hint,
}: {
    label: string
    value: string
    options: { value: string; label: string }[]
    onChange: (v: string) => void
    disabled?: boolean
    hint?: string
}) {
    return (
        <div>
            <label className="text-xs font-medium text-secondary mb-1 flex items-center gap-2">
                {label}
                {hint && <span className="text-[10px] text-muted font-normal">({hint})</span>}
            </label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className={`input-base text-xs ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        </div>
    )
}