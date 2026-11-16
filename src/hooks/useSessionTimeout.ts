import { useEffect } from 'react'
import { SESSION_MAX_MS, SESSION_START_KEY } from '../lib/session'

/**
 * Cierra la sesión cuando se cumplen 90 minutos desde que se inició.
 * El inicio se guarda en localStorage para que el límite se mantenga
 * aunque se recargue la página.
 */
export function useSessionTimeout(active: boolean, onExpire: () => void) {
    useEffect(() => {
        if (!active) return

        let startedAt = Number(localStorage.getItem(SESSION_START_KEY))

        if (!startedAt || Number.isNaN(startedAt)) {
            startedAt = Date.now()
            localStorage.setItem(SESSION_START_KEY, String(startedAt))
        }

        const check = () => {
            if (Date.now() - startedAt >= SESSION_MAX_MS) {
                onExpire()
            }
        }

        check()
        const interval = window.setInterval(check, 30_000)

        return () => window.clearInterval(interval)
    }, [active, onExpire])
}
