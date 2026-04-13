/**
 * Configuración de la base de datos SQLite usando sql.js
 * Inicializa todas las tablas necesarias
 */

const initSqlJs = require('sql.js');
const fs = require('fs-extra');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
let db;
let SQL;

/**
 * Inicializa la conexión a la base de datos
 */
async function initialize() {
    SQL = await initSqlJs();
    
    // Cargar o crear base de datos
    try {
        if (fs.existsSync(DB_PATH)) {
            const buffer = fs.readFileSync(DB_PATH);
            db = new SQL.Database(buffer);
        } else {
            db = new SQL.Database();
        }
    } catch (e) {
        db = new SQL.Database();
    }
    
    await createTables();
    await createDefaultUser();
    saveDatabase();
    
    console.log('✓ Base de datos inicializada correctamente');
}

/**
 * Guarda la base de datos en disco
 */
function saveDatabase() {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
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
    getDb: () => ({ query, run, get, all, exec })
};
