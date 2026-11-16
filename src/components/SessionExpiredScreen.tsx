import AuthLayout from './AuthLayout'

type Props = {
    email: string
    onEnter: () => void
    onChangeEmail: () => void
    onClose: () => void
}

export default function SessionExpiredScreen({
    email,
    onEnter,
    onChangeEmail,
    onClose,
}: Props) {
    return (
        <AuthLayout footer="PractiTrack · Seguridad de la sesión">
            <div className="text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                    <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" />
                    </svg>
                </div>

                <h1 className="text-xl font-bold text-[#101F3A]">
                    Volver a ingresar a PractiTrack
                </h1>

                <p className="mt-2 text-[13px] leading-5 text-slate-500">
                    Por seguridad, cerramos tu sesión después de 90 minutos de
                    uso continuo.
                </p>
            </div>

            {email ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Último correo usado
                    </p>
                    <p className="mt-1 truncate text-sm font-medium text-[#101F3A]">
                        {email}
                    </p>
                </div>
            ) : null}

            <div className="mt-5 space-y-2.5">
                <button
                    type="button"
                    onClick={onEnter}
                    className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                    {email ? 'Entrar con este correo' : 'Iniciar sesión'}
                </button>

                <button
                    type="button"
                    onClick={onChangeEmail}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                    Cambiar de correo
                </button>

                <button
                    type="button"
                    onClick={onClose}
                    className="w-full rounded-xl py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
                >
                    Cerrar sesión
                </button>
            </div>
        </AuthLayout>
    )
}
