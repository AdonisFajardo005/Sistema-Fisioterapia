/**
 * Rutas de autenticación
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../config/database');

/**
 * POST /api/auth/login
 * Inicia sesión
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
        }
        
        const db = getDb();
        const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);

        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        const validPassword = bcrypt.compareSync(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        // Guardar en sesión
        req.session.userId = user.id;
        req.session.userName = user.name;
        
        res.json({ 
            success: true, 
            user: {
                id: user.id,
                name: user.name,
                username: user.username
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * GET /api/auth/session
 * Verifica la sesión actual
 */
router.get('/session', (req, res) => {
    if (req.session && req.session.userId) {
        return res.json({ 
            authenticated: true, 
            user: {
                id: req.session.userId,
                name: req.session.userName
            }
        });
    }
    res.json({ authenticated: false });
});

/**
 * POST /api/auth/logout
 * Cierra sesión
 */
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Error al cerrar sesión' });
        }
        res.json({ success: true });
    });
});

module.exports = router;
