# OpenSpec System Design Document — Baseline Architecture

Este documento establece la línea base arquitectónica del proyecto **Arandu** para el marco de desarrollo de OpenSpec SDD.

---

## 1. Estructura General del Repositorio

El proyecto se organiza como un monorepositorio con las siguientes áreas principales:

```text
prueba/
├── backend/                  # API REST en NestJS
├── frontend-admin/           # Panel de administración en Angular 21
├── frontend-public/          # Portal público y Portfolio Builder en Angular 21
├── assets/                   # Recursos estáticos globales
├── openspec/                 # Especificaciones del diseño
└── .openspec/                # [NUEVO] Directorio de control OpenSpec SDD
```

---

## 2. Pila Tecnológica & Arquitectura por Componente

### A. Frontend Público (`frontend-public`)
* **Framework**: Angular 21.2.0 (Arquitectura Standalone).
* **Gestión de Estado**: Angular Signals (`signal`, `computed`, `portfolio-state.service.ts`) para el constructor visual (Portfolio Builder).
* **Estilado**: Tailwind CSS v4.3.0, integrado con `@tailwindcss/postcss` y configurado in-CSS mediante directivas `@theme` en `styles.css`.
* **Servicios Externos**: Supabase JS SDK v2.108.1 para autenticación y persistencia de datos.

### B. Frontend Administrador (`frontend-admin`)
* **Framework**: Angular 21.2.0 (Arquitectura Standalone).
* **Estilado**: Tailwind CSS v4.3.0.
* **Servicios**: Supabase SDK para la gestión administrativa.

### C. Servidor Backend (`backend`)
* **Framework**: NestJS (v11.0.1) con TypeScript.
* **ORM & Base de Datos**: Drizzle ORM (v0.45.2) con controlador PostgreSQL (`pg` v8.21.0).
* **Seguridad**: Helmet v8.3.0 y Throttler v6.5.0 para rate-limiting.
* **Integración**: Supabase JS SDK v2.108.1.

---

## 3. Convenciones de Estilado & Configuración Visual
* **Colores de la Marca (Tailwind Theme)**:
  * Papel: `#fbfaf7` (Fondo claro premium)
  * Carbón: `#1a1a1a` (Texto y contrastes principales)
  * Sage: `#4b6b55` (Acentos de botones y foco)
  * Rojo: `#c94a4a` (Alertas y advertencias)
* **Tipografías**:
  * Serif: *EB Garamond* (para títulos y acentos premium)
  * Sans: *Plus Jakarta Sans* / *Inter* (para textos legibles y cuerpo de la app)
* **Modales y Scroll**: Estricto uso de scroll de backdrop nativo en lugar de scrolls internos anidados para evitar doble scroll en dispositivos móviles.

---

## 4. Estado de la Línea Base (Baseline State)
* **Estado actual**: Todo el código de producción compila exitosamente bajo Angular 21 y NestJS. 
* **WYSIWYG Builder**: Refactorizado a un modelo in-place puro con toolbar absoluto flotante sobre elementos editables y presets de fondo en el sidebar izquierdo.
