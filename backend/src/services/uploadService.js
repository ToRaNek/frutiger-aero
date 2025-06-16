// backend/src/services/uploadService.js
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { logger } = require('../utils/logger');
const { generateSecureToken, formatFileSize } = require('../utils/helpers');
const ffmpegService = require('./ffmpegService');

class UploadService {
    constructor() {
        this.uploadPath = process.env.UPLOAD_PATH || './uploads';
        this.videoPath = process.env.VIDEO_PATH || './videos';
        this.tempPath = path.join(this.uploadPath, 'temp');
        this.thumbnailPath = path.join(this.videoPath, 'thumbnails');

        // Créer les dossiers nécessaires
        this.initializeDirectories();
    }

    /**
     * Initialise les dossiers d'upload nécessaires
     */
    async initializeDirectories() {
        try {
            const directories = [
                this.uploadPath,
                this.videoPath,
                this.tempPath,
                this.thumbnailPath,
                path.join(this.videoPath, 'originals'),
                path.join(this.videoPath, 'hls'),
            ];

            for (const dir of directories) {
                await fs.mkdir(dir, { recursive: true });
            }

            logger.info('Upload directories initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize upload directories:', error);
            throw error;
        }
    }

    /**
     * Génère un nom de fichier sécurisé et unique
     * @param {string} originalName - Nom original du fichier
     * @param {string} userId - ID de l'utilisateur
     * @returns {string} Nom de fichier sécurisé
     */
    generateSecureFilename(originalName, userId) {
        const ext = path.extname(originalName).toLowerCase();
        const timestamp = Date.now();
        const randomToken = generateSecureToken(16);
        const userHash = crypto.createHash('md5').update(userId).digest('hex').substring(0, 8);

        return `${userHash}_${timestamp}_${randomToken}${ext}`;
    }

    /**
     * Valide un fichier vidéo uploadé
     * @param {Object} file - Fichier Multer
     * @returns {Promise<Object>} Résultat de validation
     */
    async validateVideoFile(file) {
        try {
            const allowedFormats = (process.env.ALLOWED_VIDEO_FORMATS || 'mp4,avi,mov,mkv,webm').split(',');
            const maxSize = this.parseFileSize(process.env.MAX_FILE_SIZE || '500MB');

            // Vérifier l'extension
            const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
            if (!allowedFormats.includes(ext)) {
                return {
                    valid: false,
                    error: `Format non supporté. Formats acceptés: ${allowedFormats.join(', ')}`
                };
            }

            // Vérifier la taille
            if (file.size > maxSize) {
                return {
                    valid: false,
                    error: `Fichier trop volumineux. Taille max: ${formatFileSize(maxSize)}`
                };
            }

            // Vérifier avec FFmpeg si c'est vraiment une vidéo
            const videoInfo = await ffmpegService.getVideoInfo(file.path);
            if (!videoInfo.format || !videoInfo.streams.find(s => s.codec_type === 'video')) {
                return {
                    valid: false,
                    error: 'Le fichier ne contient pas de flux vidéo valide'
                };
            }

            return {
                valid: true,
                info: videoInfo,
                duration: videoInfo.format.duration,
                size: file.size,
                format: ext
            };
        } catch (error) {
            logger.error('Video validation failed:', error);
            return {
                valid: false,
                error: 'Erreur lors de la validation du fichier vidéo'
            };
        }
    }

    /**
     * Déplace un fichier uploadé vers le dossier final
     * @param {string} tempPath - Chemin temporaire
     * @param {string} finalFilename - Nom final du fichier
     * @returns {Promise<string>} Chemin final du fichier
     */
    async moveToFinalLocation(tempPath, finalFilename) {
        try {
            const finalPath = path.join(this.videoPath, 'originals', finalFilename);
            await fs.rename(tempPath, finalPath);

            logger.info(`File moved successfully: ${tempPath} -> ${finalPath}`);
            return finalPath;
        } catch (error) {
            logger.error('Failed to move file to final location:', error);
            throw new Error('Erreur lors du déplacement du fichier');
        }
    }

    /**
     * Génère une miniature pour une vidéo
     * @param {string} videoPath - Chemin de la vidéo
     * @param {string} videoId - ID de la vidéo
     * @returns {Promise<string>} Chemin de la miniature générée
     */
    async generateThumbnail(videoPath, videoId) {
        try {
            const thumbnailFilename = `${videoId}_thumb.jpg`;
            const thumbnailPath = path.join(this.thumbnailPath, thumbnailFilename);

            await ffmpegService.generateThumbnail(videoPath, thumbnailPath, {
                timeOffset: '00:00:05', // 5 secondes dans la vidéo
                width: 1280,
                height: 720,
                quality: 85
            });

            logger.info(`Thumbnail generated: ${thumbnailPath}`);
            return `/videos/thumbnails/${thumbnailFilename}`;
        } catch (error) {
            logger.error('Thumbnail generation failed:', error);
            throw new Error('Erreur lors de la génération de la miniature');
        }
    }

    /**
     * Nettoie les fichiers temporaires
     * @param {string} filePath - Chemin du fichier à supprimer
     */
    async cleanupTempFile(filePath) {
        try {
            await fs.unlink(filePath);
            logger.info(`Temporary file cleaned up: ${filePath}`);
        } catch (error) {
            // Ne pas throw, juste logger
            logger.warn(`Failed to cleanup temp file: ${filePath}`, error);
        }
    }

    /**
     * Nettoie automatiquement les fichiers temporaires anciens
     * @param {number} maxAgeHours - Âge maximum en heures (défaut: 24h)
     */
    async cleanupOldTempFiles(maxAgeHours = 24) {
        try {
            const files = await fs.readdir(this.tempPath);
            const now = Date.now();
            const maxAge = maxAgeHours * 60 * 60 * 1000; // Convertir en millisecondes

            for (const file of files) {
                const filePath = path.join(this.tempPath, file);
                const stats = await fs.stat(filePath);

                if (now - stats.birthtime.getTime() > maxAge) {
                    await this.cleanupTempFile(filePath);
                }
            }

            logger.info(`Temp files cleanup completed. Max age: ${maxAgeHours}h`);
        } catch (error) {
            logger.error('Failed to cleanup old temp files:', error);
        }
    }

    /**
     * Parse une taille de fichier (ex: "500MB" -> bytes)
     * @param {string} size - Taille avec unité
     * @returns {number} Taille en bytes
     */
    parseFileSize(size) {
        const units = {
            'B': 1,
            'KB': 1024,
            'MB': 1024 * 1024,
            'GB': 1024 * 1024 * 1024
        };

        const match = size.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
        if (!match) {
            throw new Error('Format de taille invalide');
        }

        const value = parseFloat(match[1]);
        const unit = match[2].toUpperCase();

        return Math.floor(value * units[unit]);
    }

    /**
     * Calcule le hash d'un fichier pour vérifier l'intégrité
     * @param {string} filePath - Chemin du fichier
     * @param {string} algorithm - Algorithme de hash (défaut: sha256)
     * @returns {Promise<string>} Hash du fichier
     */
    async calculateFileHash(filePath, algorithm = 'sha256') {
        try {
            const fileBuffer = await fs.readFile(filePath);
            const hash = crypto.createHash(algorithm);
            hash.update(fileBuffer);
            return hash.digest('hex');
        } catch (error) {
            logger.error('Failed to calculate file hash:', error);
            throw new Error('Erreur lors du calcul du hash du fichier');
        }
    }

    /**
     * Sauvegarde les métadonnées d'upload
     * @param {Object} uploadData - Données d'upload
     * @returns {Promise<Object>} Métadonnées sauvegardées
     */
    async saveUploadMetadata(uploadData) {
        try {
            const metadata = {
                uploadId: generateSecureToken(32),
                originalName: uploadData.originalName,
                finalPath: uploadData.finalPath,
                fileSize: uploadData.fileSize,
                mimeType: uploadData.mimeType,
                hash: uploadData.hash,
                uploadedAt: new Date().toISOString(),
                userId: uploadData.userId,
                videoInfo: uploadData.videoInfo
            };

            // Sauvegarder dans un fichier JSON pour le tracking
            const metadataPath = path.join(this.tempPath, `${metadata.uploadId}_metadata.json`);
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

            logger.info(`Upload metadata saved: ${metadataPath}`);
            return metadata;
        } catch (error) {
            logger.error('Failed to save upload metadata:', error);
            throw new Error('Erreur lors de la sauvegarde des métadonnées');
        }
    }

    /**
     * Traitement complet d'un upload vidéo
     * @param {Object} file - Fichier Multer
     * @param {string} userId - ID de l'utilisateur
     * @returns {Promise<Object>} Résultat du traitement
     */
    async processVideoUpload(file, userId) {
        let tempPath = file.path;

        try {
            logger.info(`Starting video upload processing: ${file.originalname}`);

            // 1. Valider le fichier
            const validation = await this.validateVideoFile(file);
            if (!validation.valid) {
                await this.cleanupTempFile(tempPath);
                throw new Error(validation.error);
            }

            // 2. Générer un nom sécurisé
            const secureFilename = this.generateSecureFilename(file.originalname, userId);

            // 3. Calculer le hash pour l'intégrité
            const fileHash = await this.calculateFileHash(tempPath);

            // 4. Déplacer vers l'emplacement final
            const finalPath = await this.moveToFinalLocation(tempPath, secureFilename);
            tempPath = null; // Fichier déplacé, plus besoin de cleanup

            // 5. Sauvegarder les métadonnées
            const metadata = await this.saveUploadMetadata({
                originalName: file.originalname,
                finalPath: finalPath,
                fileSize: file.size,
                mimeType: file.mimetype,
                hash: fileHash,
                userId: userId,
                videoInfo: validation.info
            });

            logger.info(`Video upload processed successfully: ${secureFilename}`);

            return {
                success: true,
                filename: secureFilename,
                path: finalPath,
                size: file.size,
                duration: validation.duration,
                format: validation.format,
                hash: fileHash,
                metadata: metadata,
                videoInfo: validation.info
            };

        } catch (error) {
            // Cleanup en cas d'erreur
            if (tempPath) {
                await this.cleanupTempFile(tempPath);
            }

            logger.error('Video upload processing failed:', error);
            throw error;
        }
    }

    /**
     * Supprime tous les fichiers associés à une vidéo
     * @param {string} videoId - ID de la vidéo
     * @param {string} filename - Nom du fichier original
     */
    async deleteVideoFiles(videoId, filename) {
        try {
            const filesToDelete = [
                // Fichier original
                path.join(this.videoPath, 'originals', filename),
                // Miniature
                path.join(this.thumbnailPath, `${videoId}_thumb.jpg`),
                // Dossier HLS
                path.join(this.videoPath, 'hls', videoId)
            ];

            for (const filePath of filesToDelete) {
                try {
                    const stats = await fs.stat(filePath);
                    if (stats.isDirectory()) {
                        await fs.rmdir(filePath, { recursive: true });
                    } else {
                        await fs.unlink(filePath);
                    }
                    logger.info(`Deleted: ${filePath}`);
                } catch (error) {
                    // Fichier peut ne pas exister, continuer
                    logger.warn(`Could not delete ${filePath}:`, error.message);
                }
            }

            logger.info(`All files deleted for video: ${videoId}`);
        } catch (error) {
            logger.error('Failed to delete video files:', error);
            throw new Error('Erreur lors de la suppression des fichiers vidéo');
        }
    }

    /**
     * Obtient les statistiques d'utilisation de l'espace
     * @returns {Promise<Object>} Statistiques d'espace
     */
    async getStorageStats() {
        try {
            const stats = {
                totalFiles: 0,
                totalSize: 0,
                byFormat: {},
                oldestFile: null,
                newestFile: null
            };

            const originalsPath = path.join(this.videoPath, 'originals');
            const files = await fs.readdir(originalsPath);

            for (const file of files) {
                const filePath = path.join(originalsPath, file);
                const fileStats = await fs.stat(filePath);
                const ext = path.extname(file).toLowerCase().replace('.', '');

                stats.totalFiles++;
                stats.totalSize += fileStats.size;

                // Statistiques par format
                if (!stats.byFormat[ext]) {
                    stats.byFormat[ext] = { count: 0, size: 0 };
                }
                stats.byFormat[ext].count++;
                stats.byFormat[ext].size += fileStats.size;

                // Fichiers les plus anciens/récents
                if (!stats.oldestFile || fileStats.birthtime < stats.oldestFile.date) {
                    stats.oldestFile = { file, date: fileStats.birthtime };
                }
                if (!stats.newestFile || fileStats.birthtime > stats.newestFile.date) {
                    stats.newestFile = { file, date: fileStats.birthtime };
                }
            }

            return stats;
        } catch (error) {
            logger.error('Failed to get storage stats:', error);
            throw new Error('Erreur lors de la récupération des statistiques');
        }
    }
}

// Export singleton
module.exports = new UploadService();