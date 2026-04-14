/**
 * Rutas de gestión de tratamientos y notas clínicas
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { run, query } = require('../config/database');

/**
 * GET /api/treatments
 * Obtiene todos los tratamientos con filtros opcionales
 */
router.get('/', (req, res) => {
    try {
        const db = getDb();
        const { patient_id } = req.query;
        
        let query = `
            SELECT 
                t.*,
                p.name as patient_name
            FROM treatments t
            JOIN patients p ON t.patient_id = p.id
        `;
        
        if (patient_id) {
            query += ' WHERE t.patient_id = ?';
        }
        
        query += ' ORDER BY t.session_date DESC';
        
        const treatments = patient_id 
            ? db.all(query, [patient_id])
            : db.all(query);
        
        res.json(treatments);
    } catch (error) {
        console.error('Error al obtener tratamientos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * GET /api/treatments/:id
 * Obtiene un tratamiento específico
 */
router.get('/:id', (req, res) => {
    try {
        const db = getDb();
        const treatment = db.get(`
            SELECT 
                t.*,
                p.name as patient_name
            FROM treatments t
            JOIN patients p ON t.patient_id = p.id
            WHERE t.id = ?
        `, [req.params.id]);
        
        if (!treatment) {
            return res.status(404).json({ error: 'Tratamiento no encontrado' });
        }
        
        res.json(treatment);
    } catch (error) {
        console.error('Error al obtener tratamiento:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * POST /api/treatments
 * Crea un nuevo tratamiento/nota clínica
 */
router.post('/', (req, res) => {
    try {
        const { patient_id, description, session_notes, progress, next_steps, session_date } = req.body;
        
        if (!patient_id || !description) {
            return res.status(400).json({ error: 'Paciente y descripción son requeridos' });
        }
        
        const db = getDb();
        
        // Verificar que el paciente existe
        const patient = db.get('SELECT id FROM patients WHERE id = ?', [patient_id]);
        if (!patient) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }
        
        const result = run(`
            INSERT INTO treatments (patient_id, description, session_notes, progress, next_steps, session_date) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [patient_id, description, session_notes || null, progress || null, next_steps || null, session_date || new Date().toISOString()]);
        
        res.status(201).json({ 
            id: result.lastInsertRowid,
            message: 'Tratamiento registrado exitosamente'
        });
    } catch (error) {
        console.error('Error al crear tratamiento:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * PUT /api/treatments/:id
 * Actualiza un tratamiento
 */
router.put('/:id', (req, res) => {
    try {
        const { description, session_notes, progress, next_steps, session_date } = req.body;
        
        const db = getDb();
        const result = run(`
            UPDATE treatments 
            SET description = ?, session_notes = ?, progress = ?, next_steps = ?, session_date = ?
            WHERE id = ?
        `, [description, session_notes || null, progress || null, next_steps || null, session_date || null, req.params.id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Tratamiento no encontrado' });
        }
        
        res.json({ message: 'Tratamiento actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar tratamiento:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * DELETE /api/treatments/:id
 * Elimina un tratamiento
 */
router.delete('/:id', (req, res) => {
    try {
        const db = getDb();
        const result = run('DELETE FROM treatments WHERE id = ?', [req.params.id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Tratamiento no encontrado' });
        }
        
        res.json({ message: 'Tratamiento eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar tratamiento:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * Rutas de historial clínico
 */

/**
 * GET /api/treatments/history/:patient_id
 * Obtiene el historial clínico de un paciente
 */
router.get('/history/:patient_id', (req, res) => {
    try {
        const db = getDb();
        const history = db.all(`
            SELECT * FROM clinical_history 
            WHERE patient_id = ? 
            ORDER BY created_at DESC
        `, [req.params.patient_id]);
        
        res.json(history);
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * POST /api/treatments/history
 * Crea una entrada en el historial clínico
 */
router.post('/history', (req, res) => {
    try {
        const { patient_id, diagnosis, symptoms, observations } = req.body;
        
        if (!patient_id) {
            return res.status(400).json({ error: 'Paciente es requerido' });
        }
        
        const db = getDb();
        const result = run(`
            INSERT INTO clinical_history (patient_id, diagnosis, symptoms, observations) 
            VALUES (?, ?, ?, ?)
        `, [patient_id, diagnosis || null, symptoms || null, observations || null]);
        
        res.status(201).json({ 
            id: result.lastInsertRowid,
            message: 'Historial clínico registrado exitosamente'
        });
    } catch (error) {
        console.error('Error al registrar historial:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * PUT /api/treatments/history/:id
 * Actualiza una entrada del historial clínico
 */
router.put('/history/:id', (req, res) => {
    try {
        const { diagnosis, symptoms, observations } = req.body;
        
        const db = getDb();
        const result = run(`
            UPDATE clinical_history 
            SET diagnosis = ?, symptoms = ?, observations = ?
            WHERE id = ?
        `, [diagnosis || null, symptoms || null, observations || null, req.params.id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Entrada de historial no encontrada' });
        }
        
        res.json({ message: 'Historial clínico actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar historial:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * DELETE /api/treatments/history/:id
 * Elimina una entrada del historial clínico
 */
router.delete('/history/:id', (req, res) => {
    try {
        const db = getDb();
        const result = run('DELETE FROM clinical_history WHERE id = ?', [req.params.id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Entrada de historial no encontrada' });
        }
        
        res.json({ message: 'Entrada de historial eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar historial:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
