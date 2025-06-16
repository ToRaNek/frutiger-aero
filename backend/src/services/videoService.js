// backend/src/services/videoService.js
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');
const ffmpegService = require('./ffmpegService');

// Configuration des qualités vidéo disponibles
const VIDEO_QUALITIES = [
    { name: '360p', width: 640, height: 360, bitrate: '800k' },
    { name: '480p', width: 854, height: 480, bitrate: '1200k' },
    { name: '720p', width: 1280, height: 720, bitrate: '2500k' },
    { name: '1080p', width: 1920, height: 1080, bitrate: '5000k' }
];

// Traitement complet d'une vidéo
const processVideo = async (videoId, inputPath) => {
    logger.video('Début du traitement vidéo', { videoId, inputPath });

    try {
        // Mettre à jour le statut à "processing"
        await db.query(
            'UPDATE videos SET status = $1, processing_progress = $2 WHERE id = $3',
            ['processing', 0, videoId]
        );

        // Créer les dossiers de destination
        const videoDir = path.join(__dirname, '../../videos');
        const originalDir = path.join(videoDir, 'originals');
        const hlsDir = path.join(videoDir, 'hls', videoId);
        const thumbnailDir = path.join(videoDir, 'thumbnails');

        await Promise.all([
            fs.mkdir(originalDir, { recursive: true }),
            fs.mkdir(hlsDir, { recursive: true }),
            fs.mkdir(thumbnailDir, { recursive: true })
        ]);

        // Copier le fichier original
        const originalPath = path.join(originalDir, `${videoId}_original${path.extname(inputPath)}`);
        await fs.copyFile(inputPath, originalPath);

        // Mettre à jour le chemin du fichier original en base
        await db.query(
            'UPDATE videos SET file_path = $1, processing_progress = $2 WHERE id = $3',
            [originalPath, 10, videoId]
        );

        // Obtenir les informations vidéo
        const videoInfo = await ffmpegService.getVideoInfo(originalPath);
        logger.video('Informations vidéo obtenues', { videoId, videoInfo });

        // Générer la miniature
        const thumbnailPath = await generateThumbnail(videoId, originalPath, thumbnailDir);

        // Mettre à jour la miniature en base
        await db.query(
            'UPDATE videos SET thumbnail_url = $1, processing_progress = $2 WHERE id = $3',
            [`/static/thumbnails/${path.basename(thumbnailPath)}`, 20, videoId]
        );

        // Déterminer les qualités à générer en fonction de la résolution source
        const sourceHeight = videoInfo.height;
        const qualitiesToGenerate = VIDEO_QUALITIES.filter(q => q.height <= sourceHeight);

        logger.video('Qualités à générer', {
            videoId,
            sourceHeight,
            qualities: qualitiesToGenerate.map(q => q.name)
        });

        // Générer les différentes qualités et les segments HLS
        const progressStep = 70 / qualitiesToGenerate.length; // 70% pour l'encodage

        for (let i = 0; i < qualitiesToGenerate.length; i++) {
            const quality = qualitiesToGenerate[i];
            const currentProgress = 20 + (i * progressStep);

            try {
                await generateVideoQuality(videoId, originalPath, quality, hlsDir);

                // Mettre à jour le progrès
                await db.query(
                    'UPDATE videos SET processing_progress = $1 WHERE id = $2',
                    [Math.round(currentProgress), videoId]
                );

                logger.video('Qualité générée avec succès', {
                    videoId,
                    quality: quality.name,
                    progress: Math.round(currentProgress)
                });

            } catch (error) {
                logger.error('Erreur lors de la génération de qualité', {
                    videoId,
                    quality: quality.name,
                    error: error.message
                });
                // Continuer avec les autres qualités même si une échoue
            }
        }

        // Générer le playlist HLS principal
        await generateMasterPlaylist(videoId, hlsDir, qualitiesToGenerate);

        // Nettoyer le fichier temporaire
        try {
            await fs.unlink(inputPath);
        } catch (error) {
            logger.warn('Impossible de supprimer le fichier temporaire', { inputPath, error: error.message });
        }

        // Marquer la vidéo comme prête
        await db.query(
            'UPDATE videos SET status = $1, processing_progress = $2, published_at = CURRENT_TIMESTAMP WHERE id = $3',
            ['ready', 100, videoId]
        );

        logger.video('Traitement vidéo terminé avec succès', { videoId });

        // Envoyer une notification WebSocket si disponible
        const io = global.io || require('../app').io;
        if (io) {
            io.to(`user_${videoId}`).emit('video_processed', {
                videoId,
                status: 'ready',
                message: 'Votre vidéo a été traitée avec succès et est maintenant disponible'
            });
        }

        return { success: true, videoId };

    } catch (error) {
        logger.error('Erreur lors du traitement vidéo', {
            videoId,
            error: error.message,
            stack: error.stack
        });

        // Marquer la vidéo comme échouée
        await db.query(
            'UPDATE videos SET status = $1, error_message = $2 WHERE id = $3',
            ['failed', error.message, videoId]
        );

        // Envoyer une notification d'erreur
        const io = global.io || require('../app').io;
        if (io) {
            io.to(`user_${videoId}`).emit('video_processing_error', {
                videoId,
                status: 'failed',
                error: 'Erreur lors du traitement de la vidéo'
            });
        }

        throw error;
    }
};

// Générer une miniature pour la vidéo
const generateThumbnail = async (videoId, inputPath, outputDir) => {
    const thumbnailFilename = `${videoId}_thumb.jpg`;
    const thumbnailPath = path.join(outputDir, thumbnailFilename);

    try {
        await ffmpegService.generateThumbnail(inputPath, thumbnailPath, {
            timeOffset: '00:00:05', // Prendre la miniature à 5 secondes
            width: 640,
            height: 360
        });

        logger.video('Miniature générée', { videoId, thumbnailPath });
        return thumbnailPath;

    } catch (error) {
        logger.error('Erreur lors de la génération de miniature', {
            videoId,
            error: error.message
        });
        throw error;
    }
};

// Générer une qualité vidéo spécifique avec segments HLS
const generateVideoQuality = async (videoId, inputPath, quality, outputDir) => {
    const qualityDir = path.join(outputDir, quality.name);
    await fs.mkdir(qualityDir, { recursive: true });

    const outputFilename = `${videoId}_${quality.name}`;
    const playlistPath = path.join(qualityDir, `${outputFilename}.m3u8`);
    const segmentPattern = path.join(qualityDir, `${outputFilename}_%03d.ts`);

    // Générer les segments HLS pour cette qualité
    await ffmpegService.generateHLS(inputPath, playlistPath, {
        width: quality.width,
        height: quality.height,
        bitrate: quality.bitrate,
        segmentPattern: segmentPattern,
        segmentDuration: parseInt(process.env.HLS_SEGMENT_DURATION) || 10,
        playlistSize: parseInt(process.env.HLS_PLAYLIST_SIZE) || 6
    });

    // Calculer la taille du fichier (somme des segments)
    const segmentFiles = await fs.readdir(qualityDir);
    const tsFiles = segmentFiles.filter(file => file.endsWith('.ts'));

    let totalSize = 0;
    for (const file of tsFiles) {
        const filePath = path.join(qualityDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
    }

    // Enregistrer le format en base de données
    await db.query(`
    INSERT INTO video_formats (id, video_id, quality, file_path, file_size, bitrate, width, height, playlist_url)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (video_id, quality) 
    DO UPDATE SET file_path = $4, file_size = $5, bitrate = $6, width = $7, height = $8, playlist_url = $9
  `, [
        uuidv4(),
        videoId,
        quality.name,
        qualityDir,
        totalSize,
        parseInt(quality.bitrate.replace('k', '')) * 1000,
        quality.width,
        quality.height,
        `/static/hls/${videoId}/${quality.name}/${outputFilename}.m3u8`
    ]);

    logger.video('Format vidéo enregistré', {
        videoId,
        quality: quality.name,
        totalSize,
        segmentCount: tsFiles.length
    });
};

// Générer le playlist HLS principal (master playlist)
const generateMasterPlaylist = async (videoId, outputDir, qualities) => {
    const masterPlaylistPath = path.join(outputDir, 'master.m3u8');

    let playlistContent = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

    for (const quality of qualities) {
        const bandwidth = parseInt(quality.bitrate.replace('k', '')) * 1000;
        playlistContent += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${quality.width}x${quality.height}\n`;
        playlistContent += `${quality.name}/${videoId}_${quality.name}.m3u8\n\n`;
    }

    await fs.writeFile(masterPlaylistPath, playlistContent);

    // Mettre à jour l'URL du playlist principal en base
    await db.query(
        'UPDATE videos SET metadata = metadata || $1 WHERE id = $2',
        [JSON.stringify({ masterPlaylistUrl: `/static/hls/${videoId}/master.m3u8` }), videoId]
    );

    logger.video('Master playlist généré', { videoId, masterPlaylistPath });
};

// Supprimer tous les fichiers associés à une vidéo
const deleteVideoFiles = async (videoId) => {
    try {
        const videoDir = path.join(__dirname, '../../videos');
        const filesToDelete = [
            // Fichier original
            path.join(videoDir, 'originals', `${videoId}_original.*`),
            // Dossier HLS complet
            path.join(videoDir, 'hls', videoId),
            // Miniature
            path.join(videoDir, 'thumbnails', `${videoId}_thumb.jpg`)
        ];

        for (const filePattern of filesToDelete) {
            try {
                if (filePattern.includes('*')) {
                    // Gérer les patterns avec glob
                    const dir = path.dirname(filePattern);
                    const pattern = path.basename(filePattern);

                    if (fsSync.existsSync(dir)) {
                        const files = await fs.readdir(dir);
                        const matchingFiles = files.filter(file => {
                            const regex = new RegExp(pattern.replace('*', '.*'));
                            return regex.test(file);
                        });

                        for (const file of matchingFiles) {
                            await fs.unlink(path.join(dir, file));
                        }
                    }
                } else {
                    // Supprimer le fichier ou dossier directement
                    const stats = await fs.stat(filePattern).catch(() => null);
                    if (stats) {
                        if (stats.isDirectory()) {
                            await fs.rmdir(filePattern, { recursive: true });
                        } else {
                            await fs.unlink(filePattern);
                        }
                    }
                }
            } catch (error) {
                logger.warn('Impossible de supprimer le fichier', {
                    file: filePattern,
                    error: error.message
                });
            }
        }

        logger.video('Fichiers vidéo supprimés', { videoId });

    } catch (error) {
        logger.error('Erreur lors de la suppression des fichiers vidéo', {
            videoId,
            error: error.message
        });
        throw error;
    }
};

// Obtenir les informations de progression du traitement
const getProcessingProgress = async (videoId) => {
    try {
        const result = await db.query(
            'SELECT status, processing_progress, error_message FROM videos WHERE id = $1',
            [videoId]
        );

        if (result.rows.length === 0) {
            throw new Error('Vidéo non trouvée');
        }

        const video = result.rows[0];

        return {
            status: video.status,
            progress: video.processing_progress || 0,
            error: video.error_message
        };

    } catch (error) {
        logger.error('Erreur lors de la récupération du progrès', {
            videoId,
            error: error.message
        });
        throw error;
    }
};

// Retraiter une vidéo échouée
const reprocessVideo = async (videoId) => {
    try {
        const videoResult = await db.query(
            'SELECT file_path, status FROM videos WHERE id = $1',
            [videoId]
        );

        if (videoResult.rows.length === 0) {
            throw new Error('Vidéo non trouvée');
        }

        const video = videoResult.rows[0];

        if (video.status === 'processing') {
            throw new Error('Vidéo déjà en cours de traitement');
        }

        if (!fsSync.existsSync(video.file_path)) {
            throw new Error('Fichier vidéo original introuvable');
        }

        logger.video('Début du retraitement vidéo', { videoId });

        // Relancer le traitement
        return await processVideo(videoId, video.file_path);

    } catch (error) {
        logger.error('Erreur lors du retraitement vidéo', {
            videoId,
            error: error.message
        });
        throw error;
    }
};

// Générer des statistiques sur les vidéos
const getVideoStats = async (videoId) => {
    try {
        const statsQuery = `
      SELECT 
        v.view_count,
        v.like_count,
        v.dislike_count,
        v.comment_count,
        COUNT(DISTINCT vv.user_id) as unique_viewers,
        AVG(vv.completion_percentage) as avg_completion,
        COUNT(DISTINCT DATE(vv.watched_at)) as viewing_days
      FROM videos v
      LEFT JOIN video_views vv ON v.id = vv.video_id
      WHERE v.id = $1
      GROUP BY v.id, v.view_count, v.like_count, v.dislike_count, v.comment_count
    `;

        const result = await db.query(statsQuery, [videoId]);

        if (result.rows.length === 0) {
            throw new Error('Vidéo non trouvée');
        }

        const stats = result.rows[0];

        return {
            viewCount: parseInt(stats.view_count),
            likeCount: parseInt(stats.like_count),
            dislikeCount: parseInt(stats.dislike_count),
            commentCount: parseInt(stats.comment_count),
            uniqueViewers: parseInt(stats.unique_viewers || 0),
            averageCompletion: parseFloat(stats.avg_completion || 0),
            viewingDays: parseInt(stats.viewing_days || 0),
            engagementRate: stats.view_count > 0
                ? ((parseInt(stats.like_count) + parseInt(stats.dislike_count) + parseInt(stats.comment_count)) / parseInt(stats.view_count) * 100).toFixed(2)
                : 0
        };

    } catch (error) {
        logger.error('Erreur lors de la récupération des statistiques', {
            videoId,
            error: error.message
        });
        throw error;
    }
};

// Nettoyer les vidéos orphelines (fichiers sans entrée en base)
const cleanupOrphanedFiles = async () => {
    try {
        const videoDir = path.join(__dirname, '../../videos');
        const directories = ['originals', 'hls', 'thumbnails'];

        for (const dir of directories) {
            const fullPath = path.join(videoDir, dir);

            if (!fsSync.existsSync(fullPath)) continue;

            const files = await fs.readdir(fullPath);

            for (const file of files) {
                // Extraire l'ID vidéo du nom de fichier
                const videoIdMatch = file.match(/^([a-f0-9-]{36})/);
                if (!videoIdMatch) continue;

                const videoId = videoIdMatch[1];

                // Vérifier si la vidéo existe en base
                const videoExists = await db.query(
                    'SELECT id FROM videos WHERE id = $1',
                    [videoId]
                );

                if (videoExists.rows.length === 0) {
                    // Supprimer le fichier/dossier orphelin
                    const filePath = path.join(fullPath, file);
                    const stats = await fs.stat(filePath);

                    if (stats.isDirectory()) {
                        await fs.rmdir(filePath, { recursive: true });
                    } else {
                        await fs.unlink(filePath);
                    }

                    logger.info('Fichier orphelin supprimé', { filePath });
                }
            }
        }

        logger.info('Nettoyage des fichiers orphelins terminé');

    } catch (error) {
        logger.error('Erreur lors du nettoyage des fichiers orphelins', error);
    }
};

// Planifier le nettoyage automatique des fichiers orphelins
if (process.env.NODE_ENV === 'production') {
    setInterval(cleanupOrphanedFiles, 24 * 60 * 60 * 1000); // Une fois par jour
}

module.exports = {
    processVideo,
    generateThumbnail,
    deleteVideoFiles,
    getProcessingProgress,
    reprocessVideo,
    getVideoStats,
    cleanupOrphanedFiles,
    VIDEO_QUALITIES
};