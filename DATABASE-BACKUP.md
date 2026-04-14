# Sistema de Respaldo de Base de Datos - Protección Máxima

## 📋 Descripción
La aplicación utiliza un sistema de respaldo **bulletproof** para prevenir CUALQUIER pérdida de datos en la base de datos SQLite.

## 🛡️ Capas de Protección

### 1️⃣ Guardado Inmediato (Primera línea de defensa)
- **Cuándo**: Después de CADA operación de escritura (INSERT, UPDATE, DELETE)
- **Propósito**: Garantizar que ningún cambio se pierda
- **Función**: `run()` en `config/database.js`

### 2️⃣ Escritura Atómica (Protección contra corrupción)
- **Proceso**:
  1. Escribe a archivo temporal (`database.sqlite.tmp`)
  2. Verifica que el archivo es válido
  3. Crea backup del archivo actual
  4. Reemplaza el archivo principal de forma atómica
- **Beneficio**: Si el proceso se interrumpe durante la escritura, NO se corrompe el archivo

### 3️⃣ Backup Automático (Red de seguridad)
- **Archivo principal**: `database.sqlite`
- **Archivo de backup**: `database.backup.sqlite`
- **Cuándo**: Antes de cada guardado
- **Beneficio**: Si el archivo principal se daña, hay una copia válida

### 4️⃣ Guardado Periódico (Última línea de defensa)
- **Intervalo**: Cada 30 segundos
- **Propósito**: Capturar cambios que pudieron no guardarse
- **Logs**: `[AutoSave] ✓ Base de datos guardada automáticamente`

### 5️⃣ Verificación de Integridad (Al iniciar)
- **Cuándo**: Cada vez que se inicia el servidor
- **Proceso**:
  1. Intenta cargar `database.sqlite`
  2. Verifica que sea válido (consulta tablas)
  3. Si falla, intenta cargar `database.backup.sqlite`
  4. Si ambos fallan, crea nueva base de datos

### 6️⃣ Cierre Graceful (Shutdown seguro)
- **Señales**: SIGINT (Ctrl+C), SIGTERM
- **Acción**: Guarda la base de datos antes de cerrar
- **Logs**: `✓ Base de datos guardada antes de cerrar`

## 🔧 Cómo funciona el guardado atómico

```
1. Exportar base de datos en memoria → Buffer
2. Crear backup: database.sqlite → database.backup.sqlite
3. Escribir buffer → database.sqlite.tmp
4. Verificar que .tmp no está vacío
5. Eliminar database.sqlite (si existe)
6. Renombrar database.sqlite.tmp → database.sqlite
```

**Ventaja**: Si el proceso se interrumpe en el paso 3-4, el archivo original sigue intacto.

## 📊 Resumen de archivos

| Archivo | Propósito | ¿Se pierde? |
|---------|-----------|-------------|
| `database.sqlite` | Base de datos principal | No (escritura atómica) |
| `database.backup.sqlite` | Última copia válida | No (se crea antes de cada guardado) |
| `database.sqlite.tmp` | Archivo temporal | Sí (se elimina después) |

## ⚠️ Importante

### En Producción (Render, Heroku, etc.)
El sistema de archivos en plataformas cloud es **efímero**. Los archivos se pierden en cada deploy. Para producción, considera:
- ✅ Usar una base de datos externa (PostgreSQL, MySQL)
- ✅ Configurar backups automáticos a un servicio de almacenamiento cloud (S3, Google Drive)
- ✅ Usar un servicio de base de datos gestionado (AWS RDS, Supabase, Neon)

### En Local (Tu PC)
Los datos están protegidos con 6 capas de seguridad. Los archivos se mantienen en:
- `database.sqlite` - Base de datos principal
- `database.backup.sqlite` - Última copia de seguridad

## 🔍 Monitoreo

### Ver logs de guardado automático
```bash
# En Windows
node server.js | findstr "AutoSave"

# En Linux/Mac
node server.js | grep "AutoSave"
```

### Verificar archivos de base de datos
```bash
# Windows
dir database*.sqlite

# Linux/Mac
ls -lh database*.sqlite
```

## 🛠️ Configuración

### Cambiar intervalo de guardado automático
En `config/database.js`, modifica esta línea:

```javascript
autoSaveInterval = setInterval(() => {
    saveDatabase();
}, 30000); // Cambia 30000 (30 segundos) por el valor deseado
```

### Desactivar guardado automático (NO RECOMENDADO)
Comenta la llamada a `startAutoSave()` en la función `initialize()`.

## 📝 Notas
- ✅ Cada operación de escritura guarda INMEDIATAMENTE
- ✅ Escritura atómica protege contra corrupción de archivos
- ✅ Backup automático antes de cada guardado
- ✅ Verificación de integridad al iniciar
- ✅ Recuperación automática si algo falla
- ✅ Los archivos de backup NO están incluidos en git (ver `.gitignore`)
- ✅ Sistema anti-concurrencia: evita guardados simultáneos

## 🎯 Garantía

Con este sistema, los datos **JAMÁS** deberían perderse a menos que:
1. Se eliminen manualmente ambos archivos (`database.sqlite` y `database.backup.sqlite`)
2. Haya un fallo de hardware (disco duro dañado)
3. Se deploye a una plataforma cloud sin base de datos externa
