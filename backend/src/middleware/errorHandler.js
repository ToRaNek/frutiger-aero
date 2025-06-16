// backend/src/middleware/errorHandler.js
const logger = require('../utils/logger');

// Middleware pour gérer les erreurs 404 (route non trouvée)
const notFoundHandler = (req, res, next) => {
    const error = new Error(`Route non trouvée: ${req.method} ${req.originalUrl}`);
    error.status = 404;
    error.code = 'ROUTE_NOT_FOUND';

    logger.http('Route non trouvée', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.status(404).json({
        success: false,
        error: 'Route non trouvée',
        code: 'ROUTE_NOT_FOUND',
        method: req.method,
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
    });
};

// Middleware principal de gestion des erreurs
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Logger l'erreur avec le contexte
    logger.logError(err, 'ErrorHandler', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        requestId: req.requestId,
        body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined
    });

    // Erreurs de base de données PostgreSQL
    if (err.code && err.code.startsWith('23')) {
        error = handleDatabaseError(err);
    }

    // Erreurs de validation Joi
    if (err.isJoi) {
        error = handleValidationError(err);
    }

    // Erreurs JWT
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        error = handleJwtError(err);
    }

    // Erreurs Multer (upload)
    if (err.code && err.code.startsWith('LIMIT_')) {
        error = handleMulterError(err);
    }

    // Erreurs FFmpeg
    if (err.message && err.message.includes('ffmpeg')) {
        error = handleFFmpegError(err);
    }

    // Erreurs de parsing JSON
    if (err.type === 'entity.parse.failed') {
        error = handleJsonParseError(err);
    }

    // Erreurs de limitation de débit
    if (err.type === 'rate.limit.exceeded') {
        error = handleRateLimitError(err);
    }

    // Définir le statut par défaut
    const statusCode = error.statusCode || error.status || 500;
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Réponse d'erreur standardisée
    const errorResponse = {
        success: false,
        error: error.message || 'Erreur interne du serveur',
        code: error.code || 'INTERNAL_ERROR',
        statusCode: statusCode,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
    };

    // Ajouter des détails supplémentaires en développement
    if (isDevelopment) {
        errorResponse.stack = err.stack;
        errorResponse.details = error.details;
    }

    // Ajouter des suggestions d'action pour certaines erreurs
    if (error.suggestions) {
        errorResponse.suggestions = error.suggestions;
    }

    // Ne pas exposer les erreurs internes en production
    if (statusCode === 500 && process.env.NODE_ENV === 'production') {
        errorResponse.error = 'Une erreur interne s\'est produite';
        errorResponse.code = 'INTERNAL_ERROR';
    }

    res.status(statusCode).json(errorResponse);
};

// Gérer les erreurs de base de données PostgreSQL
const handleDatabaseError = (err) => {
    let error = { statusCode: 400 };

    switch (err.code) {
        case '23000':
        case '23001':
        case '23502':
            error.message = 'Données manquantes ou invalides';
            error.code = 'INVALID_DATA';
            break;
        case '23503':
            error.message = 'Référence vers une ressource inexistante';
            error.code = 'FOREIGN_KEY_VIOLATION';
            break;
        case '23505':
            // Extraire le champ dupliqué du message d'erreur
            const duplicateField = extractDuplicateField(err.detail);
            error.message = `${duplicateField} déjà utilisé${duplicateField.includes('email') ? '' : '(e)'}`;
            error.code = 'DUPLICATE_ENTRY';
            error.field = duplicateField;
            break;
        case '23514':
            error.message = 'Contrainte de validation violée';
            error.code = 'CHECK_VIOLATION';
            break;
        case '42703':
            error.message = 'Champ de base de données invalide';
            error.code = 'INVALID_FIELD';
            error.statusCode = 500;
            break;
        case '42P01':
            error.message = 'Table de base de données introuvable';
            error.code = 'TABLE_NOT_FOUND';
            error.statusCode = 500;
            break;
        default:
            error.message = 'Erreur de base de données';
            error.code = 'DATABASE_ERROR';
            error.statusCode = 500;
    }

    return error;
};

// Extraire le champ dupliqué du message d'erreur PostgreSQL
const extractDuplicateField = (detail) => {
    if (!detail) return 'valeur';

    const match = detail.match(/Key \(([^)]+)\)/);
    if (match) {
        const field = match[1];
        // Traduire les noms de champs en français
        const fieldTranslations = {
            'email': 'email',
            'username': 'nom d\'utilisateur',
            'title': 'titre',
            'name': 'nom'
        };
        return fieldTranslations[field] || field;
    }

    return 'valeur';
};

// Gérer les erreurs de validation Joi
const handleValidationError = (err) => {
    const errors = err.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
    }));

    return {
        statusCode: 400,
        message: 'Données de validation invalides',
        code: 'VALIDATION_ERROR',
        details: errors,
        suggestions: ['Vérifiez les champs requis', 'Respectez les formats demandés']
    };
};

// Gérer les erreurs JWT
const handleJwtError = (err) => {
    let error = { statusCode: 401 };

    switch (err.name) {
        case 'TokenExpiredError':
            error.message = 'Token d\'authentification expiré';
            error.code = 'TOKEN_EXPIRED';
            error.suggestions = ['Reconnectez-vous', 'Utilisez le refresh token'];
            break;
        case 'JsonWebTokenError':
            error.message = 'Token d\'authentification invalide';
            error.code = 'INVALID_TOKEN';
            error.suggestions = ['Vérifiez le format du token', 'Reconnectez-vous'];
            break;
        case 'NotBeforeError':
            error.message = 'Token pas encore valide';
            error.code = 'TOKEN_NOT_ACTIVE';
            break;
        default:
            error.message = 'Erreur d\'authentification';
            error.code = 'AUTH_ERROR';
    }

    return error;
};

// Gérer les erreurs Multer (upload de fichiers)
const handleMulterError = (err) => {
    let error = { statusCode: 400 };

    switch (err.code) {
        case 'LIMIT_FILE_SIZE':
            error.message = 'Fichier trop volumineux';
            error.code = 'FILE_TOO_LARGE';
            error.suggestions = ['Compressez votre fichier', 'Utilisez un format plus léger'];
            break;
        case 'LIMIT_FILE_COUNT':
            error.message = 'Trop de fichiers uploadés';
            error.code = 'TOO_MANY_FILES';
            break;
        case 'LIMIT_UNEXPECTED_FILE':
            error.message = 'Champ de fichier inattendu';
            error.code = 'UNEXPECTED_FILE_FIELD';
            break;
        default:
            error.message = 'Erreur lors de l\'upload du fichier';
            error.code = 'UPLOAD_ERROR';
    }

    return error;
};

// Gérer les erreurs FFmpeg
const handleFFmpegError = (err) => {
    return {
        statusCode: 422,
        message: 'Erreur lors du traitement de la vidéo',
        code: 'VIDEO_PROCESSING_ERROR',
        details: err.message,
        suggestions: [
            'Vérifiez que le fichier vidéo n\'est pas corrompu',
            'Utilisez un format vidéo standard (MP4, AVI, MOV)',
            'Réessayez avec une vidéo de taille plus petite'
        ]
    };
};

// Gérer les erreurs de parsing JSON
const handleJsonParseError = (err) => {
    return {
        statusCode: 400,
        message: 'Format JSON invalide',
        code: 'INVALID_JSON',
        suggestions: ['Vérifiez la syntaxe JSON', 'Utilisez un validateur JSON']
    };
};

// Gérer les erreurs de limitation de débit
const handleRateLimitError = (err) => {
    return {
        statusCode: 429,
        message: 'Trop de requêtes, veuillez ralentir',
        code: 'RATE_LIMIT_EXCEEDED',
        suggestions: ['Attendez quelques minutes avant de réessayer']
    };
};

// Middleware pour capturer les erreurs asynchrones
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Middleware pour valider les paramètres d'URL
const validateParams = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.params);
        if (error) {
            return next(error);
        }
        next();
    };
};

// Middleware pour valider le body de la requête
const validateBody = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return next(error);
        }
        next();
    };
};

// Middleware pour valider les query parameters
const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.query);
        if (error) {
            return next(error);
        }
        next();
    };
};

module.exports = {
    notFoundHandler,
    errorHandler,
    asyncHandler,
    validateParams,
    validateBody,
    validateQuery,
    handleDatabaseError,
    handleValidationError,
    handleJwtError,
    handleMulterError,
    handleFFmpegError
};