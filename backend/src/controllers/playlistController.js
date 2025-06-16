// backend/src/controllers/playlistController.js
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');

// Obtenir les playlists avec pagination et filtres
const getPlaylists = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 12,
        sort = 'created_at',
        order = 'DESC',
        search,
        visibility = 'public',
        user_id
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    // Filtrer par visibilité
    if (visibility !== 'all') {
        whereConditions.push(`p.visibility = $${paramIndex}`);
        params.push(visibility);
        paramIndex++;
    }

    // Filtrer par utilisateur
    if (user_id) {
        whereConditions.push(`p.user_id = $${paramIndex}`);
        params.push(user_id);
        paramIndex++;
    }

    // Recherche textuelle
    if (search) {
        whereConditions.push(`(
      to_tsvector('french', p.title) @@ to_tsquery('french', $${paramIndex}) OR
      to_tsvector('french', p.description) @@ to_tsquery('french', $${paramIndex})
    )`);
        const searchTerms = search.split(' ').join(' & ');
        params.push(searchTerms);
        paramIndex++;
    }

    // Si pas de conditions, afficher seulement les playlists publiques
    if (whereConditions.length === 0) {
        whereConditions.push('p.visibility = \'public\'');
    }

    const baseQuery = `
    SELECT 
      p.id, p.title, p.description, p.thumbnail_url, p.visibility,
      p.video_count, p.total_duration, p.created_at, p.updated_at,
      u.id as user_id, u.username, u.avatar_url,
      CASE WHEN p.video_count > 0 THEN
        (SELECT v.thumbnail_url FROM playlist_videos pv
         JOIN videos v ON pv.video_id = v.id
         WHERE pv.playlist_id = p.id
         ORDER BY pv.position ASC
         LIMIT 1)
      ELSE NULL END as first_video_thumbnail
    FROM playlists p
    JOIN users u ON p.user_id = u.id
    WHERE ${whereConditions.join(' AND ')}
  `;

    // Obtenir le nombre total pour la pagination
    const countQuery = `
    SELECT COUNT(*) as total
    FROM playlists p
    JOIN users u ON p.user_id = u.id
    WHERE ${whereConditions.join(' AND ')}
  `;

    const [playlistsResult, countResult] = await Promise.all([
        db.query(`${baseQuery} ORDER BY p.${sort} ${order} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]),
        db.query(countQuery, params)
    ]);

    const playlists = playlistsResult.rows;
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    logger.info('Liste des playlists récupérée', {
        count: playlists.length,
        total,
        page: parseInt(page),
        filters: { search, visibility, user_id }
    });

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
});

// Obtenir une playlist spécifique avec ses vidéos
const getPlaylistById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;

    // Récupérer les informations de la playlist
    const playlistQuery = `
    SELECT 
      p.id, p.title, p.description, p.thumbnail_url, p.visibility,
      p.video_count, p.total_duration, p.created_at, p.updated_at,
      u.id as user_id, u.username, u.first_name, u.last_name, u.avatar_url
    FROM playlists p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = $1
  `;

    const playlistResult = await db.query(playlistQuery, [id]);

    if (playlistResult.rows.length === 0) {
        return res.status(404).json({
            success: false,
            error: 'Playlist non trouvée',
            code: 'PLAYLIST_NOT_FOUND'
        });
    }

    const playlist = playlistResult.rows[0];

    // Vérifier les permissions de visibilité
    if (playlist.visibility === 'private' && (!userId || (userId !== playlist.user_id && req.user?.role !== 'admin'))) {
        return res.status(403).json({
            success: false,
            error: 'Accès non autorisé à cette playlist',
            code: 'ACCESS_DENIED'
        });
    }

    // Récupérer les vidéos de la playlist
    const videosQuery = `
    SELECT 
      v.id, v.title, v.description, v.thumbnail_url, v.duration,
      v.view_count, v.like_count, v.created_at, v.status,
      pv.position, pv.added_at,
      u.id as uploader_id, u.username as uploader_username
    FROM playlist_videos pv
    JOIN videos v ON pv.video_id = v.id
    JOIN users u ON v.user_id = u.id
    WHERE pv.playlist_id = $1 AND v.status = 'ready'
    ORDER BY pv.position ASC
  `;

    const videosResult = await db.query(videosQuery, [id]);
    const videos = videosResult.rows;

    logger.info('Playlist récupérée', {
        playlistId: id,
        title: playlist.title,
        videoCount: videos.length,
        userId: userId
    });

    res.json({
        success: true,
        data: {
            playlist: {
                ...playlist,
                videos
            }
        }
    });
});

// Créer une nouvelle playlist
const createPlaylist = asyncHandler(async (req, res) => {
    const { title, description, visibility = 'public' } = req.body;
    const userId = req.user.id;

    const playlistId = uuidv4();

    const createPlaylistQuery = `
    INSERT INTO playlists (id, user_id, title, description, visibility)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, title, description, visibility, video_count, total_duration, created_at
  `;

    const newPlaylist = await db.query(createPlaylistQuery, [
        playlistId,
        userId,
        title,
        description || null,
        visibility
    ]);

    const playlist = newPlaylist.rows[0];

    logger.info('Playlist créée', {
        playlistId,
        userId,
        title,
        visibility
    });

    // Enregistrer l'événement analytics
    await db.query(`
    INSERT INTO analytics_events (user_id, event_type, event_data, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5)
  `, [
        userId,
        'playlist_created',
        { playlistId, title, visibility },
        req.ip,
        req.get('User-Agent')
    ]);

    res.status(201).json({
        success: true,
        message: 'Playlist créée avec succès',
        data: {
            playlist: {
                ...playlist,
                user: {
                    id: req.user.id,
                    username: req.user.username,
                    avatarUrl: req.user.avatar_url
                }
            }
        }
    });
});

// Mettre à jour une playlist
const updatePlaylist = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, visibility } = req.body;
    const userId = req.user.id;

    // Vérifier que la playlist existe et appartient à l'utilisateur
    const playlistQuery = 'SELECT user_id, title FROM playlists WHERE id = $1';
    const playlistResult = await db.query(playlistQuery, [id]);

    if (playlistResult.rows.length === 0) {
        return res.status(404).json({
            success: false,
            error: 'Playlist non trouvée',
            code: 'PLAYLIST_NOT_FOUND'
        });
    }

    const playlist = playlistResult.rows[0];

    if (playlist.user_id !== userId && req.user.role !== 'admin') {
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

    const updateQuery = `
    UPDATE playlists 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, title, description, visibility, updated_at
  `;

    const updatedPlaylist = await db.query(updateQuery, updateValues);

    logger.info('Playlist mise à jour', {
        playlistId: id,
        userId,
        updatedFields: Object.keys(req.body)
    });

    res.json({
        success: true,
        message: 'Playlist mise à jour avec succès',
        data: {
            playlist: updatedPlaylist.rows[0]
        }
    });
});

// Supprimer une playlist
const deletePlaylist = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // Récupérer les informations de la playlist
    const playlistQuery = 'SELECT user_id, title FROM playlists WHERE id = $1';
    const playlistResult = await db.query(playlistQuery, [id]);

    if (playlistResult.rows.length === 0) {
        return res.status(404).json({
            success: false,
            error: 'Playlist non trouvée',
            code: 'PLAYLIST_NOT_FOUND'
        });
    }

    const playlist = playlistResult.rows[0];

    if (playlist.user_id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Accès non autorisé',
            code: 'ACCESS_DENIED'
        });
    }

    // Supprimer la playlist (cascade supprimera les relations)
    await db.query('DELETE FROM playlists WHERE id = $1', [id]);

    logger.info('Playlist supprimée', {
        playlistId: id,
        title: playlist.title,
        userId
    });

    // Enregistrer l'événement analytics
    await db.query(`
    INSERT INTO analytics_events (user_id, event_type, event_data, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5)
  `, [
        userId,
        'playlist_deleted',
        { playlistId: id, title: playlist.title },
        req.ip,
        req.get('User-Agent')
    ]);

    res.json({
        success: true,
        message: 'Playlist supprimée avec succès'
    });
});

// Ajouter une vidéo à une playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { id } = req.params; // playlist ID
    const { videoId, position } = req.body;
    const userId = req.user.id;

    // Vérifier que la playlist existe et appartient à l'utilisateur
    const playlistQuery = 'SELECT user_id, title FROM playlists WHERE id = $1';
    const playlistResult = await db.query(playlistQuery, [id]);

    if (playlistResult.rows.length === 0) {
        return res.status(404).json({
            success: false,
            error: 'Playlist non trouvée',
            code: 'PLAYLIST_NOT_FOUND'
        });
    }

    const playlist = playlistResult.rows[0];

    if (playlist.user_id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Accès non autorisé',
            code: 'ACCESS_DENIED'
        });
    }

    // Vérifier que la vidéo existe et est accessible
    const videoQuery = `
    SELECT id, title, user_id, status, visibility 
    FROM videos 
    WHERE id = $1
  `;
    const videoResult = await db.query(videoQuery, [videoId]);

    if (videoResult.rows.length === 0) {
        return res.status(404).json({
            success: false,
            error: 'Vidéo non trouvée',
            code: 'VIDEO_NOT_FOUND'
        });
    }

    const video = videoResult.rows[0];

    // Vérifier que la vidéo est prête et accessible
    if (video.status !== 'ready') {
        return res.status(422).json({
            success: false,
            error: 'La vidéo n\'est pas encore prête',
            code: 'VIDEO_NOT_READY'
        });
    }

    if (video.visibility === 'private' && video.user_id !== userId) {
        return res.status(403).json({
            success: false,
            error: 'Vidéo non accessible',
            code: 'VIDEO_ACCESS_DENIED'
        });
    }

    // Vérifier que la vidéo n'est pas déjà dans la playlist
    const existingVideo = await db.query(
        'SELECT id FROM playlist_videos WHERE playlist_id = $1 AND video_id = $2',
        [id, videoId]
    );

    if (existingVideo.rows.length > 0) {
        return res.status(409).json({
            success: false,
            error: 'Vidéo déjà présente dans la playlist',
            code: 'VIDEO_ALREADY_IN_PLAYLIST'
        });
    }

    // Déterminer la position si non spécifiée
    let finalPosition = position;
    if (!finalPosition) {
        const maxPositionResult = await db.query(
            'SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM playlist_videos WHERE playlist_id = $1',
            [id]
        );
        finalPosition = maxPositionResult.rows[0].next_position;
    } else {
        // Décaler les autres vidéos si nécessaire
        await db.query(
            'UPDATE playlist_videos SET position = position + 1 WHERE playlist_id = $1 AND position >= $2',
            [id, finalPosition]
        );
    }

    // Ajouter la vidéo à la playlist
    await db.query(`
    INSERT INTO playlist_videos (id, playlist_id, video_id, position)
    VALUES ($1, $2, $3, $4)
  `, [uuidv4(), id, videoId, finalPosition]);

    logger.info('Vidéo ajoutée à la playlist', {
        playlistId: id,
        videoId,
        position: finalPosition,
        userId
    });

    res.status(201).json({
        success: true,
        message: 'Vidéo ajoutée à la playlist',
        data: {
            position: finalPosition
        }
    });
});

// Supprimer une vidéo d'une playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { id, videoId } = req.params;
    const userId = req.user.id;

    // Vérifier les permissions
    const playlistQuery = 'SELECT user_id FROM playlists WHERE id = $1';
    const playlistResult = await db.query(playlistQuery, [id]);

    if (playlistResult.rows.length === 0) {
        return res.status(404).json({
            success: false,
            error: 'Playlist non trouvée',
            code: 'PLAYLIST_NOT_FOUND'
        });
    }

    const playlist = playlistResult.rows[0];

    if (playlist.user_id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Accès non autorisé',
            code: 'ACCESS_DENIED'
        });
    }

    // Récupérer la position avant suppression pour réorganiser
    const positionResult = await db.query(
        'SELECT position FROM playlist_videos WHERE playlist_id = $1 AND video_id = $2',
        [id, videoId]
    );

    if (positionResult.rows.length === 0) {
        return res.status(404).json({
            success: false,
            error: 'Vidéo non trouvée dans la playlist',
            code: 'VIDEO_NOT_IN_PLAYLIST'
        });
    }

    const removedPosition = positionResult.rows[0].position;

    // Supprimer la vidéo de la playlist
    await db.query(
        'DELETE FROM playlist_videos WHERE playlist_id = $1 AND video_id = $2',
        [id, videoId]
    );

    // Réorganiser les positions
    await db.query(
        'UPDATE playlist_videos SET position = position - 1 WHERE playlist_id = $1 AND position > $2',
        [id, removedPosition]
    );

    logger.info('Vidéo supprimée de la playlist', {
        playlistId: id,
        videoId,
        removedPosition,
        userId
    });

    res.json({
        success: true,
        message: 'Vidéo supprimée de la playlist'
    });
});

// Réorganiser les vidéos dans une playlist
const reorderPlaylistVideos = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { videoOrders } = req.body; // Array of { videoId, position }
    const userId = req.user.id;

    // Vérifier les permissions
    const playlistQuery = 'SELECT user_id FROM playlists WHERE id = $1';
    const playlistResult = await db.query(playlistQuery, [id]);

    if (playlistResult.rows.length === 0) {
        return res.status(404).json({
            success: false,
            error: 'Playlist non trouvée',
            code: 'PLAYLIST_NOT_FOUND'
        });
    }

    const playlist = playlistResult.rows[0];

    if (playlist.user_id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Accès non autorisé',
            code: 'ACCESS_DENIED'
        });
    }

    // Commencer une transaction pour la réorganisation
    await db.transaction(async (client) => {
        for (const { videoId, position } of videoOrders) {
            await client.query(
                'UPDATE playlist_videos SET position = $1 WHERE playlist_id = $2 AND video_id = $3',
                [position, id, videoId]
            );
        }
    });

    logger.info('Playlist réorganisée', {
        playlistId: id,
        videoCount: videoOrders.length,
        userId
    });

    res.json({
        success: true,
        message: 'Playlist réorganisée avec succès'
    });
});

module.exports = {
    getPlaylists,
    getPlaylistById,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    reorderPlaylistVideos
};