// backend/src/routes/users.js
const express = require('express');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const userController = require('../controllers/userController');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');
const { uploadAvatar, handleUploadError } = require('../middleware/upload');
const { validateBody, validateQuery, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Rate limiting pour les actions utilisateur
const userActionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 actions par 15 minutes
    message: {
        success: false,
        error: 'Trop d\'actions utilisateur. Veuillez ralentir.',
        code: 'USER_ACTION_LIMIT_EXCEEDED'
    },
    skip: (req) => req.method === 'GET'
});

// Schémas de validation
const getUsersSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    sort: Joi.string().valid('created_at', 'username', 'last_login').default('created_at'),
    order: Joi.string().valid('ASC', 'DESC').default('DESC'),
    search: Joi.string().min(2).max(50).optional(),
    role: Joi.string().valid('user', 'admin', 'moderator').optional(),
    status: Joi.string().valid('active', 'inactive', 'banned').optional()
});

const updateProfileSchema = Joi.object({
    firstName: Joi.string()
        .min(2)
        .max(50)
        .pattern(/^[a-zA-ZÀ-ÿ\s-']+$/)
        .optional()
        .messages({
            'string.min': 'Le prénom doit contenir au moins 2 caractères',
            'string.max': 'Le prénom ne peut pas dépasser 50 caractères',
            'string.pattern.base': 'Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes'
        }),

    lastName: Joi.string()
        .min(2)
        .max(50)
        .pattern(/^[a-zA-ZÀ-ÿ\s-']+$/)
        .optional()
        .messages({
            'string.min': 'Le nom doit contenir au moins 2 caractères',
            'string.max': 'Le nom ne peut pas dépasser 50 caractères',
            'string.pattern.base': 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes'
        }),

    bio: Joi.string()
        .max(500)
        .optional()
        .allow('')
        .messages({
            'string.max': 'La bio ne peut pas dépasser 500 caractères'
        })
});

const changePasswordSchema = Joi.object({
    currentPassword: Joi.string()
        .required()
        .messages({
            'any.required': 'Mot de passe actuel requis'
        }),

    newPassword: Joi.string()
        .min(8)
        .max(128)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
        .required()
        .messages({
            'string.min': 'Le mot de passe doit contenir au moins 8 caractères',
            'string.max': 'Le mot de passe ne peut pas dépasser 128 caractères',
            'string.pattern.base': 'Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial',
            'any.required': 'Le nouveau mot de passe est requis'
        }),

    confirmPassword: Joi.string()
        .valid(Joi.ref('newPassword'))
        .required()
        .messages({
            'any.only': 'La confirmation du mot de passe ne correspond pas',
            'any.required': 'La confirmation du mot de passe est requise'
        })
});

/**
 * @route   GET /api/users
 * @desc    Obtenir la liste des utilisateurs (admin uniquement)
 * @access  Private (Admin)
 */
router.get('/',
    authenticateToken,
    requireRole('admin', 'moderator'),
    validateQuery(getUsersSchema),
    asyncHandler(async (req, res) => {
        const { User } = require('../models');
        const result = await User.findAll(req.query);

        res.json({
            success: true,
            data: result
        });
    })
);

/**
 * @route   GET /api/users/:id
 * @desc    Obtenir le profil public d'un utilisateur
 * @access  Public
 */
router.get('/:id',
    optionalAuth,
    asyncHandler(userController.getUserProfile)
);

/**
 * @route   PUT /api/users/profile
 * @desc    Mettre à jour son profil
 * @access  Private
 */
router.put('/profile',
    authenticateToken,
    userActionLimiter,
    validateBody(updateProfileSchema),
    asyncHandler(userController.updateProfile)
);

/**
 * @route   POST /api/users/avatar
 * @desc    Upload d'avatar
 * @access  Private
 */
router.post('/avatar',
    authenticateToken,
    userActionLimiter,
    uploadAvatar.single('avatar'),
    handleUploadError,
    asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Fichier avatar requis',
                code: 'MISSING_AVATAR_FILE'
            });
        }

        const avatarUrl = `/static/avatars/${req.file.filename}`;
        const db = require('../config/database');
        const logger = require('../utils/logger');

        // Mettre à jour l'URL de l'avatar en base
        await db.query(
            'UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [avatarUrl, req.user.id]
        );

        logger.auth('Avatar mis à jour', {
            userId: req.user.id,
            avatarUrl
        });

        res.json({
            success: true,
            message: 'Avatar mis à jour avec succès',
            data: {
                avatarUrl
            }
        });
    })
);

/**
 * @route   PUT /api/users/password
 * @desc    Changer son mot de passe
 * @access  Private
 */
router.put('/password',
    authenticateToken,
    userActionLimiter,
    validateBody(changePasswordSchema),
    asyncHandler(userController.changePassword)
);

/**
 * @route   POST /api/users/:id/follow
 * @desc    Suivre/ne plus suivre un utilisateur
 * @access  Private
 */
router.post('/:id/follow',
    authenticateToken,
    userActionLimiter,
    asyncHandler(userController.followUser)
);

/**
 * @route   GET /api/users/:id/following
 * @desc    Obtenir les abonnements d'un utilisateur
 * @access  Public
 */
router.get('/:id/following',
    validateQuery(Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(50).default(20)
    })),
    asyncHandler(userController.getUserFollowing)
);

/**
 * @route   GET /api/users/:id/followers
 * @desc    Obtenir les abonnés d'un utilisateur
 * @access  Public
 */
router.get('/:id/followers',
    validateQuery(Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(50).default(20)
    })),
    asyncHandler(userController.getUserFollowers)
);

/**
 * @route   GET /api/users/me/notifications
 * @desc    Obtenir ses notifications
 * @access  Private
 */
router.get('/me/notifications',
    authenticateToken,
    validateQuery(Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(50).default(20),
        unread: Joi.boolean().optional()
    })),
    asyncHandler(userController.getUserNotifications)
);

/**
 * @route   PUT /api/users/me/notifications/read
 * @desc    Marquer des notifications comme lues
 * @access  Private
 */
router.put('/me/notifications/read',
    authenticateToken,
    validateBody(Joi.object({
        notificationIds: Joi.array().items(Joi.string().uuid()).min(1).required()
    })),
    asyncHandler(userController.markNotificationsRead)
);

/**
 * @route   GET /api/users/:id/videos
 * @desc    Obtenir les vidéos publiques d'un utilisateur
 * @access  Public
 */
router.get('/:id/videos',
    optionalAuth,
    validateQuery(Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(50).default(12),
        sort: Joi.string().valid('created_at', 'view_count', 'like_count', 'title').default('created_at'),
        order: Joi.string().valid('ASC', 'DESC').default('DESC')
    })),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const currentUserId = req.user?.id;
        const db = require('../config/database');

        // Vérifier que l'utilisateur existe
        const userExists = await db.query('SELECT id FROM users WHERE id = $1', [id]);
        if (userExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Utilisateur non trouvé',
                code: 'USER_NOT_FOUND'
            });
        }

        // Récupérer les vidéos
        const { page, limit, sort, order } = req.query;
        const offset = (page - 1) * limit;

        // Déterminer la visibilité selon les permissions
        const visibilityCondition = currentUserId === id
            ? "v.visibility IN ('public', 'unlisted')"
            : "v.visibility = 'public'";

        const videosQuery = `
            SELECT 
                v.id, v.title, v.description, v.thumbnail_url, v.duration,
                v.view_count, v.like_count, v.dislike_count, v.created_at,
                u.username, u.avatar_url
            FROM videos v
            JOIN users u ON v.user_id = u.id
            WHERE v.user_id = $1 AND v.status = 'ready' AND ${visibilityCondition}
            ORDER BY v.${sort} ${order}
            LIMIT $2 OFFSET $3
        `;

        const countQuery = `
            SELECT COUNT(*) as total
            FROM videos v
            WHERE v.user_id = $1 AND v.status = 'ready' AND ${visibilityCondition}
        `;

        const [videosResult, countResult] = await Promise.all([
            db.query(videosQuery, [id, limit, offset]),
            db.query(countQuery, [id])
        ]);

        const videos = videosResult.rows;
        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            data: {
                videos,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            }
        });
    })
);

/**
 * @route   DELETE /api/users/account
 * @desc    Supprimer son compte
 * @access  Private
 */
router.delete('/account',
    authenticateToken,
    validateBody(Joi.object({
        password: Joi.string().required()
    })),
    asyncHandler(userController.deleteAccount)
);

/**
 * @route   PUT /api/users/:id/status
 * @desc    Modifier le statut d'un utilisateur (admin uniquement)
 * @access  Private (Admin)
 */
router.put('/:id/status',
    authenticateToken,
    requireRole('admin'),
    validateBody(Joi.object({
        status: Joi.string().valid('active', 'inactive', 'banned').required(),
        reason: Joi.string().max(500).optional()
    })),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { status, reason } = req.body;
        const db = require('../config/database');
        const logger = require('../utils/logger');

        if (id === req.user.id) {
            return res.status(400).json({
                success: false,
                error: 'Impossible de modifier son propre statut',
                code: 'CANNOT_MODIFY_SELF'
            });
        }

        const result = await db.query(
            'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING username',
            [status, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Utilisateur non trouvé',
                code: 'USER_NOT_FOUND'
            });
        }

        logger.security('Statut utilisateur modifié', {
            targetUserId: id,
            targetUsername: result.rows[0].username,
            newStatus: status,
            reason: reason || null,
            adminId: req.user.id,
            adminUsername: req.user.username
        });

        res.json({
            success: true,
            message: `Statut utilisateur modifié: ${status}`
        });
    })
);

module.exports = router;