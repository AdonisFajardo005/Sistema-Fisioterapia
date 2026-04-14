/**
 * Rutas de gestión del historial clínico
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { run, query } = require('../config/database');

/**
 * GET /api/clinical-history/patient/:patient_id
 * Obtiene el historial clínico de un paciente
 */
router.get('/patient/:patient_id', (req, res) => {
    try {
        const db = getDb();
        const history = db.all(`
            SELECT * FROM clinical_history
            WHERE patient_id = ?
            ORDER BY created_at DESC
        `, [req.params.patient_id]);

        res.json(history);
    } catch (error) {
        console.error('Error al obtener historial clínico:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * GET /api/clinical-history/:id
 * Obtiene un registro específico del historial clínico
 */
router.get('/:id', (req, res) => {
    try {
        const db = getDb();
        const history = db.get(`
            SELECT 
                ch.*,
                p.name as patient_name
            FROM clinical_history ch
            JOIN patients p ON ch.patient_id = p.id
            WHERE ch.id = ?
        `, [req.params.id]);

        if (!history) {
            return res.status(404).json({ error: 'Registro de historial clínico no encontrado' });
        }

        res.json(history);
    } catch (error) {
        console.error('Error al obtener registro de historial clínico:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * POST /api/clinical-history
 * Crea un nuevo registro en el historial clínico
 */
router.post('/', async (req, res) => {
    try {
        const {
            patient_id,
            personal_history,
            pathological_history,
            pain_scale,
            nutrition,
            hydration,
            sleep,
            physical_activity,
            surgeries,
            consultation_reason,
            previous_injuries,
            diagnosis,
            symptoms,
            observations
        } = req.body;

        if (!patient_id) {
            return res.status(400).json({ error: 'El paciente es requerido' });
        }

        const db = getDb();

        // Verificar que el paciente existe
        const patient = db.get('SELECT id FROM patients WHERE id = ?', [patient_id]);
        if (!patient) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }

        const result = await run(`
            INSERT INTO clinical_history (
                patient_id,
                personal_history,
                pathological_history,
                pain_scale,
                nutrition,
                hydration,
                sleep,
                physical_activity,
                surgeries,
                consultation_reason,
                previous_injuries,
                diagnosis,
                symptoms,
                observations
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            patient_id,
            personal_history || null,
            pathological_history || null,
            pain_scale !== null && pain_scale !== undefined ? parseInt(pain_scale) : null,
            nutrition || null,
            hydration || null,
            sleep || null,
            physical_activity || null,
            surgeries || null,
            consultation_reason || null,
            previous_injuries || null,
            diagnosis || null,
            symptoms || null,
            observations || null
        ]);

        res.status(201).json({
            id: result.lastInsertRowid,
            message: 'Historial clínico registrado exitosamente'
        });
    } catch (error) {
        console.error('Error al crear historial clínico:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * PUT /api/clinical-history/:id
 * Actualiza un registro del historial clínico
 */
router.put('/:id', async (req, res) => {
    try {
        const {
            personal_history,
            pathological_history,
            pain_scale,
            nutrition,
            hydration,
            sleep,
            physical_activity,
            surgeries,
            consultation_reason,
            previous_injuries,
            diagnosis,
            symptoms,
            observations
        } = req.body;

        const db = getDb();
        const result = await run(`
            UPDATE clinical_history
            SET
                personal_history = ?,
                pathological_history = ?,
                pain_scale = ?,
                nutrition = ?,
                hydration = ?,
                sleep = ?,
                physical_activity = ?,
                surgeries = ?,
                consultation_reason = ?,
                previous_injuries = ?,
                diagnosis = ?,
                symptoms = ?,
                observations = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            personal_history || null,
            pathological_history || null,
            pain_scale !== null && pain_scale !== undefined ? parseInt(pain_scale) : null,
            nutrition || null,
            hydration || null,
            sleep || null,
            physical_activity || null,
            surgeries || null,
            consultation_reason || null,
            previous_injuries || null,
            diagnosis || null,
            symptoms || null,
            observations || null,
            req.params.id
        ]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Registro de historial clínico no encontrado' });
        }

        res.json({ message: 'Historial clínico actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar historial clínico:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * DELETE /api/clinical-history/:id
 * Elimina un registro del historial clínico
 */
router.delete('/:id', async (req, res) => {
    try {
        const db = getDb();
        const result = await run('DELETE FROM clinical_history WHERE id = ?', [req.params.id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Registro de historial clínico no encontrado' });
        }

        res.json({ message: 'Registro de historial clínico eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar historial clínico:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
