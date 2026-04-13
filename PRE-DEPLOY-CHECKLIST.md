# ✅ Checklist Pre-Deployment

Usa esta lista antes de subir tu aplicación a producción.

---

## 📋 Archivos Creados

- [x] `.env.example` - Variables de entorno de ejemplo
- [x] `.env` - Variables de entorno locales (NO SUBIR A GITHUB)
- [x] `Procfile` - Archivo de configuración para Render/Heroku
- [x] `render.yaml` - Configuración automática para Render.com
- [x] `DEPLOYMENT.md` - Guía completa de deployment
- [x] `PRE-DEPLOY-CHECKLIST.md` - Este archivo

## 🔧 Archivos Modificados

- [x] `server.js` - Configuración de producción y variables de entorno
- [x] `package.json` - Scripts y dependencias actualizadas
- [x] `.gitignore` - Excluye archivos sensibles

---

## ✅ Verificaciones Antes del Deploy

### 1. **Dependencias Instaladas**
```bash
npm install
```
- [x] Todas las dependencias instaladas correctamente
- [x] `dotenv` agregado como dependencia

### 2. **Servidor Funciona Localmente**
```bash
npm start
```
- [x] El servidor inicia sin errores
- [x] Página de login carga en `http://localhost:3000/login.html`
- [x] Dashboard carga correctamente
- [x] Historial clínico funciona

### 3. **Variables de Entorno**
- [x] `.env` creado con valores de desarrollo
- [x] `.env.example` creado con valores de ejemplo
- [x] `.env` agregado al `.gitignore`

### 4. **Seguridad**
- [ ] Cambiar usuario y contraseña por defecto (`karen` / `karen2024`)
- [ ] Generar nuevo `SESSION_SECRET` para producción
- [x] Cookies de sesión configuradas para HTTPS en producción

### 5. **Git**
- [ ] Repositorio creado en GitHub
- [ ] Código subido con `git push`
- [ ] Verificar que `.env` NO se subió a GitHub

---

## 🚀 Pasos para Deploy

### **Opción 1: Render.com (Recomendado)**

1. Ve a https://render.com
2. Inicia sesión con GitHub
3. New + → Web Service
4. Selecciona tu repositorio
5. Configura:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
6. Agrega variables de entorno:
   - `NODE_ENV` = `production`
   - `SESSION_SECRET` = (genera uno en https://generate-secret.vercel.app/64)
   - `SESSION_MAX_AGE` = `86400000`
7. Create Web Service
8. ¡Listo! Usa la URL que te dan

### **Opción 2: Railway.app**

1. Ve a https://railway.app
2. New Project → Deploy from GitHub repo
3. Railway detectará Node.js automáticamente
4. Agrega variables de entorno
5. ¡Deploy!

---

## 🧪 Pruebas Post-Deploy

Después de subir la aplicación, verifica:

- [ ] La página de login carga en la URL de producción
- [ ] Puedes iniciar sesión con tus credenciales
- [ ] El dashboard muestra correctamente
- [ ] Puedes crear pacientes
- [ ] Puedes crear citas
- [ ] Puedes ver el historial clínico
- [ ] Puedes crear tratamientos
- [ ] Puedes gestionar pagos
- [ ] La sesión funciona correctamente (no se cierra sola)
- [ ] Funciona en el celular

---

## 📱 Compartir con tu Cliente

Una vez verificado todo:

1. **Envía la URL** por WhatsApp o email
2. **Envía las credenciales:**
   - Usuario: _(el que configuraste)_
   - Contraseña: _(la que configuraste)_
3. **Instrucciones para el cliente:**
   - Abrir la URL en el navegador del celular
   - Iniciar sesión
   - Opcional: Agregar a pantalla de inicio como una app

---

## 🔄 Actualizaciones Futuras

Cada vez que hagas cambios:

```bash
git add .
git commit -m "Descripción de los cambios"
git push
```

El servicio de hosting actualizará automáticamente la aplicación.

---

## 🆘 Si Algo Sale Mal

1. **Revisa los logs** en el dashboard del servicio de hosting
2. **Verifica las variables de entorno** estén configuradas
3. **Prueba localmente** con `npm start`
4. **Consulta la guía** en `DEPLOYMENT.md`

---

## ✨ ¡Tu App Está Lista!

Todos los archivos necesarios están creados y verificados. 
Solo sigue los pasos en `DEPLOYMENT.md` para subirla a internet.

**¡Éxito! 🚀**
