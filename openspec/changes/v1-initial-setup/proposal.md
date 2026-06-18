# Propuesta de Cambio: Configuración e Inicialización V1 (Ginebra Latina)

*   **ID de Cambio:** `change-001-setup`
*   **Título:** Configuración Inicial de Repositorio, Backend MVC, Frontends de Angular y Git Hooks (Husky)
*   **Estado:** En Propuesta
*   **Autor:** Antigravity AI & Rubén

---

## 🎯 Motivación

Establecer una base sólida, limpia y estructurada para el desarrollo de la plataforma web "Ginebra Latina". Queremos asegurarnos de que:
1.  **El código sea modular y limpio:** Separando responsabilidades en backend (MVC) y frontend (componentes pequeños de Angular).
2.  **No se rompa nada al confirmar cambios:** Automatizando compilación y tests mediante hooks de Git con **Husky**.
3.  **Haya un contrato claro de datos:** Usando especificaciones de base de datos de MongoDB y la especificación de API con OpenAPI.

---

## 🏁 Metas de esta Fase

*   Inicializar el repositorio local Git y configurar el control de versiones.
*   Crear los proyectos independientes: `/backend` (Express), `/frontend-public` (Angular) y `/frontend-admin` (Angular).
*   Instalar y configurar **Husky** en la raíz del proyecto para ejecutar verificaciones automáticas de TypeScript y linters en el hook de `pre-commit`.
*   Configurar la conexión a MongoDB Atlas mediante Mongoose y comprobar que se inicialice con éxito.
