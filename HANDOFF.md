# GoatyDB — Documento de traspaso

> Contexto completo del proyecto para que otra persona (o otra IA) pueda seguir
> trabajando sin repetir los errores que ya cometimos. Léelo entero antes de
> tocar datos: hay varias trampas que no son evidentes.

---

## 1. Qué es

**GoatyDB** es una base de datos pública de referencia (estilo Transfermarkt /
Liquipedia) de la escena **amateur de League of Legends** en España:
concretamente el **Circuito Tormenta**, y dentro de él la liga **Hextech
Series**.

Guarda, por cada periodo (split): equipos, plantillas, divisiones, resultados,
partidas, estadísticas de jugador y premios.

- **En producción:** https://goaty-db.vercel.app
- **Repositorio:** https://github.com/oierga03/GoatyDB
- **Lo hace:** Goaty Esports (oierga, adrimr7, gorke), un equipo amateur que
  además hace contenido (Goatcast) y comunidad.

### El principio que gobierna todo: honestidad del dato

**Nunca se afirma lo que no se puede verificar.** Es la promesa de valor del
proyecto y no es negociable:

- Si no sabemos el rol de un jugador, se deja `UNKNOWN`. No se adivina.
- Si no sabemos si dos nicks son la misma persona, se crean como dos jugadores
  distintos y se marca `needsReview` para que la comunidad lo corrija.
- Donde la cobertura del dato es parcial, **la web lo dice explícitamente**
  (ej.: *"Campeón conocido en 8 de 12 partidas"*).

Si en algún momento dudas entre "inventar algo razonable" y "dejarlo vacío y
decirlo", **déjalo vacío y dilo**.

---

## 2. Stack

| Capa | Tecnología |
|---|---|
| Web | Next.js 15 (App Router), TypeScript, Tailwind v4 |
| ORM | Prisma 6 |
| Base de datos | PostgreSQL en **Neon** (serverless) |
| Hosting | **Vercel** |

### Modelo de datos (resumido)

```
Season → Split → CompetitionEdition → Division → Group
                                          ↓
                                      TeamEntry ──→ Team
                                          ↓
                                  RosterMembership ──→ Player
Match (splitId, divisionId, round, teamA, teamB, scoreA, scoreB)
  └── Game (gameNumber)
        └── PlayerGameStat (player, team, side, position, champion, k/d/a, win)
Award{Definition,Edition,Recipient}
Report  (correcciones que envía la comunidad)
```

Claves importantes:
- **Un `Team` es global**; participa en varios splits vía `TeamEntry`.
- **Un `Player` es una PERSONA global**; su historia son sus `RosterMembership`.
- La clave natural de `Match` es
  `(splitId, divisionId, round, teamAId, teamBId)` → **el orden de los equipos
  importa** (ver trampa nº 4).

---

## 3. Cómo entran los datos

Todo pasa por **CSV → importador → Neon**. Los CSV son la fuente de verdad y
viven en `data/<split>/`:

| Fichero | Qué es |
|---|---|
| `split.json` | temporada, split, competición, divisiones |
| `teams.csv` | equipos, división, grupo, logo, resultado final |
| `rosters.csv` | una fila por persona en un equipo |
| `results.csv` | **resultado oficial** de cada enfrentamiento (sin stats) |
| `matches.csv` | una fila por **jugador-partida** (stats: campeón, posición, KDA) |
| `awards.csv` | premios |

```bash
npm run db:import -- periodo-2-2026     # idempotente (upsert), no borra
npm run db:import -- <split> --matches  # solo partidas (rápido)
npm run db:roles                        # rederivar roles (ya va dentro del import)
```

`results.csv` carga **todos** los enfrentamientos aunque no haya capturas;
`matches.csv` **enriquece encima** los que sí las tienen. Comparten clave
natural, así que hacen upsert sobre el mismo `Match`.

---

## 4. Las fuentes de datos (y sus límites) ⚠️

Esto es lo más importante del documento. **La web del Circuito Tormenta NO
publica estadísticas de jugador.** Lo comprobamos abriendo una página de partido
con Playwright. Lo que sí publica:

| Fuente | Qué da | Qué NO da |
|---|---|---|
| **Web del CT** (SPA, requiere Playwright) | Resultados oficiales, brackets, clasificaciones, **alineaciones con Riot ID** | ❌ campeón, ❌ rol, ❌ KDA |
| **Capturas post-partida** (subidas por los equipos al CT) | KDA, y **solo en "vista avanzada"**: campeón + rol | — |
| **CSV maestro del CT** | Plantillas (nombre CT, nick LoL, Riot ID, rol de staff) | ❌ posición de juego |

### De aquí sale la limitación central del proyecto

**El rol y el campeón SOLO existen en las capturas en "VER DETALLES AVANZADOS".**
Las capturas en vista normal muestran iconos y KDA, pero **ni el nombre del
campeón ni la posición**. Y el iconito del campeón es demasiado pequeño para
identificarlo sin adivinar (y adivinar está prohibido, ver §1).

Resultado: **solo el ~32% de los jugadores tiene rol conocido.** Y esto **no se
puede arreglar** con más scraping. Ya lo intentamos:

- ❌ *Inferir el rol del campeón*: da **0 jugadores nuevos**. Campeón y posición
  vienen de la **misma** captura avanzada; donde hay uno hay el otro (medido:
  0 registros con campeón pero sin posición).
- ✅ *Deducción "4 de 5"*: si en una alineación conocemos 4 puestos y son
  distintos, el quinto es el que falta. **No es adivinar, es descartar.** Sumó
  +25 jugadores. Ya está implementado en `scripts/roles.ts`.

> **La única vía real para subir la cobertura es que las capturas se tomen en
> vista avanzada.** Es un clic en el cliente de LoL y multiplica el valor del
> dato. Si consigues que se haga así en los periodos nuevos, tendrás cobertura
> casi total desde el día uno.

---

## 5. 🚨 Trampas que YA nos han mordido

No las descubras otra vez. Cada una costó tiempo real.

### 1. Los nombres de archivo de las capturas MIENTEN
El scraper nombra los ficheros según el partido **oficial** al que están
subidos, pero **los equipos suben capturas equivocadas**. Caso real: la carpeta
`playoff_final/Div6` contenía las capturas de la **semifinal**, no de la final.

👉 **Fíate del contenido del marcador (los nicks) y del resultado oficial, nunca
del nombre del fichero.**

### 2. "Al-Bascal" no existe: es **VyronX**
Un equipo cambió de nombre. Las capturas viejas lo llaman Al-Bascal; el oficial
lo llama VyronX. Llegué a **inventarme un equipo** y añadirlo a `teams.csv`
porque el import fallaba. Si un equipo "no existe" en `teams.csv`, **no lo
crees: busca el nombre real en la fuente oficial.**

### 3. `rosters.csv` necesita columna `division`
Un mismo equipo juega en varios splits → tiene **varios `TeamEntry`**. Sin la
columna `division`, el importador no sabe a cuál enganchar al jugador y lanza
*"X juega en varias divisiones"*. `scripts/build-rosters.ts` ya la emite.

### 4. El ORDEN de los equipos crea duplicados
La clave natural del `Match` incluye `teamAId` y `teamBId` **en orden**. Si
`matches.csv` dice `A vs B` y `results.csv` dice `B vs A`, se crean **dos
partidos distintos**. Ya pasó (4 duplicados). Alinea siempre el orden.

### 5. El importador BORRA los roles
La carga de rosters reescribe `RosterMembership.role` con lo que traiga
`rosters.csv` (que viene vacío: el CT no da posiciones). **Ya está resuelto**:
`deriveRoles()` se ejecuta automáticamente al final de `import.ts`. No lo
quites.

### 6. `playedAt` está vacío
Nunca cargamos fechas de partida. El orden cronológico se **deriva de la ronda**:
split más nuevo primero y, dentro, `Final → Semifinal → J3 → J2 → J1`. El código
ya prioriza `playedAt` si algún día se rellena.

### 7. Las fechas del CT son del LUNES
El CT muestra el lunes de la semana, pero **se juega el domingo**. No te asustes
si una captura del día 12 corresponde a un partido "del día 8": es la misma
semana.

### 8. VICTORIA/DERROTA manda sobre el KDA
En varias capturas el equipo con menos kills ganó. La etiqueta
**VICTORIA/DERROTA** del cliente es la fuente autoritativa de quién ganó, aunque
los números parezcan contradecirlo.

### 9. El scraper del CT necesita Playwright
La web es una SPA: `WebFetch`/`curl` devuelven el HTML vacío. Hay que cargarla
con Playwright y leer `page.inner_text("body")`.

---

## 6. Estado actual de los datos

### Periodo 2 2026 — COMPLETO y verificado
- **7 divisiones**, 148 equipos, 1.198 personas en plantillas.
- **242 enfrentamientos = los 242 oficiales.** Cotejado uno a uno contra la web
  del CT: **0 marcadores discrepantes**.
- 148 de ellos tienen estadísticas de jugador (3.037 registros). El resto no
  tiene capturas: se cargan con su **resultado oficial y sin stats**, que es lo
  honesto.

### Periodo 3 2026 — EN CURSO
- **5 divisiones** (ojo: no 7), **93 equipos**, **786 personas**.
- **0 partidas todavía.** La jornada 1 se jugó el domingo 12/07/2026.

### Cobertura conocida (y asumida)
| | |
|---|---|
| Jugadores con rol | 465 / 1.452 (~32%) |
| Registros con campeón | ~29% |
| Jugadores `needsReview` | 102 |
| Equipos sin logo | 8 |

`needsReview` **no es un fallo**: son nicks de marcador que no se pudieron
vincular a una persona con certeza. Salen marcados en la web y la comunidad los
corrige con el botón de reportar.

---

## 7. Despliegue y flujo de trabajo

```
   Cambios en el código ──git push──> GitHub ──automático──> Vercel ──> Web
   Cambios en los DATOS ──npm run db:import──> Neon ──────────────────> Web
```

**Los dos caminos son independientes.** Esto confunde mucho:

- **GitHub → Vercel es automático.** Cada push a `main` despliega solo.
- **Los datos NO viajan con el push.** Subir un CSV a GitHub **no** mete los
  datos en la web. Hay que correr `npm run db:import` contra Neon.

### Variables de entorno (Vercel)
| Variable | Nota |
|---|---|
| `DATABASE_URL` | **La "pooled" de Neon** (host con `-pooler`). Con la directa se agotan las conexiones en serverless. |
| `ADMIN_USER` / `ADMIN_PASSWORD` | Protegen `/admin/*` con Basic Auth |

### Seguridad
`src/middleware.ts` protege `/admin/*`. **Falla CERRADO**: si faltan las
credenciales devuelve 503 en vez de abrirse. Es a propósito — el panel muestra
el **contacto (Discord/email) de quien reporta**, y estuvo público por error
hasta que lo detectamos.

---

## 8. Lo que toca hacer ahora

1. **Cargar la jornada 1 del Periodo 3.** Flujo: capturas → `matches.csv` →
   `npm run db:import -- periodo-3-2026`. Los roles se rederivan solos.
2. **Insistir en capturas en vista avanzada** (ver §4). Es lo que más valor
   añade, con diferencia.
3. Fusionar jugadores `needsReview` desde `/admin/reportes`.
4. Premio MVP de la Jornada 3 (pendiente desde el P2).
5. Logos de los 8 equipos que no tienen.

### Ideas no hechas (valoradas y descartadas o pendientes)
- **Oro por partida**: `historico_split.csv` lo tiene, pero `PlayerGameStat` no
  guarda el campo. Requiere migración.
- **Rol desde OP.GG**: cada jugador tiene su `opgg_url`. Pero eso es su rol de
  **soloq**, no el de su equipo. Solo sería aceptable **etiquetándolo como tal**,
  nunca mezclado con el rol real.
- **`teamId` en `Report`**: los reportes de equipo se identifican por nombre
  (`subject`) para no migrar la BD recién puesta en producción.

---

## 9. Guía rápida de ficheros

| Ruta | Qué hace |
|---|---|
| `scripts/import.ts` | El importador. Lee los CSV y hace upsert. Ejecuta `deriveRoles()` al final. |
| `scripts/roles.ts` | Deriva los roles de las partidas (+ deducción "4 de 5"). |
| `scripts/build-rosters.ts` | Convierte el CSV maestro del CT en `rosters.csv`. |
| `src/middleware.ts` | Basic Auth de `/admin/*`. |
| `src/app/players/`, `teams/`, `matches/`, `estadisticas/` | Las páginas. |
| `DEPLOY.md` | Guía de despliegue (Vercel + Neon). |

**Datos externos** (fuera del repo, en el PC de Oier):
- `Downloads/ScrapingCircuitoTormenta/` — scrapers (Playwright), capturas, y
  `periodo_2/scrapeo_ct_completo.xlsx` (**la lista oficial de partidos**).
- `Downloads/goatydb equipos/` — CSV maestros de equipos y jugadores.

---

## 10. Resumen para quien llegue nuevo

> GoatyDB tiene **datos oficiales verificados** de todo el Periodo 2 y las
> plantillas del Periodo 3. La web está en producción. El código se despliega
> solo al hacer push; **los datos hay que importarlos a mano contra Neon**.
>
> La limitación de fondo es que **el rol y el campeón solo existen en las
> capturas en vista avanzada**, y eso no se arregla programando: se arregla
> pidiendo que las capturas se tomen bien.
>
> Y por encima de todo: **si no se puede verificar, no se afirma.**
