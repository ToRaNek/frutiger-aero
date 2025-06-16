// backend/src/middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Tailles maximales de fichiers
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10MB
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;  // 5MB

// Extensions autorisées
const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv'];
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_AVATAR_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Créer les dossiers de destination
const createUploadDirs = () => {
    const dirs = [
        path.join(__dirname, '../../uploads'),
        path.join(__dirname, '../../uploads/temp'),
        path.join(__dirname, '../../uploads/videos'),
        path.join(__dirname, '../../uploads/images'),
        path.join(__dirname, '../../uploads/avatars'),
        path.join(__dirname, '../../uploads/thumbnails')
    ];

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            logger.info(`Dossier d'upload créé: ${dir}`);
        }
    });
};

// Fonction pour détecter le type MIME
const detectMimeType = (file) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeTypes = {
        '.mp4': 'video/mp4',
        '.avi': 'video/x-msvideo',
        '.mov': 'video/quicktime',
        '.mkv': 'video/x-matroska',
        '.webm': 'video/webm',
        '.flv': 'video/x-flv',
        '.wmv': 'video/x-ms-wmv',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    };
    return mimeTypes[ext] || file.mimetype;
};

// Configuration de stockage pour les vidéos
const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../uploads/temp');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueId = uuidv4();
        const timestamp = Date.now();
        const extension = path.extname(file.originalname).toLowerCase();
        const filename = `video_${timestamp}_${uniqueId}${extension}`;

        // Stocker les informations dans la requête
        req.uploadInfo = {
            originalName: file.originalname,
            filename: filename,
            uniqueId: uniqueId,
            timestamp: timestamp,
            extension: extension,
            mimeType: detectMimeType(file)
        };

        logger.video('Upload vidéo en cours', {
            originalName: file.originalname,
            filename: filename,
            size: file.size
        });

        cb(null, filename);
    }
});

// Configuration de stockage pour les images
const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../uploads/images');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueId = uuidv4();
        const timestamp = Date.now();
        const extension = path.extname(file.originalname).toLowerCase();
        const filename = `image_${timestamp}_${uniqueId}${extension}`;

        req.uploadInfo = {
            originalName: file.originalname,
            filename: filename,
            uniqueId: uniqueId,
            timestamp: timestamp,
            extension: extension,
            mimeType: detectMimeType(file)
        };

        cb(null, filename);
    }
});

// Configuration de stockage pour les avatars
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../uploads/avatars');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const userId = req.user?.id || 'unknown';
        const timestamp = Date.now();
        const extension = path.extname(file.originalname).toLowerCase();
        const filename = `avatar_${userId}_${timestamp}${extension}`;

        req.uploadInfo = {
            originalName: file.originalname,
            filename: filename,
            userId: userId,
            timestamp: timestamp,
            extension: extension,
            mimeType: detectMimeType(file)
        };

        cb(null, filename);
    }
});

// Filtres de fichiers
const videoFileFilter = (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype.toLowerCase();

    // Vérifier l'extension
    if (!ALLOWED_VIDEO_EXTENSIONS.includes(extension)) {
        const error = new Error(`Format vidéo non autorisé. Formats acceptés: ${ALLOWED_VIDEO_EXTENSIONS.join(', ')}`);
        error.code = 'INVALID_VIDEO_FORMAT';
        logger.security('Tentative d\'upload de format vidéo non autorisé', {
            filename: file.originalname,
            extension: extension,
            mimeType: mimeType,
            ip: req.ip
        });
        return cb(error, false);
    }

    // Vérifier le MIME type
    if (!mimeType.startsWith('video/')) {
        const error = new Error('Le fichier doit être une vidéo valide');
        error.code = 'INVALID_VIDEO_MIME';
        logger.security('MIME type vidéo invalide', {
            filename: file.originalname,
            mimeType: mimeType,
            ip: req.ip
        });
        return cb(error, false);
    }

    cb(null, true);
};

const imageFileFilter = (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype.toLowerCase();

    if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
        const error = new Error(`Format d'image non autorisé. Formats acceptés: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`);
        error.code = 'INVALID_IMAGE_FORMAT';
        return cb(error, false);
    }

    if (!mimeType.startsWith('image/')) {
        const error = new Error('Le fichier doit être une image valide');
        error.code = 'INVALID_IMAGE_MIME';
        return cb(error, false);
    }

    cb(null, true);
};

const avatarFileFilter = (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype.toLowerCase();

    if (!ALLOWED_AVATAR_EXTENSIONS.includes(extension)) {
        const error = new Error(`Format d'avatar non autorisé. Formats acceptés: ${ALLOWED_AVATAR_EXTENSIONS.join(', ')}`);
        error.code = 'INVALID_AVATAR_FORMAT';
        return cb(error, false);
    }

    if (!mimeType.startsWith('image/')) {
        const error = new Error('L\'avatar doit être une image valide');
        error.code = 'INVALID_AVATAR_MIME';
        return cb(error, false);
    }

    cb(null, true);
};

// Configuration Multer pour les vidéos
const uploadVideo = multer({
    storage: videoStorage,
    fileFilter: videoFileFilter,
    limits: {
        fileSize: MAX_VIDEO_SIZE,
        files: 1
    },
    onError: (err, next) => {
        logger.error('Erreur Multer vidéo:', err);
        next(err);
    }
});

// Configuration Multer pour les images
const uploadImage = multer({
    storage: imageStorage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: MAX_IMAGE_SIZE,
        files: 5
    },
    onError: (err, next) => {
        logger.error('Erreur Multer image:', err);
        next(err);
    }
});

// Configuration Multer pour les avatars
const uploadAvatar = multer({
    storage: avatarStorage,
    fileFilter: avatarFileFilter,
    limits: {
        fileSize: MAX_AVATAR_SIZE,
        files: 1
    },
    onError: (err, next) => {
        logger.error('Erreur Multer avatar:', err);
        next(err);
    }
});

// Middleware de validation post-upload
const validateUpload = (req, res, next) => {
    if (!req.file && !req.files) {
        return res.status(400).json({
            success: false,
            error: 'Aucun fichier uploadé',
            code: 'NO_FILE_UPLOADED'
        });
    }

    // Ajouter des informations supplémentaires
    if (req.file) {
        req.file.uploadedAt = new Date();
        req.file.uploadedBy = req.user?.id;
    }

    if (req.files) {
        req.files.forEach(file => {
            file.uploadedAt = new Date();
            file.uploadedBy = req.user?.id;
        });
    }

    next();
};

// Middleware de gestion d'erreurs spécifique aux uploads
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        let message = 'Erreur lors de l\'upload';
        let statusCode = 400;

        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                message = 'Fichier trop volumineux';
                break;
            case 'LIMIT_FILE_COUNT':
                message = 'Trop de fichiers';
                break;
            case 'LIMIT_UNEXPECTED_FILE':
                message = 'Champ de fichier inattendu';
                break;
        }

        logger.security('Erreur d\'upload Multer', {
            code: err.code,
            field: err.field,
            message: message,
            ip: req.ip
        });

        return res.status(statusCode).json({
            success: false,
            error: message,
            code: err.code
        });
    }

    if (err.code && err.code.startsWith('INVALID_')) {
        return res.status(400).json({
            success: false,
            error: err.message,
            code: err.code
        });
    }

    next(err);
};

// Middleware de nettoyage des fichiers temporaires
const cleanupTempFiles = async (req, res, next) => {
    const originalSend = res.send;

    res.send = function(data) {
        // Nettoyer les fichiers temporaires après la réponse
        if (req.file || req.files) {
            const files = req.files || [req.file];
            files.forEach(file => {
                if (file && file.path && file.path.includes('/temp/')) {
                    fs.unlink(file.path, (err) => {
                        if (err) {
                            logger.warn('Impossible de supprimer le fichier temporaire', {
                                path: file.path,
                                error: err.message
                            });
                        }
                    });
                }
            });
        }

        return originalSend.call(this, data);
    };

    next();
};

// Middleware de vérification de l'espace disque
const checkDiskSpace = (req, res, next) => {
    const fs = require('fs');
    const uploadDir = path.join(__dirname, '../../uploads');

    try {
        const stats = fs.statSync(uploadDir);
        const freeSpace = fs.constants.F_OK; // Simplification pour l'exemple

        // Vérifier l'espace libre (logique simplifiée)
        // En réalité, vous devriez utiliser une bibliothèque comme 'check-disk-space'

        next();
    } catch (error) {
        logger.error('Erreur lors de la vérification de l\'espace disque:', error);
        next();
    }
};

// Middleware de limitation de taux pour les uploads
const uploadRateLimit = (maxUploads, windowMs = 60000) => {
    const uploads = new Map();

    return (req, res, next) => {
        const userId = req.user?.id;
        const ip = req.ip;
        const key = userId || ip;

        const now = Date.now();
        const userUploads = uploads.get(key) || [];

        // Nettoyer les anciens uploads
        const recentUploads = userUploads.filter(time => now - time < windowMs);

        if (recentUploads.length >= maxUploads) {
            return res.status(429).json({
                success: false,
                error: 'Trop d\'uploads récents. Veuillez patienter.',
                code: 'UPLOAD_RATE_LIMIT'
            });
        }

        // Ajouter l'upload actuel
        recentUploads.push(now);
        uploads.set(key, recentUploads);

        next();
    };
};

// Initialiser les dossiers
createUploadDirs();

module.exports = {
    uploadVideo,
    uploadImage,
    uploadAvatar,
    validateUpload,
    handleUploadError,
    cleanupTempFiles,
    checkDiskSpace,
    uploadRateLimit,
    MAX_VIDEO_SIZE,
    MAX_IMAGE_SIZE,
    MAX_AVATAR_SIZE,
    ALLOWED_VIDEO_EXTENSIONS,
    ALLOWED_IMAGE_EXTENSIONS,
    ALLOWED_AVATAR_EXTENSIONS
};