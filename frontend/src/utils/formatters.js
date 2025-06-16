// frontend/src/utils/formatters.js

/**
 * Formatage des dates et du temps
 */

// Formate une date en format relatif (il y a X minutes/heures/jours)
export const formatRelativeTime = (date) => {
    if (!date) return '';

    const now = new Date();
    const targetDate = new Date(date);
    const diffInMs = now.getTime() - targetDate.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);

    if (diffInSeconds < 60) {
        return 'À l\'instant';
    } else if (diffInMinutes < 60) {
        return `Il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
    } else if (diffInHours < 24) {
        return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
    } else if (diffInDays < 30) {
        return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
    } else if (diffInMonths < 12) {
        return `Il y a ${diffInMonths} mois`;
    } else {
        return `Il y a ${diffInYears} an${diffInYears > 1 ? 's' : ''}`;
    }
};

// Formate une date en format court (15 Jan 2025)
export const formatDateShort = (date) => {
    if (!date) return '';

    const targetDate = new Date(date);
    const months = [
        'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
        'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
    ];

    return `${targetDate.getDate()} ${months[targetDate.getMonth()]} ${targetDate.getFullYear()}`;
};

// Formate une date en format long (15 janvier 2025)
export const formatDateLong = (date) => {
    if (!date) return '';

    const targetDate = new Date(date);
    const months = [
        'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];

    return `${targetDate.getDate()} ${months[targetDate.getMonth()]} ${targetDate.getFullYear()}`;
};

// Formate une durée en secondes vers MM:SS ou HH:MM:SS
export const formatDuration = (seconds) => {
    if (!seconds || seconds < 0) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
};

// Formate une durée en format lisible (1h 23m 45s)
export const formatDurationReadable = (seconds) => {
    if (!seconds || seconds < 0) return '0 seconde';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    let result = [];

    if (hours > 0) {
        result.push(`${hours}h`);
    }
    if (minutes > 0) {
        result.push(`${minutes}m`);
    }
    if (remainingSeconds > 0 || result.length === 0) {
        result.push(`${remainingSeconds}s`);
    }

    return result.join(' ');
};

/**
 * Formatage des nombres et tailles
 */

// Formate un nombre avec séparateurs de milliers
export const formatNumber = (num, locale = 'fr-FR') => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return new Intl.NumberFormat(locale).format(num);
};

// Formate un nombre en format compact (1K, 1M, 1B)
export const formatCompactNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0';

    const units = [
        { value: 1e9, symbol: 'G' },
        { value: 1e6, symbol: 'M' },
        { value: 1e3, symbol: 'K' }
    ];

    for (let unit of units) {
        if (Math.abs(num) >= unit.value) {
            const formatted = (num / unit.value).toFixed(1);
            return formatted.endsWith('.0')
                ? Math.floor(num / unit.value) + unit.symbol
                : formatted + unit.symbol;
        }
    }

    return num.toString();
};

// Formate une taille de fichier en bytes vers un format lisible
export const formatFileSize = (bytes) => {
    if (bytes === 0 || !bytes) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Formate un pourcentage
export const formatPercentage = (value, total, decimals = 1) => {
    if (!total || total === 0) return '0%';
    const percentage = (value / total) * 100;
    return `${percentage.toFixed(decimals)}%`;
};

/**
 * Formatage du texte
 */

// Tronque un texte à une longueur donnée
export const truncateText = (text, maxLength, suffix = '...') => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - suffix.length) + suffix;
};

// Formate un nom d'utilisateur avec @ prefix
export const formatUsername = (username) => {
    if (!username) return '';
    return username.startsWith('@') ? username : `@${username}`;
};

// Génère les initiales d'un nom complet
export const generateInitials = (firstName, lastName) => {
    if (!firstName && !lastName) return 'U';

    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : '';
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';

    return (firstInitial + lastInitial) || 'U';
};

// Formate un nom complet
export const formatFullName = (firstName, lastName) => {
    const parts = [firstName, lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Utilisateur';
};

// Capitalize première lettre
export const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Formate un titre (chaque mot capitalisé)
export const formatTitle = (str) => {
    if (!str) return '';
    return str.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

/**
 * Formatage des URLs et liens
 */

// Génère un slug à partir d'un texte
export const generateSlug = (text) => {
    if (!text) return '';

    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Retire les accents
        .replace(/[^a-z0-9\s-]/g, '') // Garde seulement lettres, chiffres, espaces et tirets
        .trim()
        .replace(/\s+/g, '-') // Remplace espaces par tirets
        .replace(/-+/g, '-'); // Évite plusieurs tirets consécutifs
};

// Valide et formate une URL
export const formatUrl = (url) => {
    if (!url) return '';

    // Ajoute http:// si aucun protocole
    if (!/^https?:\/\//i.test(url)) {
        url = 'http://' + url;
    }

    try {
        return new URL(url).toString();
    } catch {
        return '';
    }
};

// Génère une URL de streaming
export const formatStreamUrl = (videoId, quality = 'auto') => {
    if (!videoId) return '';
    return `/api/videos/${videoId}/stream?quality=${quality}`;
};

// Génère une URL de miniature
export const formatThumbnailUrl = (videoId, size = 'medium') => {
    if (!videoId) return '/assets/default-thumbnail.png';
    return `/api/videos/${videoId}/thumbnail?size=${size}`;
};

// Génère une URL d'avatar
export const formatAvatarUrl = (userId, size = 'medium') => {
    if (!userId) return '/assets/default-avatar.png';
    return `/api/users/${userId}/avatar?size=${size}`;
};

/**
 * Formatage des tags et catégories
 */

// Normalise les tags (retire espaces, minuscules, etc.)
export const normalizeTags = (tags) => {
    if (!tags) return [];

    const tagArray = Array.isArray(tags) ? tags : tags.split(',');

    return tagArray
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0)
        .filter((tag, index, self) => self.indexOf(tag) === index); // Retire doublons
};

// Formate les tags pour affichage
export const formatTags = (tags) => {
    if (!tags || tags.length === 0) return '';

    const normalizedTags = normalizeTags(tags);
    return normalizedTags.map(tag => `#${tag}`).join(' ');
};

// Formate une catégorie
export const formatCategory = (category) => {
    if (!category) return '';
    return category.charAt(0).toUpperCase() + category.slice(1);
};

/**
 * Formatage pour les stats et métriques
 */

// Formate les vues d'une vidéo
export const formatViews = (views) => {
    if (!views || views === 0) return '0 vue';
    if (views === 1) return '1 vue';
    return `${formatCompactNumber(views)} vues`;
};

// Formate les likes
export const formatLikes = (likes) => {
    if (!likes || likes === 0) return '0';
    return formatCompactNumber(likes);
};

// Formate les abonnés
export const formatSubscribers = (count) => {
    if (!count || count === 0) return '0 abonné';
    if (count === 1) return '1 abonné';
    return `${formatCompactNumber(count)} abonnés`;
};

// Formate les vidéos dans une playlist
export const formatVideoCount = (count) => {
    if (!count || count === 0) return '0 vidéo';
    if (count === 1) return '1 vidéo';
    return `${count} vidéos`;
};

/**
 * Formatage pour la recherche et filtres
 */

// Formate les résultats de recherche
export const formatSearchResults = (count, query) => {
    if (!count || count === 0) {
        return `Aucun résultat pour "${query}"`;
    }

    const formattedCount = formatNumber(count);
    return `${formattedCount} résultat${count > 1 ? 's' : ''} pour "${query}"`;
};

// Formate les filtres actifs
export const formatActiveFilters = (filters) => {
    if (!filters || Object.keys(filters).length === 0) {
        return 'Aucun filtre';
    }

    const activeFilters = Object.entries(filters)
        .filter(([key, value]) => value && value !== 'all')
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');

    return activeFilters || 'Aucun filtre';
};

/**
 * Formatage pour les notifications
 */

// Formate le titre d'une notification
export const formatNotificationTitle = (type, data) => {
    switch (type) {
        case 'new_video':
            return `Nouvelle vidéo de ${data.username}`;
        case 'new_follower':
            return `${data.username} vous suit maintenant`;
        case 'video_liked':
            return `${data.username} a aimé votre vidéo`;
        case 'video_commented':
            return `${data.username} a commenté votre vidéo`;
        case 'playlist_shared':
            return `${data.username} a partagé une playlist`;
        default:
            return 'Nouvelle notification';
    }
};

/**
 * Formatage pour les erreurs
 */

// Formate un message d'erreur
export const formatErrorMessage = (error) => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.response?.data?.message) return error.response.data.message;
    return 'Une erreur est survenue';
};

// Formate les erreurs de validation
export const formatValidationErrors = (errors) => {
    if (!errors) return [];

    if (Array.isArray(errors)) {
        return errors.map(error => error.message || error);
    }

    if (typeof errors === 'object') {
        return Object.values(errors).flat();
    }

    return [errors.toString()];
};

/**
 * Formatage pour l'upload
 */

// Formate le progrès d'upload
export const formatUploadProgress = (loaded, total) => {
    if (!total || total === 0) return '0%';
    const percentage = Math.round((loaded / total) * 100);
    return `${percentage}%`;
};

// Formate la vitesse d'upload
export const formatUploadSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s';
    return `${formatFileSize(bytesPerSecond)}/s`;
};

// Formate le temps restant d'upload
export const formatUploadTimeRemaining = (bytesRemaining, bytesPerSecond) => {
    if (!bytesPerSecond || bytesPerSecond === 0) return 'Calcul...';

    const secondsRemaining = bytesRemaining / bytesPerSecond;

    if (secondsRemaining < 60) {
        return `${Math.round(secondsRemaining)}s restantes`;
    } else if (secondsRemaining < 3600) {
        const minutes = Math.round(secondsRemaining / 60);
        return `${minutes}m restantes`;
    } else {
        const hours = Math.round(secondsRemaining / 3600);
        return `${hours}h restantes`;
    }
};

/**
 * Export par défaut avec toutes les fonctions
 */
export default {
    // Date et temps
    formatRelativeTime,
    formatDateShort,
    formatDateLong,
    formatDuration,
    formatDurationReadable,

    // Nombres et tailles
    formatNumber,
    formatCompactNumber,
    formatFileSize,
    formatPercentage,

    // Texte
    truncateText,
    formatUsername,
    generateInitials,
    formatFullName,
    capitalize,
    formatTitle,

    // URLs et liens
    generateSlug,
    formatUrl,
    formatStreamUrl,
    formatThumbnailUrl,
    formatAvatarUrl,

    // Tags et catégories
    normalizeTags,
    formatTags,
    formatCategory,

    // Stats et métriques
    formatViews,
    formatLikes,
    formatSubscribers,
    formatVideoCount,

    // Recherche et filtres
    formatSearchResults,
    formatActiveFilters,

    // Notifications
    formatNotificationTitle,

    // Erreurs
    formatErrorMessage,
    formatValidationErrors,

    // Upload
    formatUploadProgress,
    formatUploadSpeed,
    formatUploadTimeRemaining
};