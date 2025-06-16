// backend/src/models/Playlist.js
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');
const { VISIBILITY } = require('../utils/constants');

class Playlist {
    constructor(data = {}) {
        this.id = data.id || null;
        this.userId = data.user_id || null;
        this.title = data.title || null;
        this.description = data.description || null;
        this.thumbnailUrl = data.thumbnail_url || null;
        this.visibility = data.visibility || VISIBILITY.PUBLIC;
        this.videoCount = data.video_count || 0;
        this.totalDuration = data.total_duration || 0;
        this.createdAt = data.created_at || null;
        this.updatedAt = data.updated_at || null;
    }

    // Créer une nouvelle playlist
    static async create(playlistData) {
        const {
            userId,
            title,
            description = null,
            visibility = VISIBILITY.PUBLIC
        } = playlistData;

        try {
            const playlistId = uuidv4();
            const query = `
        INSERT INTO playlists (id, user_id, title, description, visibility)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

            const result = await db.query(query, [
                playlistId,
                userId,
                title,
                description,
                visibility
            ]);

            const playlist = new Playlist(result.rows[0]);

            logger.info('Playlist créée', {
                playlistId: playlist.id,
                title: playlist.title,
                userId: playlist.userId
            });

            return playlist;
        } catch (error) {
            logger.error('Erreur lors de la création de playlist:', error);
            throw error;
        }
    }

    // Trouver une playlist par ID
    static async findById(id, includeVideos = false, includeUser = false) {
        try {
            let baseQuery = 'SELECT * FROM playlists WHERE id = $1';
            let result;

            if (includeUser) {
                baseQuery = `
          SELECT p.*, u.username, u.first_name, u.last_name, u.avatar_url
          FROM playlists p
          JOIN users u ON p.user_id = u.id
          WHERE p.id = $1
        `;
            }

            result = await db.query(baseQuery, [id]);

            if (result.rows.length === 0) {
                return null;
            }

            const playlist = new Playlist(result.rows[0]);

            if (includeUser) {
                playlist.user = {
                    username: result.rows[0].username,
                    firstName: result.rows[0].first_name,
                    lastName: result.rows[0].last_name,
                    avatarUrl: result.rows[0].avatar_url
                };
            }

            if (includeVideos) {
                playlist.videos = await playlist.getVideos();
            }

            return playlist;
        } catch (error) {
            logger.error('Erreur lors de la recherche par ID:', error);
            throw error;
        }
    }

    // Obtenir toutes les playlists avec filtres et pagination
    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 12,
            sort = 'created_at',
            order = 'DESC',
            visibility = VISIBILITY.PUBLIC,
            userId = null,
            search = null
        } = options;

        try {
            const offset = (page - 1) * limit;
            let whereConditions = [];
            let params = [];
            let paramIndex = 1;

            // Filtres de base
            if (visibility !== 'all') {
                whereConditions.push(`p.visibility = $${paramIndex}`);
                params.push(visibility);
                paramIndex++;
            }

            if (userId) {
                whereConditions.push(`p.user_id = $${paramIndex}`);
                params.push(userId);
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

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            const query = `
        SELECT 
          p.*, u.username, u.avatar_url,
          CASE WHEN p.video_count > 0 THEN
            (SELECT v.thumbnail_url FROM playlist_videos pv
             JOIN videos v ON pv.video_id = v.id
             WHERE pv.playlist_id = p.id
             ORDER BY pv.position ASC
             LIMIT 1)
          ELSE NULL END as first_video_thumbnail
        FROM playlists p
        JOIN users u ON p.user_id = u.id
        ${whereClause}
        ORDER BY p.${sort} ${order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

            const countQuery = `
        SELECT COUNT(*) as total
        FROM playlists p
        JOIN users u ON p.user_id = u.id
        ${whereClause}
      `;

            const [playlistsResult, countResult] = await Promise.all([
                db.query(query, [...params, limit, offset]),
                db.query(countQuery, params)
            ]);

            const playlists = playlistsResult.rows.map(row => {
                const playlist = new Playlist(row);
                playlist.user = {
                    username: row.username,
                    avatarUrl: row.avatar_url
                };
                playlist.firstVideoThumbnail = row.first_video_thumbnail;
                return playlist;
            });

            const total = parseInt(countResult.rows[0].total);

            return {
                playlists,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Erreur lors de la récupération des playlists:', error);
            throw error;
        }
    }

    // Obtenir les playlists d'un utilisateur
    static async findByUserId(userId, options = {}) {
        const {
            page = 1,
            limit = 12,
            sort = 'created_at',
            order = 'DESC',
            visibility = null,
            currentUserId = null
        } = options;

        try {
            const offset = (page - 1) * limit;
            let visibilityCondition = '';

            // Déterminer la visibilité selon les permissions
            if (currentUserId === userId) {
                // L'utilisateur voit toutes ses playlists
                visibilityCondition = visibility ? `AND p.visibility = '${visibility}'` : '';
            } else {
                // Les autres voient seulement les playlists publiques
                visibilityCondition = "AND p.visibility = 'public'";
            }

            const query = `
        SELECT 
          p.*,
          CASE WHEN p.video_count > 0 THEN
            (SELECT v.thumbnail_url FROM playlist_videos pv
             JOIN videos v ON pv.video_id = v.id
             WHERE pv.playlist_id = p.id
             ORDER BY pv.position ASC
             LIMIT 1)
          ELSE NULL END as first_video_thumbnail
        FROM playlists p
        WHERE p.user_id = $1 ${visibilityCondition}
        ORDER BY p.${sort} ${order}
        LIMIT $2 OFFSET $3
      `;

            const countQuery = `
        SELECT COUNT(*) as total
        FROM playlists p
        WHERE p.user_id = $1 ${visibilityCondition}
      `;

            const [playlistsResult, countResult] = await Promise.all([
                db.query(query, [userId, limit, offset]),
                db.query(countQuery, [userId])
            ]);

            const playlists = playlistsResult.rows.map(row => {
                const playlist = new Playlist(row);
                playlist.firstVideoThumbnail = row.first_video_thumbnail;
                return playlist;
            });

            const total = parseInt(countResult.rows[0].total);

            return {
                playlists,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Erreur lors de la récupération des playlists utilisateur:', error);
            throw error;
        }
    }

    // Recherche de playlists
    static async search(searchTerm, options = {}) {
        const { page = 1, limit = 12 } = options;
        const offset = (page - 1) * limit;

        try {
            const query = `
        SELECT 
          p.*, u.username, u.avatar_url,
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
        ORDER BY relevance_score DESC, p.video_count DESC
        LIMIT $2 OFFSET $3
      `;

            const searchTerms = searchTerm.split(' ').join(' & ');
            const result = await db.query(query, [searchTerms, limit, offset]);

            return result.rows.map(row => {
                const playlist = new Playlist(row);
                playlist.user = {
                    username: row.username,
                    avatarUrl: row.avatar_url
                };
                playlist.relevanceScore = parseFloat(row.relevance_score);
                playlist.firstVideoThumbnail = row.first_video_thumbnail;
                return playlist;
            });
        } catch (error) {
            logger.error('Erreur lors de la recherche de playlists:', error);
            throw error;
        }
    }

    // Sauvegarder les modifications
    async save() {
        try {
            const query = `
        UPDATE playlists SET
          title = $1, description = $2, visibility = $3,
          thumbnail_url = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `;

            const result = await db.query(query, [
                this.title,
                this.description,
                this.visibility,
                this.thumbnailUrl,
                this.id
            ]);

            if (result.rows.length > 0) {
                Object.assign(this, result.rows[0]);
            }

            return this;
        } catch (error) {
            logger.error('Erreur lors de la sauvegarde:', error);
            throw error;
        }
    }

    // Obtenir les vidéos de la playlist
    async getVideos() {
        try {
            const query = `
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

            const result = await db.query(query, [this.id]);
            return result.rows;
        } catch (error) {
            logger.error('Erreur lors de la récupération des vidéos:', error);
            throw error;
        }
    }

    // Ajouter une vidéo à la playlist
    async addVideo(videoId, position = null) {
        try {
            // Vérifier que la vidéo existe et est accessible
            const videoQuery = `
        SELECT id, title, user_id, status, visibility, duration
        FROM videos 
        WHERE id = $1 AND status = 'ready'
      `;

            const videoResult = await db.query(videoQuery, [videoId]);

            if (videoResult.rows.length === 0) {
                throw new Error('Vidéo non trouvée ou non disponible');
            }

            const video = videoResult.rows[0];

            // Vérifier que la vidéo n'est pas déjà dans la playlist
            const existingQuery = `
        SELECT id FROM playlist_videos 
        WHERE playlist_id = $1 AND video_id = $2
      `;

            const existingResult = await db.query(existingQuery, [this.id, videoId]);

            if (existingResult.rows.length > 0) {
                throw new Error('Vidéo déjà présente dans la playlist');
            }

            // Déterminer la position si non spécifiée
            let finalPosition = position;
            if (!finalPosition) {
                const maxPositionResult = await db.query(
                    'SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM playlist_videos WHERE playlist_id = $1',
                    [this.id]
                );
                finalPosition = maxPositionResult.rows[0].next_position;
            } else {
                // Décaler les autres vidéos si nécessaire
                await db.query(
                    'UPDATE playlist_videos SET position = position + 1 WHERE playlist_id = $1 AND position >= $2',
                    [this.id, finalPosition]
                );
            }

            // Ajouter la vidéo
            const insertQuery = `
        INSERT INTO playlist_videos (id, playlist_id, video_id, position)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

            const result = await db.query(insertQuery, [
                uuidv4(),
                this.id,
                videoId,
                finalPosition
            ]);

            logger.info('Vidéo ajoutée à la playlist', {
                playlistId: this.id,
                videoId: videoId,
                position: finalPosition
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Erreur lors de l\'ajout de vidéo:', error);
            throw error;
        }
    }

    // Supprimer une vidéo de la playlist
    async removeVideo(videoId) {
        try {
            // Récupérer la position avant suppression
            const positionResult = await db.query(
                'SELECT position FROM playlist_videos WHERE playlist_id = $1 AND video_id = $2',
                [this.id, videoId]
            );

            if (positionResult.rows.length === 0) {
                throw new Error('Vidéo non trouvée dans la playlist');
            }

            const removedPosition = positionResult.rows[0].position;

            // Supprimer la vidéo
            await db.query(
                'DELETE FROM playlist_videos WHERE playlist_id = $1 AND video_id = $2',
                [this.id, videoId]
            );

            // Réorganiser les positions
            await db.query(
                'UPDATE playlist_videos SET position = position - 1 WHERE playlist_id = $1 AND position > $2',
                [this.id, removedPosition]
            );

            logger.info('Vidéo supprimée de la playlist', {
                playlistId: this.id,
                videoId: videoId,
                removedPosition
            });

            return true;
        } catch (error) {
            logger.error('Erreur lors de la suppression de vidéo:', error);
            throw error;
        }
    }

    // Réorganiser les vidéos
    async reorderVideos(videoOrders) {
        try {
            await db.transaction(async (client) => {
                for (const { videoId, position } of videoOrders) {
                    await client.query(
                        'UPDATE playlist_videos SET position = $1 WHERE playlist_id = $2 AND video_id = $3',
                        [position, this.id, videoId]
                    );
                }
            });

            logger.info('Playlist réorganisée', {
                playlistId: this.id,
                videoCount: videoOrders.length
            });

            return true;
        } catch (error) {
            logger.error('Erreur lors de la réorganisation:', error);
            throw error;
        }
    }

    // Dupliquer la playlist
    async duplicate(newTitle, newUserId) {
        try {
            const duplicateId = uuidv4();
            const finalTitle = newTitle || `Copie de ${this.title}`;

            // Créer la playlist dupliquée
            const createQuery = `
        INSERT INTO playlists (id, user_id, title, description, visibility)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

            const newPlaylist = await db.query(createQuery, [
                duplicateId,
                newUserId,
                finalTitle,
                this.description,
                'private' // Toujours créer en privé
            ]);

            // Copier les vidéos
            const copyVideosQuery = `
        INSERT INTO playlist_videos (id, playlist_id, video_id, position)
        SELECT gen_random_uuid(), $1, video_id, position
        FROM playlist_videos
        WHERE playlist_id = $2
      `;

            await db.query(copyVideosQuery, [duplicateId, this.id]);

            logger.info('Playlist dupliquée', {
                originalId: this.id,
                duplicateId: duplicateId,
                newTitle: finalTitle
            });

            return new Playlist(newPlaylist.rows[0]);
        } catch (error) {
            logger.error('Erreur lors de la duplication:', error);
            throw error;
        }
    }

    // Obtenir les statistiques de la playlist
    async getStats() {
        try {
            const query = `
        SELECT 
          COUNT(pv.video_id) as video_count,
          SUM(v.duration) as total_duration,
          SUM(v.view_count) as total_views,
          AVG(v.view_count) as avg_views_per_video
        FROM playlist_videos pv
        LEFT JOIN videos v ON pv.video_id = v.id AND v.status = 'ready'
        WHERE pv.playlist_id = $1
      `;

            const result = await db.query(query, [this.id]);
            const stats = result.rows[0];

            return {
                videoCount: parseInt(stats.video_count || 0),
                totalDuration: parseInt(stats.total_duration || 0),
                totalViews: parseInt(stats.total_views || 0),
                avgViewsPerVideo: parseFloat(stats.avg_views_per_video || 0)
            };
        } catch (error) {
            logger.error('Erreur lors de la récupération des statistiques:', error);
            throw error;
        }
    }

    // Exporter la playlist
    async export(format = 'json') {
        try {
            const videos = await this.getVideos();

            const exportData = {
                playlist: {
                    id: this.id,
                    title: this.title,
                    description: this.description,
                    createdAt: this.createdAt
                },
                videos: videos.map(video => ({
                    position: video.position,
                    title: video.title,
                    description: video.description,
                    duration: video.duration,
                    uploader: video.uploader_username,
                    addedAt: video.added_at
                }))
            };

            if (format === 'm3u') {
                let m3uContent = '#EXTM3U\n';
                m3uContent += `#PLAYLIST:${this.title}\n\n`;

                videos.forEach(video => {
                    m3uContent += `#EXTINF:${video.duration || -1},${video.title}\n`;
                    m3uContent += `/api/videos/${video.id}/stream\n\n`;
                });

                return m3uContent;
            }

            return exportData;
        } catch (error) {
            logger.error('Erreur lors de l\'export:', error);
            throw error;
        }
    }

    // Supprimer la playlist
    async delete() {
        try {
            const query = 'DELETE FROM playlists WHERE id = $1';
            await db.query(query, [this.id]);

            logger.info('Playlist supprimée', {
                playlistId: this.id,
                title: this.title
            });

            return true;
        } catch (error) {
            logger.error('Erreur lors de la suppression:', error);
            throw error;
        }
    }

    // Vérifier si l'utilisateur peut voir la playlist
    canBeViewedBy(userId = null) {
        if (this.visibility === VISIBILITY.PUBLIC) {
            return true;
        }

        if (this.visibility === VISIBILITY.PRIVATE) {
            return userId === this.userId;
        }

        if (this.visibility === VISIBILITY.UNLISTED) {
            return true; // Accessible avec le lien direct
        }

        return false;
    }

    // Sérialiser pour l'API
    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            title: this.title,
            description: this.description,
            thumbnailUrl: this.thumbnailUrl,
            visibility: this.visibility,
            videoCount: this.videoCount,
            totalDuration: this.totalDuration,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    // Sérialiser pour l'API publique
    toPublicJSON() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            thumbnailUrl: this.thumbnailUrl,
            videoCount: this.videoCount,
            totalDuration: this.totalDuration,
            createdAt: this.createdAt
        };
    }
}

module.exports = Playlist;