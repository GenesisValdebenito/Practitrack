import { useOutletContext } from 'react-router-dom'
import AppearancePanel from '../components/AppearancePanel'

export default function ConfigPage() {
    useOutletContext()
    
    return (
        <div className="animate-fade-in text-[var(--text-primary)] pb-12">
            <h1 className="text-2xl font-semibold mb-8 pl-1">Configuración del Sistema</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-6">
                    {/* Preferencias Regionales */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-lg p-5">
                        <h2 className="text-sm font-semibold mb-5 text-[var(--text-secondary)] uppercase tracking-wider">Preferencias Generales</h2>
                        
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <p className="font-medium text-sm">Formato de Fecha</p>
                                <select className="bg-[var(--bg-app)] border border-[var(--border-strong)] text-sm rounded px-3 py-1.5 focus:outline-none">
                                    <option>DD/MM/YYYY</option>
                                    <option>MM/DD/YYYY</option>
                                </select>
                            </div>

                            <div className="flex justify-between items-center">
                                <p className="font-medium text-sm">Formato de Hora</p>
                                <select className="bg-[var(--bg-app)] border border-[var(--border-strong)] text-sm rounded px-3 py-1.5 focus:outline-none">
                                    <option>12 Horas</option>
                                    <option>24 Horas</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Notificaciones */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-lg p-5">
                        <h2 className="text-sm font-semibold mb-5 text-[var(--text-secondary)] uppercase tracking-wider">Notificaciones</h2>
                        
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-sm">Recordatorios de reuniones</p>
                                    <p className="text-xs text-[var(--text-muted)]">Aviso 15 min antes.</p>
                                </div>
                                <div className="w-10 h-5 bg-brand-600 rounded-full relative cursor-pointer">
                                    <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-sm">Notificaciones de Tareas</p>
                                    <p className="text-xs text-[var(--text-muted)]">Recordatorio 1 hora antes.</p>
                                </div>
                                <div className="w-10 h-5 bg-brand-600 rounded-full relative cursor-pointer">
                                    <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Apariencia Global */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-lg p-5">
                        <h2 className="text-sm font-semibold mb-5 text-[var(--text-secondary)] uppercase tracking-wider">Apariencia</h2>
                        <AppearancePanel />
                    </div>
                </div>
            </div>
        </div>
    )
}
