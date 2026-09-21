# ⏱️ PractiTrack

Plataforma web multiusuario para planificar, registrar y validar las horas de **práctica profesional** de estudiantes de educación superior.

> Proyecto desarrollado como parte de mi práctica profesional (360 horas).

**Demo:** [pendiente de despliegue] · **Autor:** Génesis Valdebenito

<!-- Agrega capturas en docs/ y enlázalas aquí -->
<!-- ![Dashboard](docs/dashboard.png) -->

## ¿Qué problema resuelve?

Los estudiantes deben acreditar cientos de horas de práctica y suelen llevar el control en planillas sueltas. PractiTrack centraliza el registro diario, muestra el avance hacia la meta y genera el informe para la institución.

## Funcionalidades

- **Autenticación** con Google o correo y contraseña (Supabase Auth).
- **Onboarding** guiado para usuarios nuevos, que se muestra una sola vez.
- **Dashboard** con porcentaje de avance, horas restantes, gráfico semanal y fecha estimada de término.
- **Horario semanal interactivo**: bloques por día, presencial o remoto.
- **Tareas** en tablero Por hacer / En curso / Hecho.
- **Bitácora** de horas trabajadas por día y categoría.
- **Importación** desde CSV/Excel con vista previa, validación y detección de duplicados.
- **Exportación** del informe a Excel y PDF.
- **Perfil** con datos de la práctica y la cuenta vinculada.
- **Datos aislados por usuario** mediante Row Level Security.

## Stack

| Área | Tecnología |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Estilos | Tailwind CSS |
| Rutas | React Router |
| Gráficos | Recharts |
| Backend | Supabase (PostgreSQL, Auth, RLS) |
| Archivos | PapaParse, SheetJS, jsPDF |
| Despliegue | Vercel |

## Requisitos

- Node.js 20 o superior
- Una cuenta gratuita en [Supabase](https://supabase.com)

## Instalación

```bash
git clone (https://github.com/GenesisValdebenito/Practitrack.git)
cd practitrack
npm install
```

### 1. Configurar Supabase

1. Crea un proyecto en Supabase.
2. En **SQL Editor**, ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql).
3. Copia `.env.example` como `.env.local` y completa la URL y la *anon key* (en *Project Settings > API*).
4. En **Authentication > Sign In / Providers**, activa **Email**. Puedes desactivar *Confirm email* solo en desarrollo.

### 2. Login con Google (opcional)

1. En Google Cloud Console crea un *ID de cliente de OAuth* de tipo Aplicación web.
2. Agrega como URI de redirección la *Callback URL* que muestra Supabase en el proveedor Google.
3. Pega el Client ID y el Client Secret en Supabase y activa el proveedor.
4. En **Authentication > URL Configuration** agrega `http://localhost:5173`.

### 3. Ejecutar

```bash
npm run dev
```

La app queda en `http://localhost:5173`.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run preview` | Vista previa de la compilación |
| `npm run lint` | Análisis estático |

## Estructura

```
src/
├── components/   Layout, LogForm, LogList
├── hooks/        useProfile
├── lib/          supabase, utils, importLogs, exportLogs
└── pages/        Login, Onboarding, Dashboard, Schedule, Tasks, Logs, Data, ProfilePage
supabase/
└── schema.sql    Tablas, políticas RLS y trigger
```

## Formato de importación

Archivo `.csv` o `.xlsx` con estas columnas (hay una plantilla descargable en la app):

| fecha | horas | descripcion | categoria | presencial |
|---|---|---|---|---|
| 2026-09-21 | 6.5 | Diseño de tablas | Base de datos | no |

Las fechas aceptan `AAAA-MM-DD` y `DD/MM/AAAA`.

## Seguridad

- Todas las tablas tienen RLS: cada usuario solo lee y modifica sus propios datos.
- El cliente usa únicamente la *anon key*; nunca se expone la `service_role`.
- `.env.local` está excluido del repositorio.

## Despliegue

1. Importa el repositorio en [Vercel](https://vercel.com) y agrega las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
2. `vercel.json` ya incluye la regla necesaria para las rutas de la SPA.
3. Agrega la URL pública en Supabase (**URL Configuration**) y en Google Cloud (orígenes autorizados) para que el login funcione en producción.

## Roadmap

- [x] Modo oscuro
- [ ] Filtros por rango de fechas en el informe
- [ ] Adjuntar evidencias (Supabase Storage)
- [ ] Recordatorios por correo
- [ ] Pruebas automatizadas

## Licencia

MIT
