# Rol: Especialista en Métricas y Tracking (`metrics-skill.spec.md`)

Este documento detalla el sistema de seguimiento de clics para restaurantes, eventos, empleos y banners publicitarios utilizando el backend de NestJS y la base de datos PostgreSQL de Supabase.

---

## 📐 Estrategia Técnica: Redirección y Registro en Base de Datos

Utilizamos el enfoque de redirección a nivel de backend:

1.  **Frontend (Angular):** Los enlaces externos apuntan al backend de NestJS:
    `https://tuservidor.com/api/redirect?id=ID_RECURSO&url=URL_DESTINO&type=TIPO_RECURSO`
2.  **Backend (NestJS - RedirectModule):**
    *   Un controlador procesa la petición de tipo `GET`.
    *   Incrementa de forma asíncrona la columna `clicks` en la tabla correspondiente (ej. `restaurants`, `events`, `jobs` o `services`).
    *   Realiza un redireccionamiento HTTP 302 hacia la `url` final.

---

## 🗄️ Implementación de Consultas de Métricas con Drizzle ORM

En el `RedirectService` de NestJS ejecutamos el incremento atómico de clics:

```typescript
import { Injectable } from '@nestjs/common';
import { db } from '../../db';
import { restaurants, events, jobs, services } from '../../db/schema';
import { eq, sql } from 'drizzle-orm';

@Injectable()
export class RedirectService {
  async registerClick(id: string, type: string) {
    let table;
    switch(type) {
      case 'restaurant': table = restaurants; break;
      case 'event':      table = events; break;
      case 'job':        table = jobs; break;
      case 'service':    table = services; break;
      default: return;
    }
    
    // Incrementar en 1 el contador de clics en la base de datos
    await db.update(table)
      .set({ clicks: sql`${table.clicks} + 1` })
      .where(eq(table.id, id));
  }
}
```

---

## 🅰️ Modificación en el Frontend de Angular

Los componentes de Angular que renderizan enlaces de salida externa deben utilizar el interceptor de clics:

```html
<!-- Ejemplo para restaurante -->
<a [href]="'/api/redirect?id=' + restaurant.id + '&type=restaurant&url=' + encode(restaurant.website)" target="_blank">
  Visitar Sitio Web
</a>
```
