import { useOutletContext } from 'react-router-dom'
import type { Profile } from '../lib/utils'

export const useProfile = () =>
    useOutletContext<{ profile: Profile; refresh: () => void }>()