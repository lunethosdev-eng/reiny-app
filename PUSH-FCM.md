# Llamadas con app cerrada — FCM HTTP v1 (tu proyecto)

**Proyecto:** `reiny-84d03`  
**Sender ID:** `749672765922`  
**Package:** `app.reiny.chat`  
**API:** Firebase Cloud Messaging API **(V1)** ✅ (Legacy desactivada, correcto)

La Edge Function ya usa **HTTP v1 + cuenta de servicio** (no hace falta Server key Legacy).

---

## Paso que te falta ahora (2 minutos)

### Crear clave de cuenta de servicio

1. En la pantalla que tienes abierta, toca **Manage Service Accounts**  
   (o pestaña **Service accounts** arriba).
2. En Google Cloud se abre la lista de cuentas de servicio.
3. Elige la cuenta `firebase-adminsdk-...@reiny-84d03.iam.gserviceaccount.com`  
   (si no hay ninguna, crea una con rol **Firebase Cloud Messaging Admin** o **Firebase Admin SDK Administrator Service Agent**).
4. Pestaña **Keys** → **Add key** → **Create new key** → tipo **JSON** → Create.
5. Se descarga un archivo `.json` (empieza con `"type": "service_account"`).

⚠️ Ese JSON es **secreto**. No lo subas al repo público.

### Ponerlo en Supabase

Supabase → **Project Settings → Edge Functions → Secrets** → Add:

| Name | Value |
|------|--------|
| `FIREBASE_SERVICE_ACCOUNT` | Pega **todo** el contenido del JSON descargado |

(Ya no uses `FCM_SERVER_KEY`; la función nueva no lo necesita.)

---

## Desplegar la function

Código actualizado: `supabase/functions/notify-call/index.ts`

**Desde el dashboard (sin PC):**  
Edge Functions → `notify-call` → pega el código → Deploy.

**Con CLI:**
```bash
supabase functions deploy notify-call
```

## Webhook

Database → Webhooks → Create:

- Table: `calls`
- Events: **Insert**
- Edge Function: `notify-call`

## SQL

Ejecuta `SQL-LLAMADAS.sql` si aún no (tablas `calls` + `device_tokens` + Realtime).

## APK

1. Sube el zip a tu repo (incluye `google-services.json`).
2. Actions → Build Android APK → Run.
3. Instala el APK → abre Reiny → acepta notificaciones.
4. Revisa tabla `device_tokens`: debe aparecer tu token.

## Prueba

Cierra Reiny del todo → otra cuenta te llama → debe llegar la notificación.

---

## Resumen de secrets

| Secret Supabase | Qué es |
|-----------------|--------|
| `FIREBASE_SERVICE_ACCOUNT` | JSON de la service account (Keys → JSON) |

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los pone Supabase solo en Edge Functions.
