// frontend/src/services/playlistService.js
import { ApiHelpers, MemoryCache, ENDPOINTS } from './api';

/**
 * Service de gestion des playlists utilisant les endpoints du backend
 * Respecte exactement les noms de méthodes du backend playlistController
 */
class PlaylistService {
    constructor() {
        this.defaultPlaylists = {
            FAVORITES: 'favorites',
            WATCH_LATER: 'watch_later',
            HISTORY: 'history'
        };
    }

    /**
     * Récupérer la liste des playlists avec filtres et pagination
     * Endpoint: GET /playlists
     */
    async getPlaylists(options = {}) {
        const {
            page = 1,
            limit = 20,
            sortBy = 'updated_at',
            sortOrder = 'desc',
            userId = null,
            isPublic = null,
            search = null
        } = options;

        const params = ApiHelpers.buildPaginationParams(page, limit, sortBy, sortOrder);

        if (userId) params.userId = userId;
        if (isPublic !== null) params.isPublic = isPublic;
        if (search) params.search = search;

        const cacheKey = `playlists_${JSON.stringify(params)}`;
        const cached = MemoryCache.get(cacheKey);
        if (cached) {
            return { data: cached, error: null };
        }

        const { data, error } = await ApiHelpers.get(ENDPOINTS.PLAYLISTS.LIST, { params });

        // Cache pour 2 minutes
        if (data && !error) {
            MemoryCache.set(cacheKey, data, 120000);
        }

        return { data, error };
    }

    /**
     * Récupérer les détails d'une playlist par ID
     * Endpoint: GET /playlists/:id
     */
    async getPlaylistById(playlistId, includeVideos = true, includeUser = true) {
        if (!playlistId) {
            return {
                data: null,
                error: {
                    message: 'ID de playlist requis',
                    type: 'VALIDATION_ERROR'
                }
            };
        }

        const cacheKey = `playlist_${playlistId}_${includeVideos}_${includeUser}`;
        const cached = MemoryCache.get(cacheKey);
        if (cached) {
            return { data: cached, error: null };
        }

        const params = {};
        if (includeVideos) params.includeVideos = 'true';
        if (includeUser) params.includeUser = 'true';

        const { data, error } = await ApiHelpers.get(
            ENDPOINTS.PLAYLISTS.DETAIL(playlistId),
            { params }
        );

        // Cache pour 5 minutes
        if (data && !error) {
            MemoryCache.set(cacheKey, data, 300000);
        }

        return { data, error };
    }

    /**
     * Créer une nouvelle playlist
     * Endpoint: POST /playlists
     */
    async createPlaylist(playlistData) {
        const { title, description, isPublic = true, thumbnail } = playlistData;

        // Validation côté client
        const validationErrors = this._validatePlaylistData(playlistData);
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

        // Préparer les données
        let requestData = { title, description, isPublic };
        let formData = null;

        // Si on a une thumbnail, utiliser FormData
        if (thumbnail instanceof File) {
            formData = new FormData();
            formData.append('thumbnail', thumbnail);
            formData.append('title', title);
            formData.append('description', description || '');
            formData.append('isPublic', isPublic.toString());
        }

        const { data, error } = formData
            ? await ApiHelpers.upload(ENDPOINTS.PLAYLISTS.CREATE, formData)
            : await ApiHelpers.post(ENDPOINTS.PLAYLISTS.CREATE, requestData);

        // Nettoyer le cache des listes
        if (data && !error) {
            this._clearPlaylistListCache();
        }

        return { data, error };
    }

    /**
     * Mettre à jour une playlist
     * Endpoint: PUT /playlists/:id
     */
    async updatePlaylist(playlistId, updateData) {
        if (!playlistId) {
            return {
                data: null,
                error: {
                    message: 'ID de playlist requis',
                    type: 'VALIDATION_ERROR'
                }
            };
        }

        const { title, description, isPublic, thumbnail } = updateData;

        // Préparer les données
        let requestData = {};
        let formData = null;

        // Si on a une nouvelle thumbnail, utiliser FormData
        if (thumbnail instanceof File) {
            formData = new FormData();
            formData.append('thumbnail', thumbnail);
            if (title) formData.append('title', title);
            if (description !== undefined) formData.append('description', description);
            if (isPublic !== undefined) formData.append('isPublic', isPublic.toString());
        } else {
            // Données JSON normales
            requestData = {
                ...(title && { title }),
                ...(description !== undefined && { description }),
                ...(isPublic !== undefined && { isPublic })
            };
        }

        const { data, error } = formData
            ? await ApiHelpers.upload(ENDPOINTS.PLAYLISTS.UPDATE(playlistId), formData)
            : await ApiHelpers.put(ENDPOINTS.PLAYLISTS.UPDATE(playlistId), requestData);

        // Nettoyer le cache
        if (data && !error) {
            this._clearPlaylistCache(playlistId);
            this._clearPlaylistListCache();
        }

        return { data, error };
    }

    /**
     * Supprimer une playlist
     * Endpoint: DELETE /playlists/:id
     */
    async deletePlaylist(playlistId) {
        if (!playlistId) {
            return {
                data: null,
                error: {
                    message: 'ID de playlist requis',
                    type: 'VALIDATION_ERROR'
                }
            };
        }

        const { data, error } = await ApiHelpers.delete(ENDPOINTS.PLAYLISTS.DELETE(playlistId));

        // Nettoyer le cache
        if (data && !error) {
            this._clearPlaylistCache(playlistId);
            this._clearPlaylistListCache();
        }

        return { data, error };
    }

    /**
     * Ajouter une vidéo à une playlist
     * Endpoint: POST /playlists/:id/videos
     */
    async addVideoToPlaylist(playlistId, videoId, position = null) {
        if (!playlistId || !videoId) {
            return {
                data: null,
                error: {
                    message: 'ID de playlist et ID de vidéo requis',
                    type: 'VALIDATION_ERROR'
                }
            };
        }

        const requestData = { videoId };
        if (position !== null && position >= 0) {
            requestData.position = position;
        }

        const { data, error } = await ApiHelpers.post(
            ENDPOINTS.PLAYLISTS.ADD_VIDEO(playlistId),
            requestData
        );

        // Nettoyer le cache de la playlist
        if (data && !error) {
            this._clearPlaylistCache(playlistId);
        }

        return { data, error };
    }

    /**
     * Supprimer une vidéo d'une playlist
     * Endpoint: DELETE /playlists/:playlistId/videos/:videoId
     */
    async removeVideoFromPlaylist(playlistId, videoId) {
        if (!playlistId || !videoId) {
            return {
                data: null,
                error: {
                    message: 'ID de playlist et ID de vidéo requis',
                    type: 'VALIDATION_ERROR'
                }
            };
        }

        const { data, error } = await ApiHelpers.delete(
            ENDPOINTS.PLAYLISTS.REMOVE_VIDEO(playlistId, videoId)
        );

        // Nettoyer le cache de la playlist
        if (data && !error) {
            this._clearPlaylistCache(playlistId);
        }

        return { data, error };
    }

    /**
     * Réorganiser les vidéos d'une playlist
     * Endpoint: PUT /playlists/:id/reorder
     */
    async reorderPlaylistVideos(playlistId, videoOrders) {
        if (!playlistId || !Array.isArray(videoOrders)) {
            return {
                data: null,
                error: {
                    message: 'ID de playlist et ordre des vidéos requis',
                    type: 'VALIDATION_ERROR'
                }
            };
        }

        // Valider le format des ordres
        const isValidOrder = videoOrders.every(order =>
            typeof order === 'object' &&
            order.videoId &&
            typeof order.position === 'number'
        );

        if (!isValidOrder) {
            return {
                data: null,
                error: {
                    message: 'Format d\'ordre invalide. Attendu: [{ videoId, position }]',
                    type: 'VALIDATION_ERROR'
                }
            };
        }

        const { data, error } = await ApiHelpers.put(
            ENDPOINTS.PLAYLISTS.REORDER(playlistId),
            { videoOrders }
        );

        // Nettoyer le cache de la playlist
        if (data && !error) {
            this._clearPlaylistCache(playlistId);
        }

        return { data, error };
    }

    /**
     * Récupérer les playlists d'un utilisateur
     * Endpoint: GET /users/:userId/playlists
     */
    async getUserPlaylists(userId, options = {}) {
        if (!userId) {
            return {
                data: null,
                error: {
                    message: 'ID utilisateur requis',
                    type: 'VALIDATION_ERROR'
                }
            };
        }

        const {
            page = 1,
            limit = 20,
            includePrivate = false
        } = options;

        const params = { page, limit };
        if (includePrivate) params.includePrivate = 'true';

        const cacheKey = `user_playlists_${userId}_${JSON.stringify(params)}`;
        const cached = MemoryCache.get(cacheKey);
        if (cached) {
            return { data: cached, error: null };
        }

        const { data, error } = await ApiHelpers.get(
            ENDPOINTS.PLAYLISTS.USER_PLAYLISTS(userId),
            { params }
        );

        // Cache pour 2 minutes
        if (data && !error) {
            MemoryCache.set(cacheKey, data, 120000);
        }

        return { data, error };
    }

    /**
     * Ajouter une vidéo aux favoris (playlist spéciale)
     */
    async addToFavorites(videoId) {
        return await this._addToDefaultPlaylist(this.defaultPlaylists.FAVORITES, videoId);
    }

    /**
     * Supprimer une vidéo des favoris
     */
    async removeFromFavorites(videoId) {
        return await this._removeFromDefaultPlaylist(this.defaultPlaylists.FAVORITES, videoId);
    }

    /**
     * Ajouter une vidéo à "À regarder plus tard"
     */
    async addToWatchLater(videoId) {
        return await this._addToDefaultPlaylist(this.defaultPlaylists.WATCH_LATER, videoId);
    }

    /**
     * Supprimer une vidéo de "À regarder plus tard"
     */
    async removeFromWatchLater(videoId) {
        return await this._removeFromDefaultPlaylist(this.defaultPlaylists.WATCH_LATER, videoId);
    }

    /**
     * Récupérer l'historique de visionnage
     */
    async getWatchHistory(options = {}) {
        const {
            page = 1,
            limit = 50,
            dateFrom = null,
            dateTo = null
        } = options;

        const params = { page, limit };
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;

        const cacheKey = `watch_history_${JSON.stringify(params)}`;
        const cached = MemoryCache.get(cacheKey);
        if (cached) {
            return { data: cached, error: null };
        }

        const { data, error } = await ApiHelpers.get('/users/watch-history', { params });

        // Cache pour 1 minute (historique change souvent)
        if (data && !error) {
            MemoryCache.set(cacheKey, data, 60000);
        }

        return { data, error };
    }

    /**
     * Nettoyer l'historique de visionnage
     */
    async clearWatchHistory(olderThan = null) {
        const requestData = {};
        if (olderThan) requestData.olderThan = olderThan;

        const { data, error } = await ApiHelpers.delete('/users/watch-history', {
            data: requestData
        });

        // Nettoyer le cache de l'historique
        if (data && !error) {
            this._clearHistoryCache();
        }

        return { data, error };
    }

    /**
     * Dupliquer une playlist
     */
    async duplicatePlaylist(playlistId, newTitle) {
        if (!playlistId || !newTitle) {
            return {
                data: null,
                error: {
                    message: 'ID de playlist et nouveau titre requis',
                    type: 'VALIDATION_ERROR'
                }
            };
        }

        const { data, error } = await ApiHelpers.post(
            `/playlists/${playlistId}/duplicate`,
            { newTitle }
        );

        // Nettoyer le cache des listes
        if (data && !error) {
            this._clearPlaylistListCache();
        }

        return { data, error };
    }

    /**
     * Rechercher dans les playlists
     */
    async searchPlaylists(searchTerm, options = {}) {
        if (!searchTerm || searchTerm.trim().length < 2) {
            return {
                data: { playlists: [], total: 0, pagination: {} },
                error: null
            };
        }

        const {
            page = 1,
            limit = 20,
            sortBy = 'relevance',
            isPublic = true
        } = options;

        const params = {
            q: searchTerm.trim(),
            page,
            limit,
            sortBy,
            isPublic
        };

        const cacheKey = `search_playlists_${JSON.stringify(params)}`;
        const cached = MemoryCache.get(cacheKey);
        if (cached) {
            return { data: cached, error: null };
        }

        const { data, error } = await ApiHelpers.get('/playlists/search', { params });

        // Cache pour 1 minute
        if (data && !error) {
            MemoryCache.set(cacheKey, data, 60000);
        }

        return { data, error };
    }

    // Méthodes privées

    /**
     * Ajouter à une playlist par défaut (favoris, à regarder plus tard)
     */
    async _addToDefaultPlaylist(playlistType, videoId) {
        return await ApiHelpers.post(`/users/playlists/${playlistType}`, { videoId });
    }

    /**
     * Supprimer d'une playlist par défaut
     */
    async _removeFromDefaultPlaylist(playlistType, videoId) {
        return await ApiHelpers.delete(`/users/playlists/${playlistType}/${videoId}`);
    }

    /**
     * Valider les données de playlist
     */
    _validatePlaylistData(data) {
        const errors = [];
        const { title } = data;

        if (!title || title.trim().length < 3) {
            errors.push('Le titre doit faire au moins 3 caractères');
        }

        if (title && title.length > 100) {
            errors.push('Le titre ne peut pas dépasser 100 caractères');
        }

        return errors;
    }

    /**
     * Nettoyer le cache d'une playlist spécifique
     */
    _clearPlaylistCache(playlistId) {
        const keys = Array.from(MemoryCache.cache.keys());
        keys.forEach(key => {
            if (key.startsWith(`playlist_${playlistId}`)) {
                MemoryCache.delete(key);
            }
        });
    }

    /**
     * Nettoyer le cache des listes de playlists
     */
    _clearPlaylistListCache() {
        const keys = Array.from(MemoryCache.cache.keys());
        keys.forEach(key => {
            if (key.startsWith('playlists_') ||
                key.startsWith('user_playlists_') ||
                key.startsWith('search_playlists_')) {
                MemoryCache.delete(key);
            }
        });
    }

    /**
     * Nettoyer le cache de l'historique
     */
    _clearHistoryCache() {
        const keys = Array.from(MemoryCache.cache.keys());
        keys.forEach(key => {
            if (key.startsWith('watch_history_')) {
                MemoryCache.delete(key);
            }
        });
    }

    /**
     * Mettre à jour une playlist dans le cache
     */
    _updatePlaylistInCache(playlistId, updates) {
        const keys = Array.from(MemoryCache.cache.keys());
        keys.forEach(key => {
            if (key.startsWith(`playlist_${playlistId}`)) {
                const cached = MemoryCache.get(key);
                if (cached && cached.playlist) {
                    const updatedData = {
                        ...cached,
                        playlist: { ...cached.playlist, ...updates }
                    };
                    MemoryCache.set(key, updatedData);
                }
            }
        });
    }
}

// Instance singleton du service playlist
const playlistService = new PlaylistService();

export default playlistService;

// Export des constantes utiles
export const DEFAULT_PLAYLISTS = {
    FAVORITES: 'favorites',
    WATCH_LATER: 'watch_later',
    HISTORY: 'history'
};

export const PLAYLIST_PRIVACY = {
    PUBLIC: true,
    PRIVATE: false
};

export const PLAYLIST_SORT_OPTIONS = {
    UPDATED_AT: 'updated_at',
    CREATED_AT: 'created_at',
    TITLE: 'title',
    VIDEO_COUNT: 'video_count',
    RELEVANCE: 'relevance'
};

export const DRAG_TYPES = {
    VIDEO_IN_PLAYLIST: 'video-in-playlist',
    VIDEO_TO_PLAYLIST: 'video-to-playlist'
};

// Helper pour créer des données de drag & drop
export const createDragData = (type, data) => ({
    type,
    data,
    timestamp: Date.now()
});

// Helper pour valider les données de drag & drop
export const validateDragData = (dragData, expectedType) => {
    return dragData &&
        dragData.type === expectedType &&
        dragData.data &&
        dragData.timestamp;
};