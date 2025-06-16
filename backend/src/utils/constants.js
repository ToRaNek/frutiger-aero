// backend/src/utils/constants.js

// Rôles utilisateur
const USER_ROLES = {
    USER: 'user',
    ADMIN: 'admin',
    MODERATOR: 'moderator'
};

// Statuts utilisateur
const USER_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    BANNED: 'banned',
    PENDING: 'pending'
};

// Statuts vidéo
const VIDEO_STATUS = {
    PROCESSING: 'processing',
    READY: 'ready',
    FAILED: 'failed',
    DELETED: 'deleted'
};

// Qualités vidéo disponibles
const VIDEO_QUALITIES = {
    '360p': { width: 640, height: 360, bitrate: '800k' },
    '480p': { width: 854, height: 480, bitrate: '1200k' },
    '720p': { width: 1280, height: 720, bitrate: '2500k' },
    '1080p': { width: 1920, height: 1080, bitrate: '5000k' },
    '1440p': { width: 2560, height: 1440, bitrate: '7500k' },
    '2160p': { width: 3840, height: 2160, bitrate: '15000k' }
};

// Visibilités playlist/vidéo
const VISIBILITY = {
    PUBLIC: 'public',
    PRIVATE: 'private',
    UNLISTED: 'unlisted'
};

// Types de réaction
const REACTION_TYPES = {
    LIKE: 'like',
    DISLIKE: 'dislike'
};

// Types de notification
const NOTIFICATION_TYPES = {
    VIDEO_PROCESSED: 'video_processed',
    VIDEO_LIKED: 'video_liked',
    VIDEO_COMMENTED: 'video_commented',
    NEW_FOLLOWER: 'new_follower',
    PLAYLIST_SHARED: 'playlist_shared',
    SYSTEM_ANNOUNCEMENT: 'system_announcement',
    PROCESSING_ERROR: 'processing_error'
};

// Types d'événements analytics
const ANALYTICS_EVENTS = {
    USER_REGISTERED: 'user_registered',
    USER_LOGIN: 'user_login',
    USER_LOGOUT: 'user_logout',
    VIDEO_UPLOADED: 'video_uploaded',
    VIDEO_VIEWED: 'video_viewed',
    VIDEO_LIKED: 'video_liked',
    VIDEO_SHARED: 'video_shared',
    PLAYLIST_CREATED: 'playlist_created',
    SEARCH_PERFORMED: 'search_performed',
    USER_FOLLOWED: 'user_followed'
};

// Formats de fichier autorisés
const ALLOWED_FORMATS = {
    VIDEO: ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.m4v'],
    IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
    AUDIO: ['.mp3', '.wav', '.aac', '.ogg', '.flac']
};

// Types MIME autorisés
const ALLOWED_MIME_TYPES = {
    VIDEO: [
        'video/mp4',
        'video/avi',
        'video/quicktime',
        'video/x-matroska',
        'video/webm',
        'video/x-flv',
        'video/x-ms-wmv'
    ],
    IMAGE: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp'
    ]
};

// Tailles maximales de fichier
const MAX_FILE_SIZES = {
    VIDEO: 500 * 1024 * 1024, // 500MB
    IMAGE: 10 * 1024 * 1024,  // 10MB
    AVATAR: 5 * 1024 * 1024,  // 5MB
    THUMBNAIL: 2 * 1024 * 1024 // 2MB
};

// Configuration HLS
const HLS_CONFIG = {
    SEGMENT_DURATION: 10, // secondes
    PLAYLIST_SIZE: 6, // nombre de segments
    FORMATS: ['360p', '480p', '720p', '1080p']
};

// Limites de rate limiting
const RATE_LIMITS = {
    AUTH: {
        WINDOW_MS: 15 * 60 * 1000, // 15 minutes
        MAX_REQUESTS: 5
    },
    UPLOAD: {
        WINDOW_MS: 60 * 60 * 1000, // 1 heure
        MAX_REQUESTS: 10
    },
    API: {
        WINDOW_MS: 15 * 60 * 1000, // 15 minutes
        MAX_REQUESTS: 100
    },
    SEARCH: {
        WINDOW_MS: 60 * 1000, // 1 minute
        MAX_REQUESTS: 30
    }
};

// Configuration JWT
const JWT_CONFIG = {
    ACCESS_TOKEN_EXPIRY: '1h',
    REFRESH_TOKEN_EXPIRY: '7d',
    ALGORITHM: 'HS256',
    ISSUER: 'frutiger-streaming',
    AUDIENCE: 'frutiger-streaming-users'
};

// Messages d'erreur standardisés
const ERROR_MESSAGES = {
    // Authentification
    INVALID_CREDENTIALS: 'Identifiants invalides',
    TOKEN_EXPIRED: 'Token expiré',
    TOKEN_INVALID: 'Token invalide',
    ACCESS_DENIED: 'Accès non autorisé',
    ACCOUNT_LOCKED: 'Compte temporairement verrouillé',
    EMAIL_NOT_VERIFIED: 'Email non vérifié',

    // Utilisateurs
    USER_NOT_FOUND: 'Utilisateur non trouvé',
    USER_ALREADY_EXISTS: 'Utilisateur déjà existant',
    CANNOT_FOLLOW_SELF: 'Impossible de se suivre soi-même',

    // Vidéos
    VIDEO_NOT_FOUND: 'Vidéo non trouvée',
    VIDEO_PROCESSING: 'Vidéo en cours de traitement',
    VIDEO_NOT_READY: 'Vidéo pas encore prête',
    FILE_NOT_FOUND: 'Fichier non trouvé',
    INVALID_VIDEO_FORMAT: 'Format vidéo invalide',

    // Playlists
    PLAYLIST_NOT_FOUND: 'Playlist non trouvée',
    VIDEO_ALREADY_IN_PLAYLIST: 'Vidéo déjà dans la playlist',
    VIDEO_NOT_IN_PLAYLIST: 'Vidéo non trouvée dans la playlist',

    // Upload
    FILE_TOO_LARGE: 'Fichier trop volumineux',
    INVALID_FILE_TYPE: 'Type de fichier invalide',
    UPLOAD_FAILED: 'Échec de l\'upload',

    // Général
    VALIDATION_ERROR: 'Erreur de validation',
    INTERNAL_ERROR: 'Erreur interne du serveur',
    ROUTE_NOT_FOUND: 'Route non trouvée',
    RATE_LIMIT_EXCEEDED: 'Limite de taux dépassée'
};

// Codes de statut HTTP
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500
};

// Configuration de cache
const CACHE_CONFIG = {
    DEFAULT_TTL: 300, // 5 minutes
    LONG_TTL: 3600, // 1 heure
    SHORT_TTL: 60, // 1 minute
    KEYS: {
        USER_PROFILE: 'user:profile:',
        VIDEO_METADATA: 'video:metadata:',
        PLAYLIST_DATA: 'playlist:data:',
        SEARCH_RESULTS: 'search:results:',
        TRENDING_VIDEOS: 'trending:videos',
        POPULAR_CATEGORIES: 'popular:categories'
    }
};

// Configuration de pagination
const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    MIN_LIMIT: 1
};

// Durées en millisecondes
const DURATIONS = {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
    MONTH: 30 * 24 * 60 * 60 * 1000,
    YEAR: 365 * 24 * 60 * 60 * 1000
};

// Configuration des logs
const LOG_LEVELS = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    HTTP: 'http',
    DEBUG: 'debug'
};

// Expressions régulières utiles
const REGEX_PATTERNS = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]$/,
    USERNAME: /^[a-zA-Z0-9_]{3,30}$/,
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    SLUG: /^[a-z0-9-]+$/,
    HEX_COLOR: /^#[0-9A-Fa-f]{6}$/,
    URL: /^https?:\/\/.+/
};

// Configuration des couleurs Frutiger Aero
const FRUTIGER_COLORS = {
    DEEP_BLUE: '#003c78',
    ROYAL_BLUE: '#0050a0',
    BRIGHT_BLUE: '#0064b4',
    SKY_BLUE: '#0078c8',
    CYAN: '#64c8dc',
    MINT: '#b1ffd8',
    GLASS: 'rgba(255, 255, 255, 0.2)',
    GRADIENT_BLUE: 'linear-gradient(45deg, #32a6ff 0%, #3f6fff 49%, #8d54ff 82%)',
    AURORA_GREEN: '#06FFA5',
    AURORA_YELLOW: '#FFD23F',
    AURORA_PINK: '#FF6B9D'
};

// Configuration des catégories par défaut
const DEFAULT_CATEGORIES = [
    { name: 'Action', slug: 'action', color: '#FF6B35', icon: 'flash' },
    { name: 'Comédie', slug: 'comedie', color: '#FFD23F', icon: 'happy' },
    { name: 'Documentaire', slug: 'documentaire', color: '#06FFA5', icon: 'book' },
    { name: 'Gaming', slug: 'gaming', color: '#4ECDC4', icon: 'game-controller' },
    { name: 'Musique', slug: 'musique', color: '#FF6B9D', icon: 'musical-note' },
    { name: 'Science', slug: 'science', color: '#45B7D1', icon: 'flask' },
    { name: 'Sport', slug: 'sport', color: '#96CEB4', icon: 'football' },
    { name: 'Voyage', slug: 'voyage', color: '#FECA57', icon: 'airplane' },
    { name: 'Cuisine', slug: 'cuisine', color: '#FF9FF3', icon: 'restaurant' },
    { name: 'Éducation', slug: 'education', color: '#54A0FF', icon: 'school' }
];

// Configuration des webhooks
const WEBHOOK_EVENTS = {
    VIDEO_UPLOADED: 'video.uploaded',
    VIDEO_PROCESSED: 'video.processed',
    VIDEO_FAILED: 'video.failed',
    USER_REGISTERED: 'user.registered',
    PLAYLIST_CREATED: 'playlist.created'
};

// Configuration des réseaux sociaux
const SOCIAL_PLATFORMS = {
    YOUTUBE: 'youtube',
    VIMEO: 'vimeo',
    DAILYMOTION: 'dailymotion',
    TWITCH: 'twitch'
};

// Environnements
const ENVIRONMENTS = {
    DEVELOPMENT: 'development',
    TEST: 'test',
    STAGING: 'staging',
    PRODUCTION: 'production'
};

module.exports = {
    USER_ROLES,
    USER_STATUS,
    VIDEO_STATUS,
    VIDEO_QUALITIES,
    VISIBILITY,
    REACTION_TYPES,
    NOTIFICATION_TYPES,
    ANALYTICS_EVENTS,
    ALLOWED_FORMATS,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZES,
    HLS_CONFIG,
    RATE_LIMITS,
    JWT_CONFIG,
    ERROR_MESSAGES,
    HTTP_STATUS,
    CACHE_CONFIG,
    PAGINATION,
    DURATIONS,
    LOG_LEVELS,
    REGEX_PATTERNS,
    FRUTIGER_COLORS,
    DEFAULT_CATEGORIES,
    WEBHOOK_EVENTS,
    SOCIAL_PLATFORMS,
    ENVIRONMENTS
};