# Rol: Especialista en Backend (`backend-skill.spec.md`)

Este documento detalla las reglas de juego para la construcción de la API REST utilizando **NestJS** (TypeScript).

---

## 🏛️ Arquitectura Modular en NestJS

NestJS está organizado en módulos independientes que contienen controladores y proveedores (servicios):

```text
src/
├── app.module.ts            # Módulo raíz que une todo
├── db/                      # Módulo y conexión de base de datos (Drizzle ORM)
│   ├── db.module.ts
│   └── index.ts
├── common/                  # Guards, interceptores y middlewares compartidos
│   └── auth.guard.ts        # Guard de validación JWT de Supabase
└── modules/                 # Sub-módulos de negocio
    ├── restaurants/
    │   ├── restaurants.module.ts
    │   ├── restaurants.controller.ts
    │   └── restaurants.service.ts
    ├── events/
    └── redirect/
```

---

## 📐 Reglas de Juego para NestJS

### 1. Controladores (`*.controller.ts`)
*   Se encargan exclusivamente de la comunicación HTTP. 
*   **Prohibido:** Hacer consultas a base de datos o lógica de negocio. Esto debe hacerse invocando métodos del servicio inyectado.
*   **Decoradores:** Usar `@Controller('restaurants')`, `@Get()`, `@Post()`, `@UseGuards()`, etc.
*   **Tamaño:** Máximo **150 líneas** por archivo.

### 2. Servicios (`*.service.ts`)
*   Responsables de la lógica y la manipulación de base de datos usando Drizzle ORM.
*   Decorados con `@Injectable()`.
*   **Tamaño:** Máximo **150 líneas** por archivo.

### 3. DTOs (Data Transfer Objects)
*   Utilizar `class-validator` y `class-transformer` para validar automáticamente las peticiones entrantes.
*   Ej: `CreateRestaurantDto` asegura que `name` y `address` existan y sean strings válidos antes de entrar al servicio.

---

## 🔒 Autenticación y Autorización (Supabase Guard)

*   Crearemos un `AuthGuard` de NestJS que interceptará las peticiones HTTP seguras.
*   El Guard extraerá el token JWT de la cabecera `Authorization: Bearer <Token>`.
*   Se decodificará y validará utilizando la clave secreta de JWT de Supabase o verificando la firma con el endpoint de Supabase Auth.
*   El usuario decodificado (con su `UID`) se inyectará en la request para ser consumido en los controladores mediante un decorador personalizado `@CurrentUser()`.
