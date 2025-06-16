// backend/src/utils/logger.js
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Configuration des niveaux de log personnalisés
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

// Configuration des couleurs pour chaque niveau
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'cyan',
    http: 'magenta',
    debug: 'white'
};

// Ajouter les couleurs à winston
winston.addColors(colors);

// Format personnalisé pour les logs
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.colorize({ all: true })
);

// Format pour la console (développement)
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let logMessage = `🌊 ${timestamp} [${level}]: ${message}`;

        // Ajouter les métadonnées si présentes
        if (Object.keys(meta).length > 0) {
            logMessage += `\n${JSON.stringify(meta, null, 2)}`;
        }

        return logMessage;
    })
);

// Format pour les fichiers (production)
const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return JSON.stringify({
            timestamp,
            level,
            message,
            service: 'frutiger-streaming-api',
            environment: process.env.NODE_ENV,
            pid: process.pid,
            ...meta
        });
    })
);

// Configuration des transports
const transports = [];

// Console transport (toujours actif)
transports.push(
    new winston.transports.Console({
        level: process.env.LOG_LEVEL || 'debug',
        format: process.env.NODE_ENV === 'production' ? fileFormat : consoleFormat,
        handleExceptions: true,
        handleRejections: true
    })
);

// File transports (production et développement avec fichier de log)
if (process.env.NODE_ENV === 'production' || process.env.LOG_FILE) {
    const logDir = path.join(__dirname, '../../logs');

    // Transport pour les logs généraux avec rotation quotidienne
    transports.push(
        new DailyRotateFile({
            filename: path.join(logDir, 'app-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'info',
            format: fileFormat,
            handleExceptions: true,
            handleRejections: true
        })
    );

    // Transport séparé pour les erreurs
    transports.push(
        new DailyRotateFile({
            filename: path.join(logDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d',
            level: 'error',
            format: fileFormat,
            handleExceptions: true,
            handleRejections: true
        })
    );

    // Transport pour les logs HTTP (requêtes)
    transports.push(
        new DailyRotateFile({
            filename: path.join(logDir, 'http-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '50m',
            maxFiles: '7d',
            level: 'http',
            format: fileFormat
        })
    );

    // Transport pour les logs de débogage (développement uniquement)
    if (process.env.NODE_ENV === 'development') {
        transports.push(
            new DailyRotateFile({
                filename: path.join(logDir, 'debug-%DATE%.log'),
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '10m',
                maxFiles: '3d',
                level: 'debug',
                format: fileFormat
            })
        );
    }
}

// Création du logger principal
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    levels,
    format: logFormat,
    transports,
    exitOnError: false,
    silent: process.env.NODE_ENV === 'test'
});

// Ajouter des méthodes personnalisées pour différents contextes

// Log pour les requêtes HTTP
logger.http = (message, meta = {}) => {
    logger.log('http', message, {
        context: 'HTTP',
        ...meta
    });
};

// Log pour les opérations de base de données
logger.db = (message, meta = {}) => {
    logger.debug(message, {
        context: 'DATABASE',
        ...meta
    });
};

// Log pour les opérations d'authentification
logger.auth = (message, meta = {}) => {
    logger.info(message, {
        context: 'AUTH',
        ...meta
    });
};

// Log pour les opérations vidéo
logger.video = (message, meta = {}) => {
    logger.info(message, {
        context: 'VIDEO',
        ...meta
    });
};

// Log pour les opérations de sécurité
logger.security = (message, meta = {}) => {
    logger.warn(message, {
        context: 'SECURITY',
        ...meta
    });
};

// Log pour les opérations de performance
logger.performance = (message, meta = {}) => {
    logger.info(message, {
        context: 'PERFORMANCE',
        ...meta
    });
};

// Fonction utilitaire pour logger les erreurs avec stack trace
logger.logError = (error, context = '', additionalInfo = {}) => {
    logger.error(`${context ? context + ': ' : ''}${error.message}`, {
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code
        },
        context: context || 'ERROR',
        ...additionalInfo
    });
};

// Fonction pour logger les métriques de performance
logger.logMetrics = (metrics, context = 'METRICS') => {
    logger.info('Métriques de performance', {
        context,
        metrics,
        timestamp: new Date().toISOString()
    });
};

// Fonction pour logger les événements utilisateur
logger.logUserAction = (userId, action, details = {}) => {
    logger.info(`Action utilisateur: ${action}`, {
        context: 'USER_ACTION',
        userId,
        action,
        details,
        timestamp: new Date().toISOString()
    });
};

// Fonction pour logger les événements de sécurité
logger.logSecurityEvent = (event, severity = 'medium', details = {}) => {
    const logLevel = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info';

    logger[logLevel](`Événement de sécurité: ${event}`, {
        context: 'SECURITY',
        event,
        severity,
        details,
        timestamp: new Date().toISOString()
    });
};

// Middleware pour logger les requêtes Express
logger.requestMiddleware = (req, res, next) => {
    const start = Date.now();

    // Générer un ID unique pour la requête
    req.requestId = require('uuid').v4();

    // Logger le début de la requête
    logger.http('Requête reçue', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        headers: {
            authorization: req.get('Authorization') ? 'Bearer [HIDDEN]' : undefined,
            contentType: req.get('Content-Type')
        }
    });

    // Logger la fin de la requête
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'http';

        logger[logLevel]('Requête terminée', {
            requestId: req.requestId,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            contentLength: res.get('Content-Length')
        });
    });

    next();
};

// Fonction de test du logger
logger.test = () => {
    logger.debug('Test du logger - DEBUG');
    logger.info('Test du logger - INFO');
    logger.warn('Test du logger - WARN');
    logger.error('Test du logger - ERROR');
    logger.http('Test du logger - HTTP');

    logger.info('Logger Frutiger Streaming initialisé avec succès! 🌊', {
        environment: process.env.NODE_ENV,
        logLevel: logger.level,
        transports: transports.length
    });
};

// Gestion gracieuse de l'arrêt
process.on('SIGINT', () => {
    logger.info('Signal SIGINT reçu, fermeture du logger...');
    logger.end();
});

process.on('SIGTERM', () => {
    logger.info('Signal SIGTERM reçu, fermeture du logger...');
    logger.end();
});

// Export du logger
module.exports = logger;