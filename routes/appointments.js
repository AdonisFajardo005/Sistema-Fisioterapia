/**
 * Rutas de gestión de citas
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');

/**
 * GET /api/appointments
 * Obtiene todas las citas con filtros opcionales
 */
router.get('/', (req, res) => {
    try {
        const db = getDb();
        const { status, date, patient_id } = req.query;
        
        let query = `
            SELECT 
                a.*,
                p.name as patient_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
        `;
        
        const conditions = [];
        const params = [];
        
        if (status) {
            conditions.push('a.status = ?');
            params.push(status);
        }
        
        if (date) {
            conditions.push('a.date = ?');
            params.push(date);
        }
        
        if (patient_id) {
            conditions.push('a.patient_id = ?');
            params.push(patient_id);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY a.date DESC, a.time DESC';
        
        const appointments = db.all(query, params);
        res.json(appointments);
    } catch (error) {
        console.error('Error al obtener citas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * GET /api/appointments/today
 * Obtiene las citas de hoy
 */
router.get('/today', (req, res) => {
    try {
        const db = getDb();
        const today = new Date().toISOString().split('T')[0];
        
        const appointments = db.all(`
            SELECT 
                a.*,
                p.name as patient_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.date = ?
            ORDER BY a.time ASC
        `, [today]);
        
        res.json(appointments);
    } catch (error) {
        console.error('Error al obtener citas de hoy:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * GET /api/appointments/:id
 * Obtiene una cita específica
 */
router.get('/:id', (req, res) => {
    try {
        const db = getDb();
        const appointment = db.get(`
            SELECT 
                a.*,
                p.name as patient_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.id = ?
        `, [req.params.id]);
        
        if (!appointment) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }
        
        res.json(appointment);
    } catch (error) {
        console.error('Error al obtener cita:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * POST /api/appointments
 * Crea una nueva cita
 */
router.post('/', (req, res) => {
    try {
        const { patient_id, date, time, notes } = req.body;
        
        if (!patient_id || !date || !time) {
            return res.status(400).json({ error: 'Paciente, fecha y hora son requeridos' });
        }
        
        const db = getDb();
        
        // Verificar que el paciente existe
        const patient = db.get('SELECT id FROM patients WHERE id = ?', [patient_id]);
        if (!patient) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }
        
        const result = db.run(`
            INSERT INTO appointments (patient_id, date, time, notes) 
            VALUES (?, ?, ?, ?)
        `, [patient_id, date, time, notes || null]);
        
        // Crear recordatorio automático
        db.run(`
            INSERT INTO reminders (patient_id, appointment_id, message, reminder_date) 
            VALUES (?, ?, ?, ?)
        `, [
            patient_id, 
            result.lastInsertRowid, 
            `Recordatorio: Cita programada para ${date} a las ${time}`,
            date
        ]);
        
        res.status(201).json({ 
            id: result.lastInsertRowid,
            message: 'Cita creada exitosamente'
        });
    } catch (error) {
        console.error('Error al crear cita:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * PUT /api/appointments/:id
 * Actualiza una cita
 */
router.put('/:id', (req, res) => {
    try {
        const { patient_id, date, time, status, notes } = req.body;
        
        const db = getDb();
        const result = db.run(`
            UPDATE appointments 
            SET patient_id = ?, date = ?, time = ?, status = ?, notes = ?
            WHERE id = ?
        `, [patient_id, date, time, status || 'pendiente', notes || null, req.params.id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }
        
        res.json({ message: 'Cita actualizada exitosamente' });
    } catch (error) {
        console.error('Error al actualizar cita:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * PATCH /api/appointments/:id/status
 * Actualiza solo el estado de una cita
 */
router.patch('/:id/status', (req, res) => {
    try {
        const { status } = req.body;
        
        if (!['pendiente', 'completada', 'cancelada'].includes(status)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }
        
        const db = getDb();
        const result = db.run('UPDATE appointments SET status = ? WHERE id = ?', [status, req.params.id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }
        
        res.json({ message: 'Estado de cita actualizado' });
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * DELETE /api/appointments/:id
 * Elimina una cita
 */
router.delete('/:id', (req, res) => {
    try {
        const db = getDb();
        const result = db.run('DELETE FROM appointments WHERE id = ?', [req.params.id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }
        
        res.json({ message: 'Cita eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar cita:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
