
import { Link } from 'react-router-dom'

const features = [
    {
        number: '01',
        title: 'Registra tus horas',
        description: 'Lleva un registro de tus jornadas, actividades y horas acumuladas.',
    },
    {
        number: '02',
        title: 'Organiza tu horario',
        description: 'Visualiza tus jornadas y planifica tu tiempo de práctica.',
    },
    {
        number: '03',
        title: 'Planifica tus tareas',
        description: 'Ordena tus pendientes, fechas importantes y actividades.',
    },
    {
        number: '04',
        title: 'Mide tu progreso',
        description: 'Consulta tus avances y cuánto te falta para completar tus horas.',
    },
]

export default function Landing() {
    return (
        <main className="min-h-screen bg-white text-slate-800">
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <img
                            src="/icon-practitrack.png"
                            alt=""
                            className="w-10 h-10 object-contain"
                        />
                        <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#101F3A]">
                            PractiTrack
                        </span>
                    </Link>

                    <nav className="flex items-center gap-3 sm:gap-6">
                        <a href="#funciones" className="hidden sm:inline text-sm font-medium text-slate-600 hover:text-blue-600">
                            Funciones
                        </a>
                        <a href="#como-funciona" className="hidden sm:inline text-sm font-medium text-slate-600 hover:text-blue-600">
                            Cómo funciona
                        </a>
                        <Link to="/login" className="text-sm font-semibold text-[#101F3A] hover:text-blue-600">
                            Iniciar sesión
                        </Link>
                        <Link
                            to="/registro"
                            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-5 py-2.5 text-sm font-semibold transition"
                        >
                            Crear cuenta
                        </Link>
                    </nav>
                </div>
            </header>

            <section className="relative overflow-hidden bg-[#101F3A]">
                <div className="absolute inset-0">
                    <img
                        src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=2000&q=85"
                        alt="Estudiantes y profesionales trabajando en equipo"
                        className="w-full h-full object-cover opacity-20"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#101F3A] via-[#101F3A]/95 to-[#101F3A]/65" />
                </div>

                <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-24 sm:py-32 lg:py-36">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 border border-white/20 bg-white/10 rounded-full px-4 py-2 text-xs sm:text-sm text-blue-100 mb-7">
                            <span className="w-2 h-2 rounded-full bg-orange-400" />
                            Tu práctica profesional, bajo control
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-white">
                            Tu práctica merece
                            <span className="block text-blue-400">una mejor organización.</span>
                        </h1>

                        <p className="mt-7 text-base sm:text-lg leading-8 text-slate-300 max-w-2xl">
                            Registra tus horas, organiza tus jornadas y visualiza tu progreso en un solo lugar. Concéntrate en aprender y deja que PractiTrack te ayude con la organización.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 mt-9">
                            <Link
                                to="/registro"
                                className="inline-flex justify-center items-center rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold px-7 py-4 transition"
                            >
                                Comenzar gratis
                                <span className="ml-3" aria-hidden="true">→</span>
                            </Link>
                            <a
                                href="#funciones"
                                className="inline-flex justify-center items-center rounded-xl border border-white/30 hover:bg-white/10 text-white font-semibold px-7 py-4 transition"
                            >
                                Conocer la plataforma
                            </a>
                        </div>

                        <p className="mt-5 text-xs text-slate-400">
                            Diseñado para acompañarte durante tu práctica profesional.
                        </p>
                    </div>
                </div>
            </section>

            <section className="py-20 sm:py-24 px-5 sm:px-8">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    <div>
                        <p className="text-sm font-bold tracking-widest text-blue-600 uppercase">
                            El desafío de la práctica
                        </p>
                        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#101F3A] mt-4">
                            Menos tiempo organizando. Más tiempo aprendiendo.
                        </h2>
                        <p className="mt-5 text-slate-600 leading-7">
                            Durante la práctica profesional hay que cumplir horas, registrar actividades, coordinar horarios y recordar fechas. Cuando la información está repartida entre papeles, planillas y mensajes, llevar el control se vuelve más difícil.
                        </p>
                        <p className="mt-4 text-slate-600 leading-7">
                            PractiTrack reúne estas tareas en un espacio digital para que puedas consultar tu información y seguir tu avance con mayor claridad.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6">
                            <div className="text-orange-500 text-sm font-bold mb-4">MÉTODO TRADICIONAL</div>
                            <h3 className="text-lg font-bold text-[#101F3A]">Información dispersa</h3>
                            <ul className="mt-4 space-y-3 text-sm text-slate-600">
                                <li>• Planillas separadas</li>
                                <li>• Cálculos manuales</li>
                                <li>• Registros difíciles de actualizar</li>
                                <li>• Seguimiento poco visual</li>
                            </ul>
                        </div>
                        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-6">
                            <div className="text-blue-600 text-sm font-bold mb-4">CON PRACTITRACK</div>
                            <h3 className="text-lg font-bold text-[#101F3A]">Todo en un solo lugar</h3>
                            <ul className="mt-4 space-y-3 text-sm text-slate-700">
                                <li>• Registro centralizado</li>
                                <li>• Progreso de horas visible</li>
                                <li>• Horarios organizados</li>
                                <li>• Tareas y datos conectados</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            <section id="funciones" className="bg-slate-50 py-20 sm:py-24 px-5 sm:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="max-w-2xl mx-auto text-center">
                        <p className="text-sm font-bold tracking-widest text-blue-600 uppercase">
                            Herramientas para tu día a día
                        </p>
                        <h2 className="text-3xl sm:text-4xl font-bold text-[#101F3A] mt-4">
                            Todo lo que necesitas para organizar tu práctica
                        </h2>
                        <p className="text-slate-600 mt-4 leading-7">
                            Funciones pensadas para acompañarte desde tu primera jornada hasta el cumplimiento de tus horas.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
                        {features.map((feature) => (
                            <article
                                key={feature.number}
                                className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition"
                            >
                                <span className="text-sm font-bold text-orange-500">
                                    {feature.number}
                                </span>
                                <h3 className="text-lg font-bold text-[#101F3A] mt-5">
                                    {feature.title}
                                </h3>
                                <p className="text-sm text-slate-600 leading-6 mt-3">
                                    {feature.description}
                                </p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="como-funciona" className="py-20 sm:py-24 px-5 sm:px-8">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
                    <div className="rounded-3xl overflow-hidden min-h-[320px] bg-slate-100">
                        <img
                            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=85"
                            alt="Estudiantes trabajando en sus proyectos académicos"
                            className="w-full h-full min-h-[320px] object-cover"
                        />
                    </div>

                    <div>
                        <p className="text-sm font-bold tracking-widest text-blue-600 uppercase">
                            Simple para comenzar
                        </p>
                        <h2 className="text-3xl sm:text-4xl font-bold text-[#101F3A] mt-4">
                            Empieza en pocos pasos
                        </h2>

                        <div className="space-y-6 mt-8">
                            {[
                                ['Crea tu cuenta', 'Regístrate con tus datos básicos.'],
                                ['Configura tu práctica', 'Indica tu institución, carrera y horas requeridas.'],
                                ['Organiza tu experiencia', 'Registra jornadas, tareas y actividades.'],
                                ['Sigue tu progreso', 'Consulta cuánto has avanzado y cuánto te falta.'],
                            ].map(([title, description], index) => (
                                <div key={title} className="flex gap-4">
                                    <div className="w-9 h-9 shrink-0 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[#101F3A]">{title}</h3>
                                        <p className="text-sm text-slate-600 mt-1">{description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-[#101F3A] px-5 sm:px-8 py-20">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white">
                        Tu siguiente etapa comienza aquí.
                    </h2>
                    <p className="text-slate-300 mt-4 leading-7">
                        Organiza tu práctica profesional con una herramienta creada para acompañar tu proceso.
                    </p>
                    <Link
                        to="/registro"
                        className="inline-flex mt-8 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 transition"
                    >
                        Crear mi cuenta gratis
                    </Link>
                </div>
            </section>

            <footer className="bg-white border-t border-slate-200 px-5 sm:px-8 py-10">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
                    <div className="flex items-center gap-3">
                        <img src="/icon-practitrack.png" alt="" className="w-9 h-9 object-contain" />
                        <div>
                            <p className="font-bold text-[#101F3A]">PractiTrack</p>
                            <p className="text-xs text-slate-500">Tu práctica, más organizada.</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-5 text-sm text-slate-500">
                        <Link to="/login" className="hover:text-blue-600">Iniciar sesión</Link>
                        <Link to="/registro" className="hover:text-blue-600">Crear cuenta</Link>
                        <a href="mailto:contacto@practitrack.cl" className="hover:text-blue-600">
                            Contacto
                        </a>
                    </div>
                    <p className="text-xs text-slate-400">
                        © {new Date().getFullYear()} PractiTrack
                    </p>
                </div>
            </footer>
        </main>
    )
}
