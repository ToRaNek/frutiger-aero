// backend/src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Configuration et utilitaires
const config = require('./config/database');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const videoRoutes = require('./routes/videos');
const playlistRoutes = require('./routes/playlists');
const categoryRoutes = require('./routes/categories');
const searchRoutes = require('./routes/search');

// Création de l'application Express
const app = express();

// Configuration des dossiers de stockage
const createDirectories = () => {
    const directories = [
        path.join(__dirname, '../uploads'),
        path.join(__dirname, '../uploads/temp'),
        path.join(__dirname, '../videos'),
        path.join(__dirname, '../videos/originals'),
        path.join(__dirname, '../videos/hls'),
        path.join(__dirname, '../videos/thumbnails'),
        path.join(__dirname, '../logs')
    ];

    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            logger.info(`Dossier créé: ${dir}`);
        }
    });
};

// Middleware de sécurité Helmet avec configuration pour le streaming
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            mediaSrc: ["'self'", "blob:", "data:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "ws:", "wss:"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
        }
    },
    crossOriginEmbedderPolicy: false, // Nécessaire pour le streaming
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Compression des réponses
app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        // Ne pas compresser les fichiers de streaming
        if (req.path.includes('/stream/') || req.path.includes('.m3u8') || req.path.includes('.ts')) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

// Configuration CORS
const corsOptions = {
    origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'Range'
    ],
    exposedHeaders: [
        'Content-Range',
        'Accept-Ranges',
        'Content-Length',
        'Content-Type'
    ]
};

app.use(cors(corsOptions));

// Middleware de logging
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
    stream: {
        write: (message) => logger.info(message.trim())
    },
    skip: (req, res) => {
        // Skip les requêtes de health check et les segments HLS
        return req.path === '/health' || req.path.includes('.ts') || req.path.includes('.m3u8');
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requêtes max
    message: {
        error: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
        retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW) || 15)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip le rate limiting pour les requêtes de streaming
        return req.path.includes('/stream/') ||
            req.path.includes('/videos/') && req.method === 'GET' ||
            req.path === '/health';
    }
});

app.use(limiter);

// Rate limiting spécial pour l'upload
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 10, // 10 uploads par heure
    message: {
        error: 'Limite d\'upload atteinte. Veuillez attendre avant de télécharger une nouvelle vidéo.',
        retryAfter: 3600
    }
});

// Parsing du body
app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

app.use(express.urlencoded({
    extended: true,
    limit: '10mb'
}));

// Servir les fichiers statiques avec gestion du cache
app.use('/static', express.static(path.join(__dirname, '../videos'), {
    maxAge: process.env.NODE_ENV === 'production' ? '7d' : '0',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        // Headers spéciaux pour les fichiers de streaming
        if (path.endsWith('.m3u8')) {
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.setHeader('Cache-Control', 'no-cache');
        } else if (path.endsWith('.ts')) {
            res.setHeader('Content-Type', 'video/mp2t');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
        } else if (path.match(/\.(mp4|webm|avi|mov)$/)) {
            res.setHeader('Accept-Ranges', 'bytes');
        }
    }
}));

// Middleware pour ajouter des headers de sécurité personnalisés
app.use((req, res, next) => {
    // Headers pour la sécurité vidéo
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Headers pour les performances
    res.setHeader('X-DNS-Prefetch-Control', 'on');

    // ID de requête unique pour le debugging
    req.requestId = require('uuid').v4();
    res.setHeader('X-Request-ID', req.requestId);

    next();
});

// Middleware de logging des requêtes importantes
app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;

        // Log les requêtes lentes
        if (duration > 1000) {
            logger.warn(`Requête lente détectée: ${req.method} ${req.path} - ${duration}ms`, {
                method: req.method,
                path: req.path,
                duration,
                userAgent: req.get('User-Agent'),
                ip: req.ip,
                requestId: req.requestId
            });
        }

        // Log les erreurs
        if (res.statusCode >= 400) {
            logger.error(`Erreur HTTP: ${res.statusCode} ${req.method} ${req.path}`, {
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                userAgent: req.get('User-Agent'),
                ip: req.ip,
                requestId: req.requestId
            });
        }
    });

    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: require('../../package.json').version,
        memory: process.memoryUsage(),
        requestId: req.requestId
    });
});

// API Info endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'Frutiger Streaming API',
        version: require('../../package.json').version,
        description: 'API de streaming vidéo avec esthétique Frutiger Aero',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            videos: '/api/videos',
            playlists: '/api/playlists',
            categories: '/api/categories',
            search: '/api/search'
        },
        documentation: '/api/docs',
        health: '/health'
    });
});

// Routes principales de l'API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/videos', uploadLimiter, videoRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/search', searchRoutes);

// Middleware pour servir la documentation API (si Swagger est configuré)
if (process.env.NODE_ENV === 'development') {
    app.get('/api/docs', (req, res) => {
        res.json({
            message: 'Documentation API Swagger sera disponible ici',
            postman: 'Collection Postman disponible dans /docs/postman',
            repository: 'https://github.com/your-username/frutiger-streaming'
        });
    });
}

// WebSocket pour les fonctionnalités temps réel (notifications, chat, etc.)
const http = require('http');
const socketIo = require('socket.io');

const server = http.createServer(app);
const io = socketIo(server, {
    cors: corsOptions,
    pingTimeout: 60000,
    pingInterval: 25000
});

// Gestion des connexions WebSocket
io.on('connection', (socket) => {
    logger.info(`Nouvelle connexion WebSocket: ${socket.id}`);

    // Join une room spécifique (utilisateur ou vidéo)
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        logger.debug(`Socket ${socket.id} a rejoint la room ${roomId}`);
    });

    // Quitter une room
    socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        logger.debug(`Socket ${socket.id} a quitté la room ${roomId}`);
    });

    // Gestion des déconnexions
    socket.on('disconnect', (reason) => {
        logger.info(`Déconnexion WebSocket: ${socket.id} - ${reason}`);
    });

    // Gestion des erreurs
    socket.on('error', (error) => {
        logger.error(`Erreur WebSocket: ${socket.id}`, error);
    });
});

// Rendre io disponible dans les routes
app.set('io', io);

// Middleware de gestion des erreurs 404
app.use(notFoundHandler);

// Middleware de gestion des erreurs globales
app.use(errorHandler);

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
    logger.error('Exception non capturée:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Promesse rejetée non gérée:', { reason, promise });
    process.exit(1);
});

// Gestion de l'arrêt gracieux
process.on('SIGTERM', () => {
    logger.info('Signal SIGTERM reçu, arrêt gracieux...');
    server.close(() => {
        logger.info('Serveur fermé avec succès');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('Signal SIGINT reçu, arrêt gracieux...');
    server.close(() => {
        logger.info('Serveur fermé avec succès');
        process.exit(0);
    });
});

// Initialisation des dossiers
createDirectories();

// Export de l'app et du serveur
module.exports = { app, server, io };