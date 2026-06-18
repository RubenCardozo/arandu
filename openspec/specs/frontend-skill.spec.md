# Rol: Especialista en Frontend (`frontend-skill.spec.md`)

Este documento detalla las interfaces de Angular para el sitio público y la plataforma independiente de administración, incluyendo las reglas de validación de usuarios y el sistema de diseño visual.

---

## 🎨 Identidad Visual y Tipografía Moderna (The Pudding Modernized)
Para mantener una estética editorial limpia, de alto impacto y moderna inspirada en "The Pudding", utilizaremos las siguientes directrices tipográficas y de diseño:

*   **Tipografía de Cabeceras (Títulos de Secciones, Deporte, Cultura):** **Cabinet Grotesk** o **Clash Display**. Fuentes sans-serif de estilo editorial, con un diseño geométrico, moderno y con mucho carácter.
*   **Tipografía de Texto y Datos (Lectura y Formularios):** **Inter** o **Plus Jakarta Sans**. Fuentes de alta legibilidad en pantallas pequeñas, ideales para tablas de datos y clasificados.
*   **Fondo:** Tono crema suave de papel (`#fbfaf7`).
*   **Contornos:** Bordes muy finos de color negro carbón (`1px solid #1a1a1a`) para delimitar las cajas ("boxes").
*   **Acentos de Color:** Verde salvia apagado (`#4b6b55`), rojo arcilla (`#b24c4c`) y azul tinta (`#2b4c7e`).

---

## 🅰️ Aplicación 1: Sitio Público (`frontend-public`)
Una Single Page Application (SPA) para los visitantes en Ginebra:
*   **Inicio:** Resumen visual de restaurantes recomendados, próximos eventos y podcasts en cuadrícula de cajas asimétricas.
*   **Directorio:** Listado dinámico con filtros por barrio de Ginebra y categorías.
*   **Agenda:** Calendario o lista de eventos.
*   **Multimedia:** Reproductores embebidos de YouTube y Spotify.
*   **Formulario de Inscripción / Pre-registro:**
    *   **Campos V1:** Nombre, Email, Teléfono Móvil, Contraseña.
    *   **Flujo V1 (Email):** Al enviar, se invoca a Supabase Auth y se envía el correo de confirmación.
    *   **Flujo V2 (SMS):** Validación del código de 6 dígitos enviado por SMS.

---

## 🅰️ Aplicación 2: Plataforma de Administración (`frontend-admin`)
Una aplicación completamente **independiente** (ej. ejecutada en `admin.ginebralatina.ch`) pero conectada al backend de NestJS y base de datos Supabase común. **Toda la interfaz estará en español.**

### 1. Panel de Control & Estadísticas (Dashboard en Español)
*   Visualización de tráfico total (vistas y clics en banners publicitarios).
*   Listado de clientes registrados ("inscriptos" y "clientes").
*   Gráficas de rendimiento de la publicidad por anunciante.

### 2. Gestor de Contenidos (CRUD en Español)
*   **Crear y Editar Notas / Artículos:** Editor de texto simple para redactar artículos culturales o noticias de deportes.
*   **Cargar Imágenes:** Subida de fotos de platos de restaurantes, logos o portadas directamente a Supabase Storage.
*   **Enlaces de YouTube:** Campos de entrada de URL de videos o podcasts de YouTube para procesar la reproducción embebida en la web pública.

### 3. Registro de Actividad (Log de Auditoría en Español)
*   Listado cronológico de las acciones del administrador (ej. *"Artículo 'Día Nacional de Colombia' creado el 12/06/2026"*).

---

## 📐 Reglas de Desarrollo en Angular
*   Ningún archivo `.component.ts` de componente debe superar las **150 líneas de código**.
*   Los formularios deben utilizar **Reactive Forms** de Angular para validar formatos en tiempo real.
*   Toda petición HTTP debe delegarse a un `Service` especializado de Angular.
