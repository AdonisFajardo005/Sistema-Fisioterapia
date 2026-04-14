/**
 * Configuración de base de datos UNIVERSAL
 * Usa PostgreSQL en producción (nube) y SQLite en desarrollo (local)
 * 
 * Producción: DATABASE_URL en .env → PostgreSQL (sobrevive a deploys)
 * Desarrollo: Sin DATABASE_URL → SQLite local
 */

const path = require('path');
const bcrypt = require('bcryptjs');

// Interfaz abstracta para ambos adaptadores
class DatabaseAdapter {
    async initialize() { throw new Error('Not implemented'); }
    async query(sql, params = []) { throw new Error('Not implemented'); }
    async run(sql, params = []) { throw new Error('Not implemented'); }
    async get(sql, params = []) { throw new Error('Not implemented'); }
    async all(sql, params = []) { throw new Error('Not implemented'); }
    async exec(sql) { throw new Error('Not implemented'); }
    async close() { /* opcional */ }
}

// Adaptador PostgreSQL (producción)
class PostgreSQLAdapter extends DatabaseAdapter {
    constructor(connectionString) {
        super();
        const { Pool } = require('pg');
        this.pool = new Pool({
            connectionString,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    async initialize() {
        await this.createTables();
        await this.createDefaultUser();
        console.log('✓ Base de datos PostgreSQL inicializada');
    }

    async createTables() {
        const tables = [
            `CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS patients (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                cedula VARCHAR(255) UNIQUE,
                gender VARCHAR(50),
                marital_status VARCHAR(50),
                address TEXT,
                phone VARCHAR(50),
                email VARCHAR(255),
                age INTEGER,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS clinical_history (
                id SERIAL PRIMARY KEY,
                patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS treatments (
                id SERIAL PRIMARY KEY,
                patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
                description TEXT NOT NULL,
                session_notes TEXT,
                progress TEXT,
                next_steps TEXT,
                session_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS appointments (
                id SERIAL PRIMARY KEY,
                patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                time VARCHAR(10) NOT NULL,
                status VARCHAR(50) DEFAULT 'pendiente',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
                appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
                amount DECIMAL(10,2) NOT NULL,
                status VARCHAR(50) DEFAULT 'pendiente',
                payment_method VARCHAR(100),
                notes TEXT,
                payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS reminders (
                id SERIAL PRIMARY KEY,
                patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
                appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
                message TEXT NOT NULL,
                reminder_date DATE NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (const sql of tables) {
            await this.pool.query(sql);
        }
    }

    async createDefaultUser() {
        const result = await this.pool.query('SELECT COUNT(*) as count FROM users');
        const count = parseInt(result.rows[0].count);

        if (count === 0) {
            const hashedPassword = bcrypt.hashSync('karen2024', 10);
            await this.pool.query(
                'INSERT INTO users (username, password, name) VALUES ($1, $2, $3)',
                ['karen', hashedPassword, 'Dra. Karen Fajardo']
            );
            console.log('✓ Usuario por defecto creado (karen / karen2024)');
        }
    }

    async query(sql, params = []) {
        const result = await this.pool.query(sql, params);
        return result.rows;
    }

    async run(sql, params = []) {
        // Para INSERT, obtener el ID retornado
        if (sql.trim().toUpperCase().startsWith('INSERT')) {
            const result = await this.pool.query(sql + ' RETURNING id', params);
            return {
                lastInsertRowid: result.rows[0]?.id || null,
                changes: result.rowCount || 0
            };
        }
        
        const result = await this.pool.query(sql, params);
        return {
            lastInsertRowid: null,
            changes: result.rowCount || 0
        };
    }

    async get(sql, params = []) {
        const result = await this.pool.query(sql, params);
        return result.rows[0] || null;
    }

    async all(sql, params = []) {
        const result = await this.pool.query(sql, params);
        return result.rows;
    }

    async exec(sql) {
        await this.pool.query(sql);
    }

    async close() {
        await this.pool.end();
    }
}

// Adaptador SQLite (desarrollo)
class SQLiteAdapter extends DatabaseAdapter {
    constructor(initSqlJs, fs) {
        super();
        this.initSqlJs = initSqlJs;
        this.fs = fs;
        this.DB_PATH = path.join(__dirname, '..', 'database.sqlite');
        this.DB_BACKUP_PATH = path.join(__dirname, '..', 'database.backup.sqlite');
        this.db = null;
        this.SQL = null;
        this.isSaving = false;
        this.savePending = false;
    }

    async initialize() {
        this.SQL = await this.initSqlJs();

        let loadedSuccessfully = false;

        // Intentar cargar la base de datos principal
        try {
            if (this.fs.existsSync(this.DB_PATH)) {
                const buffer = this.fs.readFileSync(this.DB_PATH);
                this.db = new this.SQL.Database(buffer);
                
                if (this.verifyDatabaseIntegrity(this.db)) {
                    loadedSuccessfully = true;
                    console.log('✓ Base de datos SQLite cargada y verificada');
                } else {
                    console.warn('⚠ Base de datos principal corrupta');
                    this.db = null;
                }
            }
        } catch (e) {
            console.warn('⚠ Error al cargar base de datos principal:', e.message);
            this.db = null;
        }

        // Si falla, intentar cargar desde backup
        if (!loadedSuccessfully) {
            try {
                if (this.fs.existsSync(this.DB_BACKUP_PATH)) {
                    const buffer = this.fs.readFileSync(this.DB_BACKUP_PATH);
                    this.db = new this.SQL.Database(buffer);
                    
                    if (this.verifyDatabaseIntegrity(this.db)) {
                        loadedSuccessfully = true;
                        console.log('✓ Base de datos recuperada desde backup');
                        this.fs.copyFileSync(this.DB_BACKUP_PATH, this.DB_PATH);
                    } else {
                        this.db = null;
                    }
                }
            } catch (backupError) {
                console.warn('⚠ No se pudo cargar backup:', backupError.message);
            }
        }

        // Si ambos fallan, crear nueva base de datos
        if (!loadedSuccessfully || !this.db) {
            this.db = new this.SQL.Database();
            console.log('✓ Nueva base de datos SQLite creada');
        }

        await this.createTables();
        await this.createDefaultUser();
        this.saveDatabase();
        this.startAutoSave();

        console.log('✓ SQLite inicializado correctamente');
    }

    verifyDatabaseIntegrity(database) {
        try {
            const result = database.exec('SELECT name FROM sqlite_master WHERE type="table"');
            if (!result || !result[0]) return false;
            return true;
        } catch (error) {
            return false;
        }
    }

    startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            try {
                this.saveDatabase();
            } catch (error) {
                console.error('[AutoSave] Error:', error.message);
            }
        }, 30000);

        const originalSigint = process.listeners('SIGINT');
        process.on('SIGINT', () => {
            clearInterval(this.autoSaveInterval);
            this.saveDatabase();
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            clearInterval(this.autoSaveInterval);
            this.saveDatabase();
            process.exit(0);
        });
    }

    saveDatabase() {
        if (this.isSaving) {
            this.savePending = true;
            return;
        }

        this.isSaving = true;

        try {
            const data = this.db.export();
            const buffer = Buffer.from(data);
            const tempPath = this.DB_PATH + '.tmp';

            if (this.fs.existsSync(this.DB_PATH)) {
                try {
                    this.fs.copyFileSync(this.DB_PATH, this.DB_BACKUP_PATH);
                } catch (e) {
                    // ignore backup errors
                }
            }

            this.fs.writeFileSync(tempPath, buffer);

            if (!this.fs.existsSync(tempPath) || this.fs.statSync(tempPath).size === 0) {
                throw new Error('Archivo temporal vacío');
            }

            try {
                if (this.fs.existsSync(this.DB_PATH)) {
                    this.fs.unlinkSync(this.DB_PATH);
                }
                this.fs.renameSync(tempPath, this.DB_PATH);
            } catch (renameError) {
                this.fs.copyFileSync(tempPath, this.DB_PATH);
                this.fs.unlinkSync(tempPath);
            }
        } catch (error) {
            console.error('✗ Error al guardar SQLite:', error.message);
        } finally {
            this.isSaving = false;
            if (this.savePending) {
                this.savePending = false;
                this.saveDatabase();
            }
        }
    }

    async createTables() {
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

        tables.forEach(sql => this.db.run(sql));
    }

    async createDefaultUser() {
        const result = this.db.exec('SELECT COUNT(*) as count FROM users');
        const count = result[0]?.values[0][0] || 0;

        if (count === 0) {
            const hashedPassword = bcrypt.hashSync('karen2024', 10);
            this.db.run(
                'INSERT INTO users (username, password, name) VALUES (?, ?, ?)',
                ['karen', hashedPassword, 'Dra. Karen Fajardo']
            );
            console.log('✓ Usuario por defecto creado (karen / karen2024)');
        }
    }

    query(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            if (params.length > 0) stmt.bind(params);

            const results = [];
            while (stmt.step()) {
                results.push(stmt.getAsObject());
            }
            stmt.free();
            return results;
        } catch (error) {
            console.error('Error en query:', error);
            throw error;
        }
    }

    run(sql, params = []) {
        try {
            let lastID = 0;
            try {
                const beforeResult = this.db.exec('SELECT last_insert_rowid() as id');
                lastID = beforeResult[0]?.values[0][0] || 0;
            } catch (e) { /* ignore */ }

            this.db.run(sql, params);
            this.saveDatabase();

            try {
                const result = this.db.exec('SELECT last_insert_rowid() as id');
                lastID = result[0]?.values[0][0] || 0;
            } catch (e) { /* ignore */ }

            return { lastInsertRowid: lastID, changes: 1 };
        } catch (error) {
            console.error('Error en run:', error);
            throw error;
        }
    }

    get(sql, params = []) {
        const results = this.query(sql, params);
        return results[0] || null;
    }

    all(sql, params = []) {
        return this.query(sql, params);
    }

    exec(sql) {
        this.db.run(sql);
        this.saveDatabase();
    }
}

// ==================== EXPORT ====================

// Detectar modo y crear adaptador
let db;
const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL;

if (isProduction) {
    if (!process.env.DATABASE_URL) {
        console.error('❌ ERROR: DATABASE_URL no está definido en producción');
        process.exit(1);
    }
    db = new PostgreSQLAdapter(process.env.DATABASE_URL);
    console.log('🌐 Modo: PostgreSQL (producción)');
} else {
    const initSqlJs = require('sql.js');
    const fs = require('fs-extra');
    db = new SQLiteAdapter(initSqlJs, fs);
    console.log('💾 Modo: SQLite (desarrollo local)');
}

// Exportar funciones directas Y como getDb
module.exports = {
    initialize: () => db.initialize(),
    // Funciones directas (para usar en rutas)
    query: (...args) => db.query(...args),
    run: (...args) => db.run(...args),
    get: (...args) => db.get(...args),
    all: (...args) => db.all(...args),
    exec: (...args) => db.exec(...args),
    // También exportar como getDb (compatibilidad)
    getDb: () => ({
        query: (...args) => db.query(...args),
        run: (...args) => db.run(...args),
        get: (...args) => db.get(...args),
        all: (...args) => db.all(...args),
        exec: (...args) => db.exec(...args)
    }),
    saveDatabase: () => {
        if (db.saveDatabase) db.saveDatabase();
    },
    close: () => db.close(),
    isProduction
};
