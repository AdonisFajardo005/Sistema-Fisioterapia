/**
 * Rutas de recordatorios y notificaciones por email
 * Incluye verificación automática de citas próximas
 */

const express = require('express');
const router = express.Router();
const cron = require('node-cron');
const { getDb } = require('../config/database');

// Configurar Resend (servicio de email)
let resend = null;
if (process.env.RESEND_API_KEY) {
    const { Resend } = require('resend');
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log('✓ Servicio de email (Resend) configurado');
} else {
    console.log('⚠ RESEND_API_KEY no configurada - los recordatorios por email no funcionarán');
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'karen@ejemplo.com';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

/**
 * GET /api/reminders
 * Obtiene todos los recordatorios
 */
router.get('/', async (req, res) => {
    try {
        const db = getDb();
        const reminders = await db.all(`
            SELECT r.*, p.name as patient_name, p.phone as patient_phone
            FROM reminders r
            LEFT JOIN patients p ON r.patient_id = p.id
            ORDER BY r.reminder_date DESC
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
router.get('/unread', async (req, res) => {
    try {
        const db = getDb();
        const reminders = await db.all(`
            SELECT r.*, p.name as patient_name
            FROM reminders r
            LEFT JOIN patients p ON r.patient_id = p.id
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
 * Obtiene el conteo de recordatorios no leídos
 */
router.get('/count', async (req, res) => {
    try {
        const db = getDb();
        const result = await db.get('SELECT COUNT(*) as count FROM reminders WHERE is_read = 0');

        res.json({ count: result?.count || 0 });
    } catch (error) {
        console.error('Error al obtener conteo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * POST /api/reminders
 * Crea un nuevo recordatorio
 */
router.post('/', async (req, res) => {
    try {
        const { patient_id, appointment_id, message, reminder_date } = req.body;

        if (!message || !reminder_date) {
            return res.status(400).json({ error: 'Mensaje y fecha son requeridos' });
        }

        const db = getDb();
        const result = await run(`
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
router.patch('/:id/read', async (req, res) => {
    try {
        const db = getDb();
        const result = await run('UPDATE reminders SET is_read = 1 WHERE id = ?', [req.params.id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Recordatorio no encontrado' });
        }

        res.json({ message: 'Recordatorio marcado como leído' });
    } catch (error) {
        console.error('Error al actualizar recordatorio:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * PATCH /api/reminders/read-all
 * Marca todos los recordatorios como leídos
 */
router.patch('/read-all', async (req, res) => {
    try {
        const db = getDb();
        const result = await run('UPDATE reminders SET is_read = 1 WHERE is_read = 0');

        res.json({ message: `${result.changes} recordatorios marcados como leídos` });
    } catch (error) {
        console.error('Error al actualizar recordatorios:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * DELETE /api/reminders/:id
 * Elimina un recordatorio
 */
router.delete('/:id', async (req, res) => {
    try {
        const db = getDb();
        const result = await run('DELETE FROM reminders WHERE id = ?', [req.params.id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Recordatorio no encontrado' });
        }

        res.json({ message: 'Recordatorio eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar recordatorio:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * POST/GET /api/reminders/check-email-reminders
 * Verifica citas próximas y envía emails de recordatorio (manual)
 * Accesible públicamente para ser llamado por CronJob.org
 */
router.post('/check-email-reminders', async (req, res) => {
    await checkAndSendEmails(req, res);
});

// También permitir GET para compatibilidad con CronJob.org
router.get('/check-email-reminders', async (req, res) => {
    await checkAndSendEmails(req, res);
});

async function checkAndSendEmails(req, res) {
    try {
        console.log('📧 Verificando citas próximas para recordatorios...');

        const db = getDb();

        // Obtener hora actual del servidor (UTC en Render)
        const nowUTC = new Date();
        
        // Ajustar a hora local de Centroamérica (UTC-6)
        // Si estás en otro país, cambia el offset: -5 para Colombia, -3 para Argentina, etc.
        const offsetHours = -6; 
        const localNow = new Date(nowUTC.getTime() + (offsetHours * 60 * 60 * 1000));
        
        const oneHourLater = new Date(localNow.getTime() + 60 * 60 * 1000);

        const currentDate = localNow.toISOString().split('T')[0]; // YYYY-MM-DD
        const currentTime = localNow.toISOString().split('T')[1].substring(0, 5); // HH:MM
        const futureTime = oneHourLater.toISOString().split('T')[1].substring(0, 5);

        console.log(`🕐 Hora UTC servidor: ${nowUTC.toISOString()}`);
        console.log(`🕐 Hora local ajustada: ${localNow.toISOString()}, Fecha: ${currentDate}`);
        console.log(`🔍 Buscando citas entre ${currentTime} y ${futureTime}`);
        
        // Buscar citas de HOY que están en la próxima hora
        const upcomingAppointments = await db.all(`
            SELECT 
                a.id,
                a.date,
                a.time,
                a.status,
                p.name as patient_name,
                p.phone as patient_phone,
                p.email as patient_email
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.date = ?
            AND a.time >= ?
            AND a.time <= ?
            AND a.status != 'cancelada'
            ORDER BY a.time ASC
        `, [currentDate, currentTime, futureTime]);
        
        if (upcomingAppointments.length === 0) {
            console.log('✓ No hay citas en la próxima hora');
            return res.json({ 
                message: 'No hay citas próximas en la próxima hora',
                count: 0 
            });
        }
        
        console.log(`📋 ${upcomingAppointments.length} cita(s) encontradas para la próxima hora`);
        
        // Enviar email por cada cita
        const emailsSent = [];
        
        for (const appointment of upcomingAppointments) {
            const subject = ` Recordatorio: Cita en 1 hora con ${appointment.patient_name}`;
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; text-align: center;">🏥 Recordatorio de Cita</h1>
                    </div>
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                        <p style="font-size: 16px; color: #333;">Hola Dra. Karen,</p>
                        <p style="font-size: 16px; color: #333;">Tiene una cita programada en <strong>1 hora</strong>:</p>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                            <h2 style="color: #667eea; margin-top: 0;">👤 ${appointment.patient_name}</h2>
                            <p style="margin: 10px 0;"><strong>🕐 Hora:</strong> ${appointment.time}</p>
                            <p style="margin: 10px 0;"><strong>📅 Fecha:</strong> ${appointment.date}</p>
                            ${appointment.patient_phone ? `<p style="margin: 10px 0;"><strong>📞 Teléfono:</strong> ${appointment.patient_phone}</p>` : ''}
                            ${appointment.patient_email ? `<p style="margin: 10px 0;"><strong>📧 Email:</strong> ${appointment.patient_email}</p>` : ''}
                        </div>
                        
                        <p style="color: #666; font-size: 14px; margin-top: 20px;">
                            Este es un recordatorio automático del Sistema de Gestión de Fisioterapia.
                        </p>
                    </div>
                </div>
            `;
            
            try {
                if (resend) {
                    await resend.emails.send({
                        from: FROM_EMAIL,
                        to: ADMIN_EMAIL,
                        subject: subject,
                        html: html
                    });
                    emailsSent.push(appointment.patient_name);
                    console.log(`✅ Email enviado para cita con ${appointment.patient_name}`);
                } else {
                    console.log(`⚠ Email NO enviado (Resend no configurado) - Cita con ${appointment.patient_name}`);
                }
            } catch (emailError) {
                console.error(`❌ Error enviando email para ${appointment.patient_name}:`, emailError.message);
            }
        }
        
        res.json({
            message: `${upcomingAppointments.length} cita(s) verificadas, ${emailsSent.length} email(s) enviados`,
            appointments: upcomingAppointments.map(a => a.patient_name),
            emailsSent: emailsSent
        });

    } catch (error) {
        console.error('Error en verificación de recordatorios:', error);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
}

// ============================================================
// VERIFICACIÓN AUTOMÁTICA CADA 5 MINUTOS
// ============================================================

if (resend) {
    // Ejecutar cada 5 minutos: '*/5 * * * *'
    cron.schedule('*/5 * * * *', async () => {
        try {
            console.log('⏰ [AutoCheck] Verificando citas próximas...');

            const db = getDb();
            const nowUTC = new Date();
            
            // Ajustar a hora local de Centroamérica (UTC-6)
            const offsetHours = -6; 
            const localNow = new Date(nowUTC.getTime() + (offsetHours * 60 * 60 * 1000));
            
            const oneHourLater = new Date(localNow.getTime() + 60 * 60 * 1000);

            const currentDate = localNow.toISOString().split('T')[0];
            const currentTime = localNow.toISOString().split('T')[1].substring(0, 5);
            const futureTime = oneHourLater.toISOString().split('T')[1].substring(0, 5);
            
            const upcomingAppointments = await db.all(`
                SELECT a.id, a.date, a.time, p.name as patient_name, p.phone as patient_phone
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                WHERE a.date = ?
                AND a.time >= ?
                AND a.time <= ?
                AND a.status != 'cancelada'
                ORDER BY a.time ASC
            `, [currentDate, currentTime, futureTime]);
            
            if (upcomingAppointments.length > 0) {
                console.log(`📧 [AutoCheck] ${upcomingAppointments.length} cita(s) próxima(s). Enviando emails...`);
                
                for (const apt of upcomingAppointments) {
                    try {
                        await resend.emails.send({
                            from: FROM_EMAIL,
                            to: ADMIN_EMAIL,
                            subject: `🔔 Cita en 1 hora: ${apt.patient_name}`,
                            html: `
                                <div style="font-family: Arial, sans-serif; padding: 20px;">
                                    <h2 style="color: #667eea;">🏥 Cita en 1 hora</h2>
                                    <p><strong>Paciente:</strong> ${apt.patient_name}</p>
                                    <p><strong>Hora:</strong> ${apt.time}</p>
                                    ${apt.patient_phone ? `<p><strong>Teléfono:</strong> ${apt.patient_phone}</p>` : ''}
                                </div>
                            `
                        });
                        console.log(`✅ Email enviado: ${apt.patient_name}`);
                    } catch (e) {
                        console.error(`❌ Error enviando email: ${e.message}`);
                    }
                }
            }
        } catch (error) {
            console.error('❌ [AutoCheck] Error:', error.message);
        }
    });
    
    console.log('⏰ Verificación automática de citas activada (cada 5 minutos)');
} else {
    console.log('⚠ Verificación automática desactivada (falta RESEND_API_KEY)');
}

module.exports = router;
