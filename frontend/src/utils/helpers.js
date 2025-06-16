// frontend/src/utils/helpers.js

import { VIDEO_CONFIG, IMAGE_CONFIG, STORAGE_KEYS, DEBOUNCE_DELAYS } from './constants';

/**
 * Fonctions de validation
 */

// Valide une adresse email
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Valide une URL
export const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

// Valide un nom d'utilisateur (3-20 caractères, alphanumériques + underscore)
export const isValidUsername = (username) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
};

// Valide un mot de passe (au moins 8 caractères avec maj, min, chiffre)
export const isValidPassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};

// Valide un fichier vidéo
export const isValidVideoFile = (file) => {
    if (!file) return { valid: false, error: 'Aucun fichier sélectionné' };

    // Vérification de la taille
    if (file.size > VIDEO_CONFIG.MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `Le fichier est trop volumineux. Taille maximale: ${formatFileSize(VIDEO_CONFIG.MAX_FILE_SIZE)}`
        };
    }

    // Vérification du type MIME
    if (!VIDEO_CONFIG.ALLOWED_MIME_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: `Format non supporté. Formats acceptés: ${VIDEO_CONFIG.ALLOWED_FORMATS.join(', ')}`
        };
    }

    // Vérification de l'extension
    const extension = getFileExtension(file.name);
    if (!VIDEO_CONFIG.ALLOWED_FORMATS.includes(extension)) {
        return {
            valid: false,
            error: `Extension non supportée. Extensions acceptées: ${VIDEO_CONFIG.ALLOWED_FORMATS.join(', ')}`
        };
    }

    return { valid: true };
};

// Valide un fichier image
export const isValidImageFile = (file) => {
    if (!file) return { valid: false, error: 'Aucun fichier sélectionné' };

    // Vérification de la taille
    if (file.size > IMAGE_CONFIG.MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `L'image est trop volumineuse. Taille maximale: ${formatFileSize(IMAGE_CONFIG.MAX_FILE_SIZE)}`
        };
    }

    // Vérification du type MIME
    if (!IMAGE_CONFIG.ALLOWED_MIME_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: `Format non supporté. Formats acceptés: ${IMAGE_CONFIG.ALLOWED_FORMATS.join(', ')}`
        };
    }

    return { valid: true };
};

/**
 * Fonctions de manipulation de fichiers
 */

// Obtient l'extension d'un fichier
export const getFileExtension = (filename) => {
    if (!filename) return '';
    return filename.split('.').pop().toLowerCase();
};

// Génère un nom de fichier sécurisé
export const generateSafeFilename = (originalName, prefix = '') => {
    const extension = getFileExtension(originalName);
    const baseName = originalName.replace(/\.[^/.]+$/, '');
    const safeName = baseName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .toLowerCase();

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);

    return `${prefix}${safeName}_${timestamp}_${random}.${extension}`;
};

// Lit un fichier comme Data URL
export const readFileAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// Redimensionne une image
export const resizeImage = (file, maxWidth, maxHeight, quality = 0.8) => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            // Calcule les nouvelles dimensions
            let { width, height } = img;

            if (width > height) {
                if (width > maxWidth) {
                    height = height * (maxWidth / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = width * (maxHeight / height);
                    height = maxHeight;
                }
            }

            // Redimensionne l'image
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // Convertit en blob
            canvas.toBlob(resolve, file.type, quality);
        };

        img.src = URL.createObjectURL(file);
    });
};

/**
 * Fonctions de stockage local
 */

// Sauvegarde une valeur dans le localStorage avec gestion d'erreur
export const setLocalStorage = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde dans localStorage:', error);
        return false;
    }
};

// Récupère une valeur du localStorage avec gestion d'erreur
export const getLocalStorage = (key, defaultValue = null) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Erreur lors de la lecture du localStorage:', error);
        return defaultValue;
    }
};

// Supprime une valeur du localStorage
export const removeLocalStorage = (key) => {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Erreur lors de la suppression du localStorage:', error);
        return false;
    }
};

// Nettoie tous les éléments de l'application du localStorage
export const clearAppStorage = () => {
    Object.values(STORAGE_KEYS).forEach(key => {
        removeLocalStorage(key);
    });
};

/**
 * Fonctions de manipulation des données
 */

// Clone profond d'un objet
export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
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

// Merge profond de deux objets
export const deepMerge = (target, source) => {
    const result = deepClone(target);

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

// Mélange un tableau (algorithme Fisher-Yates)
export const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

// Groupe les éléments d'un tableau par une clé
export const groupBy = (array, key) => {
    return array.reduce((groups, item) => {
        const group = item[key];
        if (!groups[group]) {
            groups[group] = [];
        }
        groups[group].push(item);
        return groups;
    }, {});
};

// Supprime les doublons d'un tableau d'objets basé sur une clé
export const uniqueBy = (array, key) => {
    const seen = new Set();
    return array.filter(item => {
        const value = item[key];
        if (seen.has(value)) {
            return false;
        }
        seen.add(value);
        return true;
    });
};

// Trie un tableau d'objets par plusieurs clés
export const sortBy = (array, ...keys) => {
    return [...array].sort((a, b) => {
        for (const key of keys) {
            let aVal = a[key];
            let bVal = b[key];

            // Gestion des chaînes (ignore la casse)
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();

            if (aVal < bVal) return -1;
            if (aVal > bVal) return 1;
        }
        return 0;
    });
};

/**
 * Fonctions de contrôle de flux
 */

// Debounce une fonction
export const debounce = (func, wait = DEBOUNCE_DELAYS.INPUT) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Throttle une fonction
export const throttle = (func, limit = DEBOUNCE_DELAYS.SCROLL) => {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// Retry avec backoff exponentiel
export const retry = async (fn, maxRetries = 3, baseDelay = 1000) => {
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

// Délai d'attente
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fonctions de génération
 */

// Génère un ID court aléatoire
export const generateShortId = (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Génère un UUID v4
export const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// Génère une couleur hex aléatoire
export const generateRandomColor = () => {
    return '#' + Math.floor(Math.random()*16777215).toString(16);
};

// Génère des couleurs pastel aléatoires (pour les avatars)
export const generatePastelColor = () => {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 80%)`;
};

/**
 * Fonctions de navigation et URL
 */

// Extrait les paramètres de l'URL
export const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    for (const [key, value] of params) {
        result[key] = value;
    }
    return result;
};

// Met à jour les paramètres de l'URL sans recharger la page
export const updateUrlParams = (params) => {
    const url = new URL(window.location);
    Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, value);
        }
    });
    window.history.replaceState({}, '', url);
};

// Vérifie si on est sur mobile
export const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Vérifie si on est sur une tablette
export const isTablet = () => {
    return /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
};

// Vérifie si on est sur desktop
export const isDesktop = () => {
    return !isMobile() && !isTablet();
};

/**
 * Fonctions de performance et monitoring
 */

// Mesure le temps d'exécution d'une fonction
export const measurePerformance = async (fn, label = 'Performance') => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    console.log(`${label}: ${end - start} millisecondes`);
    return result;
};

// Surveille les Core Web Vitals
export const observeWebVitals = (callback) => {
    // Cumulative Layout Shift
    if ('LayoutShiftAttribution' in window) {
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                    callback({ name: 'CLS', value: entry.value });
                }
            }
        }).observe({ type: 'layout-shift', buffered: true });
    }

    // First Input Delay
    new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            callback({ name: 'FID', value: entry.processingStart - entry.startTime });
        }
    }).observe({ type: 'first-input', buffered: true });

    // Largest Contentful Paint
    new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        callback({ name: 'LCP', value: lastEntry.startTime });
    }).observe({ type: 'largest-contentful-paint', buffered: true });
};

/**
 * Fonctions de sécurité
 */

// Nettoie une chaîne pour éviter les attaques XSS
export const sanitizeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

// Génère un token CSRF simple
export const generateCSRFToken = () => {
    return generateShortId(32);
};

// Valide un token JWT côté client (vérification basique)
export const isValidJWT = (token) => {
    if (!token) return false;

    const parts = token.split('.');
    if (parts.length !== 3) return false;

    try {
        const payload = JSON.parse(atob(parts[1]));
        return payload.exp > Date.now() / 1000;
    } catch {
        return false;
    }
};

/**
 * Fonctions de gestion d'erreur
 */

// Gère les erreurs réseau
export const handleNetworkError = (error) => {
    if (!navigator.onLine) {
        return 'Connexion internet indisponible';
    }

    if (error.code === 'NETWORK_ERROR') {
        return 'Erreur de connexion au serveur';
    }

    return 'Erreur réseau inconnue';
};

// Log une erreur avec contexte
export const logError = (error, context = {}) => {
    console.error('Erreur:', {
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
    });
};

/**
 * Fonctions utilitaires diverses
 */

// Copie du texte dans le presse-papier
export const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Fallback pour navigateurs plus anciens
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
    }
};

// Partage natif si disponible
export const nativeShare = async (data) => {
    if (navigator.share) {
        try {
            await navigator.share(data);
            return true;
        } catch {
            return false;
        }
    }
    return false;
};

// Vérifie si une fonctionnalité est supportée
export const isFeatureSupported = (feature) => {
    const features = {
        webRTC: 'RTCPeerConnection' in window,
        serviceWorker: 'serviceWorker' in navigator,
        notifications: 'Notification' in window,
        geolocation: 'geolocation' in navigator,
        camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
        fullscreen: 'requestFullscreen' in document.documentElement,
        picture: 'pictureInPicture' in document.documentElement,
        share: 'share' in navigator,
        clipboard: 'clipboard' in navigator
    };

    return features[feature] || false;
};

// Import des formatters pour éviter la duplication
import { formatFileSize } from './formatters';

/**
 * Export par défaut
 */
export default {
    // Validation
    isValidEmail,
    isValidUrl,
    isValidUsername,
    isValidPassword,
    isValidVideoFile,
    isValidImageFile,

    // Fichiers
    getFileExtension,
    generateSafeFilename,
    readFileAsDataURL,
    resizeImage,

    // Stockage
    setLocalStorage,
    getLocalStorage,
    removeLocalStorage,
    clearAppStorage,

    // Données
    deepClone,
    deepMerge,
    shuffleArray,
    groupBy,
    uniqueBy,
    sortBy,

    // Contrôle de flux
    debounce,
    throttle,
    retry,
    delay,

    // Génération
    generateShortId,
    generateUUID,
    generateRandomColor,
    generatePastelColor,

    // Navigation
    getUrlParams,
    updateUrlParams,
    isMobile,
    isTablet,
    isDesktop,

    // Performance
    measurePerformance,
    observeWebVitals,

    // Sécurité
    sanitizeHtml,
    generateCSRFToken,
    isValidJWT,

    // Erreurs
    handleNetworkError,
    logError,

    // Divers
    copyToClipboard,
    nativeShare,
    isFeatureSupported
};