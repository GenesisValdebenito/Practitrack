import { Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'

const sections = [
    {
        title: '1. Aceptación de los términos',
        body: 'Al crear una cuenta o utilizar PractiTrack aceptas estos Términos y Condiciones. Si no estás de acuerdo, no debes usar el servicio.',
    },
    {
        title: '2. Descripción del servicio',
        body: 'PractiTrack es una herramienta de organización académica y profesional que permite registrar horas de práctica, planificar tareas, organizar horarios y visualizar el progreso. La aplicación no reemplaza los registros oficiales de tu institución.',
    },
    {
        title: '3. Cuenta y seguridad',
        body: 'Eres responsable de mantener la confidencialidad de tu contraseña y de la actividad realizada desde tu cuenta. Debes notificarnos cualquier uso no autorizado. La sesión se cierra automáticamente después de 90 minutos de uso continuo por motivos de seguridad.',
    },
    {
        title: '4. Uso aceptable',
        body: 'No está permitido usar PractiTrack para actividades ilícitas, intentar acceder a cuentas ajenas, interferir con el funcionamiento del servicio ni cargar contenido que vulnere derechos de terceros.',
    },
    {
        title: '5. Datos personales',
        body: 'Los datos que registras (cuenta, prácticas, horas, tareas y horarios) se almacenan en Supabase y se utilizan únicamente para prestar el servicio. Puedes solicitar la actualización o eliminación de tus datos contactando al equipo de PractiTrack.',
    },
    {
        title: '6. Registros de horas',
        body: 'Las horas mostradas en PractiTrack corresponden a la información que tú registras. La aplicación no certifica ni valida oficialmente las horas ante instituciones educativas o empleadores.',
    },
    {
        title: '7. Propiedad intelectual',
        body: 'El nombre, el diseño, el código y los elementos visuales de PractiTrack pertenecen a sus autores. No se concede licencia para copiar, modificar o redistribuir la aplicación sin autorización.',
    },
    {
        title: '8. Limitación de responsabilidad',
        body: 'PractiTrack se ofrece "tal cual". No garantizamos disponibilidad ininterrumpida ni ausencia de errores. No somos responsables de pérdidas derivadas del uso o de la imposibilidad de uso del servicio.',
    },
    {
        title: '9. Cambios en los términos',
        body: 'Podemos actualizar estos términos para reflejar cambios en el servicio o en la normativa aplicable. La versión vigente estará siempre disponible en esta página.',
    },
    {
        title: '10. Contacto',
        body: 'Para consultas sobre estos términos o sobre tus datos personales, escríbenos a través de los canales de contacto indicados en la aplicación.',
    },
]

export default function Terminos() {
    return (
        <AuthLayout
            wide
            footer={
                <span>
                    PractiTrack ·{' '}
                    <Link to="/login" className="underline hover:text-white">
                        Volver a iniciar sesión
                    </Link>
                </span>
            }
        >
            <div className="mb-7">
                <p className="mb-2 text-sm font-semibold text-brand-600">
                    INFORMACIÓN LEGAL
                </p>
                <h1 className="text-xl font-bold text-[#101F3A]">
                    Términos y Condiciones
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                    Última actualización: noviembre de 2026.
                </p>
            </div>

            <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-2">
                {sections.map(section => (
                    <section key={section.title}>
                        <h2 className="text-sm font-semibold text-[#101F3A]">
                            {section.title}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                            {section.body}
                        </p>
                    </section>
                ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
                <Link
                    to="/registro"
                    className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                    Volver al registro
                </Link>
                <Link
                    to="/login"
                    className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                    Iniciar sesión
                </Link>
            </div>
        </AuthLayout>
    )
}
