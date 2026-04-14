/**
 * Rutas de gestión de pagos
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { run, query } = require('../config/database');

/**
 * GET /api/payments
 * Obtiene todos los pagos con filtros opcionales
 */
router.get('/', async (req, res) => {
    try {
        const db = getDb();
        const { status, patient_id } = req.query;
        
        let query = `
            SELECT 
                py.*,
                p.name as patient_name,
                a.date as appointment_date,
                a.time as appointment_time
            FROM payments py
            JOIN patients p ON py.patient_id = p.id
            LEFT JOIN appointments a ON py.appointment_id = a.id
        `;
        
        const conditions = [];
        const params = [];
        
        if (status) {
            conditions.push('py.status = ?');
            params.push(status);
        }
        
        if (patient_id) {
            conditions.push('py.patient_id = ?');
            params.push(patient_id);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY py.created_at DESC';
        
        const payments = params.length > 0 
            ? await db.all(query, params)
            : await db.all(query);
        
        res.json(payments);
    } catch (error) {
        console.error('Error al obtener pagos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * GET /api/payments/summary
 * Obtiene resumen de pagos
 */
router.get('/summary', async (req, res) => {
    try {
        const db = getDb();

        const totalPaid = await db.get(`
            SELECT COALESCE(SUM(amount), 0) as total
            FROM payments
            WHERE status = 'pagado'
        `);

        const totalPending = await db.get(`
            SELECT COALESCE(SUM(amount), 0) as total
            FROM payments
            WHERE status = 'pendiente'
        `);

        const countPaid = await db.get(`
            SELECT COUNT(*) as count
            FROM payments
            WHERE status = 'pagado'
        `);

        const countPending = await db.get(`
            SELECT COUNT(*) as count
            FROM payments
            WHERE status = 'pendiente'
        `);
        
        res.json({
            totalPaid: totalPaid?.total || 0,
            totalPending: totalPending?.total || 0,
            countPaid: countPaid?.count || 0,
            countPending: countPending?.count || 0
        });
    } catch (error) {
        console.error('Error al obtener resumen:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * GET /api/payments/:id
 * Obtiene un pago específico
 */
router.get('/:id', async (req, res) => {
    try {
        const db = getDb();
        const payment = await db.get(`
            SELECT
                py.*,
                p.name as patient_name,
                a.date as appointment_date,
                a.time as appointment_time
            FROM payments py
            JOIN patients p ON py.patient_id = p.id
            LEFT JOIN appointments a ON py.appointment_id = a.id
            WHERE py.id = ?
        `, [req.params.id]);
        
        if (!payment) {
            return res.status(404).json({ error: 'Pago no encontrado' });
        }
        
        res.json(payment);
    } catch (error) {
        console.error('Error al obtener pago:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * POST /api/payments
 * Crea un nuevo registro de pago
 */
router.post('/', async (req, res) => {
    try {
        const { patient_id, appointment_id, amount, status, payment_method, notes } = req.body;

        if (!patient_id || !amount) {
            return res.status(400).json({ error: 'Paciente y monto son requeridos' });
        }

        const db = getDb();

        // Verificar que el paciente existe
        const patient = await db.get('SELECT id FROM patients WHERE id = ?', [patient_id]);
        if (!patient) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }

        const result = await run(`
            INSERT INTO payments (patient_id, appointment_id, amount, status, payment_method, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [patient_id, appointment_id || null, amount, status || 'pendiente', payment_method || null, notes || null]);

        res.status(201).json({
            id: result.lastInsertRowid,
            message: 'Pago registrado exitosamente'
        });
    } catch (error) {
        console.error('Error al registrar pago:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * PUT /api/payments/:id
 * Actualiza un pago
 */
router.put('/:id', async (req, res) => {
    try {
        const { amount, status, payment_method, notes } = req.body;

        const db = getDb();
        const result = await run(`
            UPDATE payments
            SET amount = ?, status = ?, payment_method = ?, notes = ?
            WHERE id = ?
        `, [amount, status || 'pendiente', payment_method || null, notes || null, req.params.id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Pago no encontrado' });
        }

        res.json({ message: 'Pago actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar pago:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * PATCH /api/payments/:id/status
 * Actualiza solo el estado de un pago
 */
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        if (!['pagado', 'pendiente'].includes(status)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        const result = await run('UPDATE payments SET status = ? WHERE id = ?', [status, req.params.id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Pago no encontrado' });
        }

        res.json({ message: 'Estado de pago actualizado' });
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * DELETE /api/payments/:id
 * Elimina un registro de pago
 */
router.delete('/:id', async (req, res) => {
    try {
        const result = await run('DELETE FROM payments WHERE id = ?', [req.params.id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Pago no encontrado' });
        }

        res.json({ message: 'Pago eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar pago:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
