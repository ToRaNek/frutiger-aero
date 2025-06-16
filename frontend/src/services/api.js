// frontend/src/services/api.js
import axios from 'axios';

// Configuration de base de l'API
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// Instance Axios principale avec configuration
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 secondes pour les uploads vidéo
    headers: {
        'Content-Type': 'application/json',
    },
});

// Instance séparée pour les uploads de fichiers
const apiUpload = axios.create({
    baseURL: API_BASE_URL,
    timeout: 300000, // 5 minutes pour les gros uploads
    headers: {
        'Content-Type': 'multipart/form-data',
    },
});

// Storage des tokens sécurisé
const TokenStorage = {
    getAccessToken: () => localStorage.getItem('accessToken'),
    getRefreshToken: () => localStorage.getItem('refreshToken'),
    setTokens: (accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken);
        if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken);
        }
    },
    clearTokens: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    },
};

// Intercepteur de requête pour ajouter le token d'authentification
const addAuthInterceptor = (instance) => {
    instance.interceptors.request.use(
        (config) => {
            const token = TokenStorage.getAccessToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );
};

// Intercepteur de réponse pour gérer le refresh automatique des tokens
const addRefreshInterceptor = (instance) => {
    instance.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;

            // Si le token a expiré (401) et qu'on n'a pas déjà tenté de refresh
            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;

                try {
                    const refreshToken = TokenStorage.getRefreshToken();
                    if (!refreshToken) {
                        throw new Error('No refresh token available');
                    }

                    // Appel au endpoint de refresh
                    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        refreshToken,
                    });

                    const { accessToken, refreshToken: newRefreshToken } = response.data;

                    // Sauvegarder les nouveaux tokens
                    TokenStorage.setTokens(accessToken, newRefreshToken);

                    // Réessayer la requête originale avec le nouveau token
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return instance(originalRequest);
                } catch (refreshError) {
                    // Échec du refresh : déconnecter l'utilisateur
                    TokenStorage.clearTokens();
                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                }
            }

            return Promise.reject(error);
        }
    );
};

// Appliquer les intercepteurs
addAuthInterceptor(api);
addAuthInterceptor(apiUpload);
addRefreshInterceptor(api);
addRefreshInterceptor(apiUpload);

// Gestionnaire d'erreurs global
const handleApiError = (error) => {
    if (error.response) {
        // Erreur de réponse du serveur
        const { status, data } = error.response;

        switch (status) {
            case 400:
                return {
                    message: data.message || 'Données invalides',
                    errors: data.errors || null,
                    type: 'VALIDATION_ERROR'
                };
            case 401:
                return {
                    message: 'Session expirée, veuillez vous reconnecter',
                    type: 'AUTH_ERROR'
                };
            case 403:
                return {
                    message: 'Accès refusé',
                    type: 'PERMISSION_ERROR'
                };
            case 404:
                return {
                    message: 'Ressource non trouvée',
                    type: 'NOT_FOUND_ERROR'
                };
            case 409:
                return {
                    message: data.message || 'Conflit de données',
                    type: 'CONFLICT_ERROR'
                };
            case 413:
                return {
                    message: 'Fichier trop volumineux',
                    type: 'FILE_SIZE_ERROR'
                };
            case 422:
                return {
                    message: 'Données non traitables',
                    errors: data.errors || null,
                    type: 'UNPROCESSABLE_ERROR'
                };
            case 429:
                return {
                    message: 'Trop de requêtes, veuillez patienter',
                    type: 'RATE_LIMIT_ERROR'
                };
            case 500:
                return {
                    message: 'Erreur serveur, veuillez réessayer',
                    type: 'SERVER_ERROR'
                };
            default:
                return {
                    message: data.message || 'Une erreur inattendue s\'est produite',
                    type: 'UNKNOWN_ERROR'
                };
        }
    } else if (error.request) {
        // Erreur de réseau
        return {
            message: 'Connexion impossible, vérifiez votre connexion internet',
            type: 'NETWORK_ERROR'
        };
    } else {
        // Erreur de configuration
        return {
            message: 'Erreur de configuration de la requête',
            type: 'CONFIG_ERROR'
        };
    }
};

// Helpers pour les requêtes communes
const ApiHelpers = {
    // GET avec gestion d'erreur
    async get(url, config = {}) {
        try {
            const response = await api.get(url, config);
            return { data: response.data, error: null };
        } catch (error) {
            return { data: null, error: handleApiError(error) };
        }
    },

    // POST avec gestion d'erreur
    async post(url, data = {}, config = {}) {
        try {
            const response = await api.post(url, data, config);
            return { data: response.data, error: null };
        } catch (error) {
            return { data: null, error: handleApiError(error) };
        }
    },

    // PUT avec gestion d'erreur
    async put(url, data = {}, config = {}) {
        try {
            const response = await api.put(url, data, config);
            return { data: response.data, error: null };
        } catch (error) {
            return { data: null, error: handleApiError(error) };
        }
    },

    // DELETE avec gestion d'erreur
    async delete(url, config = {}) {
        try {
            const response = await api.delete(url, config);
            return { data: response.data, error: null };
        } catch (error) {
            return { data: null, error: handleApiError(error) };
        }
    },

    // Upload de fichier avec progression
    async upload(url, formData, onProgress = null) {
        try {
            const response = await apiUpload.post(url, formData, {
                onUploadProgress: (progressEvent) => {
                    if (onProgress) {
                        const percentCompleted = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total
                        );
                        onProgress(percentCompleted);
                    }
                },
            });
            return { data: response.data, error: null };
        } catch (error) {
            return { data: null, error: handleApiError(error) };
        }
    },

    // Streaming de vidéo (avec support des Range requests)
    getStreamUrl(videoId, quality = 'auto') {
        const token = TokenStorage.getAccessToken();
        const params = new URLSearchParams({
            quality,
            ...(token && { token }),
        });
        return `${API_BASE_URL}/videos/${videoId}/stream?${params}`;
    },

    // URL de miniature
    getThumbnailUrl(videoId, size = 'medium') {
        return `${API_BASE_URL}/videos/${videoId}/thumbnail?size=${size}`;
    },

    // Pagination helper
    buildPaginationParams(page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc') {
        return {
            page: Math.max(1, page),
            limit: Math.min(100, Math.max(1, limit)),
            sortBy,
            sortOrder: ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc',
        };
    },

    // Construction d'URL avec query parameters
    buildUrl(endpoint, params = {}) {
        const url = new URL(endpoint, API_BASE_URL);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                url.searchParams.append(key, value);
            }
        });
        return url.toString();
    },
};

// Middleware pour les requêtes avec retry automatique
const withRetry = (fn, maxRetries = 3, delay = 1000) => {
    return async (...args) => {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await fn(...args);
            } catch (error) {
                lastError = error;

                // Ne pas retry sur certaines erreurs
                if (error.response?.status && [400, 401, 403, 404, 422].includes(error.response.status)) {
                    throw error;
                }

                // Attendre avant le prochain essai
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delay * attempt));
                }
            }
        }

        throw lastError;
    };
};

// Configuration des timeouts par type de requête
const TimeoutConfig = {
    SHORT: 5000,    // Authentification, profils
    MEDIUM: 15000,  // Listes, recherches
    LONG: 30000,    // Métadonnées vidéo
    UPLOAD: 300000, // Uploads de fichiers
};

// Cache simple en mémoire pour certaines requêtes
const MemoryCache = {
    cache: new Map(),

    set(key, data, ttl = 300000) { // 5 minutes par défaut
        const expiry = Date.now() + ttl;
        this.cache.set(key, { data, expiry });
    },

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    },

    clear() {
        this.cache.clear();
    },

    delete(key) {
        this.cache.delete(key);
    }
};

// Export des instances et helpers
export default api;
export {
    apiUpload,
    TokenStorage,
    ApiHelpers,
    handleApiError,
    withRetry,
    TimeoutConfig,
    MemoryCache
};

// Export des endpoints principaux pour référence
export const ENDPOINTS = {
    // Authentification
    AUTH: {
        REGISTER: '/auth/register',
        LOGIN: '/auth/login',
        REFRESH: '/auth/refresh',
        LOGOUT: '/auth/logout',
        VERIFY_EMAIL: '/auth/verify-email',
        RESEND_VERIFICATION: '/auth/resend-verification',
        ME: '/auth/me',
        FORGOT_PASSWORD: '/auth/forgot-password',
        RESET_PASSWORD: '/auth/reset-password',
    },

    // Utilisateurs
    USERS: {
        PROFILE: (userId) => `/users/${userId}`,
        UPDATE_PROFILE: '/users/profile',
        CHANGE_PASSWORD: '/users/change-password',
        FOLLOW: (userId) => `/users/${userId}/follow`,
        FOLLOWING: (userId) => `/users/${userId}/following`,
        FOLLOWERS: (userId) => `/users/${userId}/followers`,
        NOTIFICATIONS: '/users/notifications',
        MARK_NOTIFICATIONS_READ: '/users/notifications/mark-read',
        DELETE_ACCOUNT: '/users/delete-account',
    },

    // Vidéos
    VIDEOS: {
        LIST: '/videos',
        DETAIL: (videoId) => `/videos/${videoId}`,
        UPLOAD: '/videos/upload',
        UPDATE: (videoId) => `/videos/${videoId}`,
        DELETE: (videoId) => `/videos/${videoId}`,
        STREAM: (videoId) => `/videos/${videoId}/stream`,
        THUMBNAIL: (videoId) => `/videos/${videoId}/thumbnail`,
        LIKE: (videoId) => `/videos/${videoId}/like`,
        DISLIKE: (videoId) => `/videos/${videoId}/dislike`,
        VIEW: (videoId) => `/videos/${videoId}/view`,
        TRENDING: '/videos/trending',
        SEARCH: '/videos/search',
    },

    // Playlists
    PLAYLISTS: {
        LIST: '/playlists',
        DETAIL: (playlistId) => `/playlists/${playlistId}`,
        CREATE: '/playlists',
        UPDATE: (playlistId) => `/playlists/${playlistId}`,
        DELETE: (playlistId) => `/playlists/${playlistId}`,
        ADD_VIDEO: (playlistId) => `/playlists/${playlistId}/videos`,
        REMOVE_VIDEO: (playlistId, videoId) => `/playlists/${playlistId}/videos/${videoId}`,
        REORDER: (playlistId) => `/playlists/${playlistId}/reorder`,
        USER_PLAYLISTS: (userId) => `/users/${userId}/playlists`,
    },

    // Commentaires
    COMMENTS: {
        LIST: (videoId) => `/videos/${videoId}/comments`,
        CREATE: (videoId) => `/videos/${videoId}/comments`,
        UPDATE: (commentId) => `/comments/${commentId}`,
        DELETE: (commentId) => `/comments/${commentId}`,
        LIKE: (commentId) => `/comments/${commentId}/like`,
    },
};