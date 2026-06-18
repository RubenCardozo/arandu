# Rol: Especialista en Arquitectura (`architecture-skill.spec.md`)

Esta especificación describe la arquitectura general del sistema "Ginebra Latina" versión 1.0 utilizando NestJS y la plataforma unificada Supabase.

---

## 🛠️ Stack de Tecnologías Unificado

| Componente | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Frontend Público** | Angular (TypeScript) | Aplicación web para el público en general |
| **Frontend Administrador** | Angular (TypeScript) | Panel de control privado del administrador |
| **Estilos** | Tailwind CSS v4 | Estilos visuales consistentes y rápidos |
| **Backend** | NestJS (Node.js + TS) | API REST principal modular |
| **Base de Datos** | PostgreSQL (Supabase) | Base de datos relacional robusta |
| **ORM / Migraciones** | Drizzle ORM | Mapeo y consultas tipo-seguras en base de datos |
| **Autenticación** | Supabase Auth | Gestión de usuarios, sesiones y roles |
| **Almacenamiento** | Supabase Storage | Guardar fotos de restaurantes, banners y anuncios |

---

## 🔒 Flujos de Inscripción y Verificación (V1 & V2)

Aprovechando las capacidades nativas de **Supabase Auth**, implementaremos los flujos de seguridad por fases sin complicar la arquitectura:

### 📧 Fase V1: Registro con Confirmación por Email (Obligatorio en V1)
1.  El usuario rellena el formulario de inscripción en Angular ingresando Nombre, Email, Teléfono y Contraseña.
2.  Angular llama a `supabase.auth.signUp()`.
3.  Supabase bloquea la cuenta temporalmente (estado pendiente) y **envía automáticamente un correo electrónico con un enlace de verificación** al usuario.
4.  El usuario hace clic en el enlace, lo que confirma su correo y activa su sesión.
5.  El backend de NestJS solo permite el acceso a rutas de usuarios si el campo `email_confirmed_at` en la sesión de Supabase no es nulo.

### 📱 Fase V2: Validación de Teléfono Móvil por SMS (En V2)
1.  Una vez verificado el email, se inicia el proceso de verificación telefónica.
2.  NestJS o Angular solicita a Supabase Auth enviar un código de verificación por SMS (`supabase.auth.signInWithOtp()` o actualización de factor de teléfono).
3.  Supabase (integrado con un proveedor como Twilio, MessageBird o Vonage) envía un SMS al móvil del usuario con un código OTP de 6 dígitos.
4.  El usuario ingresa el código OTP en la aplicación Angular.
5.  Supabase valida el código y marca el teléfono como verificado.
