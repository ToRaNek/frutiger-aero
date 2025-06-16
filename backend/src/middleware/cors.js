// backend/src/middleware/cors.js
const cors = require('cors');
const logger = require('../utils/logger');

// Configuration CORS avancée pour l'API de streaming
const corsOptions = {
    // Origines autorisées
    origin: (origin, callback) => {
        const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(o => o.trim());

        // Permettre les requêtes sans origine (applications mobiles, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }

        // Vérifier si l'origine est autorisée
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            logger.security('Origine CORS non autorisée', {
                origin,
                allowedOrigins,
                userAgent: 'N/A'
            });
            callback(new Error('Non autorisé par la politique CORS'));
        }
    },

    // Méthodes HTTP autorisées
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],

    // Headers autorisés dans les requêtes
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'Pragma',
        'Range',
        'If-Range',
        'If-None-Match',
        'If-Modified-Since',
        'X-API-Key',
        'X-Client-Version',
        'X-Request-ID'
    ],

    // Headers exposés aux clients
    exposedHeaders: [
        'Content-Range',
        'Accept-Ranges',
        'Content-Length',
        'Content-Type',
        'X-Total-Count',
        'X-Request-ID'
    ],

    // Autoriser les cookies et credentials
    credentials: true,

    // Durée de mise en cache des requêtes preflight
    maxAge: 86400, // 24 heures

    // Gérer les requêtes OPTIONS automatiquement
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Middleware CORS principal
const corsMiddleware = cors(corsOptions);

// Middleware CORS personnalisé pour les besoins spécifiques du streaming
const customCorsMiddleware = (req, res, next) => {
    // Headers spéciaux pour le streaming vidéo
    if (req.path.includes('/stream/') || req.path.includes('/videos/')) {
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

        if (req.method === 'OPTIONS') {
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Range');
            res.header('Access-Control-Max-Age', '86400');
            return res.status(204).end();
        }
    }

    // Headers pour les uploads
    if (req.path.includes('/upload')) {
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Credentials', 'true');

        if (req.method === 'OPTIONS') {
            res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            return res.status(204).end();
        }
    }

    next();
};

// Middleware pour les WebSockets
const corsWebSocket = (req, callback) => {
    const origin = req.headers.origin;
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(o => o.trim());

    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
    } else {
        logger.security('Origine WebSocket non autorisée', {
            origin,
            allowedOrigins
        });
        callback(new Error('Non autorisé par la politique CORS'));
    }
};

// Configuration CORS pour les environnements de développement
const developmentCors = cors({
    origin: true, // Accepter toutes les origines en développement
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['*'],
    exposedHeaders: ['*']
});

// Configuration CORS pour la production
const productionCors = cors({
    origin: (origin, callback) => {
        const allowedOrigins = process.env.CORS_ORIGIN.split(',').map(o => o.trim());

        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            logger.security('Tentative d\'accès depuis une origine non autorisée', {
                origin,
                allowedOrigins
            });
            callback(new Error('Non autorisé par la politique CORS'));
        }
    },
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
        'Content-Length'
    ],
    maxAge: 86400
});

// Middleware conditionnel selon l'environnement
const environmentalCors = process.env.NODE_ENV === 'production'
    ? productionCors
    : developmentCors;

// Middleware pour ajouter des headers de sécurité CORS
const securityHeaders = (req, res, next) => {
    // Empêcher l'embedding dans des iframes
    res.header('X-Frame-Options', 'DENY');

    // Empêcher le MIME type sniffing
    res.header('X-Content-Type-Options', 'nosniff');

    // Politique de référent stricte
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Autoriser seulement les connexions HTTPS en production
    if (process.env.NODE_ENV === 'production') {
        res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
};

// Middleware pour logger les requêtes CORS
const logCorsRequests = (req, res, next) => {
    const origin = req.headers.origin;
    const method = req.method;

    if (origin && (method === 'OPTIONS' || req.headers['access-control-request-method'])) {
        logger.http('Requête CORS preflight', {
            origin,
            method,
            requestedMethod: req.headers['access-control-request-method'],
            requestedHeaders: req.headers['access-control-request-headers'],
            path: req.path
        });
    }

    next();
};

// Configuration pour les APIs externes
const apiCors = cors({
    origin: ['https://api.example.com', 'https://cdn.example.com'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 3600
});

module.exports = {
    corsMiddleware,
    customCorsMiddleware,
    corsWebSocket,
    environmentalCors,
    securityHeaders,
    logCorsRequests,
    apiCors,
    developmentCors,
    productionCors
};