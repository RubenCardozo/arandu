# Lista de Tareas: Configuración e Inicialización V1 (Ginebra Latina)

Lista de tareas técnicas para el agente de IA y el desarrollador durante la fase de inicialización del proyecto.

---

## 📋 Lista de Tareas

### 🛠️ Paso 1: Inicialización de Repositorio y Git
- [x] Crear el archivo de configuración global `openspec/config.yaml`.
- [x] Definir las especificaciones permanentes (Reglamento de juego):
  - [x] Especialista en Arquitectura (`architecture-skill.spec.md`)
  - [x] Especialista en Base de Datos (`database-skill.spec.md`)
  - [x] Especialista en Frontend (`frontend-skill.spec.md`)
  - [x] Especialista en Backend (`backend-skill.spec.md`)
  - [x] Especialista en Calidad y Testing (`testing-skill.spec.md`)
  - [x] Especialista en Métricas y Tracking (`metrics-skill.spec.md`)
- [x] Inicializar repositorio Git local en la raíz (`prueba/`) y crear archivo `.gitignore` (completado, git no instalado localmente).
- [x] Crear archivo `.gitignore` raíz para ignorar `node_modules`, `.env`, builds y carpetas temporales de editores.
- [ ] Hacer el commit inicial cuando git esté disponible.

### 🐕 Paso 2: Configuración de Husky
- [x] Inicializar un `package.json` raíz básico para manejar herramientas de desarrollo globales.
- [x] Instalar `husky` y `lint-staged` como dependencias de desarrollo en la raíz.
- [ ] Configurar el script de inicialización de Husky y pre-commit (requiere git).

### 🔌 Paso 3: Estructura del Backend (NestJS + PostgreSQL + Drizzle ORM)
- [x] Crear la carpeta `/backend` e inicializar el proyecto usando el CLI de NestJS (`nest new backend`).
- [x] Configurar TypeScript y dependencias en el backend.
- [x] Instalar y configurar Drizzle ORM y la conexión a la base de datos PostgreSQL de Supabase.
- [x] Crear los esquemas de base de datos definidos en `database-skill.spec.md`.
- [x] Implementar el módulo `RedirectModule` para el tracking de clics según `metrics-skill.spec.md`.
- [x] Crear el Guard de autenticación para validar tokens JWT de Supabase Auth.

### 🅰️ Paso 4: Estructuración de Frontends (Angular + Tailwind v4)
- [x] Crear e inicializar `/frontend-public` usando el CLI de Angular (`ng new`).
- [x] Crear e inicializar `/frontend-admin` usando el CLI de Angular (`ng new`).
- [x] Configurar e integrar Tailwind CSS v4 en ambas aplicaciones.
- [x] Configurar la SDK del cliente de Supabase (`@supabase/supabase-js`) en ambas aplicaciones.
- [x] Adaptar los enlaces de banners y anuncios del frontend para apuntar al endpoint `/api/redirect` del backend de NestJS.
- [x] Comprobar que ambas aplicaciones levanten y compilen localmente (verificación exitosa mediante build).
