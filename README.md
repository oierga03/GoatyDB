# 🐐 GoatyDB

Plataforma pública de referencia para el amateur de **Hextech / League of Legends**.

Esta primera versión (MVP) es una base pública sencilla de **participación histórica**:
qué jugadores participaron, en qué equipo y rol jugaron, en qué división, cómo quedó
su equipo y qué premios ganaron. Está preparada para crecer por *splits* y para añadir
más adelante estadísticas, partidos, rankings, fantasy, etc.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS v4
- PostgreSQL + [Prisma ORM](https://www.prisma.io)
- Zod (validaciones puntuales)

---

## Requisitos

- Node.js 20+ (probado con Node 24)
- Una base de datos **PostgreSQL**. Dos opciones:
  - **A)** Docker (recomendado para local) — usa el `docker-compose.yml` incluido.
  - **B)** PostgreSQL externo (Neon, Supabase, Railway, RDS…) — solo necesitas la URL.

---

## Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y ajusta `DATABASE_URL`:

- **Con Docker** (valores por defecto ya listos):

  ```
  DATABASE_URL="postgresql://goaty:goaty@localhost:5432/goatydb?schema=public"
  ```

- **Con PostgreSQL externo**, pega la URL de tu proveedor, por ejemplo:

  ```
  DATABASE_URL="postgresql://usuario:password@host.proveedor.com:5432/basedatos?schema=public&sslmode=require"
  ```

### 3. Levantar la base de datos (solo opción Docker)

```bash
docker compose up -d
```

> Si usas un PostgreSQL externo, sáltate este paso.

### 4. Aplicar el esquema y sembrar datos demo

```bash
npm run db:migrate   # aplica la migración inicial y genera el cliente Prisma
npm run db:seed      # carga datos ficticios (temporada, split, equipos, premios…)
```

### 5. Arrancar la app

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

> Las páginas `/players`, `/teams` y `/hall-of-fame` se implementan en la **Fase 2**.
> Tras la Fase 1 ya tienes la home, el modelo de datos, la migración y la seed.

---

## Scripts

| Script              | Descripción                                                        |
| ------------------- | ------------------------------------------------------------------ |
| `npm run dev`       | Servidor de desarrollo (Next.js)                                   |
| `npm run build`     | Genera el cliente Prisma y compila para producción                 |
| `npm run start`     | Sirve la build de producción                                       |
| `npm run db:generate` | Genera el cliente de Prisma                                       |
| `npm run db:migrate`  | Crea/aplica migraciones en desarrollo                            |
| `npm run db:deploy`   | Aplica migraciones existentes (producción/CI)                   |
| `npm run db:seed`     | Ejecuta `prisma/seed.ts` con datos demo (⚠️ borra y recrea)     |
| `npm run db:import`   | Importa datos reales desde `/data` (CSV, idempotente)           |
| `npm run db:reset`    | Reinicia la base de datos y vuelve a sembrar                    |
| `npm run db:studio`   | Abre Prisma Studio para inspeccionar los datos                  |

---

## Modelo de datos

El corazón del modelo es la **participación histórica**. La identidad real es
siempre el `id` (UUID), nunca el nick.

- **Player / PlayerAlias** — jugador y sus nicks históricos.
- **Team / TeamAlias** — equipo y sus nombres históricos.
- **Season → Split** — temporada y sus splits.
- **Competition → CompetitionEdition → Division → Group** — estructura de la competición por split.
- **TeamEntry** — un equipo en una división concreta de un split concreto (con su resultado final).
- **RosterMembership** — un jugador dentro de un `TeamEntry`, con rol y estado (titular, sexto, coach…).
- **AwardDefinition → AwardEdition → AwardRecipient** — catálogo de premios, entregas y ganadores.

Reglas clave:

- IDs por **UUID**, rutas públicas por **slug** único.
- **Enums** para roles, estados y resultados.
- No se borran en cascada los datos históricos (relaciones protegidas con `Restrict`).

> **Aún NO implementado (llegará después):** partidos, mapas, estadísticas (KDA…),
> rankings, importadores, fantasy/bolsa de jugadores y premios automáticos.
> El esquema está comentado indicando dónde encajarán.

---

## Cargar datos reales (splits)

Los datos reales viven en la carpeta [`/data`](./data) como CSV editables desde
una hoja de cálculo. El importador es **idempotente** (re-ejecutable sin
duplicar) y acepta valores en español o inglés.

Cada split vive en su propia carpeta (`data/<split>/`), lista para añadir splits
futuros sin tocar los anteriores:

```bash
# Cargar/actualizar un split (merge, no borra nada):
npm run db:import -- periodo-2-2026

# Reinicio completo (⚠️ vacía TODA la base y recarga ese split):
npm run db:import -- periodo-2-2026 --fresh
```

El formato de cada CSV (`teams.csv`, `rosters.csv`, `awards.csv`) y del
`split.json`, más el flujo para añadir un split nuevo, está documentado en
[`data/README.md`](./data/README.md).

> `db:seed` (datos demo) y `db:import` (datos reales) son excluyentes: `db:seed`
> **borra** todo y recrea la demo. Para producción usa siempre `db:import`.

## Estado por fases

- **Fase 1 (hecha):** proyecto, Prisma, `.env.example`, `docker-compose.yml`, esquema, migración inicial, seed y README.
- **Fase 2 (siguiente):** páginas `/`, `/players`, `/players/[slug]`, `/teams`, `/teams/[slug]`, `/hall-of-fame` con datos reales de Prisma.
- **Fase 3 (hecha):** estados vacíos, manejo de errores (`error.tsx`), skeletons de carga, filtros funcionales y repaso de tipos.
- **Datos reales (hecho):** restricciones únicas naturales + importador CSV idempotente (`npm run db:import`).
