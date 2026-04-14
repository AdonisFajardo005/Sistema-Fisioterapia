/**
 * Script de migración: SQLite local → PostgreSQL en la nube
 * 
 * Este script lee los datos de tu database.sqlite local
 * y los inserta en la base de datos PostgreSQL de Neon/Render.
 * 
 * Uso: node migrate.js
 */

const initSqlJs = require('sql.js');
const fs = require('fs-extra');
const path = require('path');
const { Pool } = require('pg');

// ==================== CONFIGURACIÓN ====================

const SQLITE_PATH = path.join(__dirname, 'database.sqlite');

// Tu DATABASE_URL de Neon (ajústala si es necesario)
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_2UWB9ecIPDZg@ep-bitter-surf-amzaav5i.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';

// ==================== LÓGICA ====================

async function migrate() {
    console.log('🚀 Iniciando migración SQLite → PostgreSQL\n');

    // 1. Verificar que existe el archivo SQLite
    if (!fs.existsSync(SQLITE_PATH)) {
        console.error('❌ No se encontró database.sqlite en:', SQLITE_PATH);
        console.log('   Ejecuta este script desde el directorio donde está tu base de datos local.');
        process.exit(1);
    }

    // 2. Cargar SQLite
    console.log('📂 Cargando base de datos SQLite local...');
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(SQLITE_PATH);
    const sqliteDb = new SQL.Database(buffer);

    // 3. Conectar a PostgreSQL
    console.log('🌐 Conectando a PostgreSQL en la nube...');
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    // Verificar conexión
    await pool.query('SELECT 1');
    console.log('✓ Conexión a PostgreSQL exitosa\n');

    // 4. Verificar si ya hay datos en PostgreSQL
    const pgCount = await pool.query('SELECT COUNT(*) FROM patients');
    const existingCount = parseInt(pgCount.rows[0].count);

    if (existingCount > 0) {
        console.log(`⚠️  Ya hay ${existingCount} pacientes en PostgreSQL.`);
        console.log('   Si continúas, se agregarán los datos locales SIN borrar los existentes.\n');
        
        // Aquí podríamos preguntar al usuario, pero para simplificar continuamos
    }

    // 5. Migrar tablas en orden (por foreign keys)
    const tables = [
        { name: 'patients', id_col: 'id' },
        { name: 'clinical_history', id_col: 'id' },
        { name: 'treatments', id_col: 'id' },
        { name: 'appointments', id_col: 'id' },
        { name: 'payments', id_col: 'id' },
        { name: 'reminders', id_col: 'id' },
    ];

    let totalMigrated = 0;

    for (const table of tables) {
        console.log(`📋 Migrando tabla: ${table.name}...`);
        
        try {
            // Leer datos de SQLite
            const sqliteData = sqliteDb.exec(`SELECT * FROM ${table.name}`);
            
            if (!sqliteData[0] || sqliteData[0].values.length === 0) {
                console.log(`   ⏭️  Tabla vacía, saltando\n`);
                continue;
            }

            const columns = sqliteData[0].columns;
            const rows = sqliteData[0].values;

            // Construir INSERT para PostgreSQL
            for (const row of rows) {
                const placeholders = row.map((_, i) => `$${i + 1}`).join(', ');
                const insertSql = `INSERT INTO ${table.name} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

                try {
                    await pool.query(insertSql, row.map(val => val === null ? null : val));
                    totalMigrated++;
                } catch (err) {
                    // Ignorar conflictos (datos duplicados)
                    if (!err.message.includes('duplicate')) {
                        console.error(`   Error en fila: ${err.message}`);
                    }
                }
            }

            console.log(`   ✓ ${rows.length} registros migrados\n`);
        } catch (err) {
            if (err.message.includes('no such table')) {
                console.log(`   ⏭️  Tabla no existe en SQLite, saltando\n`);
            } else {
                console.error(`   ❌ Error: ${err.message}\n`);
            }
        }
    }

    // 6. Resumen
    console.log('═══════════════════════════════════════════════');
    console.log('✅ MIGRACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════════');
    console.log(`📊 Total de registros migrados: ${totalMigrated}`);
    console.log('');
    console.log('Tus datos ahora están en la nube y puedes verlos desde:');
    console.log('🌐 https://sistema-fisioterapia.onrender.com');
    console.log('');
    console.log('Acceso desde cualquier dispositivo:');
    console.log('  - Tu PC (navegador)');
    console.log('  - Tu celular');
    console.log('  - Cualquier lugar con internet');
    console.log('═══════════════════════════════════════════════');

    // Cerrar conexiones
    await pool.end();
}

// Ejecutar
migrate().catch(err => {
    console.error('❌ Error en la migración:', err.message);
    process.exit(1);
});
