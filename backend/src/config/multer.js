// backend/src/config/multer.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Configuration des formats autorisés
const ALLOWED_VIDEO_FORMATS = (process.env.ALLOWED_VIDEO_FORMATS || 'mp4,avi,mov,mkv,webm,flv,wmv,m4v')
    .split(',')
    .map(format => format.trim().toLowerCase());

const ALLOWED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

// Taille maximale des fichiers
const MAX_VIDEO_SIZE = parseFileSize(process.env.MAX_FILE_SIZE || '500MB');
const MAX_IMAGE_SIZE = parseFileSize(process.env.MAX_IMAGE_SIZE || '10MB');

// Fonction pour parser la taille des fichiers
function parseFileSize(size) {
    const units = {
        B: 1,
        KB: 1024,
        MB: 1024 * 1024,
        GB: 1024 * 1024 * 1024
    };

    const match = size.toString().match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
    if (!match) {
        throw new Error(`Format de taille invalide: ${size}`);
    }

    const [, value, unit] = match;
    return parseFloat(value) * units[unit.toUpperCase()];
}

// Créer les dossiers nécessaires
const createUploadDirs = () => {
    const dirs = [
        path.join(__dirname, '../../uploads'),
        path.join(__dirname, '../../uploads/temp'),
        path.join(__dirname, '../../uploads/videos'),
        path.join(__dirname, '../../uploads/images'),
        path.join(__dirname, '../../uploads/thumbnails')
    ];

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            logger.info(`Dossier d'upload créé: ${dir}`);
        }
    });
};

// Configuration du stockage pour les vidéos
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

        // Stocker les informations du fichier dans la requête
        req.uploadInfo = {
            originalName: file.originalname,
            filename: filename,
            uniqueId: uniqueId,
            timestamp: timestamp,
            extension: extension
        };

        logger.video('Fichier vidéo en cours d\'upload', {
            originalName: file.originalname,
            filename: filename,
            size: file.size || 'inconnu'
        });

        cb(null, filename);
    }
});

// Configuration du stockage pour les images
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
            extension: extension
        };

        cb(null, filename);
    }
});

// Filtres de fichiers
const videoFileFilter = (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase().slice(1);
    const mimeType = file.mimetype.toLowerCase();

    // Vérifier l'extension
    if (!ALLOWED_VIDEO_FORMATS.includes(extension)) {
        const error = new Error(`Format de fichier non autorisé. Formats acceptés: ${ALLOWED_VIDEO_FORMATS.join(', ')}`);
        error.code = 'INVALID_FILE_TYPE';
        logger.security('Tentative d\'upload de format non autorisé', {
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
        error.code = 'INVALID_MIME_TYPE';
        logger.security('MIME type invalide détecté', {
            filename: file.originalname,
            mimeType: mimeType,
            ip: req.ip
        });
        return cb(error, false);
    }

    logger.debug('Fichier vidéo accepté', {
        filename: file.originalname,
        extension: extension,
        mimeType: mimeType
    });

    cb(null, true);
};

const imageFileFilter = (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase().slice(1);
    const mimeType = file.mimetype.toLowerCase();

    if (!ALLOWED_IMAGE_FORMATS.includes(extension)) {
        const error = new Error(`Format d'image non autorisé. Formats acceptés: ${ALLOWED_IMAGE_FORMATS.join(', ')}`);
        error.code = 'INVALID_FILE_TYPE';
        return cb(error, false);
    }

    if (!mimeType.startsWith('image/')) {
        const error = new Error('Le fichier doit être une image valide');
        error.code = 'INVALID_MIME_TYPE';
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
        files: 1, // Une seule vidéo à la fois
        fieldSize: 1024 * 1024 // 1MB pour les champs texte
    },
    onError: (err, next) => {
        logger.error('Erreur Multer lors de l\'upload vidéo:', err);
        next(err);
    }
});

// Configuration Multer pour les images
const uploadImage = multer({
    storage: imageStorage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: MAX_IMAGE_SIZE,
        files: 5, // Jusqu'à 5 images
        fieldSize: 1024 * 100 // 100KB pour les champs texte
    },
    onError: (err, next) => {
        logger.error('Erreur Multer lors de l\'upload image:', err);
        next(err);
    }
});

// Configuration Multer en mémoire pour le traitement temporaire
const uploadMemory = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max en mémoire
        files: 1
    }
});

// Middleware de gestion des erreurs d'upload
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        let message = 'Erreur lors de l\'upload du fichier';
        let statusCode = 400;

        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                message = `Fichier trop volumineux. Taille maximale: ${formatFileSize(error.field === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE)}`;
                break;
            case 'LIMIT_FILE_COUNT':
                message = 'Trop de fichiers uploadés';
                break;
            case 'LIMIT_FIELD_KEY':
                message = 'Nom de champ trop long';
                break;
            case 'LIMIT_FIELD_VALUE':
                message = 'Valeur de champ trop longue';
                break;
            case 'LIMIT_FIELD_COUNT':
                message = 'Trop de champs dans la requête';
                break;
            case 'LIMIT_UNEXPECTED_FILE':
                message = 'Champ de fichier inattendu';
                break;
        }

        logger.security('Erreur d\'upload Multer', {
            code: error.code,
            field: error.field,
            message: message,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        return res.status(statusCode).json({
            success: false,
            error: message,
            code: error.code
        });
    }

    if (error.code === 'INVALID_FILE_TYPE' || error.code === 'INVALID_MIME_TYPE') {
        return res.status(400).json({
            success: false,
            error: error.message,
            code: error.code
        });
    }

    next(error);
};

// Fonction pour formater la taille des fichiers
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Fonction pour nettoyer les fichiers temporaires
const cleanupTempFiles = async (filename) => {
    try {
        const tempPath = path.join(__dirname, '../../uploads/temp', filename);
        if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
            logger.debug(`Fichier temporaire supprimé: ${filename}`);
        }
    } catch (error) {
        logger.error('Erreur lors de la suppression du fichier temporaire:', error);
    }
};

// Fonction pour nettoyer automatiquement les anciens fichiers temporaires
const cleanupOldTempFiles = () => {
    const tempDir = path.join(__dirname, '../../uploads/temp');
    const maxAge = 24 * 60 * 60 * 1000; // 24 heures

    fs.readdir(tempDir, (err, files) => {
        if (err) {
            logger.error('Erreur lors de la lecture du dossier temp:', err);
            return;
        }

        files.forEach(file => {
            const filePath = path.join(tempDir, file);
            fs.stat(filePath, (err, stats) => {
                if (err) return;

                const age = Date.now() - stats.mtime.getTime();
                if (age > maxAge) {
                    fs.unlink(filePath, (err) => {
                        if (!err) {
                            logger.info(`Ancien fichier temporaire supprimé: ${file}`);
                        }
                    });
                }
            });
        });
    });
};

// Fonction pour valider un fichier vidéo après upload
const validateVideoFile = async (filePath) => {
    return new Promise((resolve, reject) => {
        const ffmpeg = require('fluent-ffmpeg');

        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                logger.error('Erreur lors de la validation du fichier vidéo:', err);
                return reject(new Error('Fichier vidéo corrompu ou invalide'));
            }

            const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
            if (!videoStream) {
                return reject(new Error('Aucun stream vidéo trouvé dans le fichier'));
            }

            const fileInfo = {
                duration: metadata.format.duration,
                size: metadata.format.size,
                bitrate: metadata.format.bit_rate,
                width: videoStream.width,
                height: videoStream.height,
                frameRate: eval(videoStream.r_frame_rate), // Convertir la fraction en nombre
                codec: videoStream.codec_name,
                format: metadata.format.format_name
            };

            logger.video('Fichier vidéo validé', fileInfo);
            resolve(fileInfo);
        });
    });
};

// Planifier le nettoyage automatique des fichiers temporaires
setInterval(cleanupOldTempFiles, 60 * 60 * 1000); // Toutes les heures

// Initialiser les dossiers
createUploadDirs();

module.exports = {
    uploadVideo,
    uploadImage,
    uploadMemory,
    handleUploadError,
    cleanupTempFiles,
    validateVideoFile,
    formatFileSize,
    parseFileSize,
    MAX_VIDEO_SIZE,
    MAX_IMAGE_SIZE,
    ALLOWED_VIDEO_FORMATS,
    ALLOWED_IMAGE_FORMATS
};