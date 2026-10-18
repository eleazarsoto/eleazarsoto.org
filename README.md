# eleazarsoto.org

Sitio de artista de Eleazar Soto, saxofonista. Publicado en **Cloudflare Pages**.

## Estructura
- `site/`: la página (HTML, CSS, JS e imágenes). Es lo que Cloudflare publica.
- `functions/api/`: funciones del servidor (rutas `/api/...`).
  - `asistente.js`: chat con IA.
  - `documento.js`: lee la invitación o el brief.
  - `geocode.js`: busca direcciones para el mapa.
- `server/knowledge.js`: todo lo que sabe el asistente. **Edita aquí** los datos.
- `server/util.js`: utilidades y la lista de modelos de Gemini.

## Configuración en Cloudflare Pages
- Build command: (vacío)
- Build output directory: `site`
- Variables y secretos (Settings → Variables and Secrets):
  - `GEMINI_API_KEY` (secreto): clave de Google AI Studio.
  - `ANTHROPIC_API_KEY` (secreto, opcional): respaldo con Claude Haiku.
  - `GEMINI_MODELS` (opcional): modelos separados por comas, si Google retira los actuales.

Sin claves el sitio funciona igual: el chat dice que se está configurando y el formulario pide los datos a mano.

## Propuestas de evento
El formulario «Diseña tu evento» arma la propuesta y la persona la envía por WhatsApp (33 5122 1400) o por correo (rezzonante@gmail.com).

## Editar
- Contacto, redes y opciones: `site/lib/manifest.js`
- Textos: `site/index.html` (bloques `.es` / `.en`)
- Estilos: `site/styles.css`
