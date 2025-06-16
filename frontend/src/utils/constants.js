// frontend/src/utils/constants.js

// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
export const API_ENDPOINTS = {
    // Auth endpoints
    AUTH: {
        REGISTER: '/auth/register',
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        REFRESH: '/auth/refresh-token',
        ME: '/auth/me',
        VERIFY_EMAIL: '/auth/verify-email',
        RESEND_VERIFICATION: '/auth/resend-verification',
        FORGOT_PASSWORD: '/auth/forgot-password',
        RESET_PASSWORD: '/auth/reset-password'
    },

    // User endpoints
    USERS: {
        PROFILE: '/users/profile',
        UPDATE_PROFILE: '/users/profile',
        CHANGE_PASSWORD: '/users/change-password',
        FOLLOW: '/users/follow',
        FOLLOWING: '/users/following',
        FOLLOWERS: '/users/followers',
        NOTIFICATIONS: '/users/notifications',
        MARK_NOTIFICATIONS_READ: '/users/notifications/read',
        DELETE_ACCOUNT: '/users/delete'
    },

    // Video endpoints
    VIDEOS: {
        LIST: '/videos',
        BY_ID: '/videos',
        UPLOAD: '/videos/upload',
        UPDATE: '/videos',
        DELETE: '/videos',
        STREAM: '/videos/stream',
        SEARCH: '/videos/search',
        TRENDING: '/videos/trending',
        CATEGORIES: '/videos/categories',
        LIKE: '/videos/like',
        DISLIKE: '/videos/dislike',
        VIEW: '/videos/view'
    },

    // Playlist endpoints
    PLAYLISTS: {
        LIST: '/playlists',
        BY_ID: '/playlists',
        CREATE: '/playlists',
        UPDATE: '/playlists',
        DELETE: '/playlists',
        ADD_VIDEO: '/playlists/videos',
        REMOVE_VIDEO: '/playlists/videos',
        REORDER: '/playlists/reorder',
        FAVORITES: '/playlists/favorites',
        WATCH_LATER: '/playlists/watch-later',
        HISTORY: '/playlists/history'
    }
};

// Video Configuration
export const VIDEO_CONFIG = {
    MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
    ALLOWED_FORMATS: ['mp4', 'avi', 'mov', 'webm', 'mkv'],
    ALLOWED_MIME_TYPES: [
        'video/mp4',
        'video/avi',
        'video/quicktime',
        'video/webm',
        'video/x-matroska'
    ],
    THUMBNAIL_SIZES: {
        SMALL: '160x90',
        MEDIUM: '320x180',
        LARGE: '640x360',
        HD: '1280x720'
    },
    QUALITIES: [
        { label: 'Auto', value: 'auto' },
        { label: '1080p', value: '1080p' },
        { label: '720p', value: '720p' },
        { label: '480p', value: '480p' },
        { label: '360p', value: '360p' },
        { label: '240p', value: '240p' }
    ],
    PLAYBACK_RATES: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
};

// Image Configuration
export const IMAGE_CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
    ALLOWED_MIME_TYPES: [
        'image/jpeg',
        'image/png',
        'image/webp'
    ],
    AVATAR_SIZES: {
        SMALL: '32x32',
        MEDIUM: '64x64',
        LARGE: '128x128'
    }
};

// Pagination
export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    VIDEO_GRID_LIMIT: 12,
    PLAYLIST_GRID_LIMIT: 8,
    SEARCH_RESULTS_LIMIT: 24,
    COMMENTS_LIMIT: 10,
    NOTIFICATIONS_LIMIT: 15
};

// Local Storage Keys
export const STORAGE_KEYS = {
    ACCESS_TOKEN: 'frutiger_access_token',
    REFRESH_TOKEN: 'frutiger_refresh_token',
    USER: 'frutiger_user',
    THEME: 'frutiger_theme',
    LANGUAGE: 'frutiger_language',
    PLAYER_SETTINGS: 'frutiger_player_settings',
    SEARCH_HISTORY: 'frutiger_search_history',
    RECENTLY_WATCHED: 'frutiger_recently_watched'
};

// Routes
export const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    REGISTER: '/register',
    PROFILE: '/profile',
    USER_PROFILE: '/user/:userId',
    VIDEO: '/video/:videoId',
    PLAYLIST: '/playlist/:playlistId',
    UPLOAD: '/upload',
    SEARCH: '/search',
    TRENDING: '/trending',
    FAVORITES: '/favorites',
    WATCH_LATER: '/watch-later',
    HISTORY: '/history',
    SETTINGS: '/settings'
};

// User Roles & Permissions
export const USER_ROLES = {
    ADMIN: 'admin',
    MODERATOR: 'moderator',
    USER: 'user'
};

export const PERMISSIONS = {
    UPLOAD_VIDEO: 'upload_video',
    CREATE_PLAYLIST: 'create_playlist',
    COMMENT: 'comment',
    MODERATE: 'moderate',
    ADMIN: 'admin'
};

// Video Categories
export const VIDEO_CATEGORIES = {
    MUSIC: 'music',
    GAMING: 'gaming',
    EDUCATION: 'education',
    ENTERTAINMENT: 'entertainment',
    NEWS: 'news',
    SPORTS: 'sports',
    TECHNOLOGY: 'technology',
    TRAVEL: 'travel',
    LIFESTYLE: 'lifestyle',
    COMEDY: 'comedy'
};

// Reaction Types
export const REACTION_TYPES = {
    LIKE: 'like',
    DISLIKE: 'dislike'
};

// Notification Types
export const NOTIFICATION_TYPES = {
    NEW_VIDEO: 'new_video',
    NEW_FOLLOWER: 'new_follower',
    VIDEO_LIKED: 'video_liked',
    VIDEO_COMMENTED: 'video_commented',
    PLAYLIST_SHARED: 'playlist_shared',
    SYSTEM: 'system'
};

// Toast Types
export const TOAST_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

// Modal Types
export const MODAL_TYPES = {
    CONFIRM: 'confirm',
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CUSTOM: 'custom'
};

// Search Types
export const SEARCH_TYPES = {
    ALL: 'all',
    VIDEOS: 'videos',
    PLAYLISTS: 'playlists',
    USERS: 'users'
};

// Sort Options
export const SORT_OPTIONS = {
    NEWEST: 'newest',
    OLDEST: 'oldest',
    MOST_VIEWED: 'most_viewed',
    MOST_LIKED: 'most_liked',
    ALPHABETICAL: 'alphabetical',
    DURATION_SHORT: 'duration_short',
    DURATION_LONG: 'duration_long'
};

// Date Ranges
export const DATE_RANGES = {
    ALL: 'all',
    TODAY: 'today',
    THIS_WEEK: 'this_week',
    THIS_MONTH: 'this_month',
    THIS_YEAR: 'this_year'
};

// Duration Filters
export const DURATION_FILTERS = {
    ALL: 'all',
    SHORT: 'short', // < 4 minutes
    MEDIUM: 'medium', // 4-20 minutes
    LONG: 'long' // > 20 minutes
};

// Player States
export const PLAYER_STATES = {
    IDLE: 'idle',
    LOADING: 'loading',
    PLAYING: 'playing',
    PAUSED: 'paused',
    BUFFERING: 'buffering',
    ERROR: 'error',
    ENDED: 'ended'
};

// Upload States
export const UPLOAD_STATES = {
    IDLE: 'idle',
    UPLOADING: 'uploading',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};

// Breakpoints (correspond aux styles CSS)
export const BREAKPOINTS = {
    XS: 480,
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    XXL: 1536
};

// Animation Durations
export const ANIMATION_DURATION = {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500
};

// Debounce Delays
export const DEBOUNCE_DELAYS = {
    SEARCH: 300,
    RESIZE: 150,
    SCROLL: 100,
    INPUT: 500
};

// Error Messages
export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Erreur de connexion. Veuillez vérifier votre connexion internet.',
    SERVER_ERROR: 'Erreur serveur. Veuillez réessayer plus tard.',
    VALIDATION_ERROR: 'Données invalides. Veuillez vérifier vos informations.',
    AUTH_ERROR: 'Erreur d\'authentification. Veuillez vous reconnecter.',
    PERMISSION_ERROR: 'Vous n\'avez pas les permissions nécessaires.',
    NOT_FOUND: 'Ressource non trouvée.',
    FILE_TOO_LARGE: 'Le fichier est trop volumineux.',
    INVALID_FILE_TYPE: 'Type de fichier non supporté.',
    UPLOAD_FAILED: 'Échec de l\'upload. Veuillez réessayer.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
    LOGIN_SUCCESS: 'Connexion réussie !',
    REGISTER_SUCCESS: 'Inscription réussie ! Vérifiez votre email.',
    UPLOAD_SUCCESS: 'Vidéo uploadée avec succès !',
    UPDATE_SUCCESS: 'Mise à jour réussie !',
    DELETE_SUCCESS: 'Suppression réussie !',
    SAVE_SUCCESS: 'Sauvegarde réussie !',
    EMAIL_VERIFIED: 'Email vérifié avec succès !',
    PASSWORD_RESET: 'Mot de passe réinitialisé avec succès !'
};

// Default Values
export const DEFAULTS = {
    AVATAR: '/assets/default-avatar.png',
    THUMBNAIL: '/assets/default-thumbnail.png',
    PAGE_TITLE: 'Frutiger Streaming Platform',
    META_DESCRIPTION: 'Plateforme de streaming vidéo moderne avec design Frutiger Aero',
    LANGUAGE: 'fr',
    VOLUME: 0.8,
    PLAYBACK_RATE: 1
};

// Feature Flags
export const FEATURES = {
    LIVE_STREAMING: false,
    COMMENTS: true,
    RATINGS: true,
    PLAYLISTS: true,
    NOTIFICATIONS: true,
    DARK_MODE: true,
    ANALYTICS: true,
    SOCIAL_SHARE: true
};

// External Links
export const EXTERNAL_LINKS = {
    SUPPORT: 'https://support.frutiger-streaming.com',
    DOCUMENTATION: 'https://docs.frutiger-streaming.com',
    PRIVACY: 'https://frutiger-streaming.com/privacy',
    TERMS: 'https://frutiger-streaming.com/terms',
    GITHUB: 'https://github.com/frutiger-streaming'
};

// Social Media
export const SOCIAL_MEDIA = {
    TWITTER: 'https://twitter.com/frutigerstreaming',
    FACEBOOK: 'https://facebook.com/frutigerstreaming',
    INSTAGRAM: 'https://instagram.com/frutigerstreaming',
    YOUTUBE: 'https://youtube.com/frutigerstreaming'
};

export default {
    API_BASE_URL,
    API_ENDPOINTS,
    VIDEO_CONFIG,
    IMAGE_CONFIG,
    PAGINATION,
    STORAGE_KEYS,
    ROUTES,
    USER_ROLES,
    PERMISSIONS,
    VIDEO_CATEGORIES,
    REACTION_TYPES,
    NOTIFICATION_TYPES,
    TOAST_TYPES,
    MODAL_TYPES,
    SEARCH_TYPES,
    SORT_OPTIONS,
    DATE_RANGES,
    DURATION_FILTERS,
    PLAYER_STATES,
    UPLOAD_STATES,
    BREAKPOINTS,
    ANIMATION_DURATION,
    DEBOUNCE_DELAYS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    DEFAULTS,
    FEATURES,
    EXTERNAL_LINKS,
    SOCIAL_MEDIA
};