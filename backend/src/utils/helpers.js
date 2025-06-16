// backend/src/utils/helpers.js
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const { DURATIONS, FRUTIGER_COLORS } = require('./constants');

// Formatage des dates
const formatDate = (date, format = 'ISO') => {
    if (!date) return null;

    const d = new Date(date);

    switch (format) {
        case 'ISO':
            return d.toISOString();
        case 'FR':
            return d.toLocaleDateString('fr-FR');
        case 'EN':
            return d.toLocaleDateString('en-US');
        case 'RELATIVE':
            return getRelativeTime(d);
        case 'FULL':
            return d.toLocaleString('fr-FR');
        default:
            return d.toString();
    }
};

// Temps relatif (il y a X minutes/heures/jours)
const getRelativeTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);

    if (diff < DURATIONS.MINUTE) {
        return 'À l\'instant';
    } else if (diff < DURATIONS.HOUR) {
        const minutes = Math.floor(diff / DURATIONS.MINUTE);
        return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else if (diff < DURATIONS.DAY) {
        const hours = Math.floor(diff / DURATIONS.HOUR);
        return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    } else if (diff < DURATIONS.WEEK) {
        const days = Math.floor(diff / DURATIONS.DAY);
        return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    } else if (diff < DURATIONS.MONTH) {
        const weeks = Math.floor(diff / DURATIONS.WEEK);
        return `Il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;
    } else if (diff < DURATIONS.YEAR) {
        const months = Math.floor(diff / DURATIONS.MONTH);
        return `Il y a ${months} mois`;
    } else {
        const years = Math.floor(diff / DURATIONS.YEAR);
        return `Il y a ${years} an${years > 1 ? 's' : ''}`;
    }
};

// Formatage de la durée (en secondes vers format MM:SS ou HH:MM:SS)
const formatDuration = (seconds) => {
    if (!seconds || seconds < 0) return '00:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
};

// Formatage de la taille de fichier
const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Formatage des nombres (avec séparateurs de milliers)
const formatNumber = (num, locale = 'fr-FR') => {
    if (!num && num !== 0) return '0';
    return new Intl.NumberFormat(locale).format(num);
};

// Formatage compact des nombres (1K, 1M, 1B)
const formatCompactNumber = (num) => {
    if (!num && num !== 0) return '0';

    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1) + 'B';
    } else if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    } else {
        return num.toString();
    }
};

// Génération de slug à partir d'un titre
const generateSlug = (text) => {
    if (!text) return '';

    return text
        .toLowerCase()
        .normalize('NFD') // Décomposer les caractères accentués
        .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
        .replace(/[^a-z0-9\s-]/g, '') // Garder seulement lettres, chiffres, espaces et tirets
        .replace(/\s+/g, '-') // Remplacer espaces par des tirets
        .replace(/-+/g, '-') // Éviter les tirets multiples
        .replace(/^-|-$/g, ''); // Supprimer tirets en début/fin
};

// Génération d'ID unique court
const generateShortId = (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Génération de hash sécurisé
const generateHash = (data, algorithm = 'sha256') => {
    return crypto.createHash(algorithm).update(data).digest('hex');
};

// Génération de token sécurisé
const generateSecureToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

// Validation d'email
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validation d'URL
const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

// Nettoyage de texte (suppression HTML, trim)
const sanitizeText = (text, maxLength = null) => {
    if (!text) return '';

    let cleaned = text
        .replace(/<[^>]*>/g, '') // Supprimer balises HTML
        .replace(/&[^;]+;/g, '') // Supprimer entités HTML
        .trim();

    if (maxLength && cleaned.length > maxLength) {
        cleaned = cleaned.substring(0, maxLength).trim() + '...';
    }

    return cleaned;
};

// Extraction du domaine d'une URL
const extractDomain = (url) => {
    try {
        return new URL(url).hostname;
    } catch {
        return null;
    }
};

// Génération de couleur aléatoire Frutiger
const getRandomFrutigerColor = () => {
    const colors = Object.values(FRUTIGER_COLORS).filter(color => !color.includes('linear-gradient'));
    return colors[Math.floor(Math.random() * colors.length)];
};

// Mélange d'un tableau (Fisher-Yates)
const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

// Pagination helper
const getPaginationInfo = (page, limit, total) => {
    const totalPages = Math.ceil(total / limit);
    return {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        offset: (page - 1) * limit
    };
};

// Debounce function
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
};

// Throttle function
const throttle = (func, limit) => {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// Retry function avec backoff exponentiel
const retry = async (fn, maxRetries = 3, baseDelay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;

            const delay = baseDelay * Math.pow(2, i);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

// Deep clone d'un objet
const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
};

// Merge profond d'objets
const deepMerge = (target, source) => {
    const result = { ...target };

    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
    }

    return result;
};

// Validation de la force d'un mot de passe
const getPasswordStrength = (password) => {
    if (!password) return { score: 0, feedback: ['Mot de passe requis'] };

    let score = 0;
    const feedback = [];

    // Longueur
    if (password.length >= 8) score += 1;
    else feedback.push('Au moins 8 caractères');

    if (password.length >= 12) score += 1;

    // Complexité
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Au moins une minuscule');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Au moins une majuscule');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Au moins un chiffre');

    if (/[^a-zA-Z\d]/.test(password)) score += 1;
    else feedback.push('Au moins un caractère spécial');

    // Patterns communs
    if (!/(.)\1{2,}/.test(password)) score += 1; // Pas de répétitions
    if (!/123|abc|qwe/i.test(password)) score += 1; // Pas de séquences

    const strength = score <= 2 ? 'Faible' : score <= 4 ? 'Moyen' : score <= 6 ? 'Fort' : 'Très fort';

    return { score, strength, feedback };
};

// Génération de nom de fichier sécurisé
const generateSafeFilename = (originalName, prefix = '') => {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
    const timestamp = Date.now();
    const random = generateShortId(6);

    return `${prefix}${safeName}_${timestamp}_${random}${ext}`;
};

// Vérification d'existence de fichier
const fileExists = async (filePath) => {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
};

// Création de dossier récursif
const ensureDirectory = async (dirPath) => {
    try {
        await fs.mkdir(dirPath, { recursive: true });
        return true;
    } catch (error) {
        return false;
    }
};

// Calcul de hash de fichier
const calculateFileHash = async (filePath, algorithm = 'sha256') => {
    const crypto = require('crypto');
    const fs = require('fs');

    return new Promise((resolve, reject) => {
        const hash = crypto.createHash(algorithm);
        const stream = fs.createReadStream(filePath);

        stream.on('data', data => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
};

// Validation de token JWT basique (sans vérification de signature)
const parseJwtPayload = (token) => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = Buffer.from(parts[1], 'base64').toString();
        return JSON.parse(payload);
    } catch {
        return null;
    }
};

// Génération de métadonnées de fichier
const generateFileMetadata = (file) => {
    return {
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        extension: path.extname(file.originalname).toLowerCase(),
        uploadedAt: new Date().toISOString(),
        hash: null // À calculer séparément si nécessaire
    };
};

// Normalisation des tags
const normalizeTags = (tags) => {
    if (!tags) return [];

    const tagArray = Array.isArray(tags) ? tags : tags.split(',');

    return tagArray
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0 && tag.length <= 50)
        .filter((tag, index, arr) => arr.indexOf(tag) === index) // Unique
        .slice(0, 20); // Limite à 20 tags
};

// Génération d'une palette de couleurs basée sur Frutiger Aero
const generateFrutigerPalette = () => {
    return {
        primary: FRUTIGER_COLORS.BRIGHT_BLUE,
        secondary: FRUTIGER_COLORS.CYAN,
        accent: FRUTIGER_COLORS.AURORA_GREEN,
        background: FRUTIGER_COLORS.GLASS,
        text: '#333333',
        textLight: '#666666'
    };
};

module.exports = {
    formatDate,
    getRelativeTime,
    formatDuration,
    formatFileSize,
    formatNumber,
    formatCompactNumber,
    generateSlug,
    generateShortId,
    generateHash,
    generateSecureToken,
    isValidEmail,
    isValidUrl,
    sanitizeText,
    extractDomain,
    getRandomFrutigerColor,
    shuffleArray,
    getPaginationInfo,
    debounce,
    throttle,
    retry,
    deepClone,
    deepMerge,
    getPasswordStrength,
    generateSafeFilename,
    fileExists,
    ensureDirectory,
    calculateFileHash,
    parseJwtPayload,
    generateFileMetadata,
    normalizeTags,
    generateFrutigerPalette
};