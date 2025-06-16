// backend/src/routes/search.js
const express = require('express');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const { optionalAuth } = require('../middleware/auth');
const { validateQuery, asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// Rate limiting pour les recherches
const searchLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 recherches par minute
    message: {
        success: false,
        error: 'Trop de recherches. Veuillez ralentir.',
        code: 'SEARCH_RATE_LIMIT_EXCEEDED'
    }
});

// Schémas de validation
const searchSchema = Joi.object({
    q: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': 'Le terme de recherche doit contenir au moins 2 caractères',
            'string.max': 'Le terme de recherche ne peut pas dépasser 100 caractères',
            'any.required': 'Terme de recherche requis'
        }),

    type: Joi.string()
        .valid('all', 'videos', 'playlists', 'users')
        .default('all')
        .messages({
            'any.only': 'Type de recherche invalide (all, videos, playlists, users)'
        }),

    category: Joi.string()
        .alphanum()
        .optional(),

    duration: Joi.string()
        .valid('short', 'medium', 'long')
        .optional()
        .messages({
            'any.only': 'Durée invalide (short: <4min, medium: 4-20min, long: >20min)'
        }),

    upload_date: Joi.string()
        .valid('hour', 'today', 'week', 'month', 'year')
        .optional()
        .messages({
            'any.only': 'Date d\'upload invalide (hour, today, week, month, year)'
        }),

    sort: Joi.string()
        .valid('relevance', 'upload_date', 'view_count', 'rating')
        .default('relevance')
        .messages({
            'any.only': 'Tri invalide (relevance, upload_date, view_count, rating)'
        }),

    page: Joi.number()
        .integer()
        .min(1)
        .default(1),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(50)
        .default(20)
});

const suggestionsSchema = Joi.object({
    q: Joi.string()
        .min(1)
        .max(50)
        .required()
        .messages({
            'string.min': 'Le terme doit contenir au moins 1 caractère',
            'string.max': 'Le terme ne peut pas dépasser 50 caractères',
            'any.required': 'Terme requis'
        }),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(10)
        .default(5)
});

/**
 * @route   GET /api/search
 * @desc    Recherche globale dans les vidéos, playlists et utilisateurs
 * @access  Public
 */
router.get('/',
    searchLimiter,
    optionalAuth,
    validateQuery(searchSchema),
    asyncHandler(async (req, res) => {
        const { q, type, category, duration, upload_date, sort, page, limit } = req.query;
        const offset = (page - 1) * limit;
        const userId = req.user?.id;

        // Nettoyer et préparer le terme de recherche
        const searchTerm = q.trim();
        const tsQuery = searchTerm.split(' ').filter(word => word.length > 0).join(' & ');

        const results = {};

        // Recherche dans les vidéos
        if (type === 'all' || type === 'videos') {
            results.videos = await searchVideos(tsQuery, {
                category,
                duration,
                upload_date,
                sort,
                limit: type === 'videos' ? limit : Math.min(limit, 10),
                offset: type === 'videos' ? offset : 0,
                userId
            });
        }

        // Recherche dans les playlists
        if (type === 'all' || type === 'playlists') {
            results.playlists = await searchPlaylists(tsQuery, {
                sort,
                limit: type === 'playlists' ? limit : Math.min(limit, 10),
                offset: type === 'playlists' ? offset : 0,
                userId
            });
        }

        // Recherche dans les utilisateurs
        if (type === 'all' || type === 'users') {
            results.users = await searchUsers(tsQuery, {
                sort,
                limit: type === 'users' ? limit : Math.min(limit, 10),
                offset: type === 'users' ? offset : 0
            });
        }

        // Enregistrer la recherche pour les analytics
        if (userId) {
            try {
                await db.query(`
          INSERT INTO analytics_events (user_id, event_type, event_data, ip_address, user_agent)
          VALUES ($1, $2, $3, $4, $5)
        `, [
                    userId,
                    'search_performed',
                    {
                        query: searchTerm,
                        type,
                        filters: { category, duration, upload_date, sort }
                    },
                    req.ip,
                    req.get('User-Agent')
                ]);
            } catch (error) {
                logger.error('Erreur lors de l\'enregistrement de la recherche:', error);
            }
        }

        logger.info('Recherche effectuée', {
            query: searchTerm,
            type,
            resultCounts: {
                videos: results.videos?.data?.length || 0,
                playlists: results.playlists?.data?.length || 0,
                users: results.users?.data?.length || 0
            },
            userId
        });

        res.json({
            success: true,
            data: {
                query: searchTerm,
                type,
                ...results
            }
        });
    })
);

/**
 * @route   GET /api/search/suggestions
 * @desc    Obtenir des suggestions de recherche
 * @access  Public
 */
router.get('/suggestions',
    searchLimiter,
    validateQuery(suggestionsSchema),
    asyncHandler(async (req, res) => {
        const { q, limit } = req.query;

        const searchTerm = q.trim().toLowerCase();

        // Recherche dans les titres de vidéos et tags populaires
        const suggestionsQuery = `
      WITH video_suggestions AS (
        SELECT DISTINCT title as suggestion, 'video' as type, view_count as weight
        FROM videos
        WHERE LOWER(title) LIKE $1 AND status = 'ready' AND visibility = 'public'
        ORDER BY view_count DESC
        LIMIT $2
      ),
      tag_suggestions AS (
        SELECT DISTINCT unnest(tags) as suggestion, 'tag' as type, COUNT(*) as weight
        FROM videos
        WHERE tags && ARRAY(SELECT LOWER($3) || '%')
        AND status = 'ready' AND visibility = 'public'
        GROUP BY unnest(tags)
        ORDER BY COUNT(*) DESC
        LIMIT $2
      ),
      playlist_suggestions AS (
        SELECT DISTINCT title as suggestion, 'playlist' as type, video_count as weight
        FROM playlists
        WHERE LOWER(title) LIKE $1 AND visibility = 'public'
        ORDER BY video_count DESC
        LIMIT $2
      )
      SELECT suggestion, type, weight
      FROM (
        SELECT * FROM video_suggestions
        UNION ALL
        SELECT * FROM tag_suggestions
        UNION ALL
        SELECT * FROM playlist_suggestions
      ) combined
      ORDER BY weight DESC
      LIMIT $2
    `;

        const result = await db.query(suggestionsQuery, [
            `%${searchTerm}%`,
            limit,
            searchTerm
        ]);

        const suggestions = result.rows.map(row => ({
            text: row.suggestion,
            type: row.type,
            weight: parseInt(row.weight)
        }));

        res.json({
            success: true,
            data: {
                query: q,
                suggestions
            }
        });
    })
);

/**
 * @route   GET /api/search/trending
 * @desc    Obtenir les termes de recherche tendance
 * @access  Public
 */
router.get('/trending',
    asyncHandler(async (req, res) => {
        const { limit = 10 } = req.query;

        // Recherches populaires des 7 derniers jours
        const trendingQuery = `
      SELECT 
        event_data->>'query' as query,
        COUNT(*) as search_count,
        COUNT(DISTINCT user_id) as unique_users
      FROM analytics_events
      WHERE event_type = 'search_performed'
      AND created_at >= NOW() - INTERVAL '7 days'
      AND event_data->>'query' IS NOT NULL
      AND LENGTH(event_data->>'query') >= 2
      GROUP BY event_data->>'query'
      HAVING COUNT(*) >= 3
      ORDER BY search_count DESC, unique_users DESC
      LIMIT $1
    `;

        const result = await db.query(trendingQuery, [limit]);

        const trending = result.rows.map(row => ({
            query: row.query,
            searchCount: parseInt(row.search_count),
            uniqueUsers: parseInt(row.unique_users)
        }));

        res.json({
            success: true,
            data: {
                trending
            }
        });
    })
);

// Fonction pour rechercher dans les vidéos
const searchVideos = async (tsQuery, options = {}) => {
    const {
        category,
        duration,
        upload_date,
        sort = 'relevance',
        limit = 10,
        offset = 0,
        userId
    } = options;

    let whereConditions = [
        "v.status = 'ready'",
        "v.visibility = 'public'",
        "to_tsvector('french', v.title || ' ' || COALESCE(v.description, '')) @@ to_tsquery('french', $1)"
    ];
    let params = [tsQuery];
    let paramIndex = 2;

    // Filtrer par catégorie
    if (category) {
        whereConditions.push(`EXISTS (
      SELECT 1 FROM video_categories vc 
      JOIN categories c ON vc.category_id = c.id 
      WHERE vc.video_id = v.id AND c.slug = $${paramIndex}
    )`);
        params.push(category);
        paramIndex++;
    }

    // Filtrer par durée
    if (duration) {
        switch (duration) {
            case 'short':
                whereConditions.push('v.duration < 240'); // < 4 minutes
                break;
            case 'medium':
                whereConditions.push('v.duration >= 240 AND v.duration <= 1200'); // 4-20 minutes
                break;
            case 'long':
                whereConditions.push('v.duration > 1200'); // > 20 minutes
                break;
        }
    }

    // Filtrer par date d'upload
    if (upload_date) {
        switch (upload_date) {
            case 'hour':
                whereConditions.push('v.created_at >= NOW() - INTERVAL \'1 hour\'');
                break;
            case 'today':
                whereConditions.push('v.created_at >= CURRENT_DATE');
                break;
            case 'week':
                whereConditions.push('v.created_at >= NOW() - INTERVAL \'7 days\'');
                break;
            case 'month':
                whereConditions.push('v.created_at >= NOW() - INTERVAL \'30 days\'');
                break;
            case 'year':
                whereConditions.push('v.created_at >= NOW() - INTERVAL \'1 year\'');
                break;
        }
    }

    // Définir l'ordre
    let orderBy = '';
    switch (sort) {
        case 'upload_date':
            orderBy = 'v.created_at DESC';
            break;
        case 'view_count':
            orderBy = 'v.view_count DESC';
            break;
        case 'rating':
            orderBy = '(v.like_count::float / NULLIF(v.like_count + v.dislike_count, 0)) DESC NULLS LAST';
            break;
        case 'relevance':
        default:
            orderBy = "ts_rank(to_tsvector('french', v.title || ' ' || COALESCE(v.description, '')), to_tsquery('french', $1)) DESC";
            break;
    }

    const query = `
    SELECT 
      v.id, v.title, v.description, v.thumbnail_url, v.duration,
      v.view_count, v.like_count, v.dislike_count, v.created_at,
      u.id as user_id, u.username, u.avatar_url,
      ts_rank(to_tsvector('french', v.title || ' ' || COALESCE(v.description, '')), to_tsquery('french', $1)) as relevance_score,
      COALESCE(json_agg(
        CASE WHEN c.id IS NOT NULL THEN
          json_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'color', c.color)
        ELSE NULL END
      ) FILTER (WHERE c.id IS NOT NULL), '[]') as categories
    FROM videos v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN video_categories vc ON v.id = vc.video_id
    LEFT JOIN categories c ON vc.category_id = c.id
    WHERE ${whereConditions.join(' AND ')}
    GROUP BY v.id, u.id, u.username, u.avatar_url
    ORDER BY ${orderBy}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

    const result = await db.query(query, [...params, limit, offset]);

    // Ajouter les réactions de l'utilisateur si connecté
    const videos = result.rows;
    if (userId && videos.length > 0) {
        const videoIds = videos.map(v => v.id);
        const reactionsResult = await db.query(
            'SELECT video_id, reaction_type FROM video_reactions WHERE user_id = $1 AND video_id = ANY($2)',
            [userId, videoIds]
        );

        const reactionsMap = new Map(reactionsResult.rows.map(r => [r.video_id, r.reaction_type]));
        videos.forEach(video => {
            video.user_reaction = reactionsMap.get(video.id) || null;
        });
    }

    return {
        data: videos,
        count: videos.length
    };
};

// Fonction pour rechercher dans les playlists
const searchPlaylists = async (tsQuery, options = {}) => {
    const { sort = 'relevance', limit = 10, offset = 0, userId } = options;

    let orderBy = '';
    switch (sort) {
        case 'upload_date':
            orderBy = 'p.created_at DESC';
            break;
        case 'view_count':
            orderBy = 'p.video_count DESC';
            break;
        case 'relevance':
        default:
            orderBy = "ts_rank(to_tsvector('french', p.title || ' ' || COALESCE(p.description, '')), to_tsquery('french', $1)) DESC";
            break;
    }

    const query = `
    SELECT 
      p.id, p.title, p.description, p.thumbnail_url, p.visibility,
      p.video_count, p.total_duration, p.created_at,
      u.id as user_id, u.username, u.avatar_url,
      ts_rank(to_tsvector('french', p.title || ' ' || COALESCE(p.description, '')), to_tsquery('french', $1)) as relevance_score,
      CASE WHEN p.video_count > 0 THEN
        (SELECT v.thumbnail_url FROM playlist_videos pv
         JOIN videos v ON pv.video_id = v.id
         WHERE pv.playlist_id = p.id
         ORDER BY pv.position ASC
         LIMIT 1)
      ELSE NULL END as first_video_thumbnail
    FROM playlists p
    JOIN users u ON p.user_id = u.id
    WHERE p.visibility = 'public'
    AND to_tsvector('french', p.title || ' ' || COALESCE(p.description, '')) @@ to_tsquery('french', $1)
    ORDER BY ${orderBy}
    LIMIT $2 OFFSET $3
  `;

    const result = await db.query(query, [tsQuery, limit, offset]);

    return {
        data: result.rows,
        count: result.rows.length
    };
};

// Fonction pour rechercher dans les utilisateurs
const searchUsers = async (tsQuery, options = {}) => {
    const { sort = 'relevance', limit = 10, offset = 0 } = options;

    let orderBy = '';
    switch (sort) {
        case 'upload_date':
            orderBy = 'u.created_at DESC';
            break;
        case 'view_count':
            orderBy = 'video_count DESC';
            break;
        case 'relevance':
        default:
            orderBy = "ts_rank(to_tsvector('french', u.username || ' ' || COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '') || ' ' || COALESCE(u.bio, '')), to_tsquery('french', $1)) DESC";
            break;
    }

    const query = `
    SELECT 
      u.id, u.username, u.first_name, u.last_name, u.avatar_url, u.bio, u.created_at,
      ts_rank(to_tsvector('french', u.username || ' ' || COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '') || ' ' || COALESCE(u.bio, '')), to_tsquery('french', $1)) as relevance_score,
      (SELECT COUNT(*) FROM videos WHERE user_id = u.id AND status = 'ready') as video_count,
      (SELECT COUNT(*) FROM user_follows WHERE following_id = u.id) as followers_count
    FROM users u
    WHERE u.status = 'active'
    AND to_tsvector('french', u.username || ' ' || COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '') || ' ' || COALESCE(u.bio, '')) @@ to_tsquery('french', $1)
    ORDER BY ${orderBy}
    LIMIT $2 OFFSET $3
  `;

    const result = await db.query(query, [tsQuery, limit, offset]);

    return {
        data: result.rows,
        count: result.rows.length
    };
};

module.exports = router;