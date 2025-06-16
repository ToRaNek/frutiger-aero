// backend/src/routes/auth.js
const express = require('express');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validateBody, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Rate limiting spécifique pour l'authentification
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 tentatives max par IP
    message: {
        success: false,
        error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
        code: 'TOO_MANY_AUTH_ATTEMPTS'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Ne pas limiter les requêtes GET (profil, vérification email)
        return req.method === 'GET';
    }
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 3, // 3 inscriptions max par IP
    message: {
        success: false,
        error: 'Trop d\'inscriptions depuis cette IP. Réessayez dans 1 heure.',
        code: 'TOO_MANY_REGISTRATIONS'
    }
});

// Schémas de validation Joi
const registerSchema = Joi.object({
    username: Joi.string()
        .alphanum()
        .min(3)
        .max(30)
        .required()
        .messages({
            'string.alphanum': 'Le nom d\'utilisateur ne peut contenir que des lettres et des chiffres',
            'string.min': 'Le nom d\'utilisateur doit contenir au moins 3 caractères',
            'string.max': 'Le nom d\'utilisateur ne peut pas dépasser 30 caractères',
            'any.required': 'Le nom d\'utilisateur est requis'
        }),

    email: Joi.string()
        .email({ tlds: { allow: false } })
        .required()
        .messages({
            'string.email': 'Format d\'email invalide',
            'any.required': 'L\'email est requis'
        }),

    password: Joi.string()
        .min(8)
        .max(128)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
        .required()
        .messages({
            'string.min': 'Le mot de passe doit contenir au moins 8 caractères',
            'string.max': 'Le mot de passe ne peut pas dépasser 128 caractères',
            'string.pattern.base': 'Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial',
            'any.required': 'Le mot de passe est requis'
        }),

    confirmPassword: Joi.string()
        .valid(Joi.ref('password'))
        .required()
        .messages({
            'any.only': 'La confirmation du mot de passe ne correspond pas',
            'any.required': 'La confirmation du mot de passe est requise'
        }),

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

    acceptTerms: Joi.boolean()
        .valid(true)
        .required()
        .messages({
            'any.only': 'Vous devez accepter les conditions d\'utilisation'
        })
});

const loginSchema = Joi.object({
    login: Joi.string()
        .required()
        .messages({
            'any.required': 'Email ou nom d\'utilisateur requis'
        }),

    password: Joi.string()
        .required()
        .messages({
            'any.required': 'Mot de passe requis'
        }),

    rememberMe: Joi.boolean()
        .optional()
});

const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string()
        .required()
        .messages({
            'any.required': 'Refresh token requis'
        })
});

const logoutSchema = Joi.object({
    refreshToken: Joi.string()
        .optional(),

    allDevices: Joi.boolean()
        .optional()
        .default(false)
});

const resendVerificationSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .required()
        .messages({
            'string.email': 'Format d\'email invalide',
            'any.required': 'Email requis'
        })
});

// Routes d'authentification

/**
 * @route   POST /api/auth/register
 * @desc    Inscription d'un nouvel utilisateur
 * @access  Public
 * @rateLimit 3 requêtes par heure par IP
 */
router.post('/register',
    registerLimiter,
    validateBody(registerSchema),
    asyncHandler(authController.register)
);

/**
 * @route   POST /api/auth/login
 * @desc    Connexion d'un utilisateur
 * @access  Public
 * @rateLimit 5 requêtes par 15 minutes par IP
 */
router.post('/login',
    authLimiter,
    validateBody(loginSchema),
    asyncHandler(authController.login)
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Renouvellement du token d'accès
 * @access  Public
 * @rateLimit 5 requêtes par 15 minutes par IP
 */
router.post('/refresh',
    authLimiter,
    validateBody(refreshTokenSchema),
    asyncHandler(authController.refreshToken)
);

/**
 * @route   POST /api/auth/logout
 * @desc    Déconnexion d'un utilisateur
 * @access  Private (optionnel)
 */
router.post('/logout',
    optionalAuth,
    validateBody(logoutSchema),
    asyncHandler(authController.logout)
);

/**
 * @route   GET /api/auth/verify-email/:token
 * @desc    Vérification de l'email avec le token
 * @access  Public
 */
router.get('/verify-email/:token',
    asyncHandler(authController.verifyEmail)
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Renvoyer l'email de vérification
 * @access  Public
 * @rateLimit 5 requêtes par 15 minutes par IP
 */
router.post('/resend-verification',
    authLimiter,
    validateBody(resendVerificationSchema),
    asyncHandler(authController.resendVerificationEmail)
);

/**
 * @route   GET /api/auth/me
 * @desc    Obtenir les informations de l'utilisateur connecté
 * @access  Private
 */
router.get('/me',
    authenticateToken,
    asyncHandler(authController.me)
);

/**
 * @route   GET /api/auth/check
 * @desc    Vérifier si l'utilisateur est connecté (pour le frontend)
 * @access  Private
 */
router.get('/check',
    authenticateToken,
    asyncHandler(async (req, res) => {
        res.json({
            success: true,
            data: {
                authenticated: true,
                user: {
                    id: req.user.id,
                    username: req.user.username,
                    email: req.user.email,
                    role: req.user.role,
                    emailVerified: req.user.email_verified
                }
            }
        });
    })
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Demander une réinitialisation de mot de passe
 * @access  Public
 * @rateLimit 5 requêtes par 15 minutes par IP
 */
router.post('/forgot-password',
    authLimiter,
    validateBody(Joi.object({
        email: Joi.string()
            .email({ tlds: { allow: false } })
            .required()
            .messages({
                'string.email': 'Format d\'email invalide',
                'any.required': 'Email requis'
            })
    })),
    asyncHandler(async (req, res) => {
        // TODO: Implémenter la logique de réinitialisation de mot de passe
        res.json({
            success: true,
            message: 'Si cet email existe, un lien de réinitialisation a été envoyé'
        });
    })
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Réinitialiser le mot de passe avec un token
 * @access  Public
 * @rateLimit 5 requêtes par 15 minutes par IP
 */
router.post('/reset-password',
    authLimiter,
    validateBody(Joi.object({
        token: Joi.string()
            .required()
            .messages({
                'any.required': 'Token de réinitialisation requis'
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
    })),
    asyncHandler(async (req, res) => {
        // TODO: Implémenter la logique de réinitialisation de mot de passe
        res.json({
            success: true,
            message: 'Mot de passe réinitialisé avec succès'
        });
    })
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Changer le mot de passe (utilisateur connecté)
 * @access  Private
 */
router.post('/change-password',
    authenticateToken,
    validateBody(Joi.object({
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
    })),
    asyncHandler(async (req, res) => {
        // TODO: Implémenter la logique de changement de mot de passe
        res.json({
            success: true,
            message: 'Mot de passe modifié avec succès'
        });
    })
);

/**
 * @route   GET /api/auth/sessions
 * @desc    Obtenir les sessions actives de l'utilisateur
 * @access  Private
 */
router.get('/sessions',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const db = require('../config/database');

        const sessionsQuery = `
      SELECT id, ip_address, user_agent, created_at, last_used_at, expires_at,
             CASE WHEN expires_at > NOW() THEN true ELSE false END as is_valid
      FROM user_sessions
      WHERE user_id = $1 AND is_active = true
      ORDER BY last_used_at DESC
    `;

        const sessionsResult = await db.query(sessionsQuery, [req.user.id]);

        res.json({
            success: true,
            data: {
                sessions: sessionsResult.rows.map(session => ({
                    id: session.id,
                    ipAddress: session.ip_address,
                    userAgent: session.user_agent,
                    createdAt: session.created_at,
                    lastUsedAt: session.last_used_at,
                    expiresAt: session.expires_at,
                    isValid: session.is_valid,
                    isCurrent: session.ip_address === req.ip &&
                        session.user_agent === req.get('User-Agent')
                }))
            }
        });
    })
);

/**
 * @route   DELETE /api/auth/sessions/:sessionId
 * @desc    Révoquer une session spécifique
 * @access  Private
 */
router.delete('/sessions/:sessionId',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { sessionId } = req.params;
        const db = require('../config/database');

        const result = await db.query(
            'UPDATE user_sessions SET is_active = false WHERE id = $1 AND user_id = $2',
            [sessionId, req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Session non trouvée',
                code: 'SESSION_NOT_FOUND'
            });
        }

        res.json({
            success: true,
            message: 'Session révoquée avec succès'
        });
    })
);

/**
 * @route   DELETE /api/auth/sessions
 * @desc    Révoquer toutes les sessions (sauf la courante)
 * @access  Private
 */
router.delete('/sessions',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const db = require('../config/database');

        // Révoquer toutes les sessions sauf celle utilisée pour cette requête
        const result = await db.query(`
      UPDATE user_sessions 
      SET is_active = false 
      WHERE user_id = $1 
      AND NOT (ip_address = $2 AND user_agent = $3)
    `, [req.user.id, req.ip, req.get('User-Agent')]);

        res.json({
            success: true,
            message: `${result.rowCount} session(s) révoquée(s) avec succès`
        });
    })
);

module.exports = router;