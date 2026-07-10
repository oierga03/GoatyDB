# Desplegar GoatyDB online

GoatyDB es una app **Next.js 15** con **Prisma + PostgreSQL (Neon)**. La forma más
sencilla de ponerla online es **Vercel** (hosting de la app) + **Neon** (base de datos,
que ya usamos en desarrollo). El build de producción está verificado (`npm run build` ✓).

---

## 1. Base de datos (Neon) — ya la tienes

La BD de Neon que usamos en desarrollo **ya está migrada y con todos los datos** (7
divisiones). Si despliegas apuntando a esa misma BD, el sitio sale online **ya poblado**.

> ⚠️ **Importante para serverless:** Vercel ejecuta cada petición en una función
> serverless, y abrir muchas conexiones directas agota el límite de Neon. Usa la
> **cadena de conexión con _pooler_** (la que Neon marca como *"Pooled connection"*, su
> host contiene `-pooler`, p. ej. `...-pooler.eu-central-1.aws.neon.tech`). En el panel
> de Neon: **Dashboard → Connection Details → Connection pooling: ON → copia esa URL.**

---

## 2. Desplegar en Vercel

1. Entra en **vercel.com** e inicia sesión con GitHub.
2. **Add New… → Project** e importa el repo **`oierga03/GoatyDB`**.
3. Vercel detecta Next.js automáticamente. **No cambies** el build command
   (usa `npm run build`, que ya hace `prisma generate && next build`).
4. En **Environment Variables** añade:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | la **URL con pooler** de Neon (paso 1) |

5. **Deploy.** En 1–2 min tendrás una URL tipo `https://goatydb.vercel.app`.

Cada `git push` a `main` vuelve a desplegar automáticamente.

---

## 3. Si usas una base de datos NUEVA (opcional)

Si prefieres una BD de producción separada de la de desarrollo:

```bash
# apuntando la variable DATABASE_URL a la nueva BD:
npx prisma migrate deploy          # crea el esquema
npm run db:import -- periodo-2-2026 # carga equipos, rosters, premios y partidas
```

(El import se corre **desde tu máquina** contra la BD nueva; Vercel no lo ejecuta.)

---

## Checklist de "listo para producción"

- [x] `npm run build` compila sin errores (tipos + lint incluidos).
- [x] `.env` fuera del repo (credenciales de Neon a salvo).
- [x] 139/139 logos de equipos presentes en `public/logos/`.
- [x] `prisma generate` se ejecuta en el build (Vercel lo hará solo).
- [ ] Configurar `DATABASE_URL` (pooler) en Vercel.
- [ ] (Opcional) Dominio propio en Vercel → Settings → Domains.

## Notas / mejoras futuras (no bloquean el despliegue)

- Prisma avisa de migrar la config de `package.json#prisma` a `prisma.config.ts`
  (solo un warning; obligatorio a partir de Prisma 7).
- Considerar caché/ISR en páginas de lectura para reducir consultas a Neon.
