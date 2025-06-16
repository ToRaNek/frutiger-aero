// backend/src/routes/categories.js
const express = require('express');
const Joi = require('joi');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateBody, validateQuery, asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// Schémas de validation
const createCategorySchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': 'Le nom doit contenir au moins 2 caractères',
            'string.max': 'Le nom ne peut pas dépasser 100 caractères',
            'any.required': 'Le nom est requis'
        }),

    slug: Joi.string()
        .min(2)
        .max(100)
        .pattern(/^[a-z0-9-]+$/)
        .optional()
        .messages({
            'string.min': 'Le slug doit contenir au moins 2 caractères',
            'string.max': 'Le slug ne peut pas dépasser 100 caractères',
            'string.pattern.base': 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets'
        }),

    description: Joi.string()
        .max(500)
        .optional()
        .allow('')
        .messages({
            'string.max': 'La description ne peut pas dépasser 500 caractères'
        }),

    color: Joi.string()
        .pattern(/^#[0-9A-Fa-f]{6}$/)
        .optional()
        .messages({
            'string.pattern.base': 'La couleur doit être un code hexadécimal valide (#RRGGBB)'
        }),

    icon: Joi.string()
        .max(50)
        .optional()
        .messages({
            'string.max': 'L\'icône ne peut pas dépasser 50 caractères'
        })
});

const updateCategorySchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .optional()
        .messages({
            'string.min': 'Le nom doit contenir au moins 2 caractères',
            'string.max': 'Le nom ne peut pas dépasser 100 caractères'
        }),

    description: Joi.string()
        .max(500)
        .optional()
        .allow('')
        .messages({
            'string.max': 'La description ne peut pas dépasser 500 caractères'
        }),

    color: Joi.string()
        .pattern(/^#[0-9A-Fa-f]{6}$/)
        .optional()
        .messages({
            'string.pattern.base': 'La couleur doit être un code hexadécimal valide (#RRGGBB)'
        }),

    icon: Joi.string()
        .max(50)
        .optional()
        .messages({
            'string.max': 'L\'icône ne peut pas dépasser 50 caractères'
        })
});

const getCategoriesSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    sort: Joi.string().valid('name', 'video_count', 'created_at').default('name'),
    order: Joi.string().valid('ASC', 'DESC').default('ASC'),
    search: Joi.string().min(1).max(100).optional()
});

/**
 * @route   GET /api/categories
 * @desc    Obtenir toutes les catégories avec leurs statistiques
 * @access  Public
 */
router.get('/',
    validateQuery(getCategoriesSchema),
    asyncHandler(async (req, res) => {
        const { page, limit, sort, order, search } = req.query;
        const offset = (page - 1) * limit;

        let whereCondition = '';
        const params = [];
        let paramIndex = 1;

        // Recherche par nom si spécifiée
        if (search) {
            whereCondition = `WHERE LOWER(c.name) LIKE LOWER($${paramIndex}) OR LOWER(c.description) LIKE LOWER($${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        const categoriesQuery = `
      SELECT 
        c.id, c.name, c.slug, c.description, c.color, c.icon, c.created_at,
        COALESCE(video_stats.video_count, 0) as video_count,
        COALESCE(video_stats.total_views, 0) as total_views
      FROM categories c
      LEFT JOIN (
        SELECT 
          vc.category_id,
          COUNT(DISTINCT v.id) as video_count,
          SUM(v.view_count) as total_views
        FROM video_categories vc
        JOIN videos v ON vc.video_id = v.id
        WHERE v.status = 'ready' AND v.visibility = 'public'
        GROUP BY vc.category_id
      ) video_stats ON c.id = video_stats.category_id
      ${whereCondition}
      ORDER BY c.${sort} ${order}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

        const countQuery = `
      SELECT COUNT(*) as total
      FROM categories c
      ${whereCondition}
    `;

        const [categoriesResult, countResult] = await Promise.all([
            db.query(categoriesQuery, [...params, limit, offset]),
            db.query(countQuery, params)
        ]);

        const categories = categoriesResult.rows;
        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);

        logger.info('Liste des catégories récupérée', {
            count: categories.length,
            total,
            search: search || null
        });

        res.json({
            success: true,
            data: {
                categories,
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
 * @route   GET /api/categories/:slug
 * @desc    Obtenir une catégorie spécifique par son slug
 * @access  Public
 */
router.get('/:slug',
    asyncHandler(async (req, res) => {
        const { slug } = req.params;

        const categoryQuery = `
      SELECT 
        c.id, c.name, c.slug, c.description, c.color, c.icon, c.created_at,
        COALESCE(video_stats.video_count, 0) as video_count,
        COALESCE(video_stats.total_views, 0) as total_views,
        COALESCE(video_stats.avg_duration, 0) as avg_duration
      FROM categories c
      LEFT JOIN (
        SELECT 
          vc.category_id,
          COUNT(DISTINCT v.id) as video_count,
          SUM(v.view_count) as total_views,
          AVG(v.duration) as avg_duration
        FROM video_categories vc
        JOIN videos v ON vc.video_id = v.id
        WHERE v.status = 'ready' AND v.visibility = 'public'
        GROUP BY vc.category_id
      ) video_stats ON c.id = video_stats.category_id
      WHERE c.slug = $1
    `;

        const result = await db.query(categoryQuery, [slug]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Catégorie non trouvée',
                code: 'CATEGORY_NOT_FOUND'
            });
        }

        const category = result.rows[0];

        // Obtenir quelques vidéos populaires de cette catégorie
        const popularVideosQuery = `
      SELECT 
        v.id, v.title, v.thumbnail_url, v.duration, v.view_count, v.created_at,
        u.username, u.avatar_url
      FROM video_categories vc
      JOIN videos v ON vc.video_id = v.id
      JOIN users u ON v.user_id = u.id
      WHERE vc.category_id = $1 AND v.status = 'ready' AND v.visibility = 'public'
      ORDER BY v.view_count DESC
      LIMIT 8
    `;

        const popularVideosResult = await db.query(popularVideosQuery, [category.id]);

        logger.info('Catégorie récupérée', {
            categorySlug: slug,
            categoryName: category.name,
            videoCount: category.video_count
        });

        res.json({
            success: true,
            data: {
                category: {
                    ...category,
                    popularVideos: popularVideosResult.rows
                }
            }
        });
    })
);

/**
 * @route   GET /api/categories/:slug/videos
 * @desc    Obtenir les vidéos d'une catégorie avec pagination
 * @access  Public
 */
router.get('/:slug/videos',
    validateQuery(Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(50).default(12),
        sort: Joi.string().valid('created_at', 'view_count', 'like_count', 'title', 'duration').default('view_count'),
        order: Joi.string().valid('ASC', 'DESC').default('DESC')
    })),
    asyncHandler(async (req, res) => {
        const { slug } = req.params;
        const { page, limit, sort, order } = req.query;
        const offset = (page - 1) * limit;

        // Vérifier que la catégorie existe
        const categoryResult = await db.query('SELECT id, name FROM categories WHERE slug = $1', [slug]);

        if (categoryResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Catégorie non trouvée',
                code: 'CATEGORY_NOT_FOUND'
            });
        }

        const category = categoryResult.rows[0];

        const videosQuery = `
      SELECT 
        v.id, v.title, v.description, v.thumbnail_url, v.duration,
        v.view_count, v.like_count, v.dislike_count, v.created_at,
        u.id as user_id, u.username, u.avatar_url
      FROM video_categories vc
      JOIN videos v ON vc.video_id = v.id
      JOIN users u ON v.user_id = u.id
      WHERE vc.category_id = $1 AND v.status = 'ready' AND v.visibility = 'public'
      ORDER BY v.${sort} ${order}
      LIMIT $2 OFFSET $3
    `;

        const countQuery = `
      SELECT COUNT(*) as total
      FROM video_categories vc
      JOIN videos v ON vc.video_id = v.id
      WHERE vc.category_id = $1 AND v.status = 'ready' AND v.visibility = 'public'
    `;

        const [videosResult, countResult] = await Promise.all([
            db.query(videosQuery, [category.id, limit, offset]),
            db.query(countQuery, [category.id])
        ]);

        const videos = videosResult.rows;
        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            data: {
                category: {
                    id: category.id,
                    name: category.name,
                    slug: slug
                },
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
 * @route   POST /api/categories
 * @desc    Créer une nouvelle catégorie
 * @access  Private (Admin seulement)
 */
router.post('/',
    authenticateToken,
    requireRole('admin'),
    validateBody(createCategorySchema),
    asyncHandler(async (req, res) => {
        const { name, slug, description, color, icon } = req.body;
        const { v4: uuidv4 } = require('uuid');

        // Générer un slug si non fourni
        const finalSlug = slug || name.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        // Vérifier l'unicité du nom et du slug
        const existingCategory = await db.query(
            'SELECT id FROM categories WHERE name = $1 OR slug = $2',
            [name, finalSlug]
        );

        if (existingCategory.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Une catégorie avec ce nom ou ce slug existe déjà',
                code: 'CATEGORY_ALREADY_EXISTS'
            });
        }

        const categoryId = uuidv4();

        const createCategoryQuery = `
      INSERT INTO categories (id, name, slug, description, color, icon)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, slug, description, color, icon, created_at
    `;

        const newCategory = await db.query(createCategoryQuery, [
            categoryId,
            name,
            finalSlug,
            description || null,
            color || null,
            icon || null
        ]);

        const category = newCategory.rows[0];

        logger.info('Catégorie créée', {
            categoryId,
            name,
            slug: finalSlug,
            createdBy: req.user.id
        });

        res.status(201).json({
            success: true,
            message: 'Catégorie créée avec succès',
            data: {
                category
            }
        });
    })
);

/**
 * @route   PUT /api/categories/:id
 * @desc    Mettre à jour une catégorie
 * @access  Private (Admin seulement)
 */
router.put('/:id',
    authenticateToken,
    requireRole('admin'),
    validateBody(updateCategorySchema),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { name, description, color, icon } = req.body;

        // Vérifier que la catégorie existe
        const categoryExists = await db.query('SELECT id FROM categories WHERE id = $1', [id]);

        if (categoryExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Catégorie non trouvée',
                code: 'CATEGORY_NOT_FOUND'
            });
        }

        // Vérifier l'unicité du nom si modifié
        if (name) {
            const nameExists = await db.query(
                'SELECT id FROM categories WHERE name = $1 AND id != $2',
                [name, id]
            );

            if (nameExists.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    error: 'Une catégorie avec ce nom existe déjà',
                    code: 'CATEGORY_NAME_EXISTS'
                });
            }
        }

        // Préparer les champs à mettre à jour
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        if (name !== undefined) {
            updateFields.push(`name = $${paramIndex}`);
            updateValues.push(name);
            paramIndex++;
        }

        if (description !== undefined) {
            updateFields.push(`description = $${paramIndex}`);
            updateValues.push(description);
            paramIndex++;
        }

        if (color !== undefined) {
            updateFields.push(`color = $${paramIndex}`);
            updateValues.push(color);
            paramIndex++;
        }

        if (icon !== undefined) {
            updateFields.push(`icon = $${paramIndex}`);
            updateValues.push(icon);
            paramIndex++;
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Aucun champ à mettre à jour',
                code: 'NO_UPDATE_FIELDS'
            });
        }

        updateValues.push(id);

        const updateQuery = `
      UPDATE categories 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, slug, description, color, icon, created_at
    `;

        const updatedCategory = await db.query(updateQuery, updateValues);

        logger.info('Catégorie mise à jour', {
            categoryId: id,
            updatedFields: Object.keys(req.body),
            updatedBy: req.user.id
        });

        res.json({
            success: true,
            message: 'Catégorie mise à jour avec succès',
            data: {
                category: updatedCategory.rows[0]
            }
        });
    })
);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Supprimer une catégorie
 * @access  Private (Admin seulement)
 */
router.delete('/:id',
    authenticateToken,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Vérifier que la catégorie existe
        const categoryResult = await db.query('SELECT name FROM categories WHERE id = $1', [id]);

        if (categoryResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Catégorie non trouvée',
                code: 'CATEGORY_NOT_FOUND'
            });
        }

        const categoryName = categoryResult.rows[0].name;

        // Vérifier s'il y a des vidéos associées
        const videoCount = await db.query(
            'SELECT COUNT(*) as count FROM video_categories WHERE category_id = $1',
            [id]
        );

        const associatedVideos = parseInt(videoCount.rows[0].count);

        if (associatedVideos > 0) {
            return res.status(409).json({
                success: false,
                error: `Impossible de supprimer la catégorie car ${associatedVideos} vidéo(s) y sont associées`,
                code: 'CATEGORY_HAS_VIDEOS',
                videoCount: associatedVideos
            });
        }

        // Supprimer la catégorie
        await db.query('DELETE FROM categories WHERE id = $1', [id]);

        logger.info('Catégorie supprimée', {
            categoryId: id,
            categoryName,
            deletedBy: req.user.id
        });

        res.json({
            success: true,
            message: 'Catégorie supprimée avec succès'
        });
    })
);

/**
 * @route   GET /api/categories/stats/overview
 * @desc    Obtenir les statistiques générales des catégories
 * @access  Private (Admin seulement)
 */
router.get('/stats/overview',
    authenticateToken,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
        const statsQuery = `
      SELECT 
        COUNT(DISTINCT c.id) as total_categories,
        COUNT(DISTINCT vc.video_id) as total_categorized_videos,
        COUNT(DISTINCT v.id) as total_videos,
        ROUND(COUNT(DISTINCT vc.video_id)::numeric / NULLIF(COUNT(DISTINCT v.id), 0) * 100, 2) as categorization_percentage
      FROM categories c
      LEFT JOIN video_categories vc ON c.id = vc.category_id
      CROSS JOIN videos v
      WHERE v.status = 'ready'
    `;

        const topCategoriesQuery = `
      SELECT 
        c.name, c.slug, c.color,
        COUNT(vc.video_id) as video_count,
        SUM(v.view_count) as total_views
      FROM categories c
      LEFT JOIN video_categories vc ON c.id = vc.category_id
      LEFT JOIN videos v ON vc.video_id = v.id AND v.status = 'ready'
      GROUP BY c.id, c.name, c.slug, c.color
      ORDER BY video_count DESC, total_views DESC
      LIMIT 10
    `;

        const [statsResult, topCategoriesResult] = await Promise.all([
            db.query(statsQuery),
            db.query(topCategoriesQuery)
        ]);

        const stats = statsResult.rows[0];
        const topCategories = topCategoriesResult.rows;

        res.json({
            success: true,
            data: {
                overview: {
                    totalCategories: parseInt(stats.total_categories),
                    totalCategorizedVideos: parseInt(stats.total_categorized_videos),
                    totalVideos: parseInt(stats.total_videos),
                    categorizationPercentage: parseFloat(stats.categorization_percentage) || 0
                },
                topCategories
            }
        });
    })
);

module.exports = router;