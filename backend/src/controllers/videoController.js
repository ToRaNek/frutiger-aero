// backend/src/controllers/videoController.js
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateVideoFile, cleanupTempFiles } = require('../config/multer');
const videoService = require('../services/videoService');
const ffmpegService = require('../services/ffmpegService');

// Obtenir la liste des vidéos avec pagination et filtres
const getVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 12,
        sort = 'created_at',
        order = 'DESC',
        category,
        search,
        status = 'ready',
        user_id
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = ['v.visibility = $1'];
    let params = ['public'];
    let paramIndex = 2;

    // Filtrer par statut
    if (status) {
        whereConditions.push(`v.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
    }

    // Filtrer par utilisateur
    if (user_id) {
        whereConditions.push(`v.user_id = $${paramIndex}`);
        params.push(user_id);
        paramIndex++;
    }

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

    // Recherche textuelle
    if (search) {
        whereConditions.push(`(
      to_tsvector('french', v.title) @@ to_tsquery('french', $${paramIndex}) OR
      to_tsvector('french', v.description) @@ to_tsquery('french', $${paramIndex}) OR
      v.tags && ARRAY[$${paramIndex}]
    )`);
        const searchTerms = search.split(' ').join(' & ');
        params.push(searchTerms);
        paramIndex++;
    }

    // Construction de la requête principale
    const baseQuery = `
    SELECT 
      v.id, v.title, v.description, v.thumbnail_url, v.duration,
      v.view_count, v.like_count, v.dislike_count, v.comment_count,
      v.created_at, v.published_at, v.tags,
      u.id as user_id, u.username, u.avatar_url,
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
  `;

    // Obtenir le nombre total pour la pagination
    const countQuery = `
    SELECT COUNT(DISTINCT v.id) as total
    FROM videos v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN video_categories vc ON v.id = vc.video_id
    LEFT JOIN categories c ON vc.category_id = c.id
    WHERE ${whereConditions.join(' AND ')}
  `;

    const [videosResult, countResult] = await Promise.all([
        db.query(`${baseQuery} ORDER BY v.${sort} ${order} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]),
        db.query(countQuery, params)
    ]);

    const videos = videosResult.rows;
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Ajouter des informations de réaction pour l'utilisateur connecté
    if (req.user) {
        const videoIds = videos.map(v => v.id);
        if (videoIds.length > 0) {
            const reactionsQuery = `
        SELECT video_id, reaction_type
        FROM video_reactions
        WHERE user_id = $1 AND video_id = ANY($2)
      `;

            const reactionsResult = await db.query(reactionsQuery, [req.user.id, videoIds]);
            const reactionsMap = new Map(
                reactionsResult.rows.map(r => [r.video_id, r.reaction_type])
            );

            videos.forEach(video => {
                video.user_reaction = reactionsMap.get(video.id) || null;
            });
        }
    }

    logger.video('Liste des vidéos récupérée', {
        count: videos.length,
        total,
        page: parseInt(page),
        filters: { category, search, status, user_id }
    });

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
});

// Obtenir une vidéo spécifique par ID
const getVideoById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;

    const videoQuery = `
    SELECT 
      v.id, v.title, v.description, v.thumbnail_url, v.duration, v.width, v.height,
      v.view_count, v.like_count, v.dislike_count, v.comment_count,
      v.created_at, v.published_at, v.tags, v.status, v.visibility,
      v.original_filename, v.file_size, v.mime_type,
      u.id as user_id, u.username, u.first_name, u.last_name, u.avatar_url,
      COALESCE(json_agg(
        CASE WHEN c.id IS NOT NULL THEN
          json_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'color', c.color)
        ELSE NULL END
      ) FILTER (WHERE c.id IS NOT NULL), '[]') as categories,
      COALESCE(json_agg(
        CASE WHEN vf.id IS NOT NULL THEN
          json_build_object(
            'quality', vf.quality, 
            'file_path', vf.file_path,
            'file_size', vf.file_size,
            'bitrate', vf.bitrate,
            'playlist_url', vf.playlist_url
          )
        ELSE NULL END
      ) FILTER (WHERE vf.id IS NOT NULL), '[]') as formats
    FROM videos v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN video_categories vc ON v.id = vc.video_id
    LEFT JOIN categories c ON vc.category_id = c.id
    LEFT JOIN video_formats vf ON v.id = vf.video_id
    WHERE v.id = $1
    GROUP BY v.id, u.id, u.username, u.first_name, u.last_name, u.avatar_url
  `;

    const videoResult = await db.query(videoQuery, [id]);

    if (videoResult.rows.length === 0) {
        return res.status(404).json({
            success: false,
            error: 'Vidéo non trouvée',
            code: 'VIDEO_NOT_FOUND'
        });
    }

    const video = videoResult.rows[0];

    // Vérifier les permissions de visibilité
    if (video.visibility === 'private' && (!userId || (userId !== video.user_id && req.user?.role !== 'admin'))) {
        return res.status(403).json({
            success: false,
            error: 'Accès non autorisé à cette vidéo',
            code: 'ACCESS_DENIED'
        });
    }

    // Vérifier si la vidéo est prête
    if (video.status !== 'ready' && (!userId || (userId !== video.user_id && req.user?.role !== 'admin'))) {
        return res.status(422).json({
            success: false,
            error: 'Vidéo en cours de traitement',
            code: 'VIDEO_PROCESSING',
            status: video.status
        });
    }

    // Enregistrer la vue (pour les utilisateurs authentifiés ou avec session)
    const sessionId = req.sessionID || req.ip;

    try {
        await db.query(`
      INSERT INTO video_views (user_id, video_id, session_id, ip_address, user_agent, watched_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, video_id) 
      DO UPDATE SET watched_at = CURRENT_TIMESTAMP, last_position = 0
    `, [userId, id, sessionId, req.ip, req.get('User-Agent')]);

        // Incrémenter le compteur de vues (de façon asynchrone)
        db.query('UPDATE videos SET view_count = view_count + 1 WHERE id = $1', [id])
            .catch(err => logger.error('Erreur lors de l\'incrémentation des vues:', err));

    } catch (error) {
        logger.error('Erreur lors de l\'enregistrement de la vue:', error);
    }

    // Obtenir la réaction de l'utilisateur si connecté
    let userReaction = null;
    if (userId) {
        const reactionResult = await db.query(
            'SELECT reaction_type FROM video_reactions WHERE user_id = $1 AND video_id = $2',
            [userId, id]
        );
        userReaction = reactionResult.rows[0]?.reaction_type || null;
    }

    // Obtenir la position de lecture de l'utilisateur si connecté
    let watchPosition = 0;
    if (userId) {
        const positionResult = await db.query(
            'SELECT last_position FROM video_views WHERE user_id = $1 AND video_id = $2',
            [userId, id]
        );
        watchPosition = positionResult.rows[0]?.last_position || 0;
    }

    logger.video('Vidéo récupérée', {
        videoId: id,
        title: video.title,
        userId: userId,
        viewerCount: video.view_count + 1
    });

    res.json({
        success: true,
        data: {
            video: {
                ...video,
                userReaction,
                watchPosition
            }
        }
    });
});

// Upload d'une nouvelle vidéo
const uploadVideo = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            error: 'Fichier vidéo requis',
            code: 'MISSING_VIDEO_FILE'
        });
    }

    const { title, description, tags, categories, visibility = 'public' } = req.body;
    const userId = req.user.id;
    const file = req.file;

    logger.video('Début de l\'upload de vidéo', {
        userId,
        filename: file.originalname,
        size: file.size,
        title
    });

    try {
        // Valider le fichier vidéo
        const videoInfo = await validateVideoFile(file.path);

        // Créer l'enregistrement vidéo en base de données
        const videoId = uuidv4();
        const parsedTags = tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags) : [];

        const insertVideoQuery = `
      INSERT INTO videos (
        id, title, description, user_id, original_filename, file_path, file_size,
        mime_type, duration, width, height, frame_rate, bitrate, visibility, tags, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id, title, status, created_at
    `;

        const newVideo = await db.query(insertVideoQuery, [
            videoId,
            title,
            description || null,
            userId,
            file.originalname,
            file.path,
            file.size,
            file.mimetype,
            Math.round(videoInfo.duration),
            videoInfo.width,
            videoInfo.height,
            videoInfo.frameRate,
            videoInfo.bitrate,
            visibility,
            parsedTags,
            'processing'
        ]);

        // Associer aux catégories si spécifiées
        if (categories && categories.length > 0) {
            const parsedCategories = typeof categories === 'string'
                ? categories.split(',').map(c => c.trim())
                : categories;

            for (const categorySlug of parsedCategories) {
                try {
                    await db.query(`
            INSERT INTO video_categories (id, video_id, category_id)
            SELECT $1, $2, c.id
            FROM categories c
            WHERE c.slug = $3
          `, [uuidv4(), videoId, categorySlug]);
                } catch (error) {
                    logger.warn('Erreur lors de l\'association à la catégorie:', {
                        videoId,
                        categorySlug,
                        error: error.message
                    });
                }
            }
        }

        // Démarrer le traitement vidéo en arrière-plan
        videoService.processVideo(videoId, file.path)
            .then(() => {
                logger.video('Traitement vidéo terminé avec succès', { videoId, title });
            })
            .catch(error => {
                logger.error('Erreur lors du traitement vidéo:', { videoId, error: error.message });
                // Marquer la vidéo comme échouée
                db.query(
                    'UPDATE videos SET status = $1, error_message = $2 WHERE id = $3',
                    ['failed', error.message, videoId]
                ).catch(dbError => {
                    logger.error('Erreur lors de la mise à jour du statut vidéo:', dbError);
                });
            });

        // Enregistrer l'événement analytics
        await db.query(`
      INSERT INTO analytics_events (user_id, event_type, event_data, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
    `, [
            userId,
            'video_uploaded',
            {
                videoId,
                title,
                duration: Math.round(videoInfo.duration),
                fileSize: file.size
            },
            req.ip,
            req.get('User-Agent')
        ]);

        logger.video('Vidéo uploadée avec succès', {
            videoId,
            userId,
            title,
            status: 'processing'
        });

        res.status(201).json({
            success: true,
            message: 'Vidéo uploadée avec succès, traitement en cours',
            data: {
                video: {
                    id: videoId,
                    title,
                    status: 'processing',
                    createdAt: newVideo.rows[0].created_at
                }
            }
        });

    } catch (error) {
        // Nettoyer le fichier temporaire en cas d'erreur
        await cleanupTempFiles(file.filename);

        logger.error('Erreur lors de l\'upload de vidéo:', {
            userId,
            filename: file.originalname,
            error: error.message
        });

        if (error.message.includes('corrompu')) {
            return res.status(422).json({
                success: false,
                error: 'Fichier vidéo corrompu ou invalide',
                code: 'INVALID_VIDEO_FILE'
            });
        }

        throw error;
    }
});

// Mettre à jour les informations d'une vidéo
const updateVideo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, tags, categories, visibility } = req.body;
    const userId = req.user.id;

    // Vérifier que la vidéo existe et appartient à l'utilisateur
    const videoQuery = 'SELECT user_id, title FROM videos WHERE id = $1';
    const videoResult = await db.query(videoQuery, [id]);

    if (videoResult.rows.length === 0) {
        return res.status(404).json({
            success: false,
            error: 'Vidéo non trouvée',
            code: 'VIDEO_NOT_FOUND'
        });
    }

    const video = videoResult.rows[0];

    if (video.user_id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Accès non autorisé',
            code: 'ACCESS_DENIED'
        });
    }

    // Préparer les champs à mettre à jour
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (title !== undefined) {
        updateFields.push(`title = $${paramIndex}`);
        updateValues.push(title);
        paramIndex++;
    }

    if (description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        updateValues.push(description);
        paramIndex++;
    }

    if (tags !== undefined) {
        const parsedTags = tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags) : [];
        updateFields.push(`tags = $${paramIndex}`);
        updateValues.push(parsedTags);
        paramIndex++;
    }

    if (visibility !== undefined) {
        updateFields.push(`visibility = $${paramIndex}`);
        updateValues.push(visibility);
        paramIndex++;
    }

    if (updateFields.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Aucun champ à mettre à jour',
            code: 'NO_UPDATE_FIELDS'
        });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    // Mettre à jour la vidéo
    const updateQuery = `
    UPDATE videos 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, title, description, tags, visibility, updated_at
  `;

    const updatedVideo = await db.query(updateQuery, updateValues);

    // Mettre à jour les catégories si spécifiées
    if (categories !== undefined) {
        await db.query('DELETE FROM video_categories WHERE video_id = $1', [id]);

        if (categories && categories.length > 0) {
            const parsedCategories = typeof categories === 'string'
                ? categories.split(',').map(c => c.trim())
                : categories;

            for (const categorySlug of parsedCategories) {
                try {
                    await db.query(`
            INSERT INTO video_categories (id, video_id, category_id)
            SELECT $1, $2, c.id
            FROM categories c
            WHERE c.slug = $3
          `, [uuidv4(), id, categorySlug]);
                } catch (error) {
                    logger.warn('Erreur lors de l\'association à la catégorie:', {
                        videoId: id,
                        categorySlug,
                        error: error.message
                    });
                }
            }
        }
    }

    logger.video('Vidéo mise à jour', {
        videoId: id,
        userId,
        updatedFields: Object.keys(req.body)
    });

    res.json({
        success: true,
        message: 'Vidéo mise à jour avec succès',
        data: {
            video: updatedVideo.rows[0]
        }
    });
});

// Supprimer une vidéo
const deleteVideo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // Récupérer les informations de la vidéo
    const videoQuery = `
    SELECT user_id, title, file_path, thumbnail_url
    FROM videos 
    WHERE id = $1
  `;
    const videoResult = await db.query(videoQuery, [id]);

    if (videoResult.rows.length === 0) {
        return res.status(404).json({
            success: false,
            error: 'Vidéo non trouvée',
            code: 'VIDEO_NOT_FOUND'
        });
    }

    const video = videoResult.rows[0];

    if (video.user_id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Accès non autorisé',
            code: 'ACCESS_DENIED'
        });
    }

    try {
        // Supprimer la vidéo de la base de données (cascade supprimera les relations)
        await db.query('DELETE FROM videos WHERE id = $1', [id]);

        // Supprimer les fichiers physiques
        await videoService.deleteVideoFiles(id);

        logger.video('Vidéo supprimée', {
            videoId: id,
            title: video.title,
            userId
        });

        // Enregistrer l'événement analytics
        await db.query(`
      INSERT INTO analytics_events (user_id, event_type, event_data, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
    `, [
            userId,
            'video_deleted',
            { videoId: id, title: video.title },
            req.ip,
            req.get('User-Agent')
        ]);

        res.json({
            success: true,
            message: 'Vidéo supprimée avec succès'
        });

    } catch (error) {
        logger.error('Erreur lors de la suppression de vidéo:', {
            videoId: id,
            error: error.message
        });
        throw error;
    }
});

// Stream d'une vidéo avec support des range requests
const streamVideo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { quality = 'auto' } = req.query;

    // Récupérer les informations de la vidéo
    const videoQuery = `
    SELECT v.id, v.file_path, v.file_size, v.mime_type, v.status, v.visibility,
           vf.file_path as format_path, vf.playlist_url
    FROM videos v
    LEFT JOIN video_formats vf ON v.id = vf.video_id AND vf.quality = $2
    WHERE v.id = $1
  `;

    const videoResult = await db.query(videoQuery, [id, quality]);

    if (videoResult.rows.length === 0) {
        return res.status(404).json({
            success: false,
            error: 'Vidéo non trouvée',
            code: 'VIDEO_NOT_FOUND'
        });
    }

    const video = videoResult.rows[0];

    if (video.status !== 'ready') {
        return res.status(422).json({
            success: false,
            error: 'Vidéo en cours de traitement',
            code: 'VIDEO_PROCESSING'
        });
    }

    // Utiliser le format spécifique s'il existe, sinon le fichier original
    const filePath = video.format_path || video.file_path;

    if (!fs.existsSync(filePath)) {
        logger.error('Fichier vidéo introuvable sur le disque', {
            videoId: id,
            filePath
        });

        return res.status(404).json({
            success: false,
            error: 'Fichier vidéo introuvable',
            code: 'FILE_NOT_FOUND'
        });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Support des range requests pour le streaming
    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;

        const file = fs.createReadStream(filePath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': video.mime_type || 'video/mp4',
            'Cache-Control': 'public, max-age=31536000', // 1 an
            'Expires': new Date(Date.now() + 31536000000).toUTCString()
        };

        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': video.mime_type || 'video/mp4',
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=31536000',
            'Expires': new Date(Date.now() + 31536000000).toUTCString()
        };

        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
    }

    logger.video('Streaming vidéo', {
        videoId: id,
        quality,
        hasRange: !!range,
        fileSize
    });
});

module.exports = {
    getVideos,
    getVideoById,
    uploadVideo,
    updateVideo,
    deleteVideo,
    streamVideo
};