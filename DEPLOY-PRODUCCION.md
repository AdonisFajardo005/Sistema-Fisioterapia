# 🚀 Guía de Deploy a Producción con Base de Datos Persistente

## Opción 1: Render (Recomendado - PostgreSQL incluido)

### Pasos:

1. **Sube tu código a GitHub** (ya está hecho ✅)

2. **Ve a [render.com](https://render.com) → Sign Up → GitHub**

3. **New + → Blueprint**
   - Selecciona tu repositorio `Sistema-Fisioterapia`
   - Render detectará automáticamente `render.yaml`
   - Se creará:
     - ✅ Servidor web (tu app)
     - ✅ Base de datos PostgreSQL (persistente, no se borra)

4. **Espera 5-10 minutos** a que termine el deploy

5. **Tu app estará en:** `https://dra-karen-fajardo.onrender.com`

### ⚠️ Importante:
- La base de datos PostgreSQL **NO se borra** con cada deploy
- Los datos persisten entre reinicios
- Plan gratuito: 90 días de base de datos, luego $7/mes

---

## Opción 2: Render + Neon (PostgreSQL gratis permanente)

### Paso 1: Crear base de datos en Neon

1. Ve a [neon.tech](https://neon.tech) → Sign Up con Google
2. Create a Project → Nombre: `fisioterapia`
3. Copia la **Connection String** que te dan:
   ```
   postgresql://user:password@ep-xyz123.us-east-1.neon.tech/mydb
   ```

### Paso 2: Deploy en Render

1. Ve a [render.com](https://render.com)
2. New + → Web Service
3. Conecta tu repositorio de GitHub
4. Configura:
   - **Name:** `dra-karen-fajardo`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`

5. **Agrega estas variables de entorno:**
   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://user:password@ep-xyz123.us-east-1.neon.tech/mydb
   SESSION_SECRET=cualquier-cadena-larga-aqui
   SESSION_MAX_AGE=86400000
   ```

6. Click **Create Web Service**

---

## Cómo funciona ahora tu app:

### En tu PC (desarrollo):
- Usa **SQLite** (`database.sqlite`)
- No necesitas PostgreSQL
- Funciona igual que antes

### En la nube (producción):
- Usa **PostgreSQL** (Neon o Render)
- Los datos **nunca se borran**
- Accesible desde cualquier lugar

La app detecta automáticamente cuál usar según la variable `DATABASE_URL`.

---

## Verificar que funciona:

1. Abre tu app en producción
2. Crea un paciente de prueba
3. Haz refresh de la página → El paciente debe seguir ahí ✅
4. Haz un nuevo deploy → El paciente debe seguir ahí ✅

---

## Notas:

- **Render gratis:** La app se duerme después de 15 min sin uso (tarda 30s en despertar)
- **Neon gratis:** 0.5 GB de almacenamiento, suficiente para miles de pacientes
- **Para producción real:** Considera planes pagos ($5-7/mes)
