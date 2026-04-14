/**
 * Configuración de base de datos UNIVERSAL
 * PostgreSQL en producción (Neon) / SQLite en desarrollo local
 * Convierte automáticamente ? a $1, $2 para PostgreSQL
 */

const path = require('path');
const bcrypt = require('bcryptjs');

// ==================== PostgreSQL Adapter ====================
class PGDatabase {
    constructor(connectionString) {
        const { Pool } = require('pg');
        this.pool = new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false }
        });
        this.name = 'PostgreSQL';
    }

    /**
     * Convierte ? a $1, $2, $3 para PostgreSQL
     */
    _convert(sql, params = []) {
        let converted = sql;
        let paramIndex = 1;
        // Reemplazar ? por $1, $2, etc. (manejar strings dentro de la query)
        let inString = false;
        let escape = false;
        let result = '';
        
        for (let i = 0; i < converted.length; i++) {
            const char = converted[i];
            
            if (escape) {
                result += char;
                escape = false;
                continue;
            }
            
            if (char === '\\') {
                escape = true;
                result += char;
                continue;
            }
            
            if (char === "'") {
                inString = !inString;
                result += char;
                continue;
            }
            
            if (!inString && char === '?') {
                result += '$' + paramIndex++;
            } else {
                result += char;
            }
        }
        
        return { sql: result, params };
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
        const { sql, params } = this._convert('SELECT COUNT(*) FROM users', []);
        const result = await this.pool.query(sql, params);
        const count = parseInt(result.rows[0].count);
        if (count === 0) {
            const hashedPassword = bcrypt.hashSync('karen2024', 10);
            const { sql: insertSql, params: insertParams } = this._convert(
                'INSERT INTO users (username, password, name) VALUES (?, ?, ?)',
                ['karen', hashedPassword, 'Dra. Karen Fajardo']
            );
            await this.pool.query(insertSql, insertParams);
            console.log('✓ Usuario por defecto creado (karen / karen2024)');
        }
    }

    async query(sql, params = []) {
        const { sql: convertedSql, params: convertedParams } = this._convert(sql, params);
        const result = await this.pool.query(convertedSql, convertedParams);
        return result.rows;
    }

    async run(sql, params = []) {
        const { sql: convertedSql, params: convertedParams } = this._convert(sql, params);
        if (sql.trim().toUpperCase().startsWith('INSERT')) {
            const result = await this.pool.query(convertedSql + ' RETURNING id', convertedParams);
            return { lastInsertRowid: result.rows[0]?.id || null, changes: result.rowCount || 0 };
        }
        const result = await this.pool.query(convertedSql, convertedParams);
        return { lastInsertRowid: null, changes: result.rowCount || 0 };
    }

    async get(sql, params = []) {
        const { sql: convertedSql, params: convertedParams } = this._convert(sql, params);
        const result = await this.pool.query(convertedSql, convertedParams);
        return result.rows[0] || null;
    }

    async all(sql, params = []) {
        const { sql: convertedSql, params: convertedParams } = this._convert(sql, params);
        const result = await this.pool.query(convertedSql, convertedParams);
        return result.rows;
    }

    async exec(sql) {
        await this.pool.query(sql);
    }

    async close() {
        await this.pool.end();
    }
}

// ==================== SQLite Adapter ====================
class SQLiteDatabase {
    constructor() {
        this.SQL = null;
        this.db = null;
        this.fs = require('fs-extra');
        this.DB_PATH = path.join(__dirname, '..', 'database.sqlite');
        this.DB_BACKUP_PATH = path.join(__dirname, '..', 'database.backup.sqlite');
        this.isSaving = false;
        this.savePending = false;
        this.name = 'SQLite';
    }

    async initialize() {
        const initSqlJs = require('sql.js');
        this.SQL = await initSqlJs();

        let loaded = false;
        try {
            if (this.fs.existsSync(this.DB_PATH)) {
                const buffer = this.fs.readFileSync(this.DB_PATH);
                this.db = new this.SQL.Database(buffer);
                if (this.verifyIntegrity()) {
                    loaded = true;
                    console.log('✓ SQLite cargada y verificada');
                } else {
                    this.db = null;
                }
            }
        } catch (e) {
            this.db = null;
        }

        if (!loaded) {
            try {
                if (this.fs.existsSync(this.DB_BACKUP_PATH)) {
                    const buffer = this.fs.readFileSync(this.DB_BACKUP_PATH);
                    this.db = new this.SQL.Database(buffer);
                    if (this.verifyIntegrity()) {
                        loaded = true;
                        console.log('✓ SQLite recuperada desde backup');
                        this.fs.copyFileSync(this.DB_BACKUP_PATH, this.DB_PATH);
                    }
                }
            } catch (e) { /* ignore */ }
        }

        if (!loaded || !this.db) {
            this.db = new this.SQL.Database();
            console.log('✓ Nueva SQLite creada');
        }

        this.createTables();
        this.createDefaultUser();
        this.saveDatabase();
        this.startAutoSave();
        console.log('✓ SQLite inicializada');
    }

    verifyIntegrity() {
        try {
            const r = this.db.exec('SELECT name FROM sqlite_master WHERE type="table"');
            return r && r[0] && r[0].values.length > 0;
        } catch (e) { return false; }
    }

    startAutoSave() {
        setInterval(() => { try { this.saveDatabase(); } catch(e) {} }, 30000);
        process.on('SIGINT', () => { this.saveDatabase(); process.exit(0); });
        process.on('SIGTERM', () => { this.saveDatabase(); process.exit(0); });
    }

    saveDatabase() {
        if (this.isSaving) { this.savePending = true; return; }
        this.isSaving = true;
        try {
            const buffer = Buffer.from(this.db.export());
            const tmp = this.DB_PATH + '.tmp';
            if (this.fs.existsSync(this.DB_PATH)) {
                try { this.fs.copyFileSync(this.DB_PATH, this.DB_BACKUP_PATH); } catch(e) {}
            }
            this.fs.writeFileSync(tmp, buffer);
            if (this.fs.existsSync(this.DB_PATH)) this.fs.unlinkSync(this.DB_PATH);
            this.fs.renameSync(tmp, this.DB_PATH);
        } catch (e) {
            console.error('Error guardando SQLite:', e.message);
        } finally {
            this.isSaving = false;
            if (this.savePending) { this.savePending = false; this.saveDatabase(); }
        }
    }

    createTables() {
        const tables = [
            `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS patients (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, cedula TEXT UNIQUE, gender TEXT, marital_status TEXT, address TEXT, phone TEXT, email TEXT, age INTEGER, notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS clinical_history (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER NOT NULL, personal_history TEXT, pathological_history TEXT, pain_scale INTEGER, nutrition TEXT, hydration TEXT, sleep TEXT, physical_activity TEXT, surgeries TEXT, consultation_reason TEXT, previous_injuries TEXT, diagnosis TEXT, symptoms TEXT, observations TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE)`,
            `CREATE TABLE IF NOT EXISTS treatments (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER NOT NULL, description TEXT NOT NULL, session_notes TEXT, progress TEXT, next_steps TEXT, session_date DATETIME DEFAULT CURRENT_TIMESTAMP, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE)`,
            `CREATE TABLE IF NOT EXISTS appointments (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL, status TEXT DEFAULT 'pendiente', notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE)`,
            `CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER NOT NULL, appointment_id INTEGER, amount REAL NOT NULL, status TEXT DEFAULT 'pendiente', payment_method TEXT, notes TEXT, payment_date DATETIME DEFAULT CURRENT_TIMESTAMP, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE, FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL)`,
            `CREATE TABLE IF NOT EXISTS reminders (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER, appointment_id INTEGER, message TEXT NOT NULL, reminder_date TEXT NOT NULL, is_read INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE, FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE)`
        ];
        tables.forEach(sql => this.db.run(sql));
    }

    createDefaultUser() {
        const result = this.db.exec('SELECT COUNT(*) FROM users');
        const count = result[0]?.values[0][0] || 0;
        if (count === 0) {
            const hashedPassword = bcrypt.hashSync('karen2024', 10);
            this.db.run('INSERT INTO users (username, password, name) VALUES (?, ?, ?)', ['karen', hashedPassword, 'Dra. Karen Fajardo']);
            console.log('✓ Usuario por defecto creado (karen / karen2024)');
        }
    }

    query(sql, params = []) {
        const stmt = this.db.prepare(sql);
        if (params.length > 0) stmt.bind(params);
        const results = [];
        while (stmt.step()) results.push(stmt.getAsObject());
        stmt.free();
        return results;
    }

    run(sql, params = []) {
        let lastID = 0;
        try {
            const before = this.db.exec('SELECT last_insert_rowid() as id');
            lastID = before[0]?.values[0][0] || 0;
        } catch(e) {}
        this.db.run(sql, params);
        this.saveDatabase();
        try {
            const after = this.db.exec('SELECT last_insert_rowid() as id');
            lastID = after[0]?.values[0][0] || 0;
        } catch(e) {}
        return { lastInsertRowid: lastID, changes: 1 };
    }

    get(sql, params = []) {
        return this.query(sql, params)[0] || null;
    }

    all(sql, params = []) {
        return this.query(sql, params);
    }

    exec(sql) {
        this.db.run(sql);
        this.saveDatabase();
    }
}

// ==================== DETECT MODE & EXPORT ====================

const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL;
let dbInstance;

if (isProduction) {
    if (!process.env.DATABASE_URL) {
        console.error('❌ ERROR: DATABASE_URL no está definido en producción');
        process.exit(1);
    }
    dbInstance = new PGDatabase(process.env.DATABASE_URL);
    console.log('🌐 Modo: PostgreSQL (producción)');
} else {
    dbInstance = new SQLiteDatabase();
    console.log('💾 Modo: SQLite (desarrollo local)');
}

// Exportar funciones como métodos del módulo
module.exports = {
    initialize: () => dbInstance.initialize(),
    query: (sql, params) => dbInstance.query(sql, params),
    run: (sql, params) => dbInstance.run(sql, params),
    get: (sql, params) => dbInstance.get(sql, params),
    all: (sql, params) => dbInstance.all(sql, params),
    exec: (sql) => dbInstance.exec(sql),
    getDb: () => ({
        query: (sql, params) => dbInstance.query(sql, params),
        run: (sql, params) => dbInstance.run(sql, params),
        get: (sql, params) => dbInstance.get(sql, params),
        all: (sql, params) => dbInstance.all(sql, params),
        exec: (sql) => dbInstance.exec(sql)
    }),
    saveDatabase: () => { if (dbInstance.saveDatabase) dbInstance.saveDatabase(); },
    close: () => { if (dbInstance.close) dbInstance.close(); },
    isProduction
};
