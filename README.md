# Dra. Karen Fajardo - Sistema de Gestión de Fisioterapia

Un sistema web completo, mobile-first, diseñado para la gestión de pacientes, citas, tratamientos y pagos de fisioterapia.

## 📱 Características

- ✅ **Diseño Mobile-First**: Optimizado para uso desde celular
- ✅ **Modo Claro/Oscuro**: Cambio de tema según preferencia
- ✅ **Autenticación Segura**: Sistema de login con sesiones
- ✅ **Gestión de Pacientes**: Crear, editar, eliminar y ver historial completo
- ✅ **Historial Clínico**: Registro de diagnósticos, síntomas y observaciones
- ✅ **Agenda de Citas**: Programación con estados (pendiente/completada/cancelada)
- ✅ **Tratamientos**: Notas de sesión, progreso y próximos pasos
- ✅ **Control de Pagos**: Registro con estados (pagado/pendiente)
- ✅ **Notificaciones**: Sistema de recordatorios internos
- ✅ **Dashboard**: Resumen general con estadísticas

## 🚀 Instalación y Ejecución Paso a Paso

### Prerrequisitos

Necesitas tener instalado:
- **Node.js** (versión 16 o superior)
- **Visual Studio Code** (recomendado)

### Paso 1: Abrir el proyecto en Visual Studio Code

1. Abre Visual Studio Code
2. Ve a `Archivo > Abrir carpeta...`
3. Selecciona la carpeta donde está el proyecto: `C:\Users\adoni\Downloads\sofia`

### Paso 2: Abrir la terminal

En Visual Studio Code:
1. Ve al menú `Terminal > Nueva terminal` (o presiona `` Ctrl+` ``)
2. Se abrirá una terminal en la parte inferior

### Paso 3: Instalar dependencias

En la terminal, ejecuta:

```bash
npm install
```

Esto instalará todas las librerías necesarias (Express, SQLite, etc.). Espera a que termine (puede tardar 1-2 minutos).

### Paso 4: Iniciar el servidor

Una vez instaladas las dependencias, ejecuta:

```bash
npm start
```

Verás un mensaje como este:

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   Dra. Karen Fajardo - Sistema de Gestión                ║
║   Servidor ejecutándose en http://localhost:3000          ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

✓ Base de datos inicializada correctamente
✓ Usuario por defecto creado (karen / karen2024)
```

### Paso 5: Abrir la aplicación

1. Abre tu navegador (Chrome, Firefox, Edge, etc.)
2. Ve a: **http://localhost:3000**
3. Serás redirigido a la página de login

### Paso 6: Iniciar sesión

Usa las credenciales por defecto:
- **Usuario:** `karen`
- **Contraseña:** `karen2024`

¡Listo! Ya puedes usar el sistema.

## 📂 Estructura del Proyecto

```
sofia/
├── config/
│   └── database.js          # Configuración de base de datos SQLite
├── routes/
│   ├── auth.js              # Rutas de autenticación
│   ├── patients.js          # Gestión de pacientes
│   ├── appointments.js      # Gestión de citas
│   ├── treatments.js        # Tratamientos y historial clínico
│   ├── payments.js          # Control de pagos
│   └── reminders.js         # Sistema de recordatorios
├── public/
│   ├── css/
│   │   └── styles.css       # Estilos principales (mobile-first)
│   ├── js/
│   │   ├── app.js           # Lógica principal de la aplicación
│   │   └── login.js         # Lógica del login
│   ├── index.html           # Página principal (dashboard)
│   └── login.html           # Página de login
├── server.js                # Servidor principal Express
├── package.json             # Dependencias del proyecto
├── database.sqlite          # Base de datos (se crea automáticamente)
└── README.md                # Este archivo
```

## 🎨 Uso del Sistema

### Dashboard
- Vista resumen con estadísticas principales
- Citas del día y próximas citas
- Total de pacientes, citas pendientes y pagos pendientes

### Pacientes
1. Haz clic en **"Nuevo Paciente"**
2. Completa los campos: nombre, teléfono, email, edad, notas
3. Haz clic en **"Guardar"**
4. Para ver el historial completo, haz clic en **"Ver Historial"**

### Citas
1. Haz clic en **"Nueva Cita"**
2. Selecciona el paciente
3. Elige fecha y hora
4. Agrega notas (opcional)
5. Puedes cambiar el estado: Pendiente → Completada o Cancelada

### Tratamientos
1. Haz clic en **"Nuevo Tratamiento"**
2. Selecciona el paciente
3. Agrega descripción, notas de sesión, progreso y próximos pasos

### Pagos
1. Haz clic en **"Nuevo Pago"**
2. Selecciona el paciente
3. Ingresa el monto, estado, método de pago y notas
4. Puedes marcar como "Pagado" los pagos pendientes

### Notificaciones
- Haz clic en el ícono de campana 🔔 en la parte superior
- Verás los recordatorios de citas
- Puedes marcar todo como leído

### Cambio de Tema
- Haz clic en el ícono de sol/luna ☀️🌙 en la parte superior
- El tema se guarda automáticamente

## 🛠️ Modo Desarrollo (Opcional)

Si deseas que el servidor se reinicie automáticamente cuando hagas cambios:

```bash
npm run dev
```

Esto usa `nodemon` para reinicio automático.

## 📊 Base de Datos

- El sistema usa **SQLite** (base de datos ligera)
- La base de datos se crea automáticamente en `database.sqlite`
- No necesitas instalar ningún servidor de base de datos
- El usuario por defecto se crea automáticamente

## 🔒 Seguridad

- Contraseñas encriptadas con bcrypt
- Sesiones seguras con express-session
- Protección de rutas con middleware de autenticación

## 🌐 Acceso desde otros dispositivos

Si deseas acceder desde tu celular u otro dispositivo en la misma red:

1. Obtén tu IP local:
   - Windows: Ejecuta `ipconfig` en la terminal
   - Busca "Dirección IPv4" (ej: 192.168.1.100)

2. Accede desde el otro dispositivo:
   - `http://192.168.1.100:3000` (reemplaza con tu IP)

## ⚙️ Configuración Avanzada

### Cambiar el puerto

Edita `server.js` y cambia:
```javascript
const PORT = process.env.PORT || 3000;
```

O usa variable de entorno:
```bash
$env:PORT=4000  # PowerShell
npm start
```

### Cambiar credenciales de acceso

Edita `config/database.js` y modifica:
```javascript
insert.run('karen', hashedPassword, 'Dra. Karen Fajardo');
```

## 🐛 Solución de Problemas

### Error: "EADDRINUSE"
El puerto 3000 ya está en uso. Cambia el puerto o cierra la otra aplicación.

### Error: "Cannot find module"
Ejecuta nuevamente `npm install`

### La base de datos no se crea
Asegúrate de tener permisos de escritura en la carpeta

### No puedo iniciar sesión
Verifica las credenciales:
- Usuario: `karen`
- Contraseña: `karen2024`

## 📝 Notas

- El sistema funciona completamente offline
- Todos los datos se guardan localmente en `database.sqlite`
- Para respaldo, copia el archivo `database.sqlite`
- **Importante:** La primera vez que se ejecuta, el sistema crea automáticamente la base de datos y el usuario por defecto

## ✅ Estado del Sistema

**✓ Sistema completamente funcional y probado**
- Servidor ejecutándose correctamente
- Base de datos SQLite operativa
- Autenticación funcionando
- Todas las APIs REST operacionales
- Frontend responsive listo

## 👩‍⚕️ Desarrollado para

**Dra. Karen Fajardo** - Fisioterapeuta

Sistema de gestión de pacientes, citas, tratamientos y pagos.

---

**Versión:** 1.0.0  
**Tecnologías:** Node.js, Express, SQLite, HTML/CSS/JS  
**Licencia:** MIT
