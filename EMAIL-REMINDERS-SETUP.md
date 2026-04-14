# ⚡ Configuración de Recordatorios por Email

## ¿Qué hace el sistema?

Cada **5 minutos** el sistema revisa automáticamente si hay citas en la próxima hora y envía un email a la Dra. Karen con los detalles de la cita (paciente, hora, teléfono).

---

## Pasos para activarlo (5 minutos):

### 1. Crear cuenta en Resend (Gratis)

1. Ve a: **https://resend.com**
2. Clic en **"Sign Up"** → Usa tu Google (`adonisfajardo22@gmail.com`)
3. Ve a **API Keys** (en la barra lateral izquierda)
4. Clic en **"Create API Key"**
   - Name: `Sistema Fisioterapia`
   - Permisos: **Sending access**
5. Copia la API Key (se ve como: `re_xxxxxxxxxx`)

### 2. Agregar variables en Render

1. Ve a tu servicio en **Render** → **Environment**
2. Agrega estas 3 variables:

| Key | Value |
|-----|-------|
| `RESEND_API_KEY` | `re_xxxxxxxxxx` (la que copiaste) |
| `RESEND_FROM_EMAIL` | `onboarding@resend.dev` |
| `ADMIN_EMAIL` | `sofiafajardo155@gmail.com` |

3. Clic en **Save changes** → **Redeploy**

### 3. Configurar CronJob.org (Gratis)

1. Ve a: **https://cron-job.org**
2. Sign Up con Google
3. Clic en **"Create Cronjob"**
4. Configura:
   - **Title:** `Recordatorio Citas`
   - **URL:** `https://sistema-fisioterapia.onrender.com/api/reminders/check-email-reminders`
   - **Schedule:** Cada 5 minutos
   - **Method:** `POST`
5. Clic en **Create**

---

## ✅ Verificar que funciona

### Prueba manual:

1. Crea una cita en tu sistema para **dentro de 1 hora**
2. Abre tu navegador y ve a:
   ```
   https://sistema-fisioterapia.onrender.com/api/reminders/check-email-reminders
   ```
   (o usa Postman/Thunder Client para enviar un POST a esa URL)
3. Revisa tu correo (`sofiafajardo155@gmail.com`) → Debería llegar un email con los detalles de la cita

### Ver logs:

En Render → **Logs**, deberías ver cada 5 minutos:
```
⏰ [AutoCheck] Verificando citas próximas...
📧 [AutoCheck] 1 cita(s) próxima(s). Enviando emails...
✅ Email enviado: Nombre del Paciente
```

---

## 📧 Ejemplo del email que llega:

```
Asunto: 🏥 Recordatorio de Cita

Hola Dra. Karen,

Tiene una cita programada en 1 hora:

👤 Juan Pérez
🕐 Hora: 15:30
📅 Fecha: 2026-04-14
📞 Teléfono: 63581045
```

---

## ⚠️ Notas Importantes

- **Resend gratis:** 100 emails/día (más que suficiente para citas diarias)
- **CronJob.org gratis:** Verificación ilimitada cada 5 minutos
- **Si no configuras Resend:** El sistema funciona normal, solo no envía emails
- **El sistema también verifica automáticamente** cada 5 minutos mientras el servidor está activo

---

## 🔧 ¿Cómo funciona internamente?

1. **node-cron** ejecuta una tarea cada 5 minutos en el servidor
2. Consulta la base de datos: *"Dame citas de HOY entre ahora y +1 hora"*
3. Si encuentra citas, envía un email bonito con los detalles
4. **CronJob.org** despierta el servidor cada 5 minutos para que la verificación siempre funcione (incluso si nadie usa la app)
