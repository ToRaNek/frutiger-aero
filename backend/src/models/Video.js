// backend/src/models/Video.js
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');
const { VIDEO_STATUS, VISIBILITY } = require('../utils/constants');

class Video {
    constructor(data = {}) {
        this.id = data.id || null;
        this.title = data.title || null;
        this.description = data.description || null;
        this.userId = data.user_id || null;
        this.originalFilename = data.original_filename || null;
        this.filePath = data.file_path || null;
        this.fileSize = data.file_size || null;
        this.mimeType = data.mime_type || null;
        this.duration = data.duration || null;
        this.width = data.width || null;
        this.height = data.height || null;
        this.frameRate = data.frame_rate || null;
        this.bitrate = data.bitrate || null;
        this.thumbnailUrl = data.thumbnail_url || null;
        this.status = data.status || VIDEO_STATUS.PROCESSING;
        this.visibility = data.visibility || VISIBILITY.PUBLIC;
        this.viewCount = data.view_count || 0;
        this.likeCount = data.like_count || 0;
        this.dislikeCount = data.dislike_count || 0;
        this.commentCount = data.comment_count || 0;
        this.tags = data.tags || [];
        this.metadata = data.metadata || {};
        this.processingProgress = data.processing_progress || 0;
        this.errorMessage = data.error_message || null;
        this.createdAt = data.created_at || null;
        this.updatedAt = data.updated_at || null;
        this.publishedAt = data.published_at || null;
    }

    // Créer une nouvelle vidéo
    static async create(videoData) {
        const {
            title,
            description,
            userId,
            originalFilename,
            filePath,
            fileSize,
            mimeType,
            duration,
            width,
            height,
            frameRate,
            bitrate,
            visibility = VISIBILITY.PUBLIC,
            tags = []
        } = videoData;

        try {
            const videoId = uuidv4();
            const query = `
        INSERT INTO videos (
          id, title, description, user_id, original_filename, file_path, file_size,
          mime_type, duration, width, height, frame_rate, bitrate, visibility, tags, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;

            const result = await db.query(query, [
                videoId,
                title,
                description,
                userId,
                originalFilename,
                filePath,
                fileSize,
                mimeType,
                duration,
                width,
                height,
                frameRate,
                bitrate,
                visibility,
                tags,
                VIDEO_STATUS.PROCESSING
            ]);

            const video = new Video(result.rows[0]);

            logger.video('Vidéo créée', {
                videoId: video.id,
                title: video.title,
                userId: video.userId
            });

            return video;
        } catch (error) {
            logger.error('Erreur lors de la création de vidéo:', error);
            throw error;
        }
    }

    // Trouver une vidéo par ID
    static async findById(id, includeUser = false) {
        try {
            let query = 'SELECT * FROM videos WHERE id = $1';
            let result;

            if (includeUser) {
                query = `
          SELECT v.*, u.username, u.first_name, u.last_name, u.avatar_url
          FROM videos v
          JOIN users u ON v.user_id = u.id
          WHERE v.id = $1
        `;
            }

            result = await db.query(query, [id]);

            if (result.rows.length === 0) {
                return null;
            }

            const video = new Video(result.rows[0]);

            if (includeUser) {
                video.user = {
                    username: result.rows[0].username,
                    firstName: result.rows[0].first_name,
                    lastName: result.rows[0].last_name,
                    avatarUrl: result.rows[0].avatar_url
                };
            }

            return video;
        } catch (error) {
            logger.error('Erreur lors de la recherche par ID:', error);
            throw error;
        }
    }

    // Obtenir toutes les vidéos avec filtres et pagination
    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 12,
            sort = 'created_at',
            order = 'DESC',
            status = VIDEO_STATUS.READY,
            visibility = VISIBILITY.PUBLIC,
            userId = null,
            category = null,
            search = null
        } = options;

        try {
            const offset = (page - 1) * limit;
            let whereConditions = [];
            let params = [];
            let paramIndex = 1;

            // Filtres de base
            if (status) {
                whereConditions.push(`v.status = $${paramIndex}`);
                params.push(status);
                paramIndex++;
            }

            if (visibility) {
                whereConditions.push(`v.visibility = $${paramIndex}`);
                params.push(visibility);
                paramIndex++;
            }

            if (userId) {
                whereConditions.push(`v.user_id = $${paramIndex}`);
                params.push(userId);
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

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            const query = `
        SELECT 
          v.*, u.username, u.avatar_url,
          COALESCE(json_agg(
            CASE WHEN c.id IS NOT NULL THEN
              json_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'color', c.color)
            ELSE NULL END
          ) FILTER (WHERE c.id IS NOT NULL), '[]') as categories
        FROM videos v
        JOIN users u ON v.user_id = u.id
        LEFT JOIN video_categories vc ON v.id = vc.video_id
        LEFT JOIN categories c ON vc.category_id = c.id
        ${whereClause}
        GROUP BY v.id, u.username, u.avatar_url
        ORDER BY v.${sort} ${order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

            const countQuery = `
        SELECT COUNT(DISTINCT v.id) as total
        FROM videos v
        JOIN users u ON v.user_id = u.id
        LEFT JOIN video_categories vc ON v.id = vc.video_id
        LEFT JOIN categories c ON vc.category_id = c.id
        ${whereClause}
      `;

            const [videosResult, countResult] = await Promise.all([
                db.query(query, [...params, limit, offset]),
                db.query(countQuery, params)
            ]);

            const videos = videosResult.rows.map(row => {
                const video = new Video(row);
                video.user = {
                    username: row.username,
                    avatarUrl: row.avatar_url
                };
                video.categories = row.categories;
                return video;
            });

            const total = parseInt(countResult.rows[0].total);

            return {
                videos,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Erreur lors de la récupération des vidéos:', error);
            throw error;
        }
    }

    // Obtenir les vidéos trending
    static async findTrending(limit = 10) {
        try {
            const query = `
        SELECT 
          v.*, u.username, u.avatar_url,
          (v.view_count * 0.7 + v.like_count * 0.3) as trending_score
        FROM videos v
        JOIN users u ON v.user_id = u.id
        WHERE v.status = $1 AND v.visibility = $2
        AND v.created_at > NOW() - INTERVAL '7 days'
        ORDER BY trending_score DESC, v.created_at DESC
        LIMIT $3
      `;

            const result = await db.query(query, [VIDEO_STATUS.READY, VISIBILITY.PUBLIC, limit]);

            return result.rows.map(row => {
                const video = new Video(row);
                video.user = {
                    username: row.username,
                    avatarUrl: row.avatar_url
                };
                video.trendingScore = parseFloat(row.trending_score);
                return video;
            });
        } catch (error) {
            logger.error('Erreur lors de la récupération des vidéos trending:', error);
            throw error;
        }
    }

    // Recherche de vidéos avec score de pertinence
    static async search(searchTerm, options = {}) {
        const { page = 1, limit = 12, category = null } = options;
        const offset = (page - 1) * limit;

        try {
            let whereConditions = [
                'v.status = $1',
                'v.visibility = $2',
                "to_tsvector('french', v.title || ' ' || COALESCE(v.description, '')) @@ to_tsquery('french', $3)"
            ];
            let params = [VIDEO_STATUS.READY, VISIBILITY.PUBLIC, searchTerm.split(' ').join(' & ')];
            let paramIndex = 4;

            if (category) {
                whereConditions.push(`EXISTS (
          SELECT 1 FROM video_categories vc 
          JOIN categories c ON vc.category_id = c.id 
          WHERE vc.video_id = v.id AND c.slug = $${paramIndex}
        )`);
                params.push(category);
                paramIndex++;
            }

            const query = `
        SELECT 
          v.*, u.username, u.avatar_url,
          ts_rank(to_tsvector('french', v.title || ' ' || COALESCE(v.description, '')), to_tsquery('french', $3)) as relevance_score
        FROM videos v
        JOIN users u ON v.user_id = u.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY relevance_score DESC, v.view_count DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

            const result = await db.query(query, [...params, limit, offset]);

            return result.rows.map(row => {
                const video = new Video(row);
                video.user = {
                    username: row.username,
                    avatarUrl: row.avatar_url
                };
                video.relevanceScore = parseFloat(row.relevance_score);
                return video;
            });
        } catch (error) {
            logger.error('Erreur lors de la recherche de vidéos:', error);
            throw error;
        }
    }

    // Sauvegarder les modifications
    async save() {
        try {
            const query = `
        UPDATE videos SET
          title = $1, description = $2, visibility = $3, tags = $4,
          status = $5, processing_progress = $6, error_message = $7,
          thumbnail_url = $8, metadata = $9, updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
        RETURNING *
      `;

            const result = await db.query(query, [
                this.title,
                this.description,
                this.visibility,
                this.tags,
                this.status,
                this.processingProgress,
                this.errorMessage,
                this.thumbnailUrl,
                JSON.stringify(this.metadata),
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

    // Marquer comme publié
    async publish() {
        try {
            this.status = VIDEO_STATUS.READY;
            this.publishedAt = new Date();

            const query = `
        UPDATE videos SET 
          status = $1, 
          published_at = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `;

            await db.query(query, [this.status, this.publishedAt, this.id]);

            logger.video('Vidéo publiée', {
                videoId: this.id,
                title: this.title
            });

            return this;
        } catch (error) {
            logger.error('Erreur lors de la publication:', error);
            throw error;
        }
    }

    // Incrémenter le compteur de vues
    async incrementViews() {
        try {
            const query = `
        UPDATE videos SET view_count = view_count + 1
        WHERE id = $1
        RETURNING view_count
      `;

            const result = await db.query(query, [this.id]);
            this.viewCount = result.rows[0].view_count;

            return this;
        } catch (error) {
            logger.error('Erreur lors de l\'incrémentation des vues:', error);
            throw error;
        }
    }

    // Ajouter/modifier une réaction
    async addReaction(userId, reactionType) {
        try {
            const query = `
        INSERT INTO video_reactions (id, user_id, video_id, reaction_type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, video_id)
        DO UPDATE SET reaction_type = $4, created_at = CURRENT_TIMESTAMP
        RETURNING reaction_type, created_at
      `;

            const result = await db.query(query, [uuidv4(), userId, this.id, reactionType]);

            logger.video('Réaction ajoutée', {
                videoId: this.id,
                userId,
                reactionType
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Erreur lors de l\'ajout de réaction:', error);
            throw error;
        }
    }

    // Supprimer une réaction
    async removeReaction(userId) {
        try {
            const query = `
        DELETE FROM video_reactions 
        WHERE user_id = $1 AND video_id = $2
        RETURNING reaction_type
      `;

            const result = await db.query(query, [userId, this.id]);

            if (result.rows.length > 0) {
                logger.video('Réaction supprimée', {
                    videoId: this.id,
                    userId,
                    reactionType: result.rows[0].reaction_type
                });
            }

            return result.rows.length > 0;
        } catch (error) {
            logger.error('Erreur lors de la suppression de réaction:', error);
            throw error;
        }
    }

    // Obtenir la réaction d'un utilisateur
    async getUserReaction(userId) {
        try {
            const query = `
        SELECT reaction_type FROM video_reactions 
        WHERE user_id = $1 AND video_id = $2
      `;

            const result = await db.query(query, [userId, this.id]);
            return result.rows[0]?.reaction_type || null;
        } catch (error) {
            logger.error('Erreur lors de la récupération de réaction:', error);
            throw error;
        }
    }

    // Obtenir les formats disponibles
    async getFormats() {
        try {
            const query = `
        SELECT quality, file_path, file_size, bitrate, width, height, playlist_url
        FROM video_formats
        WHERE video_id = $1
        ORDER BY width DESC
      `;

            const result = await db.query(query, [this.id]);
            return result.rows;
        } catch (error) {
            logger.error('Erreur lors de la récupération des formats:', error);
            throw error;
        }
    }

    // Ajouter un format
    async addFormat(formatData) {
        try {
            const {
                quality,
                filePath,
                fileSize,
                bitrate,
                width,
                height,
                playlistUrl = null
            } = formatData;

            const query = `
        INSERT INTO video_formats (id, video_id, quality, file_path, file_size, bitrate, width, height, playlist_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (video_id, quality)
        DO UPDATE SET file_path = $4, file_size = $5, bitrate = $6, width = $7, height = $8, playlist_url = $9
        RETURNING *
      `;

            const result = await db.query(query, [
                uuidv4(),
                this.id,
                quality,
                filePath,
                fileSize,
                bitrate,
                width,
                height,
                playlistUrl
            ]);

            return result.rows[0];
        } catch (error) {
            logger.error('Erreur lors de l\'ajout de format:', error);
            throw error;
        }
    }

    // Obtenir les statistiques détaillées
    async getDetailedStats() {
        try {
            const query = `
        SELECT 
          COUNT(DISTINCT vv.user_id) as unique_viewers,
          AVG(vv.completion_percentage) as avg_completion,
          COUNT(DISTINCT DATE(vv.watched_at)) as viewing_days,
          COUNT(DISTINCT c.id) as comment_count,
          COUNT(DISTINCT vr.id) FILTER (WHERE vr.reaction_type = 'like') as like_count,
          COUNT(DISTINCT vr.id) FILTER (WHERE vr.reaction_type = 'dislike') as dislike_count
        FROM videos v
        LEFT JOIN video_views vv ON v.id = vv.video_id
        LEFT JOIN comments c ON v.id = c.video_id AND c.is_deleted = false
        LEFT JOIN video_reactions vr ON v.id = vr.video_id
        WHERE v.id = $1
        GROUP BY v.id
      `;

            const result = await db.query(query, [this.id]);

            if (result.rows.length === 0) {
                return null;
            }

            const stats = result.rows[0];

            return {
                viewCount: this.viewCount,
                uniqueViewers: parseInt(stats.unique_viewers || 0),
                averageCompletion: parseFloat(stats.avg_completion || 0),
                viewingDays: parseInt(stats.viewing_days || 0),
                commentCount: parseInt(stats.comment_count || 0),
                likeCount: parseInt(stats.like_count || 0),
                dislikeCount: parseInt(stats.dislike_count || 0),
                engagementRate: this.viewCount > 0
                    ? ((parseInt(stats.like_count || 0) + parseInt(stats.dislike_count || 0) + parseInt(stats.comment_count || 0)) / this.viewCount * 100).toFixed(2)
                    : 0
            };
        } catch (error) {
            logger.error('Erreur lors de la récupération des statistiques:', error);
            throw error;
        }
    }

    // Supprimer la vidéo
    async delete() {
        try {
            const query = 'DELETE FROM videos WHERE id = $1';
            await db.query(query, [this.id]);

            logger.video('Vidéo supprimée', {
                videoId: this.id,
                title: this.title
            });

            return true;
        } catch (error) {
            logger.error('Erreur lors de la suppression:', error);
            throw error;
        }
    }

    // Vérifier si l'utilisateur peut voir la vidéo
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

    // Obtenir l'URL de streaming
    getStreamUrl(quality = 'auto') {
        if (quality === 'auto') {
            return `/api/videos/${this.id}/stream`;
        }
        return `/api/videos/${this.id}/stream?quality=${quality}`;
    }

    // Sérialiser pour l'API
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            userId: this.userId,
            thumbnailUrl: this.thumbnailUrl,
            duration: this.duration,
            width: this.width,
            height: this.height,
            status: this.status,
            visibility: this.visibility,
            viewCount: this.viewCount,
            likeCount: this.likeCount,
            dislikeCount: this.dislikeCount,
            commentCount: this.commentCount,
            tags: this.tags,
            processingProgress: this.processingProgress,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            publishedAt: this.publishedAt
        };
    }

    // Sérialiser pour l'API publique (sans données sensibles)
    toPublicJSON() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            thumbnailUrl: this.thumbnailUrl,
            duration: this.duration,
            viewCount: this.viewCount,
            likeCount: this.likeCount,
            dislikeCount: this.dislikeCount,
            commentCount: this.commentCount,
            tags: this.tags,
            createdAt: this.createdAt,
            publishedAt: this.publishedAt
        };
    }
}

module.exports = Video;