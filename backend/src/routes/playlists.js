// backend/src/routes/playlists.js
const express = require('express');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const playlistController = require('../controllers/playlistController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validateBody, validateQuery, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Rate limiting pour les actions sur les playlists
const playlistActionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 actions par 15 minutes
    message: {
        success: false,
        error: 'Trop d\'actions sur les playlists. Veuillez ralentir.',
        code: 'PLAYLIST_ACTION_LIMIT_EXCEEDED'
    },
    skip: (req) => req.method === 'GET'
});

// Schémas de validation
const getPlaylistsSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(12),
    sort: Joi.string().valid('created_at', 'updated_at', 'title', 'video_count').default('created_at'),
    order: Joi.string().valid('ASC', 'DESC').default('DESC'),
    search: Joi.string().min(2).max(100).optional(),
    visibility: Joi.string().valid('public', 'private', 'unlisted', 'all').default('public'),
    user_id: Joi.string().uuid().optional()
});

const createPlaylistSchema = Joi.object({
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
        .max(2000)
        .optional()
        .allow('')
        .messages({
            'string.max': 'La description ne peut pas dépasser 2000 caractères'
        }),

    visibility: Joi.string()
        .valid('public', 'private', 'unlisted')
        .default('public')
        .messages({
            'any.only': 'Visibilité invalide (public, private, unlisted)'
        })
});

const updatePlaylistSchema = Joi.object({
    title: Joi.string()
        .min(3)
        .max(255)
        .optional()
        .messages({
            'string.min': 'Le titre doit contenir au moins 3 caractères',
            'string.max': 'Le titre ne peut pas dépasser 255 caractères'
        }),

    description: Joi.string()
        .max(2000)
        .optional()
        .allow('')
        .messages({
            'string.max': 'La description ne peut pas dépasser 2000 caractères'
        }),

    visibility: Joi.string()
        .valid('public', 'private', 'unlisted')
        .optional()
        .messages({
            'any.only': 'Visibilité invalide (public, private, unlisted)'
        })
});

const addVideoSchema = Joi.object({
    videoId: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.guid': 'ID de vidéo invalide',
            'any.required': 'ID de vidéo requis'
        }),

    position: Joi.number()
        .integer()
        .min(1)
        .optional()
        .messages({
            'number.integer': 'La position doit être un nombre entier',
            'number.min': 'La position doit être supérieure à 0'
        })
});

const reorderVideosSchema = Joi.object({
    videoOrders: Joi.array()
        .items(
            Joi.object({
                videoId: Joi.string().uuid().required(),
                position: Joi.number().integer().min(1).required()
            })
        )
        .min(1)
        .required()
        .messages({
            'array.min': 'Au moins une vidéo doit être spécifiée',
            'any.required': 'Ordre des vidéos requis'
        })
});

// Routes publiques

/**
 * @route   GET /api/playlists
 * @desc    Obtenir la liste des playlists avec pagination et filtres
 * @access  Public
 */
router.get('/',
    optionalAuth,
    validateQuery(getPlaylistsSchema),
    asyncHandler(playlistController.getPlaylists)
);

/**
 * @route   GET /api/playlists/:id
 * @desc    Obtenir une playlist spécifique avec ses vidéos
 * @access  Public (avec auth optionnelle pour les playlists privées)
 */
router.get('/:id',
    optionalAuth,
    asyncHandler(playlistController.getPlaylistById)
);

// Routes nécessitant une authentification

/**
 * @route   POST /api/playlists
 * @desc    Créer une nouvelle playlist
 * @access  Private
 */
router.post('/',
    authenticateToken,
    playlistActionLimiter,
    validateBody(createPlaylistSchema),
    asyncHandler(playlistController.createPlaylist)
);

/**
 * @route   PUT /api/playlists/:id
 * @desc    Mettre à jour une playlist
 * @access  Private (propriétaire ou admin)
 */
router.put('/:id',
    authenticateToken,
    playlistActionLimiter,
    validateBody(updatePlaylistSchema),
    asyncHandler(playlistController.updatePlaylist)
);

/**
 * @route   DELETE /api/playlists/:id
 * @desc    Supprimer une playlist
 * @access  Private (propriétaire ou admin)
 */
router.delete('/:id',
    authenticateToken,
    playlistActionLimiter,
    asyncHandler(playlistController.deletePlaylist)
);

/**
 * @route   POST /api/playlists/:id/videos
 * @desc    Ajouter une vidéo à une playlist
 * @access  Private (propriétaire ou admin)
 */
router.post('/:id/videos',
    authenticateToken,
    playlistActionLimiter,
    validateBody(addVideoSchema),
    asyncHandler(playlistController.addVideoToPlaylist)
);

/**
 * @route   DELETE /api/playlists/:id/videos/:videoId
 * @desc    Supprimer une vidéo d'une playlist
 * @access  Private (propriétaire ou admin)
 */
router.delete('/:id/videos/:videoId',
    authenticateToken,
    playlistActionLimiter,
    asyncHandler(playlistController.removeVideoFromPlaylist)
);

/**
 * @route   PUT /api/playlists/:id/reorder
 * @desc    Réorganiser les vidéos dans une playlist
 * @access  Private (propriétaire ou admin)
 */
router.put('/:id/reorder',
    authenticateToken,
    playlistActionLimiter,
    validateBody(reorderVideosSchema),
    asyncHandler(playlistController.reorderPlaylistVideos)
);

/**
 * @route   POST /api/playlists/:id/duplicate
 * @desc    Dupliquer une playlist
 * @access  Private
 */
router.post('/:id/duplicate',
    authenticateToken,
    playlistActionLimiter,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { title: newTitle } = req.body;
        const userId = req.user.id;
        const db = require('../config/database');
        const { v4: uuidv4 } = require('uuid');

        // Récupérer la playlist source
        const sourcePlaylistQuery = `
      SELECT title, description, visibility FROM playlists 
      WHERE id = $1 AND (visibility = 'public' OR user_id = $2)
    `;

        const sourceResult = await db.query(sourcePlaylistQuery, [id, userId]);

        if (sourceResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Playlist non trouvée ou non accessible',
                code: 'PLAYLIST_NOT_FOUND'
            });
        }

        const sourcePlaylist = sourceResult.rows[0];
        const duplicateId = uuidv4();
        const duplicateTitle = newTitle || `Copie de ${sourcePlaylist.title}`;

        // Créer la playlist dupliquée
        await db.query(`
      INSERT INTO playlists (id, user_id, title, description, visibility)
      VALUES ($1, $2, $3, $4, $5)
    `, [
            duplicateId,
            userId,
            duplicateTitle,
            sourcePlaylist.description,
            'private' // Toujours créer en privé
        ]);

        // Copier les vidéos
        await db.query(`
      INSERT INTO playlist_videos (id, playlist_id, video_id, position)
      SELECT gen_random_uuid(), $1, video_id, position
      FROM playlist_videos
      WHERE playlist_id = $2
    `, [duplicateId, id]);

        res.status(201).json({
            success: true,
            message: 'Playlist dupliquée avec succès',
            data: {
                playlistId: duplicateId,
                title: duplicateTitle
            }
        });
    })
);

/**
 * @route   GET /api/playlists/:id/export
 * @desc    Exporter une playlist (liste des vidéos)
 * @access  Public (pour les playlists publiques) / Private (pour les autres)
 */
router.get('/:id/export',
    optionalAuth,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { format = 'json' } = req.query;
        const userId = req.user?.id;
        const db = require('../config/database');

        // Récupérer la playlist avec ses vidéos
        const playlistQuery = `
      SELECT 
        p.id, p.title, p.description, p.visibility, p.created_at,
        u.username as creator,
        json_agg(
          json_build_object(
            'position', pv.position,
            'title', v.title,
            'description', v.description,
            'duration', v.duration,
            'uploader', vu.username,
            'url', '/videos/' || v.id,
            'addedAt', pv.added_at
          ) ORDER BY pv.position
        ) FILTER (WHERE v.id IS NOT NULL) as videos
      FROM playlists p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN playlist_videos pv ON p.id = pv.playlist_id
      LEFT JOIN videos v ON pv.video_id = v.id AND v.status = 'ready'
      LEFT JOIN users vu ON v.user_id = vu.id
      WHERE p.id = $1
      GROUP BY p.id, p.title, p.description, p.visibility, p.created_at, u.username
    `;

        const result = await db.query(playlistQuery, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Playlist non trouvée',
                code: 'PLAYLIST_NOT_FOUND'
            });
        }

        const playlist = result.rows[0];

        // Vérifier les permissions
        if (playlist.visibility === 'private' && (!userId || userId !== playlist.user_id)) {
            return res.status(403).json({
                success: false,
                error: 'Accès non autorisé',
                code: 'ACCESS_DENIED'
            });
        }

        // Formater selon le format demandé
        if (format === 'json') {
            res.json({
                success: true,
                data: playlist
            });
        } else if (format === 'm3u') {
            // Format M3U pour les lecteurs multimédia
            let m3uContent = '#EXTM3U\n';
            m3uContent += `#PLAYLIST:${playlist.title}\n\n`;

            if (playlist.videos) {
                playlist.videos.forEach(video => {
                    m3uContent += `#EXTINF:${video.duration || -1},${video.title}\n`;
                    m3uContent += `${req.protocol}://${req.get('host')}${video.url}\n\n`;
                });
            }

            res.setHeader('Content-Type', 'audio/x-mpegurl');
            res.setHeader('Content-Disposition', `attachment; filename="${playlist.title}.m3u"`);
            res.send(m3uContent);
        } else {
            return res.status(400).json({
                success: false,
                error: 'Format non supporté (json, m3u)',
                code: 'UNSUPPORTED_FORMAT'
            });
        }
    })
);

/**
 * @route   GET /api/playlists/user/:userId
 * @desc    Obtenir les playlists d'un utilisateur spécifique
 * @access  Public (playlists publiques seulement)
 */
router.get('/user/:userId',
    optionalAuth,
    validateQuery(Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(50).default(12),
        sort: Joi.string().valid('created_at', 'updated_at', 'title', 'video_count').default('created_at'),
        order: Joi.string().valid('ASC', 'DESC').default('DESC')
    })),
    asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const { page, limit, sort, order } = req.query;
        const currentUserId = req.user?.id;
        const offset = (page - 1) * limit;
        const db = require('../config/database');

        // Vérifier si l'utilisateur existe
        const userExists = await db.query('SELECT id FROM users WHERE id = $1', [userId]);
        if (userExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Utilisateur non trouvé',
                code: 'USER_NOT_FOUND'
            });
        }

        // Déterminer la visibilité selon les permissions
        const visibilityCondition = currentUserId === userId
            ? "p.visibility IN ('public', 'private', 'unlisted')"
            : "p.visibility = 'public'";

        const playlistsQuery = `
      SELECT 
        p.id, p.title, p.description, p.visibility,
        p.video_count, p.total_duration, p.created_at, p.updated_at,
        u.username, u.avatar_url,
        CASE WHEN p.video_count > 0 THEN
          (SELECT v.thumbnail_url FROM playlist_videos pv
           JOIN videos v ON pv.video_id = v.id
           WHERE pv.playlist_id = p.id
           ORDER BY pv.position ASC
           LIMIT 1)
        ELSE NULL END as first_video_thumbnail
      FROM playlists p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = $1 AND ${visibilityCondition}
      ORDER BY p.${sort} ${order}
      LIMIT $2 OFFSET $3
    `;

        const countQuery = `
      SELECT COUNT(*) as total
      FROM playlists p
      WHERE p.user_id = $1 AND ${visibilityCondition}
    `;

        const [playlistsResult, countResult] = await Promise.all([
            db.query(playlistsQuery, [userId, limit, offset]),
            db.query(countQuery, [userId])
        ]);

        const playlists = playlistsResult.rows;
        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            data: {
                playlists,
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

module.exports = router;