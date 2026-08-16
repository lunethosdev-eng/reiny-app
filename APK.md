# Cómo generar el APK de Reiny

Icono: gato pixel (icon-512.png / res/mipmap-*)

## Opción A — GitHub Actions (recomendada)

1. Sube este repo a GitHub (ya preparado).
2. En el repo: **Actions → Build Android APK → Run workflow**.
3. Cuando termine, descarga el artefacto **reiny-debug-apk**.
4. Instálalo en el teléfono (permite "fuentes desconocidas").

Requisitos: el workflow usa Capacitor. La primera corrida puede tardar varios minutos.

## Opción B — En tu PC (Android Studio)

```bash
npm install
npx cap add android
npx cap sync
npx cap open android
```

En Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

## Opción C — PWA Builder (sin Android Studio)

1. Publica la carpeta en GitHub Pages / Netlify / cualquier hosting HTTPS.
2. Entra a https://www.pwabuilder.com
3. Pega la URL → Package → Android → Generate.
4. Descarga el APK / zip.

## Notas

- El APK **debug** sirve para probar. Para Play Store necesitas keystore y `assembleRelease`.
- La API key de OpenRouter está en `app.js`. Mantén el repo **privado** o muévela a un backend.
- Chromo AI y Supabase necesitan internet en el dispositivo.
