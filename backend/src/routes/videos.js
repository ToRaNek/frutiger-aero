// backend/src/routes/videos.js
const express = require('express');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const videoController = require('../controllers/videoController');
const { authenticateToken, optionalAuth, requireOwnership } = require('../middleware/auth');
const { uploadVideo, handleUploadError } = require('../config/multer');
const { validateBody, validateQuery, asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// Rate limiting pour les uploads
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 10, // 10 uploads par heure
    message: {
        success: false,
        error: 'Limite d\'upload atteinte. Veuillez attendre avant de télécharger une nouvelle vidéo.',
        code: 'UPLOAD_LIMIT_EXCEEDED'
    },
    skip: (req) => req.method === 'GET'
});

// Rate limiting pour les actions sur les vidéos
const videoActionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 actions par 15 minutes
    message: {
        success: false,
        error: 'Trop d\'actions sur les vidéos. Veuillez ralentir.',
        code: 'VIDEO_ACTION_LIMIT_EXCEEDED'
    },
    skip: (req) => req.method === 'GET'
});

// Schémas de validation
const getVideosSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(12),
    sort: Joi.string().valid('created_at', 'published_at', 'view_count', 'like_count', 'title', 'duration').default('created_at'),
    order: Joi.string().valid('ASC', 'DESC').default('DESC'),
    category: Joi.string().alphanum().optional(),
    search: Joi.string().min(2).max(100).optional(),
    status: Joi.string().valid('processing', 'ready', 'failed').default('ready'),
    user_id: Joi.string().uuid().optional(),
    visibility: Joi.string().valid('public', 'private', 'unlisted').optional()
});

const uploadVideoSchema = Joi.object({
    title: Joi.string()
        .min(3)
        .max(255)
        .required()
        .messages({
            'string.min': 'Le titre doit contenir au moins 3 caractères',
            'string.max': 'Le titre ne peut pas dépasser 255 caractères',
            'any.required': 'Le titre est requis'
        }),

    description: Joi.string()
        .max(5000)
        .optional()
        .allow('')
        .messages({
            'string.max': 'La description ne peut pas dépasser 5000 caractères'
        }),

    tags: Joi.alternatives()
        .try(
            Joi.array().items(Joi.string().max(50)).max(20),
            Joi.string().max(1000)
        )
        .optional()
        .messages({
            'array.max': 'Maximum 20 tags autorisés',
            'string.max': 'Les tags ne peuvent pas dépasser 1000 caractères au total'
        }),

    categories: Joi.alternatives()
        .try(
            Joi.array().items(Joi.string().alphanum()).max(5),
            Joi.string().max(100)
        )
        .optional()
        .messages({
            'array.max': 'Maximum 5 catégories autorisées'
        }),

    visibility: Joi.string()
        .valid('public', 'private', 'unlisted')
        .default('public'),

    scheduledAt: Joi.date()
        .greater('now')
        .optional()
        .messages({
            'date.greater': 'La date de publication doit être dans le futur'
        })
});

const updateVideoSchema = Joi.object({
    title: Joi.string()
        .min(3)
        .max(255)
        .optional()
        .messages({
            'string.min': 'Le titre doit contenir au moins 3 caractères',
            'string.max': 'Le titre ne peut pas dépasser 255 caractères'
        }),

    description: Joi.string()
        .max(5000)
        .optional()
        .allow('')
        .messages({
            'string.max': 'La description ne peut pas dépasser 5000 caractères'
        }),

    tags: Joi.alternatives()
        .try(
            Joi.array().items(Joi.string().max(50)).max(20),
            Joi.string().max(1000)
        )
        .optional()
        .messages({
            'array.max': 'Maximum 20 tags autorisés',
            'string.max': 'Les tags ne peuvent pas dépasser 1000 caractères au total'
        }),

    categories: Joi.alternatives()
        .try(
            Joi.array().items(Joi.string().alphanum()).max(5),
            Joi.string().max(100)
        )
        .optional()
        .messages({
            'array.max': 'Maximum 5 catégories autorisées'
        }),

    visibility: Joi.string()
        .valid('public', 'private', 'unlisted')
        .optional()
});

const reactionSchema = Joi.object({
    type: Joi.string()
        .valid('like', 'dislike')
        .required()
        .messages({
            'any.only': 'Type de réaction invalide (like ou dislike)',
            'any.required': 'Type de réaction requis'
        })
});

const commentSchema = Joi.object({
    content: Joi.string()
        .min(1)
        .max(2000)
        .required()
        .messages({
            'string.min': 'Le commentaire ne peut pas être vide',
            'string.max': 'Le commentaire ne peut pas dépasser 2000 caractères',
            'any.required': 'Contenu du commentaire requis'
        }),

    parentId: Joi.string()
        .uuid()
        .optional()
        .messages({
            'string.guid': 'ID de commentaire parent invalide'
        })
});

// Routes publiques

/**
 * @route   GET /api/videos
 * @desc    Obtenir la liste des vidéos avec pagination et filtres
 * @access  Public (avec auth optionnelle pour les réactions)
 */
router.get('/',
    optionalAuth,
    validateQuery(getVideosSchema),
    asyncHandler(videoController.getVideos)
);

/**
 * @route   GET /api/videos/:id
 * @desc    Obtenir une vidéo spécifique par ID
 * @access  Public (avec auth optionnelle)
 */
router.get('/:id',
    optionalAuth,
    asyncHandler(videoController.getVideoById)
);

/**
 * @route   GET /api/videos/:id/stream
 * @desc    Stream d'une vidéo avec support des range requests
 * @access  Public
 */
router.get('/:id/stream',
    asyncHandler(videoController.streamVideo)
);

// Routes nécessitant une authentification

/**
 * @route   POST /api/videos
 * @desc    Upload d'une nouvelle vidéo
 * @access  Private
 */
router.post('/',
    authenticateToken,
    uploadLimiter,
    uploadVideo.single('video'),
    handleUploadError,
    validateBody(uploadVideoSchema),
    asyncHandler(videoController.uploadVideo)
);

/**
 * @route   PUT /api/videos/:id
 * @desc    Mettre à jour les informations d'une vidéo
 * @access  Private (propriétaire ou admin)
 */
router.put('/:id',
    authenticateToken,
    videoActionLimiter,
    requireOwnership('id', 'videos', 'user_id'),
    validateBody(updateVideoSchema),
    asyncHandler(videoController.updateVideo)
);

/**
 * @route   DELETE /api/videos/:id
 * @desc    Supprimer une vidéo
 * @access  Private (propriétaire ou admin)
 */
router.delete('/:id',
    authenticateToken,
    requireOwnership('id', 'videos', 'user_id'),
    asyncHandler(videoController.deleteVideo)
);

/**
 * @route   POST /api/videos/:id/react
 * @desc    Ajouter/modifier une réaction (like/dislike) à une vidéo
 * @access  Private
 */
router.post('/:id/react',
    authenticateToken,
    videoActionLimiter,
    validateBody(reactionSchema),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { type } = req.body;
        const userId = req.user.id;

        // Vérifier que la vidéo existe
        const videoExists = await db.query('SELECT id FROM videos WHERE id = $1', [id]);
        if (videoExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Vidéo non trouvée',
                code: 'VIDEO_NOT_FOUND'
            });
        }

        // Insérer ou mettre à jour la réaction
        const result = await db.query(`
      INSERT INTO video_reactions (id, user_id, video_id, reaction_type)
      VALUES (gen_random_uuid(), $1, $2, $3)
      ON CONFLICT (user_id, video_id)
      DO UPDATE SET reaction_type = $3, created_at = CURRENT_TIMESTAMP
      RETURNING reaction_type, created_at
    `, [userId, id, type]);

        logger.video('Réaction ajoutée/modifiée', {
            videoId: id,
            userId,
            reactionType: type
        });

        res.json({
            success: true,
            message: 'Réaction enregistrée',
            data: {
                reaction: {
                    type: result.rows[0].reaction_type,
                    createdAt: result.rows[0].created_at
                }
            }
        });
    })
);

/**
 * @route   DELETE /api/videos/:id/react
 * @desc    Supprimer sa réaction d'une vidéo
 * @access  Private
 */
router.delete('/:id/react',
    authenticateToken,
    videoActionLimiter,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await db.query(
            'DELETE FROM video_reactions WHERE user_id = $1 AND video_id = $2',
            [userId, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Aucune réaction trouvée',
                code: 'REACTION_NOT_FOUND'
            });
        }

        logger.video('Réaction supprimée', { videoId: id, userId });

        res.json({
            success: true,
            message: 'Réaction supprimée'
        });
    })
);

/**
 * @route   GET /api/videos/:id/comments
 * @desc    Obtenir les commentaires d'une vidéo
 * @access  Public
 */
router.get('/:id/comments',
    validateQuery(Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(50).default(20),
        sort: Joi.string().valid('created_at', 'like_count').default('created_at'),
        order: Joi.string().valid('ASC', 'DESC').default('DESC')
    })),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { page, limit, sort, order } = req.query;
        const offset = (page - 1) * limit;

        const commentsQuery = `
      SELECT 
        c.id, c.content, c.like_count, c.dislike_count, c.reply_count,
        c.created_at, c.updated_at, c.is_edited,
        u.id as user_id, u.username, u.avatar_url,
        CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END as is_reply
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.video_id = $1 AND c.is_deleted = false AND c.parent_id IS NULL
      ORDER BY c.${sort} ${order}
      LIMIT $2 OFFSET $3
    `;

        const countQuery = `
      SELECT COUNT(*) as total
      FROM comments c
      WHERE c.video_id = $1 AND c.is_deleted = false AND c.parent_id IS NULL
    `;

        const [commentsResult, countResult] = await Promise.all([
            db.query(commentsQuery, [id, limit, offset]),
            db.query(countQuery, [id])
        ]);

        const comments = commentsResult.rows;
        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            data: {
                comments,
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
 * @route   POST /api/videos/:id/comments
 * @desc    Ajouter un commentaire à une vidéo
 * @access  Private
 */
router.post('/:id/comments',
    authenticateToken,
    videoActionLimiter,
    validateBody(commentSchema),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { content, parentId } = req.body;
        const userId = req.user.id;

        // Vérifier que la vidéo existe
        const videoExists = await db.query('SELECT id FROM videos WHERE id = $1', [id]);
        if (videoExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Vidéo non trouvée',
                code: 'VIDEO_NOT_FOUND'
            });
        }

        // Vérifier le commentaire parent si spécifié
        if (parentId) {
            const parentExists = await db.query(
                'SELECT id FROM comments WHERE id = $1 AND video_id = $2 AND is_deleted = false',
                [parentId, id]
            );
            if (parentExists.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Commentaire parent non trouvé',
                    code: 'PARENT_COMMENT_NOT_FOUND'
                });
            }
        }

        // Créer le commentaire
        const commentResult = await db.query(`
      INSERT INTO comments (id, user_id, video_id, parent_id, content)
      VALUES (gen_random_uuid(), $1, $2, $3, $4)
      RETURNING id, content, created_at
    `, [userId, id, parentId || null, content]);

        const comment = commentResult.rows[0];

        logger.video('Commentaire ajouté', {
            videoId: id,
            commentId: comment.id,
            userId,
            isReply: !!parentId
        });

        res.status(201).json({
            success: true,
            message: 'Commentaire ajouté',
            data: {
                comment: {
                    id: comment.id,
                    content: comment.content,
                    createdAt: comment.created_at,
                    user: {
                        id: req.user.id,
                        username: req.user.username,
                        avatarUrl: req.user.avatar_url
                    }
                }
            }
        });
    })
);

/**
 * @route   GET /api/videos/:id/stats
 * @desc    Obtenir les statistiques détaillées d'une vidéo
 * @access  Private (propriétaire ou admin)
 */
router.get('/:id/stats',
    authenticateToken,
    requireOwnership('id', 'videos', 'user_id'),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const videoService = require('../services/videoService');

        try {
            const stats = await videoService.getVideoStats(id);

            res.json({
                success: true,
                data: { stats }
            });
        } catch (error) {
            if (error.message === 'Vidéo non trouvée') {
                return res.status(404).json({
                    success: false,
                    error: 'Vidéo non trouvée',
                    code: 'VIDEO_NOT_FOUND'
                });
            }
            throw error;
        }
    })
);

/**
 * @route   GET /api/videos/:id/progress
 * @desc    Obtenir le progrès de traitement d'une vidéo
 * @access  Private (propriétaire ou admin)
 */
router.get('/:id/progress',
    authenticateToken,
    requireOwnership('id', 'videos', 'user_id'),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const videoService = require('../services/videoService');

        try {
            const progress = await videoService.getProcessingProgress(id);

            res.json({
                success: true,
                data: { progress }
            });
        } catch (error) {
            if (error.message === 'Vidéo non trouvée') {
                return res.status(404).json({
                    success: false,
                    error: 'Vidéo non trouvée',
                    code: 'VIDEO_NOT_FOUND'
                });
            }
            throw error;
        }
    })
);

/**
 * @route   POST /api/videos/:id/reprocess
 * @desc    Relancer le traitement d'une vidéo échouée
 * @access  Private (propriétaire ou admin)
 */
router.post('/:id/reprocess',
    authenticateToken,
    requireOwnership('id', 'videos', 'user_id'),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const videoService = require('../services/videoService');

        try {
            await videoService.reprocessVideo(id);

            res.json({
                success: true,
                message: 'Retraitement de la vidéo démarré'
            });
        } catch (error) {
            if (error.message.includes('non trouvée')) {
                return res.status(404).json({
                    success: false,
                    error: 'Vidéo non trouvée',
                    code: 'VIDEO_NOT_FOUND'
                });
            } else if (error.message.includes('déjà en cours')) {
                return res.status(409).json({
                    success: false,
                    error: 'Vidéo déjà en cours de traitement',
                    code: 'ALREADY_PROCESSING'
                });
            }
            throw error;
        }
    })
);

/**
 * @route   POST /api/videos/:id/watch-progress
 * @desc    Enregistrer la progression de visionnage
 * @access  Private
 */
router.post('/:id/watch-progress',
    authenticateToken,
    validateBody(Joi.object({
        position: Joi.number().min(0).required(),
        duration: Joi.number().min(0).optional(),
        completed: Joi.boolean().default(false)
    })),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { position, duration, completed } = req.body;
        const userId = req.user.id;

        const completionPercentage = duration ? Math.min((position / duration) * 100, 100) : 0;

        await db.query(`
      INSERT INTO video_views (user_id, video_id, last_position, watched_duration, completion_percentage, watched_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, video_id)
      DO UPDATE SET 
        last_position = $3,
        watched_duration = GREATEST(video_views.watched_duration, $4),
        completion_percentage = GREATEST(video_views.completion_percentage, $5),
        watched_at = CURRENT_TIMESTAMP
    `, [userId, id, position, position, completionPercentage]);

        res.json({
            success: true,
            message: 'Progression sauvegardée'
        });
    })
);

module.exports = router;