# 📱 Guía de Deployment - Sistema Dra. Karen Fajardo

Esta guía te mostrará cómo subir tu aplicación a internet para que tus clientes puedan acceder desde cualquier dispositivo.

---

## 🚀 Opción 1: Render.com (GRATIS - RECOMENDADO)

### **Paso 1: Crear cuenta en GitHub**

1. Ve a https://github.com
2. Crea una cuenta gratuita (si no tienes una)
3. Verifica tu email

### **Paso 2: Subir tu código a GitHub**

1. Ve a https://github.com/new
2. Crea un nuevo repositorio:
   - Nombre: `sistema-fisioterapia` (o el que quieras)
   - Tipo: **Privado** (recomendado) o Público
   - NO marques "Initialize with README"
3. Haz clic en "Create repository"

4. En tu computadora, abre la terminal (CMD o PowerShell) y ejecuta:

```bash
cd C:\Users\adoni\Downloads\sofia

# Inicializar git (si no lo has hecho)
git init

# Agregar todos los archivos
git add .

# Crear primer commit
git commit -m "Primera versión del sistema"

# Conectar con GitHub (REEMPLAZA con tu usuario y repositorio)
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git

# Subir el código
git push -u origin main
```

**Nota:** Si te pide hacer login en GitHub, sigue las instrucciones en la terminal.

### **Paso 3: Crear cuenta en Render**

1. Ve a https://render.com
2. Haz clic en "Get Started for Free"
3. Inicia sesión con tu cuenta de GitHub
4. Autoriza la conexión

### **Paso 4: Crear el servicio web**

1. En el dashboard de Render, haz clic en **"New +"** → **"Web Service"**
2. Selecciona tu repositorio `sistema-fisioterapia`
3. Configura:
   - **Name:** `sistema-fisioterapia` (o el que quieras)
   - **Region:** El más cercano a tu ubicación (ej: Oregon, Frankfurt)
   - **Branch:** `main`
   - **Root Directory:** Déjalo vacío
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** **Free**

4. Haz clic en **"Advanced"** y agrega estas variables de entorno:
   - `NODE_ENV` = `production`
   - `SESSION_SECRET` = (genera uno en https://generate-secret.vercel.app/64)
   - `SESSION_MAX_AGE` = `86400000`

5. Haz clic en **"Create Web Service"**

### **Paso 5: ¡Listo!**

Render te dará una URL como:
```
https://sistema-fisioterapia.onrender.com
```

**¡Comparte esta URL con tu cliente!** Puede acceder desde cualquier dispositivo.

---

## 🌐 Opción 2: Railway.app (GRATIS)

### **Paso 1: Crear cuenta**

1. Ve a https://railway.app
2. Inicia sesión con GitHub

### **Paso 2: Crear proyecto**

1. Haz clic en **"New Project"**
2. Selecciona **"Deploy from GitHub repo"**
3. Elige tu repositorio

### **Paso 3: Configurar**

Railway detectará automáticamente que es Node.js. Solo agrega las variables de entorno:
- `NODE_ENV` = `production`
- `SESSION_SECRET` = (genera uno nuevo)

### **Paso 4: Deploy**

Railway te dará una URL automática. ¡Listo!

---

## ☁️ Opción 3: Fly.io (GRATIS)

### **Paso 1: Instalar Fly CLI**

1. Descarga desde https://fly.io/docs/hands-on/install-flyctl/
2. Abre terminal y ejecuta: `flyctl auth signup`

### **Paso 2: Inicializar app**

```bash
cd C:\Users\adoni\Downloads\sofia
flyctl launch
```

Sigue las instrucciones en pantalla.

### **Paso 3: Deploy**

```bash
flyctl deploy
```

---

## 🔧 Preparación del Código

Tu aplicación YA está lista para producción. Incluye:

✅ **Variables de entorno** configuradas  
✅ **Archivos de configuración** (.env.example, Procfile, render.yaml)  
✅ **Seguridad** para sesiones en producción  
✅ **Scripts** de producción en package.json  
✅ **.gitignore** correcto (no sube archivos sensibles)  

---

## 🔐 Seguridad - IMPORTANTE

### **ANTES de subir a producción:**

1. **Cambia el usuario y contraseña por defecto:**
   - Usuario actual: `karen`
   - Contraseña actual: `karen2024`
   
   **Cámbialo desde la aplicación después del primer login.**

2. **Genera un SESSION_SECRET nuevo:**
   - Ve a https://generate-secret.vercel.app/64
   - Copia el valor generado
   - Úsalo en las variables de entorno

3. **NUNCA subas el archivo `.env` a GitHub:**
   - El archivo `.env` ya está en `.gitignore`
   - Solo sube `.env.example` (sin valores reales)

---

## 📋 Checklist Antes del Deploy

- [ ] Código subido a GitHub
- [ ] Cuenta creada en Render/Railway/Fly
- [ ] Variables de entorno configuradas
- [ ] SESSION_SECRET generado y seguro
- [ ] Usuario/contraseña cambiados
- [ ] URL de producción probada

---

## 🎯 Después del Deploy

### **Compartir con tu cliente:**

1. **Envía la URL** por WhatsApp/email
2. **Credenciales de acceso:**
   - Usuario: (el que configuraste)
   - Contraseña: (la que configuraste)

3. **Tu cliente puede:**
   - Acceder desde cualquier celular/tablet/computadora
   - Usar la app como si estuviera instalada
   - Agregar la página a "Inicio" en su celular (como una app)

### **Para agregar a pantalla de inicio (Android/iPhone):**

**Android (Chrome):**
1. Abre la URL en Chrome
2. Toca los 3 puntos (⋮) → "Agregar a pantalla principal"

**iPhone (Safari):**
1. Abre la URL en Safari
2. Toca el botón compartir (⬆️)
3. Selecciona "Agregar a inicio"

---

## 🔄 Actualizar la Aplicación

Cuando hagas cambios:

```bash
cd C:\Users\adoni\Downloads\sofia

# Agregar cambios
git add .
git commit -m "Descripción de los cambios"

# Subir a GitHub
git push

# ¡Render/Railway actualizará automáticamente!
```

---

## 🆘 Solución de Problemas

### **La app no carga en Render:**

1. Ve al dashboard de Render
2. Selecciona tu servicio
3. Haz clic en **"Logs"**
4. Busca errores en los logs

### **Error de base de datos:**

- La base de datos SQLite se crea automáticamente
- Si hay problemas, revisa los logs

### **Errores de sesión:**

- Verifica que `SESSION_SECRET` esté configurado
- Verifica que `NODE_ENV=production`

---

## 📞 ¿Necesitas Ayuda?

- **Render Docs:** https://render.com/docs
- **Railway Docs:** https://docs.railway.app
- **Node.js Docs:** https://nodejs.org/docs

---

## ✅ ¡Listo!

Tu aplicación está lista para producción. Sigue los pasos arriba y tu cliente podrá acceder desde cualquier dispositivo.

**URL de producción:** _(la que te dará el servicio de hosting)_

**Usuario:** _(el que configures)_

**Contraseña:** _(la que configures)_

---

**¡Buena suerte! 🚀**
