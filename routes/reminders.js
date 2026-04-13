/**
 * Rutas de gestión de recordatorios
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');

/**
 * GET /api/reminders
 * Obtiene todos los recordatorios
 */
router.get('/', (req, res) => {
    try {
        const db = getDb();
        
        const reminders = db.all(`
            SELECT 
                r.*,
                p.name as patient_name,
                a.date as appointment_date,
                a.time as appointment_time
            FROM reminders r
            LEFT JOIN patients p ON r.patient_id = p.id
            LEFT JOIN appointments a ON r.appointment_id = a.id
            ORDER BY r.reminder_date DESC, r.created_at DESC
        `);
        
        res.json(reminders);
    } catch (error) {
        console.error('Error al obtener recordatorios:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * GET /api/reminders/unread
 * Obtiene recordatorios no leídos
 */
router.get('/unread', (req, res) => {
    try {
        const db = getDb();
        
        const reminders = db.all(`
            SELECT 
                r.*,
                p.name as patient_name,
                a.date as appointment_date,
                a.time as appointment_time
            FROM reminders r
            LEFT JOIN patients p ON r.patient_id = p.id
            LEFT JOIN appointments a ON r.appointment_id = a.id
            WHERE r.is_read = 0
            ORDER BY r.created_at DESC
        `);
        
        res.json(reminders);
    } catch (error) {
        console.error('Error al obtener recordatorios:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * GET /api/reminders/count
 * Cuenta recordatorios no leídos
 */
router.get('/count', (req, res) => {
    try {
        const db = getDb();
        
        const result = db.get(`
            SELECT COUNT(*) as count FROM reminders WHERE is_read = 0
        `);
        
        res.json({ unread: result?.count || 0 });
    } catch (error) {
        console.error('Error al contar recordatorios:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * POST /api/reminders
 * Crea un nuevo recordatorio
 */
router.post('/', (req, res) => {
    try {
        const { patient_id, appointment_id, message, reminder_date } = req.body;
        
        if (!message || !reminder_date) {
            return res.status(400).json({ error: 'Mensaje y fecha son requeridos' });
        }
        
        const db = getDb();
        const result = db.run(`
            INSERT INTO reminders (patient_id, appointment_id, message, reminder_date) 
            VALUES (?, ?, ?, ?)
        `, [patient_id || null, appointment_id || null, message, reminder_date]);
        
        res.status(201).json({ 
            id: result.lastInsertRowid,
            message: 'Recordatorio creado exitosamente'
        });
    } catch (error) {
        console.error('Error al crear recordatorio:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * PATCH /api/reminders/:id/read
 * Marca un recordatorio como leído
 */
router.patch('/:id/read', (req, res) => {
    try {
        const db = getDb();
        const result = db.run('UPDATE reminders SET is_read = 1 WHERE id = ?', [req.params.id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Recordatorio no encontrado' });
        }
        
        res.json({ message: 'Recordatorio marcado como leído' });
    } catch (error) {
        console.error('Error al marcar recordatorio:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * PATCH /api/reminders/read-all
 * Marca todos los recordatorios como leídos
 */
router.patch('/read-all', (req, res) => {
    try {
        const db = getDb();
        const result = db.run('UPDATE reminders SET is_read = 1 WHERE is_read = 0');
        
        res.json({ 
            message: 'Todos los recordatorios marcados como leídos',
            updated: result.changes
        });
    } catch (error) {
        console.error('Error al marcar todos los recordatorios:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * DELETE /api/reminders/:id
 * Elimina un recordatorio
 */
router.delete('/:id', (req, res) => {
    try {
        const db = getDb();
        const result = db.run('DELETE FROM reminders WHERE id = ?', [req.params.id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Recordatorio no encontrado' });
        }
        
        res.json({ message: 'Recordatorio eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar recordatorio:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
