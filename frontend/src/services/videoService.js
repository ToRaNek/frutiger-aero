// frontend/src/services/videoService.js
import { ApiHelpers, MemoryCache, ENDPOINTS, withRetry } from './api';

/**
 * Service de gestion des vidéos utilisant les endpoints du backend
 * Respecte exactement les noms de méthodes du backend videoController
 */
class VideoService {
    constructor() {
        this.uploadCache = new Map(); // Cache pour les uploads en cours
    }

    /**
     * Récupérer la liste des vidéos avec filtres et pagination
     * Endpoint: GET /videos
     */
    async getVideos(options = {}) {
        const {
            page = 1,
            limit = 20,
            sortBy = 'created_at',
            sortOrder = 'desc',
            category = null,
            userId = null,
            search = null,
            status = 'published',
            featured = null
        } = options;

        // Construire les paramètres de requête
        const params = ApiHelpers.buildPaginationParams(page, limit, sortBy, sortOrder);

        if (category) params.category = category;
        if (userId) params.userId = userId;
        if (search) params.search = search;
        if (status) params.status = status;
        if (featured !== null) params.featured = featured;

        // Clé de cache pour cette requête
        const cacheKey = `videos_${JSON.stringify(params)}`;
        const cached = MemoryCache.get(cacheKey);
        if (cached) {
            return { data: cached, error: null };
        }

        const { data, error } = await ApiHelpers.get(ENDPOINTS.VIDEOS.LIST, { params });

        // Mettre en cache les résultats pour 2 minutes
        if (data && !error) {
            MemoryCache.set(cacheKey, data, 120000);
        }

        return { data, error };
    }

    /**
     * Récupérer les détails d'une vidéo par ID
     * Endpoint: GET /videos/:id
     */
    async getVideoById(videoId, includeUser = true) {
        if (!videoId) {
            return {
                data: null,
                error: {
                    message: 'ID de vidéo requis',
                    type: 'VALIDATION_ERROR'
                }
            };
        }

        const cacheKey = `video_${videoId}_${includeUser}`;
        const cached = MemoryCache.get(cacheKey);
        if (cached) {
            return { data: cached, error: null };
        }

        const params = {};
        if (includeUser) params.includeUser = 'true';

        const { data, error } = await ApiHelpers.get(
            ENDPOINTS.VIDEOS.DETAIL(videoId),
            { params }
        );

        // Cache pour 5 minutes
        if (data && !error) {
            MemoryCache.set(cacheKey, data, 300000);
        }

        return { data, error };
    }

    /**
     * Upload d'une nouvelle vidéo
     * Endpoint: POST /videos/upload
     */
    async uploadVideo(videoData, onProgress = null) {
        const { file, title, description, category, tags, thumbnail, isPrivate = false } = videoData;

        // Validation côté client
        const validationErrors = this._validateVideoUpload(videoData);
        if (validationErrors.length > 0) {
            return {
                data: null,
                error: {
                    message: 'Données invalides',
                    errors: validationErrors,
                    type: 'VALIDATION_ERROR'
                }
            };
        }

        // Créer le FormData pour l'upload
        const formData = new FormData();
        formData.append('video', file);
        formData.append('title', title);
        formData.append('description', description || '');
        formData.append('category', category);
        formData.append('isPrivate', isPrivate.toString());

        // Tags (array vers JSON)
        if (tags && tags.length > 0) {
            formData.append('tags', JSON.stringify(tags));
        }

        // Thumbnail optionnelle
        if (thumbnail) {
            formData.append('thumbnail', thumbnail);
        }

        // Stocker l'upload en cours
        const uploadId = Date.now().toString();
        this.uploadCache.set(uploadId, {
            status: 'uploading',
            progress: 0,
            startTime: Date.now()
        });

        try {
            const { data, error } = await ApiHelpers.upload(
                ENDPOINTS.VIDEOS.UPLOAD,
                formData,
                (progress) => {
                    // Mettre à jour le cache d'upload
                    this.uploadCache.set(uploadId, {
                        status: 'uploading',
                        progress,
                        startTime: this.uploadCache.get(uploadId)?.startTime || Date.now()
                    });

                    // Callback de progression
                    if (onProgress) {
                        onProgress({ uploadId, progress, stage: 'uploading' });
                    }
                }
            );

            if (error) {
                this.uploadCache.set(uploadId, {
                    status: 'error',
                    error,
                    progress: 0
                });
                return { data: null, error };
            }

            // Upload terminé avec succès
            this.uploadCache.set(uploadId, {
                status: 'processing',
                progress: 100,
                videoId: data.video.id
            });

            // Nettoyer le cache des vidéos pour forcer un refresh
            this._clearVideoListCache();

            if (onProgress) {
                onProgress({
                    uploadId,
                    progress: 100,
                    stage: 'processing',
                    videoId: data.video.id
                });
            }

            return { data, error: null };
        } catch (error) {
            this.uploadCache.set(uploadId, {
                status: 'error',
                error,
                progress: 0
            });

            return {
                data: null,
                error: {
                    message: 'Erreur lors de l\'upload',
                    type: 'UPLOAD_ERROR'
                }
            };
        }
    }

    /**
     * Mettre à jour une vidéo
     * Endpoint: PUT /videos/:id
     */
    async updateVideo(videoId, updateData) {
        if (!videoId) {
            return {
                data: null,
                error: {
                    message: 'ID de vidéo requis',
                    type: 'VALIDATION_ERROR'
                }
            };
        }

        const { title, description, category, tags, isPrivate, thumbnail } = updateData;

        // Préparer les données
        let requestData = {};
        let formData = null;

        // Si on a une nouvelle thumbnail, utiliser FormData
        if (thumbnail instanceof File) {
            formData = new FormData();
            formData.append('thumbnail', thumbnail);
            if (title) formData.append('title', title);
            if (description) formData.append('description', description);
            if (category) formData.append('category', category);
            if (tags) formData.append('tags', JSON.stringify(tags));
            if (isPrivate !== undefined) formData.append('isPrivate', isPrivate.toString());
        } else {
            // Données JSON normales
            requestData = {
                ...(title && { title }),
                ...(description !== undefined && { description }),
                ...(category && { category }),
                ...(tags && { tags }),
                ...(isPrivate !== undefined && { isPrivate })
            };
        }

        const { data, error } = formData
            ? await ApiHelpers.upload(ENDPOINTS.VIDEOS.UPDATE(videoId), formData)
            : await ApiHelpers.put(ENDPOINTS.VIDEOS.UPDATE(videoId), requestData);

        // Nettoyer le cache pour cette vidéo
        if (data && !error) {
            this._clearVideoCache(videoId);
            this._clearVideoListCache();
        }

        return { data, error };
    }

    /**
     * Supprimer une vidéo
     * Endpoint: DELETE /videos/:id
     */
    async deleteVideo(videoId) {
        if (!videoId) {
            return {
                data: null,
                error: {
                    message: 'ID de vidéo requis',
                    type: 'VALIDATION_ERROR'
                }
            };
        }

        const { data, error } = await ApiHelpers.delete(ENDPOINTS.VIDEOS.DELETE(videoId));

        // Nettoyer le cache
        if (data && !error) {
            this._clearVideoCache(videoId);
            this._clearVideoListCache();
        }

        return { data, error };
    }

    /**
     * Obtenir l'URL de streaming d'une vidéo
     * Endpoint: GET /videos/:id/stream
     */
    getStreamUrl(videoId, quality = 'auto') {
        return ApiHelpers.getStreamUrl(videoId, quality);
    }

    /**
     * Enregistrer une vue de vidéo
     * Endpoint: POST /videos/:id/view
     */
    async recordView(videoId, watchTime = 0) {
        if (!videoId) return { data: null, error: null };

        // Utiliser withRetry pour les vues car c'est important pour les analytics
        const recordViewWithRetry = withRetry(
            () => ApiHelpers.post(ENDPOINTS.VIDEOS.VIEW(videoId), { watchTime }),
            2, // 2 tentatives max
            1000 // 1 seconde entre les tentatives
        );

        return await recordViewWithRetry();
    }

    /**
     * Liker une vidéo
     * Endpoint: POST /videos/:id/like
     */
    async likeVideo(videoId) {
        if (!videoId) {
            return {
                data: null,
                error: {
                    message: 'ID de vidéo requis',
                    type: 'VALIDATION_ERROR'
                }
            };
        }

        const { data, error } = await ApiHelpers.post(ENDPOINTS.VIDEOS.LIKE(videoId));

        // Mettre à jour le cache de la vidéo
        if (data && !error) {
            this._updateVideoInCache(videoId, {
                likes: data.likes,
                userReaction: data.userReaction
            });
        }

        return { data, error };
    }

    /**
     * Disliker une vidéo
     * Endpoint: POST /videos/:id/dislike
     */
    async dislikeVideo(videoId) {
        if (!videoId) {
            return {
                data: null,
                error: {
                    message: 'ID de vidéo requis',
                    type: 'VALIDATION_ERROR'
                }
            };
        }

        const { data, error } = await ApiHelpers.post(ENDPOINTS.VIDEOS.DISLIKE(videoId));

        // Mettre à jour le cache de la vidéo
        if (data && !error) {
            this._updateVideoInCache(videoId, {
                dislikes: data.dislikes,
                userReaction: data.userReaction
            });
        }

        return { data, error };
    }

    /**
     * Rechercher des vidéos
     * Endpoint: GET /videos/search
     */
    async searchVideos(searchTerm, options = {}) {
        if (!searchTerm || searchTerm.trim().length < 2) {
            return {
                data: { videos: [], total: 0, pagination: {} },
                error: null
            };
        }

        const {
            page = 1,
            limit = 20,
            sortBy = 'relevance',
            category = null,
            duration = null, // 'short', 'medium', 'long'
            uploadDate = null // 'today', 'week', 'month', 'year'
        } = options;

        const params = {
            q: searchTerm.trim(),
            page,
            limit,
            sortBy
        };

        if (category) params.category = category;
        if (duration) params.duration = duration;
        if (uploadDate) params.uploadDate = uploadDate;

        const cacheKey = `search_${JSON.stringify(params)}`;
        const cached = MemoryCache.get(cacheKey);
        if (cached) {
            return { data: cached, error: null };
        }

        const { data, error } = await ApiHelpers.get(ENDPOINTS.VIDEOS.SEARCH, { params });

        // Cache des résultats de recherche pour 1 minute
        if (data && !error) {
            MemoryCache.set(cacheKey, data, 60000);
        }

        return { data, error };
    }

    /**
     * Récupérer les vidéos tendances
     * Endpoint: GET /videos/trending
     */
    async getTrendingVideos(options = {}) {
        const {
            limit = 20,
            category = null,
            timeframe = 'week' // 'day', 'week', 'month'
        } = options;

        const params = { limit, timeframe };
        if (category) params.category = category;

        const cacheKey = `trending_${JSON.stringify(params)}`;
        const cached = MemoryCache.get(cacheKey);
        if (cached) {
            return { data: cached, error: null };
        }

        const { data, error } = await ApiHelpers.get(ENDPOINTS.VIDEOS.TRENDING, { params });

        // Cache pour 10 minutes
        if (data && !error) {
            MemoryCache.set(cacheKey, data, 600000);
        }

        return { data, error };
    }

    /**
     * Obtenir l'URL de la miniature
     */
    getThumbnailUrl(videoId, size = 'medium') {
        return ApiHelpers.getThumbnailUrl(videoId, size);
    }

    /**
     * Récupérer le statut d'un upload
     */
    getUploadStatus(uploadId) {
        return this.uploadCache.get(uploadId) || null;
    }

    /**
     * Nettoyer le cache d'un upload terminé
     */
    clearUploadStatus(uploadId) {
        this.uploadCache.delete(uploadId);
    }

    /**
     * Obtenir les catégories disponibles
     */
    async getCategories() {
        const cacheKey = 'video_categories';
        const cached = MemoryCache.get(cacheKey);
        if (cached) {
            return { data: cached, error: null };
        }

        const { data, error } = await ApiHelpers.get('/videos/categories');

        // Cache pour 1 heure
        if (data && !error) {
            MemoryCache.set(cacheKey, data, 3600000);
        }

        return { data, error };
    }

    // Méthodes privées

    /**
     * Valider les données d'upload de vidéo
     */
    _validateVideoUpload(videoData) {
        const errors = [];
        const { file, title, category } = videoData;

        if (!file) {
            errors.push('Fichier vidéo requis');
        } else {
            // Vérifier le type de fichier
            const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm'];
            if (!allowedTypes.includes(file.type)) {
                errors.push('Format de fichier non supporté. Utilisez MP4, AVI, MOV, MKV ou WebM');
            }

            // Vérifier la taille (500MB max par défaut)
            const maxSize = 500 * 1024 * 1024; // 500MB
            if (file.size > maxSize) {
                errors.push('Fichier trop volumineux. Taille maximum: 500MB');
            }
        }

        if (!title || title.trim().length < 3) {
            errors.push('Le titre doit faire au moins 3 caractères');
        }

        if (title && title.length > 100) {
            errors.push('Le titre ne peut pas dépasser 100 caractères');
        }

        if (!category) {
            errors.push('Catégorie requise');
        }

        return errors;
    }

    /**
     * Nettoyer le cache d'une vidéo spécifique
     */
    _clearVideoCache(videoId) {
        const keys = Array.from(MemoryCache.cache.keys());
        keys.forEach(key => {
            if (key.startsWith(`video_${videoId}`)) {
                MemoryCache.delete(key);
            }
        });
    }

    /**
     * Nettoyer le cache des listes de vidéos
     */
    _clearVideoListCache() {
        const keys = Array.from(MemoryCache.cache.keys());
        keys.forEach(key => {
            if (key.startsWith('videos_') || key.startsWith('trending_') || key.startsWith('search_')) {
                MemoryCache.delete(key);
            }
        });
    }

    /**
     * Mettre à jour une vidéo dans le cache
     */
    _updateVideoInCache(videoId, updates) {
        const keys = Array.from(MemoryCache.cache.keys());
        keys.forEach(key => {
            if (key.startsWith(`video_${videoId}`)) {
                const cached = MemoryCache.get(key);
                if (cached && cached.video) {
                    const updatedData = {
                        ...cached,
                        video: { ...cached.video, ...updates }
                    };
                    MemoryCache.set(key, updatedData);
                }
            }
        });
    }
}

// Instance singleton du service vidéo
const videoService = new VideoService();

export default videoService;

// Export des constantes utiles
export const VIDEO_FORMATS = {
    MP4: 'video/mp4',
    AVI: 'video/avi',
    MOV: 'video/mov',
    MKV: 'video/mkv',
    WEBM: 'video/webm'
};

export const VIDEO_QUALITIES = {
    AUTO: 'auto',
    LOW: '360p',
    MEDIUM: '720p',
    HIGH: '1080p'
};

export const THUMBNAIL_SIZES = {
    SMALL: 'small',    // 120x90
    MEDIUM: 'medium',  // 320x240
    LARGE: 'large'     // 640x480
};

export const UPLOAD_STATUS = {
    UPLOADING: 'uploading',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    ERROR: 'error'
};

export const SEARCH_SORT_OPTIONS = {
    RELEVANCE: 'relevance',
    UPLOAD_DATE: 'upload_date',
    VIEW_COUNT: 'view_count',
    RATING: 'rating'
};

export const DURATION_FILTERS = {
    SHORT: 'short',   // < 4 minutes
    MEDIUM: 'medium', // 4-20 minutes
    LONG: 'long'      // > 20 minutes
};

export const UPLOAD_DATE_FILTERS = {
    TODAY: 'today',
    WEEK: 'week',
    MONTH: 'month',
    YEAR: 'year'
};