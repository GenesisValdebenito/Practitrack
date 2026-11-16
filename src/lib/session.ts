export const LAST_EMAIL_KEY = 'practitrack:last-email'
export const SESSION_START_KEY = 'practitrack:session-started-at'
export const SESSION_MAX_MS = 90 * 60 * 1000

export function getLastEmail(): string {
    try {
        return localStorage.getItem(LAST_EMAIL_KEY) ?? ''
    } catch {
        return ''
    }
}

export function setLastEmail(email: string) {
    try {
        if (email.trim()) {
            localStorage.setItem(LAST_EMAIL_KEY, email.trim())
        }
    } catch {
        // localStorage puede no estar disponible (modo privado, etc.)
    }
}

export function clearLastEmail() {
    try {
        localStorage.removeItem(LAST_EMAIL_KEY)
    } catch {
        // ignorar
    }
}

export function clearSessionStart() {
    try {
        localStorage.removeItem(SESSION_START_KEY)
    } catch {
        // ignorar
    }
}
