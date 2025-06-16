// backend/src/middleware/validation.js
const Joi = require('joi');
const logger = require('../utils/logger');

// Schémas de validation communs
const commonSchemas = {
    uuid: Joi.string().uuid().messages({
        'string.guid': 'ID invalide'
    }),

    email: Joi.string().email().messages({
        'string.email': 'Format d\'email invalide'
    }),

    password: Joi.string()
        .min(8)
        .max(128)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
        .messages({
            'string.min': 'Le mot de passe doit contenir au moins 8 caractères',
            'string.max': 'Le mot de passe ne peut pas dépasser 128 caractères',
            'string.pattern.base': 'Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial'
        }),

    username: Joi.string()
        .alphanum()
        .min(3)
        .max(30)
        .messages({
            'string.alphanum': 'Le nom d\'utilisateur ne peut contenir que des lettres et des chiffres',
            'string.min': 'Le nom d\'utilisateur doit contenir au moins 3 caractères',
            'string.max': 'Le nom d\'utilisateur ne peut pas dépasser 30 caractères'
        }),

    name: Joi.string()
        .min(2)
        .max(50)
        .pattern(/^[a-zA-ZÀ-ÿ\s-']+$/)
        .messages({
            'string.min': 'Le nom doit contenir au moins 2 caractères',
            'string.max': 'Le nom ne peut pas dépasser 50 caractères',
            'string.pattern.base': 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes'
        }),

    pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20)
    })
};

// Schémas de validation pour l'authentification
const authSchemas = {
    register: Joi.object({
        username: commonSchemas.username.required(),
        email: commonSchemas.email.required(),
        password: commonSchemas.password.required(),
        confirmPassword: Joi.string()
            .valid(Joi.ref('password'))
            .required()
            .messages({
                'any.only': 'La confirmation du mot de passe ne correspond pas'
            }),
        firstName: commonSchemas.name.optional(),
        lastName: commonSchemas.name.optional(),
        acceptTerms: Joi.boolean().valid(true).required().messages({
            'any.only': 'Vous devez accepter les conditions d\'utilisation'
        })
    }),

    login: Joi.object({
        login: Joi.string().required().messages({
            'any.required': 'Email ou nom d\'utilisateur requis'
        }),
        password: Joi.string().required().messages({
            'any.required': 'Mot de passe requis'
        }),
        rememberMe: Joi.boolean().optional()
    }),

    refreshToken: Joi.object({
        refreshToken: Joi.string().required().messages({
            'any.required': 'Refresh token requis'
        })
    }),

    changePassword: Joi.object({
        currentPassword: Joi.string().required(),
        newPassword: commonSchemas.password.required(),
        confirmPassword: Joi.string()
            .valid(Joi.ref('newPassword'))
            .required()
            .messages({
                'any.only': 'La confirmation du mot de passe ne correspond pas'
            })
    })
};

// Schémas de validation pour les vidéos
const videoSchemas = {
    upload: Joi.object({
        title: Joi.string().min(3).max(255).required().messages({
            'string.min': 'Le titre doit contenir au moins 3 caractères',
            'string.max': 'Le titre ne peut pas dépasser 255 caractères'
        }),
        description: Joi.string().max(5000).optional().allow(''),
        tags: Joi.alternatives()
            .try(
                Joi.array().items(Joi.string().max(50)).max(20),
                Joi.string().max(1000)
            )
            .optional(),
        categories: Joi.alternatives()
            .try(
                Joi.array().items(Joi.string().alphanum()).max(5),
                Joi.string().max(100)
            )
            .optional(),
        visibility: Joi.string().valid('public', 'private', 'unlisted').default('public')
    }),

    update: Joi.object({
        title: Joi.string().min(3).max(255).optional(),
        description: Joi.string().max(5000).optional().allow(''),
        tags: Joi.alternatives()
            .try(
                Joi.array().items(Joi.string().max(50)).max(20),
                Joi.string().max(1000)
            )
            .optional(),
        categories: Joi.alternatives()
            .try(
                Joi.array().items(Joi.string().alphanum()).max(5),
                Joi.string().max(100)
            )
            .optional(),
        visibility: Joi.string().valid('public', 'private', 'unlisted').optional()
    }),

    query: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(50).default(12),
        sort: Joi.string().valid('created_at', 'published_at', 'view_count', 'like_count', 'title', 'duration').default('created_at'),
        order: Joi.string().valid('ASC', 'DESC').default('DESC'),
        category: Joi.string().alphanum().optional(),
        search: Joi.string().min(2).max(100).optional(),
        status: Joi.string().valid('processing', 'ready', 'failed').default('ready'),
        user_id: commonSchemas.uuid.optional()
    }),

    reaction: Joi.object({
        type: Joi.string().valid('like', 'dislike').required()
    }),

    comment: Joi.object({
        content: Joi.string().min(1).max(2000).required(),
        parentId: commonSchemas.uuid.optional()
    })
};

// Schémas de validation pour les playlists
const playlistSchemas = {
    create: Joi.object({
        title: Joi.string().min(3).max(255).required(),
        description: Joi.string().max(2000).optional().allow(''),
        visibility: Joi.string().valid('public', 'private', 'unlisted').default('public')
    }),

    update: Joi.object({
        title: Joi.string().min(3).max(255).optional(),
        description: Joi.string().max(2000).optional().allow(''),
        visibility: Joi.string().valid('public', 'private', 'unlisted').optional()
    }),

    addVideo: Joi.object({
        videoId: commonSchemas.uuid.required(),
        position: Joi.number().integer().min(1).optional()
    }),

    reorder: Joi.object({
        videoOrders: Joi.array()
            .items(
                Joi.object({
                    videoId: commonSchemas.uuid.required(),
                    position: Joi.number().integer().min(1).required()
                })
            )
            .min(1)
            .required()
    })
};

// Schémas de validation pour les utilisateurs
const userSchemas = {
    updateProfile: Joi.object({
        firstName: commonSchemas.name.optional(),
        lastName: commonSchemas.name.optional(),
        bio: Joi.string().max(500).optional().allow('')
    }),

    notifications: Joi.object({
        notificationIds: Joi.array().items(commonSchemas.uuid).min(1).required()
    }),

    deleteAccount: Joi.object({
        password: Joi.string().required()
    })
};

// Schémas de validation pour la recherche
const searchSchemas = {
    search: Joi.object({
        q: Joi.string().min(2).max(100).required(),
        type: Joi.string().valid('all', 'videos', 'playlists', 'users').default('all'),
        category: Joi.string().alphanum().optional(),
        duration: Joi.string().valid('short', 'medium', 'long').optional(),
        upload_date: Joi.string().valid('hour', 'today', 'week', 'month', 'year').optional(),
        sort: Joi.string().valid('relevance', 'upload_date', 'view_count', 'rating').default('relevance'),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(50).default(20)
    }),

    suggestions: Joi.object({
        q: Joi.string().min(1).max(50).required(),
        limit: Joi.number().integer().min(1).max(10).default(5)
    })
};

// Middleware de validation générique
const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false,
            allowUnknown: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));

            logger.warn('Erreur de validation', {
                property,
                errors,
                originalData: req[property],
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            return res.status(400).json({
                success: false,
                error: 'Données de validation invalides',
                code: 'VALIDATION_ERROR',
                details: errors
            });
        }

        // Remplacer les données validées
        req[property] = value;
        next();
    };
};

// Middleware de validation des paramètres
const validateParams = (schema) => validate(schema, 'params');

// Middleware de validation du body
const validateBody = (schema) => validate(schema, 'body');

// Middleware de validation des query parameters
const validateQuery = (schema) => validate(schema, 'query');

// Middleware de validation des headers
const validateHeaders = (schema) => validate(schema, 'headers');

// Middleware de validation conditionnelle
const validateIf = (condition, schema, property = 'body') => {
    return (req, res, next) => {
        if (condition(req)) {
            return validate(schema, property)(req, res, next);
        }
        next();
    };
};

// Middleware de validation des fichiers uploadés
const validateFileUpload = (options = {}) => {
    const {
        required = true,
        maxSize = 50 * 1024 * 1024, // 50MB par défaut
        allowedTypes = [],
        maxFiles = 1
    } = options;

    return (req, res, next) => {
        if (required && !req.file && !req.files) {
            return res.status(400).json({
                success: false,
                error: 'Fichier requis',
                code: 'FILE_REQUIRED'
            });
        }

        const files = req.files || (req.file ? [req.file] : []);

        // Vérifier le nombre de fichiers
        if (files.length > maxFiles) {
            return res.status(400).json({
                success: false,
                error: `Maximum ${maxFiles} fichier(s) autorisé(s)`,
                code: 'TOO_MANY_FILES'
            });
        }

        // Vérifier chaque fichier
        for (const file of files) {
            // Vérifier la taille
            if (file.size > maxSize) {
                return res.status(400).json({
                    success: false,
                    error: `Fichier trop volumineux. Taille maximale: ${formatFileSize(maxSize)}`,
                    code: 'FILE_TOO_LARGE'
                });
            }

            // Vérifier le type MIME
            if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
                return res.status(400).json({
                    success: false,
                    error: `Type de fichier non autorisé. Types acceptés: ${allowedTypes.join(', ')}`,
                    code: 'INVALID_FILE_TYPE'
                });
            }
        }

        next();
    };
};

// Fonction utilitaire pour formater la taille des fichiers
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Middleware de sanitisation des données
const sanitize = (req, res, next) => {
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;

        // Supprimer les caractères de contrôle
        return str.replace(/[\x00-\x1F\x7F]/g, '')
            .trim()
            .substring(0, 10000); // Limiter la longueur
    };

    const sanitizeObject = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;

        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (Array.isArray(value)) {
                sanitized[key] = value.map(item =>
                    typeof item === 'string' ? sanitizeString(item) : item
                );
            } else if (typeof value === 'string') {
                sanitized[key] = sanitizeString(value);
            } else if (typeof value === 'object') {
                sanitized[key] = sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    };

    // Sanitiser body, query et params
    if (req.body) req.body = sanitizeObject(req.body);
    if (req.query) req.query = sanitizeObject(req.query);
    if (req.params) req.params = sanitizeObject(req.params);

    next();
};

module.exports = {
    commonSchemas,
    authSchemas,
    videoSchemas,
    playlistSchemas,
    userSchemas,
    searchSchemas,
    validate,
    validateParams,
    validateBody,
    validateQuery,
    validateHeaders,
    validateIf,
    validateFileUpload,
    sanitize,
    formatFileSize
};