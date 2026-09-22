import { Style, Avatar } from '@dicebear/core'
import definition from '@dicebear/styles/avataaars.json' with { type: 'json' }
import type { AvatarConfig } from './utils'

const style = new Style(definition)

const HAIR_COLORS: Record<string, string> = {
    auburn: '#A55728',
    black: '#2C1B18',
    blonde: '#B58143',
    blondeGolden: '#D6B370',
    brown: '#724133',
    brownDark: '#4A312C',
    pastelPink: '#F59797',
    platinum: '#ECDCBF',
    red: '#C93305',
    silverGray: '#E8E1E1',
}

const CLOTHES_COLORS: Record<string, string> = {
    black: '#262E33',
    blue01: '#65C9FF',
    blue02: '#5199E4',
    blue03: '#25557C',
    gray01: '#E6E6E6',
    gray02: '#929598',
    heather: '#3C4F5C',
    pastelBlue: '#B1E2FF',
    pastelGreen: '#A7FFC4',
    pastelOrange: '#FFDEB5',
    pastelRed: '#FFAFB9',
    pastelYellow: '#FFFFB1',
    pink: '#FF488E',
    red: '#FF5C5C',
    white: '#FFFFFF',
}

const SKIN_COLORS: Record<string, string> = {
    light: '#EDB98A',
    tanned: '#FD9841',
    brown: '#D08B5B',
    darkBrown: '#AE5D29',
    black: '#614335',
}

const BG_COLORS: Record<string, string> = {
    b6e3f4: '#b6e3f4',
    c0aede: '#c0aede',
    d1d4f9: '#d1d4f9',
    ffd5dc: '#ffd5dc',
    ffdfbf: '#ffdfbf',
    a5d8a5: '#a5d8a5',
}

const ACCESSORIES_COLORS: Record<string, string> = {
    black: '#262E33',
    red: '#FF0000',
    blue: '#25557C',
    gold: '#D4AF37',
    silver: '#C0C0C0',
    brown: '#724133',
    pink: '#FF69B4',
    green: '#2E8B57',
}

const DEFAULT_CONFIG: AvatarConfig = {
    skin: 'light',
    hair: 'shortHairShortFlat',
    hairColor: 'brown',
    eyes: 'default',
    eyebrows: 'default',
    mouth: 'smile',
    accessories: '',
    accessoriesColor: 'black',
    facialHair: '',
    facialHairColor: 'brown',
    clothe: 'shirtCrewNeck',
    clothesColor: 'blue03',
    bgColor: 'b6e3f4',
}

export function sanitizeAvatarConfig(config: AvatarConfig | null | undefined): AvatarConfig {
    if (!config) return { ...DEFAULT_CONFIG }
    return {
        ...DEFAULT_CONFIG,
        ...config,
        accessories: config.accessories ?? '',
        accessoriesColor: config.accessoriesColor ?? 'black',
        facialHair: config.facialHair ?? '',
        facialHairColor: config.facialHairColor ?? 'brown',
        clothe: config.clothe ?? 'shirtCrewNeck',
        clothesColor: config.clothesColor ?? 'blue03',
    }
}

export function renderAvatarSvgUri(seed: string, config: AvatarConfig): string {
    const c = sanitizeAvatarConfig(config)

    const hasFacialHair = c.facialHair && c.facialHair.trim() !== ''
    const hasAccessories = c.accessories && c.accessories.trim() !== ''

    const options: Record<string, any> = {
        seed,
        size: 256,
        skinColor: [SKIN_COLORS[c.skin] ?? SKIN_COLORS.light],
        backgroundColor: [BG_COLORS[c.bgColor] ?? BG_COLORS.b6e3f4],
        topVariant: [c.hair],
        hairColor: [HAIR_COLORS[c.hairColor] ?? HAIR_COLORS.brown],
        eyesVariant: [c.eyes],
        eyebrowsVariant: [c.eyebrows],
        mouthVariant: [c.mouth],
        clothesVariant: [c.clothe],
        clothesColor: [CLOTHES_COLORS[c.clothesColor] ?? CLOTHES_COLORS.blue03],
        facialHairVariant: hasFacialHair ? [c.facialHair] : [],
        facialHairColor: [HAIR_COLORS[c.facialHairColor] ?? HAIR_COLORS.brown],
        accessoriesVariant: hasAccessories ? [c.accessories] : [],
    }

    if (hasAccessories) {
        options.accessoriesColor = [
            ACCESSORIES_COLORS[c.accessoriesColor] ?? ACCESSORIES_COLORS.black,
        ]
    }

    try {
        return new Avatar(style, options as any).toDataUri()
    } catch (e) {
        console.error('[renderAvatarSvgUri] Error:', e)
        console.error('[renderAvatarSvgUri] Options:', options)
        throw e
    }
}