# TrainerOS

App gratuita para entrenadores personales: gestionan clientes y rutinas, y cada alumno entrena y registra su progreso desde el celular.

## Cómo funciona el acceso

- **Entrenador:** se registra con correo y contraseña en `/login`. Recibe un link propio (`/t/su-nombre`).
- **Alumno:** el entrenador lo carga con su correo y le pasa el link. El alumno ingresa ese correo y recibe un link de acceso, sin contraseña. Si el correo no fue cargado por ese entrenador, no entra.

Los permisos se aplican en la base de datos con Row Level Security. El frontend no es una barrera de seguridad.

## Stack

React 19, TypeScript, Vite, TanStack Query y Supabase (Postgres, Auth y Edge Functions). No hay backend propio.

## Desarrollo local

Requiere Node 22 y Docker corriendo.

```bash
npm install
npx supabase start
```

`supabase start` muestra la URL y la clave pública. Copiá `.env.example` a `.env.local` y completalas. Después, en dos terminales:

```bash
npx supabase functions serve --env-file supabase/.env.local
```

```bash
npm run dev
```

`supabase/.env.local` debe tener `APP_URL=http://127.0.0.1:5173`. Los correos de prueba quedan en el buzón local: http://127.0.0.1:54324.

## Base de datos

Todo cambio va en una migración nueva de `supabase/migrations/`. No cambies el esquema a mano desde el panel de Supabase.

```bash
npx supabase migration new nombre_del_cambio
npx supabase db reset
npx supabase gen types typescript --local > src/types/database.types.ts
```

## Tests

| Comando | Qué prueba | Requiere |
|---|---|---|
| `npm run test` | Lógica de la app | Nada |
| `npm run test:db` | Permisos entre entrenadores y alumnos, acceso y sesiones | Supabase local |
| `npm run test:e2e` | Flujo completo en el navegador | Supabase local y la función de abajo |

Para el E2E, la primera vez corré `npx playwright install chromium`, y dejá la función corriendo:

```bash
npx supabase functions serve --env-file supabase/.env.e2e
```

## Salida a producción

1. Hacé un backup de la base.
2. Revisá el esquema real: `00003_row_level_security.sql` **borra todas las políticas existentes** del esquema `public`, y `00002` falla si un entrenador tiene dos clientes con el mismo correo.
3. Vinculá el proyecto y aplicá las migraciones. Si el esquema inicial se cargó a mano, primero marcá la `00001` como aplicada:

   ```bash
   npx supabase link --project-ref <id-del-proyecto>
   npx supabase migration repair --status applied 00001
   npx supabase db push
   ```

4. Publicá la función: `npx supabase functions deploy request-client-access`.
5. Definí su variable: `npx supabase secrets set APP_URL=https://tu-dominio`.
6. En Supabase, en Authentication → URL Configuration, cargá el dominio en Site URL y en Redirect URLs.
7. Configurá un SMTP propio: el correo incluido en Supabase tiene un límite de envío muy bajo.
8. Publicá el frontend con las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

**Las migraciones y el frontend salen juntos.** Activar RLS corta los links viejos `/alumno/:id`.
