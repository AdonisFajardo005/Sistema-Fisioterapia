/**
 * Servidor principal de la aplicación
 * Dra. Karen Fajardo - Sistema de Gestión de Fisioterapia
 */

const express = require('express');
const session = require('express-session');
const morgan = require('morgan');
const path = require('path');

// Cargar variables de entorno
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const db = require('./config/database');
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const appointmentRoutes = require('./routes/appointments');
const treatmentRoutes = require('./routes/treatments');
const paymentRoutes = require('./routes/payments');
const reminderRoutes = require('./routes/reminders');
const clinicalHistoryRoutes = require('./routes/clinical-history');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de seguridad para producción
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1); // Confía en el proxy inverso
}

// Middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));

// Configuración de sesión
app.use(session({
    secret: process.env.SESSION_SECRET || 'dra-karen-fajardo-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // true en producción con HTTPS
        httpOnly: true, // Previene acceso desde JavaScript
        sameSite: 'lax', // Protección CSRF
        maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Middleware de autenticación
function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(401).json({ error: 'No autenticado' });
    }
    res.redirect('/login.html');
}

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/patients', isAuthenticated, patientRoutes);
app.use('/api/appointments', isAuthenticated, appointmentRoutes);
app.use('/api/treatments', isAuthenticated, treatmentRoutes);
app.use('/api/payments', isAuthenticated, paymentRoutes);
app.use('/api/reminders', isAuthenticated, reminderRoutes);
app.use('/api/clinical-history', isAuthenticated, clinicalHistoryRoutes);

// Ruta principal
app.get('/', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login.html', (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor después de inicializar la base de datos
async function startServer() {
    try {
        await db.initialize();
        
        app.listen(PORT, () => {
            console.log(`\n╔══════════════════════════════════════════════════════════╗`);
            console.log(`║                                                          ║`);
            console.log(`║   Dra. Karen Fajardo - Sistema de Gestión                ║`);
            console.log(`║   Servidor ejecutándose en http://localhost:${PORT}        ║`);
            console.log(`║                                                          ║`);
            console.log(`╚══════════════════════════════════════════════════════════╝\n`);
        });
    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

startServer();
