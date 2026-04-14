/**
 * Configuración de la base de datos SQLite usando sql.js
 * Inicializa todas las tablas necesarias
 */

const initSqlJs = require('sql.js');
const fs = require('fs-extra');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
const DB_BACKUP_PATH = path.join(__dirname, '..', 'database.backup.sqlite');
let db;
let SQL;

/**
 * Verifica la integridad de la base de datos
 */
function verifyDatabaseIntegrity(database) {
    try {
        // Intentar ejecutar una consulta simple
        const result = database.exec('SELECT name FROM sqlite_master WHERE type="table"');
        if (!result || !result[0]) {
            return false;
        }
        
        const tables = result[0].values.map(row => row[0]);
        console.log('  Tablas encontradas:', tables.join(', '));
        return tables.length > 0;
    } catch (error) {
        console.error('  Error de integridad:', error.message);
        return false;
    }
}

/**
 * Inicializa la conexión a la base de datos
 */
async function initialize() {
    SQL = await initSqlJs();

    // Cargar o crear base de datos con recuperación automática
    let loadedSuccessfully = false;

    // Intentar cargar la base de datos principal
    try {
        if (fs.existsSync(DB_PATH)) {
            console.log('📂 Cargando base de datos principal...');
            const buffer = fs.readFileSync(DB_PATH);
            db = new SQL.Database(buffer);
            
            // Verificar integridad
            if (verifyDatabaseIntegrity(db)) {
                loadedSuccessfully = true;
                console.log('✓ Base de datos principal cargada y verificada');
            } else {
                console.warn('⚠ Base de datos principal corrupta');
                db = null;
            }
        }
    } catch (e) {
        console.warn('⚠ Error al cargar base de datos principal:', e.message);
        db = null;
    }

    // Si falla, intentar cargar desde backup
    if (!loadedSuccessfully) {
        try {
            if (fs.existsSync(DB_BACKUP_PATH)) {
                console.log('📂 Intentando recuperar desde backup...');
                const buffer = fs.readFileSync(DB_BACKUP_PATH);
                db = new SQL.Database(buffer);
                
                if (verifyDatabaseIntegrity(db)) {
                    loadedSuccessfully = true;
                    console.log('✓ Base de datos recuperada desde backup exitosamente');
                    
                    // Restaurar backup como base de datos principal
                    fs.copyFileSync(DB_BACKUP_PATH, DB_PATH);
                } else {
                    console.warn('⚠ Backup también está corrupto');
                    db = null;
                }
            }
        } catch (backupError) {
            console.warn('⚠ No se pudo cargar backup:', backupError.message);
        }
    }

    // Si ambos fallan, crear nueva base de datos
    if (!loadedSuccessfully || !db) {
        db = new SQL.Database();
        console.log('✓ Nueva base de datos creada en memoria');
    }

    await createTables();
    await createDefaultUser();
    saveDatabase();

    // Iniciar guardado automático cada 30 segundos
    startAutoSave();

    console.log('✓ Base de datos inicializada correctamente');
}

/**
 * Inicia el guardado automático periódico
 */
let autoSaveInterval;
function startAutoSave() {
    // Guardar cada 30 segundos como red de seguridad
    autoSaveInterval = setInterval(() => {
        try {
            saveDatabase();
            console.log('[AutoSave] ✓ Base de datos guardada automáticamente');
        } catch (error) {
            console.error('[AutoSave] ✗ Error al guardar automáticamente:', error.message);
        }
    }, 30000); // 30 segundos
    
    // Limpiar intervalo al cerrar el proceso
    process.on('SIGINT', () => {
        clearInterval(autoSaveInterval);
        saveDatabase();
        console.log('\n✓ Base de datos guardada antes de cerrar');
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        clearInterval(autoSaveInterval);
        saveDatabase();
        console.log('\n✓ Base de datos guardada antes de cerrar (SIGTERM)');
        process.exit(0);
    });
}

/**
 * Guarda la base de datos en disco con backup automático y escritura atómica
 */
let isSaving = false;
let savePending = false;

function saveDatabase() {
    // Evitar guardados simultáneos
    if (isSaving) {
        savePending = true;
        return;
    }
    
    isSaving = true;
    
    try {
        const data = db.export();
        const buffer = Buffer.from(data);
        
        // Escritura atómica: escribir a archivo temporal primero
        const tempPath = DB_PATH + '.tmp';
        
        // Crear backup del archivo actual antes de sobrescribir
        if (fs.existsSync(DB_PATH)) {
            try {
                fs.copyFileSync(DB_PATH, DB_BACKUP_PATH);
            } catch (backupError) {
                console.warn('⚠ No se pudo crear backup:', backupError.message);
            }
        }
        
        // Escribir a archivo temporal
        fs.writeFileSync(tempPath, buffer);
        
        // Verificar que el archivo temporal es válido
        if (!fs.existsSync(tempPath) || fs.statSync(tempPath).size === 0) {
            throw new Error('El archivo temporal está vacío o no se creó');
        }
        
        // Reemplazar archivo principal (atômico en la mayoría de sistemas operativos)
        try {
            if (fs.existsSync(DB_PATH)) {
                fs.unlinkSync(DB_PATH);
            }
            fs.renameSync(tempPath, DB_PATH);
        } catch (renameError) {
            // Si rename falla, copiar contenido
            fs.copyFileSync(tempPath, DB_PATH);
            fs.unlinkSync(tempPath);
        }
        
    } catch (error) {
        console.error('✗ Error CRÍTICO al guardar la base de datos:', error.message);
        // No relanzar - mejor perder un guardado que crash la app
        // El auto-save lo intentará de nuevo en 30 segundos
    } finally {
        isSaving = false;
        
        // Si hay un guardado pendiente, ejecutarlo
        if (savePending) {
            savePending = false;
            saveDatabase();
        }
    }
}

/**
 * Crea todas las tablas necesarias
 */
async function createTables() {
    const tables = [
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            cedula TEXT UNIQUE,
            gender TEXT,
            marital_status TEXT,
            address TEXT,
            phone TEXT,
            email TEXT,
            age INTEGER,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS clinical_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            personal_history TEXT,
            pathological_history TEXT,
            pain_scale INTEGER,
            nutrition TEXT,
            hydration TEXT,
            sleep TEXT,
            physical_activity TEXT,
            surgeries TEXT,
            consultation_reason TEXT,
            previous_injuries TEXT,
            diagnosis TEXT,
            symptoms TEXT,
            observations TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS treatments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            description TEXT NOT NULL,
            session_notes TEXT,
            progress TEXT,
            next_steps TEXT,
            session_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            status TEXT DEFAULT 'pendiente',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            appointment_id INTEGER,
            amount REAL NOT NULL,
            status TEXT DEFAULT 'pendiente',
            payment_method TEXT,
            notes TEXT,
            payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
        )`,
        `CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER,
            appointment_id INTEGER,
            message TEXT NOT NULL,
            reminder_date TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
        )`
    ];
    
    tables.forEach(sql => {
        db.run(sql);
    });
}

/**
 * Crea el usuario por defecto (Dra. Karen Fajardo)
 */
async function createDefaultUser() {
    const result = db.exec('SELECT COUNT(*) as count FROM users');
    const count = result[0]?.values[0][0] || 0;
    
    if (count === 0) {
        const hashedPassword = bcrypt.hashSync('karen2024', 10);
        db.run(
            'INSERT INTO users (username, password, name) VALUES (?, ?, ?)',
            ['karen', hashedPassword, 'Dra. Karen Fajardo']
        );
        console.log('✓ Usuario por defecto creado (karen / karen2024)');
    }
}

/**
 * Ejecuta una consulta que retorna resultados
 */
function query(sql, params = []) {
    try {
        const stmt = db.prepare(sql);
        if (params.length > 0) {
            stmt.bind(params);
        }
        
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    } catch (error) {
        console.error('Error en query:', error, sql);
        throw error;
    }
}

/**
 * Ejecuta una consulta que no retorna resultados (INSERT, UPDATE, DELETE)
 */
function run(sql, params = []) {
    try {
        // Get lastInsertRowID before executing
        let lastID = 0;
        let changes = 0;
        
        try {
            const beforeResult = db.exec('SELECT last_insert_rowid() as id');
            lastID = beforeResult[0]?.values[0][0] || 0;
        } catch (e) {
            // ignore
        }
        
        db.run(sql, params);
        saveDatabase();

        // Get lastInsertRowID after executing
        try {
            const result = db.exec('SELECT last_insert_rowid() as id');
            lastID = result[0]?.values[0][0] || 0;
        } catch (e) {
            // ignore
        }

        return { lastInsertRowid: lastID, changes: 1 };
    } catch (error) {
        console.error('Error en run:', error, sql);
        throw error;
    }
}

/**
 * Obtiene un solo registro
 */
function get(sql, params = []) {
    const results = query(sql, params);
    return results[0] || null;
}

/**
 * Obtiene todos los registros
 */
function all(sql, params = []) {
    return query(sql, params);
}

/**
 * Ejecuta SQL directamente
 */
function exec(sql) {
    db.run(sql);
    saveDatabase();
}

module.exports = {
    initialize,
    saveDatabase,
    getDb: () => ({ query, run, get, all, exec })
};
