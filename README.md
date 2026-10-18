# eleazarsoto.org

Sitio de artista de Eleazar Soto, saxofonista. Publicado en Netlify.

## Estructura
- `site/`: la página (HTML, CSS, JS e imágenes). Es lo que Netlify publica.
- `netlify/functions/`: funciones del servidor.
  - `asistente.mjs`: chat con IA.
  - `lector-documento.mjs`: lee la invitación o el brief.
  - `geocode.mjs`: busca direcciones para el mapa.
- `netlify/lib/knowledge.mjs`: todo lo que sabe el asistente. **Edita aquí** los datos.
- `netlify.toml`: configuración de Netlify.

## Variables de entorno (Netlify → Site configuration → Environment variables)
- `GEMINI_API_KEY`: clave de Google AI Studio (motor principal, capa gratuita).
- `ANTHROPIC_API_KEY`: opcional, respaldo con Claude Haiku.

Sin claves el sitio funciona igual. El chat responde que se está configurando y el formulario pide los datos a mano.

## Propuestas de evento
Llegan por **Netlify Forms** (formulario `propuesta`). Puedes verlas en Netlify → Forms. Para recibirlas por correo, ve a Forms → Form notifications → Email notification.

## Editar
- Contacto, redes y opciones: `site/lib/manifest.js`
- Textos: `site/index.html` (bloques `.es` / `.en`)
- Estilos: `site/styles.css`
