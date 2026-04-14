/**
 * Rutas de gestión de pacientes
 */

const express = require('express');
const router = express.Router();
const { getDb, run, query } = require('../config/database');

/**
 * GET /api/patients
 * Obtiene todos los pacientes
 */
router.get('/', async (req, res) => {
    try {
        const db = getDb();
        const patients = await db.all(`
            SELECT 
                p.*,
                (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id) as total_appointments,
                (SELECT COUNT(*) FROM treatments t WHERE t.patient_id = p.id) as total_treatments
            FROM patients p 
            ORDER BY p.updated_at DESC
        `);
        
        res.json(patients);
    } catch (error) {
        console.error('Error al obtener pacientes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * GET /api/patients/:id
 * Obtiene un paciente específico con su historial
 */
router.get('/:id', async (req, res) => {
    try {
        const db = getDb();
        const patient = await db.get('SELECT * FROM patients WHERE id = ?', [req.params.id]);

        if (!patient) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }

        // Obtener historial clínico
        const clinicalHistory = await db.all(`
            SELECT * FROM clinical_history
            WHERE patient_id = ?
            ORDER BY created_at DESC
        `, [req.params.id]);

        // Obtener tratamientos
        const treatments = await db.all(`
            SELECT * FROM treatments
            WHERE patient_id = ?
            ORDER BY session_date DESC
        `, [req.params.id]);

        // Obtener citas
        const appointments = await db.all(`
            SELECT * FROM appointments
            WHERE patient_id = ?
            ORDER BY date DESC, time DESC
        `, [req.params.id]);

        // Obtener pagos
        const payments = await db.all(`
            SELECT * FROM payments
            WHERE patient_id = ?
            ORDER BY created_at DESC
        `, [req.params.id]);
        
        res.json({
            ...patient,
            clinicalHistory,
            treatments,
            appointments,
            payments
        });
    } catch (error) {
        console.error('Error al obtener paciente:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * POST /api/patients
 * Crea un nuevo paciente
 */
router.post('/', async (req, res) => {
    try {
        const { name, cedula, gender, marital_status, address, phone, email, age, notes } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'El nombre es requerido' });
        }

        const result = await run(`
            INSERT INTO patients (name, cedula, gender, marital_status, address, phone, email, age, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            name,
            cedula || null,
            gender || null,
            marital_status || null,
            address || null,
            phone || null,
            email || null,
            age ? parseInt(age) : null,
            notes || null
        ]);

        res.status(201).json({
            id: result.lastInsertRowid,
            message: 'Paciente creado exitosamente'
        });
    } catch (error) {
        console.error('Error al crear paciente:', error);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

/**
 * PUT /api/patients/:id
 * Actualiza un paciente
 */
router.put('/:id', async (req, res) => {
    try {
        const { name, cedula, gender, marital_status, address, phone, email, age, notes } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'El nombre es requerido' });
        }

        const result = await run(`
            UPDATE patients
            SET name = ?, cedula = ?, gender = ?, marital_status = ?, address = ?, phone = ?, email = ?, age = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            name,
            cedula || null,
            gender || null,
            marital_status || null,
            address || null,
            phone || null,
            email || null,
            age ? parseInt(age) : null,
            notes || null,
            req.params.id
        ]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }

        res.json({ message: 'Paciente actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar paciente:', error);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

/**
 * DELETE /api/patients/:id
 * Elimina un paciente
 */
router.delete('/:id', async (req, res) => {
    try {
        const result = await run('DELETE FROM patients WHERE id = ?', [req.params.id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }

        res.json({ message: 'Paciente eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar paciente:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
