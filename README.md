# GanadoMarket — ecosistema marketplace ganadero para Venezuela

Monorepo con los actores del ecosistema de compra y venta de ganado: **backend**, **marketplace
público**, **panel del ganadero** y **panel administrador**, cada uno en su espacio y compartiendo
tipos, validaciones y componentes.

Sigue la misma lógica que `marketplace-agro` (Hono + Drizzle + PostgreSQL en el backend, React +
Vite + shadcn en los frontends, despliegue Render + Neon + Netlify). La diferencia es que aquí todo
vive en un solo repositorio orquestado con **Turborepo** y **npm workspaces**.

```
ganado-market/
├── apps/
│   ├── api/        Backend Hono + Drizzle + PostgreSQL           → http://localhost:4000
│   ├── web/        Marketplace público (compradores)             → http://localhost:5173
│   ├── ganadero/   Panel del ganadero (vendedores)               → http://localhost:5174
│   └── admin/      Panel de administración                       → http://localhost:5175
├── packages/
│   ├── shared/     Catálogos de Venezuela, enums, DTOs zod, tipos de respuesta, cliente HTTP
│   └── ui/         shadcn/ui + layout de panel, formularios de auth, subida de fotos, logo
├── docker-compose.yml   Postgres local (puerto 5433)
└── render.yaml          Blueprint del API para Render
```

## Referencias y cómo se adaptaron a Venezuela

| Referencia | Qué se tomó | Adaptación venezolana |
|---|---|---|
| [suganado.com](https://suganado.com/) (Colombia) | Clasificados gratis; razas agrupadas por propósito (carne, leche, doble propósito); anuncio por **ejemplar** o **lote**; sexo, peso y precio negociable; hasta 10 fotos y video; contacto por WhatsApp; filtros por raza y departamento | 23 estados + Distrito Capital (en lugar de departamentos); razas criollas (**Carora**, **Criollo Limonero**) junto a Brahman, Gyr, Girolando, etc.; clases del llano (**maute/mauta**, **padrote**, **vaca parida**) |
| Subastanet / Subastar, Superbid + TVGan (remates virtuales en Latinoamérica) | Remates en línea por lotes, abiertos a compradores de todo el país | Remates aprobados por un admin, precio base + incremento, extensión automática del cierre si hay pujas en los últimos 2 min |
| [tuganadovenezuela.com](https://www.tuganadovenezuela.com/) (Venezuela) | **Solicitudes de compra** (el comprador publica lo que busca, con presupuesto y urgencia, e identidad protegida); filtros por peso y edad; consejos de "compra con seguridad"; tasa BCV automática; nombre del vendedor en la tarjeta | Solicitudes con presupuesto **por kg o por cabeza** (allá el precio por kg no se distingue); contacto visible sólo para ganaderos y contador de interesados para el comprador; edad en **meses** (como se negocian mautes y novillos) |
| Práctica comercial local | — | Precio en **USD** (por cabeza, **por kg en pie** o por lote) con equivalente en **Bs. a tasa BCV** que se actualiza sola; **cédula/RIF** validados; teléfonos móviles 04xx normalizados a `58…` para `wa.me` |
| Control sanitario (INSAI) | — | Cada anuncio declara vacuna contra **aftosa** y **brucelosis**, **guía de movilización** y registro genealógico; las fincas se verifican por **RIF** y **hierro** registrado |

## Actores y flujos

| Actor | Dónde trabaja | Qué hace |
|---|---|---|
| **Comprador** | `web` | Busca ganado por especie, raza, estado, clase, sexo, precio, peso y edad; contacta por WhatsApp o deja una consulta; guarda favoritos; **publica solicitudes de compra** ("busco 30 becerros de 160–200 kg"); puja en remates |
| **Ganadero** | `ganadero` | Registra fincas/hatos; publica anuncios (borrador → revisión → publicado → pausado/vendido); responde consultas; **contacta a compradores desde las solicitudes**; organiza remates con lotes |
| **Administrador** | `admin` | Modera anuncios (aprobar, rechazar con motivo, destacar), solicitudes, remates y **denuncias**; verifica fincas; edita, suspende y elimina usuarios y sus roles; gestiona especies y razas, servicios (vinculados a cuentas), tasa BCV y soporte. Todo queda en el **historial de acciones** |
| **Transportista / veterinario** | `web` → Servicios | Directorio de servicios del ecosistema por estado (jaulas ganaderas, médicos veterinarios, inseminación, alimento), gestionado desde el admin |

### Alcance del panel admin

| Sección | Puede | No puede (a propósito o pendiente) |
|---|---|---|
| Anuncios | Ver la vista previa, aprobar, rechazar con motivo, destacar | Crear ni editar anuncios: los crea el ganadero |
| Denuncias | Retirar el anuncio (pasa a rechazado con motivo y atiende todas sus denuncias) o descartar | — |
| Fincas | Verificar, rechazar o revocar la verificación | Crear o editar fincas |
| Remates / Solicitudes | Aprobar o cancelar remates; cerrar o borrar solicitudes | Editar lotes ni pujas |
| Usuarios | Editar datos, roles, suspender, **eliminar** (pide escribir el correo; se bloquea si la cuenta está en un remate en curso, si es la propia o si es el último admin) | Ver contraseñas, consultas privadas ni favoritos |
| Servicios | Crear, editar, borrar; **vincular a una cuenta** (recibe el rol transportista o veterinario) | — |
| Especies y razas | Crear y editar especies; crear, editar y borrar razas | Borrar especies con anuncios |
| Historial | Ver quién hizo qué y cuándo (sobrevive aunque se borre la cuenta del admin) | Editar el historial |

Las denuncias exigen sesión iniciada (una por usuario y anuncio) y el vendedor no ve quién lo denunció.

El API separa las rutas por actor: `/anuncios`, `/subastas`… (público), `/ganadero/*` (rol
ganadero) y `/admin/*` (rol admin). Los roles se leen de la base de datos en cada petición, así que
una suspensión o un cambio de rol aplica de inmediato.

## Puesta en marcha (local)

Requisitos: Node ≥ 20.19, npm 11 y Docker (para Postgres).

```bash
npm install
npm run db:up                               # Postgres en localhost:5433
cp apps/api/.env.example apps/api/.env      # y cambia JWT_SECRET
npm run db:migrate                          # aplica apps/api/drizzle/*.sql
npm run db:seed                             # roles, 6 especies / 45 razas, admin
npm run db:seed:demo                        # opcional: ganadero, fincas, anuncios, remate en vivo
npm run dev                                 # api + web + ganadero + admin
```

Para levantar sólo una app y su backend: `npm run dev:web`, `npm run dev:ganadero` o
`npm run dev:admin`.

Cuentas creadas por los seeds (sólo para desarrollo):

| Rol | Correo | Contraseña |
|---|---|---|
| Admin | `admin@ganadomarket.local` | `Admin1234!` (configurable con `ADMIN_EMAIL` / `ADMIN_PASSWORD`) |
| Ganadero (demo) | `ganadero@demo.ve` | `Demo1234!` |
| Comprador (demo) | `comprador@demo.ve` | `Demo1234!` |

La **tasa BCV se actualiza sola**: el API la consulta en `ve.dolarapi.com` (con respaldo en la
portada de `bcv.org.ve`) y la refresca cada 3 horas. En **Admin → Configuración** se puede
desactivar y cargar a mano.

**Recuperar contraseña:** sin `SMTP_HOST` en `apps/api/.env`, el correo con el enlace se imprime
en la consola del API (útil en desarrollo). En producción configura `SMTP_*` y las URLs públicas
`WEB_URL`, `GANADERO_URL` y `ADMIN_URL`, para que el enlace apunte a la app correcta.

> Los textos de **Términos** y **Privacidad** (`apps/web/src/pages/legal.tsx`) son un borrador.
> Debe revisarlos un abogado antes de publicar.

## Scripts (raíz)

| Script | Qué hace |
|---|---|
| `npm run dev` | Todas las apps en modo desarrollo (Turbo) |
| `npm run build` | Build de producción: `tsup` para el API, `vite build` para los frontends |
| `npm run typecheck` / `npm run lint` | TypeScript y ESLint en todos los paquetes |
| `npm run db:generate` | Genera una migración a partir de los cambios en `apps/api/src/database/schemas` |
| `npm run db:migrate` / `db:push` / `db:studio` | Aplicar migraciones, sincronizar el schema o abrir Drizzle Studio |

## Cómo se comparten las cosas

- **`@workspace/shared`** es la fuente única de verdad del dominio: estados de Venezuela, especies
  y razas, enums con sus etiquetas, **DTOs zod** (los usa el API para validar y los formularios
  para validar en el cliente, con mensajes en español), tipos de respuesta, formateo de USD y Bs.,
  y `createApiClient`.
- **`@workspace/ui`** contiene los componentes shadcn (Base UI) y las piezas comunes de las tres
  SPAs: `DashboardShell`, `AuthLayout`, `LoginForm` / `RegisterForm`, `FormField`, `StatusBadge`,
  `ImageUploader` y `createAuth`. Para añadir un componente shadcn:
  `npx shadcn@latest add <componente> -c apps/web`.
- Cada frontend llama a `/api/*`. En desarrollo lo reenvía el proxy de Vite y en producción un
  redirect de Netlify, igual que el admin de `marketplace-agro`. Así no hay CORS y el JWT viaja como
  `Authorization: Bearer`.

## Despliegue

Mismo esquema que `marketplace-agro`: **API → Render**, **BD → Neon**, **frontends → Netlify**
(tres sitios). La diferencia es que los cuatro salen del mismo repositorio de GitHub.

1. **Neon**: crea la base y ejecuta `npm run db:migrate` y `npm run db:seed` con `DATABASE_URL`
   apuntando a Neon (mantén `?sslmode=require`).
2. **Render**: *New → Blueprint* sobre este repo; `render.yaml` construye con
   `turbo build --filter=api` y arranca `node apps/api/dist/index.js`. Completa `DATABASE_URL`,
   `CORS_ORIGINS`, `WEB_URL` / `GANADERO_URL` / `ADMIN_URL`, el correo (`SMTP_*`) y, para fotos
   persistentes, las variables `CLOUDINARY_*`.
3. **Netlify** (un sitio por app): *Base directory* = `apps/web`, `apps/ganadero` o `apps/admin`.
   En cada `netlify.toml`, reemplaza `REPLACE_WITH_API_URL` por la URL de Render. Define también
   `VITE_GANADERO_URL` en `web` y `VITE_WEB_URL` en `ganadero` y `admin`, para que los enlaces
   entre apps apunten a los dominios reales.

> **Fotos:** sin Cloudinary, el API guarda las imágenes en `apps/api/uploads/`. Sirve para
> desarrollo, pero el disco de Render free es efímero y esas fotos se pierden en cada deploy.
> En producción configura Cloudinary.

## Próximos pasos sugeridos

- **Vista previa al compartir por WhatsApp y SEO**: prerenderizar `/ganado/:slug` con metadatos
  Open Graph (foto, precio, ubicación). Hoy, como toda SPA, un enlace compartido sale sin vista
  previa.
- **Precio de referencia por kg en pie** (promedio por clase y estado, calculado con los anuncios).
- Notificaciones (correo o WhatsApp Business) al aprobar anuncios, recibir consultas o
  solicitudes compatibles, o ser superado en una puja.
- Vencimiento automático de anuncios a los 60 días, con renovación en un clic.
- Subida de video y compresión de fotos para conexiones lentas.
- Panel propio para transportistas y veterinarios (hoy el admin vincula el servicio a su cuenta).
- Login con Google y verificación de identidad con documentos.
- Cierre formal de remates: adjudicación, constancia para comprador y vendedor, comisión.
