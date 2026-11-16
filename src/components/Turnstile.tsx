import { useEffect, useRef } from 'react'

const SCRIPT_ID = 'cf-turnstile-script'

/**
 * Clave de sitio de Cloudflare Turnstile.
 * Configura `VITE_TURNSTILE_SITE_KEY` en `.env.local`.
 * Si no se configura, se usa la clave de prueba oficial de Cloudflare
 * (siempre valida) para poder trabajar en desarrollo.
 */
const SITE_KEY =
    (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ||
    '1x00000000000000000000AA'

type TurnstileOptions = {
    sitekey: string
    theme?: 'light' | 'dark' | 'auto'
    callback?: (token: string) => void
    'expired-callback'?: () => void
    'error-callback'?: () => void
}

type TurnstileApi = {
    render: (container: HTMLElement, options: TurnstileOptions) => string
    remove: (widgetId: string) => void
}

declare global {
    interface Window {
        turnstile?: TurnstileApi
    }
}

type Props = {
    onToken: (token: string | null) => void
    theme?: 'light' | 'dark' | 'auto'
}

export default function Turnstile({ onToken, theme = 'light' }: Props) {
    const containerRef = useRef<HTMLDivElement>(null)
    const widgetIdRef = useRef<string | null>(null)
    const callbackRef = useRef(onToken)

    // Mantener la referencia actualizada sin leerla durante el render.
    useEffect(() => {
        callbackRef.current = onToken
    }, [onToken])

    useEffect(() => {
        let cancelled = false

        const renderWidget = () => {
            if (
                cancelled ||
                !containerRef.current ||
                !window.turnstile ||
                widgetIdRef.current
            ) {
                return
            }

            widgetIdRef.current = window.turnstile.render(
                containerRef.current,
                {
                    sitekey: SITE_KEY,
                    theme,
                    callback: token => callbackRef.current(token),
                    'expired-callback': () => callbackRef.current(null),
                    'error-callback': () => callbackRef.current(null),
                },
            )
        }

        if (window.turnstile) {
            renderWidget()

            return () => {
                cancelled = true

                if (widgetIdRef.current && window.turnstile) {
                    window.turnstile.remove(widgetIdRef.current)
                    widgetIdRef.current = null
                }
            }
        }

        let script = document.getElementById(
            SCRIPT_ID,
        ) as HTMLScriptElement | null

        if (!script) {
            script = document.createElement('script')
            script.id = SCRIPT_ID
            script.src =
                'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
            script.async = true
            script.defer = true
            document.head.appendChild(script)
        }

        const handleLoad = () => renderWidget()
        script.addEventListener('load', handleLoad)

        return () => {
            cancelled = true
            script?.removeEventListener('load', handleLoad)

            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.remove(widgetIdRef.current)
                widgetIdRef.current = null
            }
        }
    }, [theme])

    return <div ref={containerRef} className="flex justify-center" />
}
