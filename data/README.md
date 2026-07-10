# 📥 Datos reales — cómo cargar un split

**Cada split vive en su propia carpeta** dentro de `data/`, por ejemplo
`data/periodo-2-2026/`. Así, añadir un split futuro (donde los equipos de cada
división pueden cambiar) es tan simple como **crear otra carpeta** y volver a
importar, sin tocar lo anterior.

```
data/
  periodo-2-2026/
    split.json      ← temporada, split, competición, edición y divisiones
    teams.csv       ← equipos (nombre + logo + división)
    rosters.csv     ← jugadores (una fila por jugador en un equipo)
    awards.csv      ← premios (opcional)
  periodo-3-2026/   ← el próximo split, misma estructura
    ...
```

Edita los CSV con tu hoja de cálculo, expórtalos a **UTF-8** y ejecuta:

```bash
npm run db:import -- periodo-2-2026            # carga/actualiza ese split (merge)
npm run db:import -- periodo-2-2026 --fresh    # ⚠️ VACÍA TODA la base y recarga
```

- El importador es **idempotente**: puedes re-ejecutarlo sin duplicar.
- Acepta separador `,` **o** `;` (Excel en español) — lo detecta solo.
- Acepta valores en **español o inglés** para roles, resultados, etc.
- **Añadir un split nuevo**: crea su carpeta y haz `db:import -- <carpeta>` (sin
  `--fresh`). Se crea una edición y divisiones nuevas para ese split; los equipos
  que ya existían se reutilizan y el split anterior queda intacto.
- `--fresh` borra **todos** los splits: úsalo solo para un reinicio completo.

---

## 1) `split.json` — la competición

Define la temporada, el split, la competición, la edición y **las divisiones**.
Los `slug` se generan solos a partir de los nombres. Los estados válidos son
`UPCOMING`, `ACTIVE`, `COMPLETED`, `ARCHIVED`.

Las divisiones que uses en `rosters.csv` **deben existir aquí** (por nombre).

---

## 1.5) `teams.csv` — equipos (opcional, sin jugadores todavía)

Para dar de alta equipos con su logo y división **antes** de tener rosters.
Columnas: `division` (opcional), `team_name`, `team_short`, `team_logo`,
`final_result` (opcional), `final_position` (opcional), `final_record` (opcional),
`group` (opcional), `founded_year` (opcional).

- `final_result`: fase alcanzada — `Campeón`, `Finalista`, `Semifinalista`,
  `Cuartos`, `Playoffs`, `Fase de grupos`, `Participó`…
- `final_position`: puesto final (1, 2, 3…). Se usa para ordenar la división.
- `final_record`: récord de la fase suiza en formato `V-D` (ej. `2-0`, `3-1`).

**Logos:** pon los archivos en [`public/logos/`](../public/logos) y referencia
`team_logo` como `/logos/nombre.png`. También vale una URL `https://…` externa.
Si lo dejas vacío se muestra un placeholder con las siglas.

## 2) `rosters.csv` — una fila por miembro de un equipo

Los rosters se **enganchan a los equipos ya cargados** por `teams.csv` (no tocan
su resultado/récord). Una fila por miembro (jugador o staff).

| Columna         | Obligatorio | Descripción                                                                  |
| --------------- | ----------- | ---------------------------------------------------------------------------- |
| `team`          | ✅          | Siglas o nombre del equipo (debe existir ya en `teams.csv`).                 |
| `player_nick`   | ✅          | Nick/handle del jugador (ej. el del CT, `BARROSO#2960`).                      |
| `player_slug`   | ⬜          | Fuerza el identificador. Úsalo para desambiguar o fijar identidad.           |
| `role`          | ⬜          | Posición en LoL. Vacío si aún no la tienes.                                   |
| `roster_status` | ✅          | Cargo: `Jugador`, `Coach`, `Propietario`, `Capitán`… Ver abajo.              |
| `is_captain`    | ⬜          | `x`, `sí`, `true` o `1` para marcar capitán.                                  |
| `division`      | ⬜          | Solo si un equipo juega en varias divisiones; normalmente se deduce solo.    |

**`role`** — `Top`, `Jungla` (o `Jungle`), `Mid`, `ADC` (o `Bot`), `Support`
(o `Soporte`), `Flex`. Vacío = desconocido (lo rellenamos con los nicks de LoL).

**`roster_status`** — el **coach** tiene rol propio; el resto del staff se agrupa:
- `Jugador` (o `Titular`) → jugador. `Suplente`, `Sexto`, `Inactivo` también valen.
- `Capitán` → jugador + marcado como capitán.
- `Coach` / `Entrenador` → cuerpo técnico (coach).
- `Propietario`, `CEO`, `Manager`, `Analista`, `Staff`… → **staff genérico**.

> ⚠️ Identidad: el jugador se identifica por su `player_slug` (o por el slug del
> nick si no lo indicas). Como el handle del CT es estable, úsalo como nick para
> no duplicar a la misma persona entre equipos. El nick de LoL llegará después.

---

## 3) `awards.csv` — una fila por premio recibido (opcional)

| Columna            | Obligatorio | Descripción                                                        |
| ------------------ | ----------- | ------------------------------------------------------------------ |
| `award_name`       | ✅          | Nombre del premio (ej. `MVP del Split`).                           |
| `award_slug`       | ⬜          | Fuerza el identificador del premio.                                |
| `scope`            | ✅          | `Split`, `División`, `Jornada` u `Otro`.                          |
| `category`         | ✅          | `MVP`, `Ejecutor`, `Asistente`, `All-Pro`, `Rendimiento`, `Especial`. |
| `is_featured`      | ⬜          | `x`/`true` para destacarlo (premios grandes).                     |
| `display_priority` | ⬜          | Orden (mayor = aparece antes).                                     |
| `title`            | ✅          | Título único de la entrega (ej. `MVP del Split · División 3 · Split 2 2026`). |
| `division`         | ⬜          | Acota el premio a una división.                                    |
| `player_nick`      | ✅          | Ganador (debe existir en `rosters.csv`).                          |
| `player_slug`      | ⬜          | Igual que en rosters, para desambiguar.                           |
| `team`             | ⬜          | Equipo con el que lo ganó (siglas o nombre).                      |
| `citation`         | ⬜          | Frase/justificación.                                               |
| `awarded_at`       | ⬜          | Fecha `AAAA-MM-DD`.                                                |
| `image_url`        | ⬜          | Imagen del premio.                                                 |

> Varios ganadores del mismo premio: repite el `award_name` + `title` en varias
> filas cambiando `player_nick`. Se agrupan en la misma entrega.

---

Los ficheros actuales traen **datos de ejemplo** (Equipo Ejemplo A/B). Bórralos y
pon los tuyos. Si el importador encuentra un error, te dirá el fichero y la línea.
