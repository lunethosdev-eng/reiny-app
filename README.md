# Reiny 🐱

App social: chats, estados, reels, música, perfiles estilo Piko y **Chromo AI** (tsundere).

Icono oficial: gato pixel (`icon-512.png`).

## Abrir en el navegador

Sirve la carpeta con cualquier static server, por ejemplo:

```bash
npx serve .
# o
python3 -m http.server 7700
```

## Mencionar a Chromo

En cualquier chat escribe:

```text
@chromo ayuda
@chromo cómo subo un estado?
```

## Generar APK

Lee **[APK.md](./APK.md)** — tres formas:

1. **GitHub Actions** (Actions → Build Android APK)
2. **Android Studio** + Capacitor
3. **PWA Builder** online

### Capacitor (resumen)

```bash
npm install
npx cap add android
npx cap sync
npx cap open android
```

## Supabase

Configura tu proyecto y ejecuta `supabase-schema.sql` / `SQL-ESTADOS-COMPLETO.sql`.

## Seguridad

La API key de OpenRouter vive en `app.js` (cliente).  
**Mantén el repo privado** o muévela a un backend antes de hacerlo público.
