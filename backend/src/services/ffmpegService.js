// backend/src/services/ffmpegService.js
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const logger = require('../utils/logger');

// Configuration FFmpeg
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE_PATH = process.env.FFPROBE_PATH || 'ffprobe';

// Définir les chemins FFmpeg si spécifiés
if (FFMPEG_PATH !== 'ffmpeg') {
    ffmpeg.setFfmpegPath(FFMPEG_PATH);
}
if (FFPROBE_PATH !== 'ffprobe') {
    ffmpeg.setFfprobePath(FFPROBE_PATH);
}

// Obtenir les informations détaillées d'une vidéo
const getVideoInfo = (inputPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
            if (err) {
                logger.error('Erreur FFprobe lors de l\'analyse vidéo', {
                    inputPath,
                    error: err.message
                });
                return reject(new Error(`Impossible d'analyser la vidéo: ${err.message}`));
            }

            try {
                const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
                const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');

                if (!videoStream) {
                    throw new Error('Aucun stream vidéo trouvé dans le fichier');
                }

                // Calculer le frame rate
                let frameRate = 30; // Défaut
                if (videoStream.r_frame_rate) {
                    const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
                    if (den && den !== 0) {
                        frameRate = Math.round((num / den) * 100) / 100;
                    }
                }

                const videoInfo = {
                    // Informations générales
                    duration: parseFloat(metadata.format.duration) || 0,
                    size: parseInt(metadata.format.size) || 0,
                    bitrate: parseInt(metadata.format.bit_rate) || 0,
                    format: metadata.format.format_name,

                    // Informations vidéo
                    width: videoStream.width,
                    height: videoStream.height,
                    frameRate: frameRate,
                    videoCodec: videoStream.codec_name,
                    pixelFormat: videoStream.pix_fmt,
                    videoBitrate: parseInt(videoStream.bit_rate) || 0,

                    // Informations audio
                    audioCodec: audioStream?.codec_name || null,
                    audioChannels: audioStream?.channels || 0,
                    audioSampleRate: audioStream?.sample_rate || 0,
                    audioBitrate: parseInt(audioStream?.bit_rate) || 0,

                    // Métadonnées
                    title: metadata.format.tags?.title || null,
                    artist: metadata.format.tags?.artist || null,
                    album: metadata.format.tags?.album || null,
                    date: metadata.format.tags?.date || null,

                    // Informations techniques
                    container: path.extname(inputPath).toLowerCase().slice(1),
                    hasVideo: !!videoStream,
                    hasAudio: !!audioStream,
                    isStreamable: ['mp4', 'webm', 'mov'].includes(path.extname(inputPath).toLowerCase().slice(1))
                };

                logger.video('Informations vidéo extraites', {
                    inputPath,
                    duration: videoInfo.duration,
                    resolution: `${videoInfo.width}x${videoInfo.height}`,
                    codec: videoInfo.videoCodec,
                    size: videoInfo.size
                });

                resolve(videoInfo);

            } catch (parseError) {
                logger.error('Erreur lors du parsing des métadonnées vidéo', {
                    inputPath,
                    error: parseError.message,
                    metadata: JSON.stringify(metadata, null, 2)
                });
                reject(new Error(`Erreur lors de l'analyse des métadonnées: ${parseError.message}`));
            }
        });
    });
};

// Générer une miniature à partir d'une vidéo
const generateThumbnail = (inputPath, outputPath, options = {}) => {
    return new Promise((resolve, reject) => {
        const {
            timeOffset = '00:00:05',
            width = 640,
            height = 360,
            quality = 80
        } = options;

        logger.video('Génération de miniature', {
            inputPath,
            outputPath,
            timeOffset,
            size: `${width}x${height}`
        });

        ffmpeg(inputPath)
            .screenshots({
                count: 1,
                folder: path.dirname(outputPath),
                filename: path.basename(outputPath),
                timemarks: [timeOffset],
                size: `${width}x${height}`
            })
            .on('end', () => {
                logger.video('Miniature générée avec succès', { outputPath });
                resolve(outputPath);
            })
            .on('error', (err) => {
                logger.error('Erreur lors de la génération de miniature', {
                    inputPath,
                    outputPath,
                    error: err.message
                });
                reject(new Error(`Erreur lors de la génération de miniature: ${err.message}`));
            });
    });
};

// Générer plusieurs miniatures à différents moments
const generateMultipleThumbnails = (inputPath, outputDir, options = {}) => {
    return new Promise((resolve, reject) => {
        const {
            count = 5,
            width = 640,
            height = 360,
            prefix = 'thumb'
        } = options;

        logger.video('Génération de miniatures multiples', {
            inputPath,
            outputDir,
            count,
            size: `${width}x${height}`
        });

        ffmpeg(inputPath)
            .screenshots({
                count: count,
                folder: outputDir,
                filename: `${prefix}_%i.jpg`,
                size: `${width}x${height}`
            })
            .on('end', () => {
                const thumbnails = Array.from({ length: count }, (_, i) =>
                    path.join(outputDir, `${prefix}_${i + 1}.jpg`)
                );
                logger.video('Miniatures multiples générées', { count, outputDir });
                resolve(thumbnails);
            })
            .on('error', (err) => {
                logger.error('Erreur lors de la génération de miniatures multiples', {
                    inputPath,
                    error: err.message
                });
                reject(new Error(`Erreur lors de la génération de miniatures: ${err.message}`));
            });
    });
};

// Convertir une vidéo en format MP4 web-optimisé
const convertToWebMP4 = (inputPath, outputPath, options = {}) => {
    return new Promise((resolve, reject) => {
        const {
            width,
            height,
            bitrate = '2500k',
            audioBitrate = '128k',
            preset = 'medium',
            crf = 23
        } = options;

        logger.video('Conversion MP4 web', {
            inputPath,
            outputPath,
            resolution: `${width}x${height}`,
            bitrate
        });

        let command = ffmpeg(inputPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .audioBitrate(audioBitrate)
            .videoBitrate(bitrate)
            .addOption('-preset', preset)
            .addOption('-crf', crf)
            .addOption('-movflags', '+faststart') // Optimisation streaming
            .addOption('-pix_fmt', 'yuv420p'); // Compatibilité maximale

        // Redimensionner si nécessaire
        if (width && height) {
            command = command.size(`${width}x${height}`);
        }

        command
            .on('start', (commandLine) => {
                logger.debug('Commande FFmpeg démarrée', { commandLine });
            })
            .on('progress', (progress) => {
                logger.debug('Progrès conversion MP4', {
                    percent: progress.percent,
                    timemark: progress.timemark
                });
            })
            .on('end', () => {
                logger.video('Conversion MP4 terminée', { outputPath });
                resolve(outputPath);
            })
            .on('error', (err) => {
                logger.error('Erreur lors de la conversion MP4', {
                    inputPath,
                    outputPath,
                    error: err.message
                });
                reject(new Error(`Erreur lors de la conversion MP4: ${err.message}`));
            })
            .save(outputPath);
    });
};

// Générer des segments HLS pour le streaming adaptatif
const generateHLS = (inputPath, playlistPath, options = {}) => {
    return new Promise((resolve, reject) => {
        const {
            width,
            height,
            bitrate = '2500k',
            audioBitrate = '128k',
            segmentDuration = 10,
            playlistSize = 6,
            segmentPattern
        } = options;

        logger.video('Génération HLS', {
            inputPath,
            playlistPath,
            resolution: `${width}x${height}`,
            bitrate,
            segmentDuration
        });

        let command = ffmpeg(inputPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .audioBitrate(audioBitrate)
            .videoBitrate(bitrate)
            .addOption('-preset', 'medium')
            .addOption('-crf', '23')
            .addOption('-pix_fmt', 'yuv420p')
            .addOption('-profile:v', 'baseline')
            .addOption('-level', '3.0')
            .addOption('-start_number', '0')
            .addOption('-hls_time', segmentDuration)
            .addOption('-hls_list_size', playlistSize)
            .addOption('-hls_flags', 'delete_segments')
            .addOption('-f', 'hls');

        // Redimensionner si nécessaire
        if (width && height) {
            command = command.size(`${width}x${height}`);
        }

        // Pattern des segments si spécifié
        if (segmentPattern) {
            command = command.addOption('-hls_segment_filename', segmentPattern);
        }

        command
            .on('start', (commandLine) => {
                logger.debug('Commande FFmpeg HLS démarrée', { commandLine });
            })
            .on('progress', (progress) => {
                logger.debug('Progrès génération HLS', {
                    percent: progress.percent,
                    timemark: progress.timemark
                });
            })
            .on('end', () => {
                logger.video('Génération HLS terminée', { playlistPath });
                resolve(playlistPath);
            })
            .on('error', (err) => {
                logger.error('Erreur lors de la génération HLS', {
                    inputPath,
                    playlistPath,
                    error: err.message
                });
                reject(new Error(`Erreur lors de la génération HLS: ${err.message}`));
            })
            .save(playlistPath);
    });
};

// Extraire l'audio d'une vidéo
const extractAudio = (inputPath, outputPath, options = {}) => {
    return new Promise((resolve, reject) => {
        const {
            format = 'mp3',
            bitrate = '192k',
            sampleRate = 44100
        } = options;

        logger.video('Extraction audio', {
            inputPath,
            outputPath,
            format,
            bitrate
        });

        ffmpeg(inputPath)
            .noVideo()
            .audioCodec(format === 'mp3' ? 'mp3' : 'aac')
            .audioBitrate(bitrate)
            .audioFrequency(sampleRate)
            .on('start', (commandLine) => {
                logger.debug('Commande FFmpeg extraction audio démarrée', { commandLine });
            })
            .on('progress', (progress) => {
                logger.debug('Progrès extraction audio', {
                    percent: progress.percent,
                    timemark: progress.timemark
                });
            })
            .on('end', () => {
                logger.video('Extraction audio terminée', { outputPath });
                resolve(outputPath);
            })
            .on('error', (err) => {
                logger.error('Erreur lors de l\'extraction audio', {
                    inputPath,
                    outputPath,
                    error: err.message
                });
                reject(new Error(`Erreur lors de l'extraction audio: ${err.message}`));
            })
            .save(outputPath);
    });
};

// Créer un GIF animé à partir d'une vidéo
const createAnimatedGIF = (inputPath, outputPath, options = {}) => {
    return new Promise((resolve, reject) => {
        const {
            startTime = '00:00:00',
            duration = 5,
            width = 480,
            fps = 15,
            quality = 'medium'
        } = options;

        logger.video('Création GIF animé', {
            inputPath,
            outputPath,
            startTime,
            duration,
            size: `${width}px`,
            fps
        });

        // Palette de couleurs optimisée pour GIF
        const paletteFilters = quality === 'high'
            ? 'palettegen=stats_mode=diff'
            : 'palettegen';

        ffmpeg(inputPath)
            .seekInput(startTime)
            .duration(duration)
            .size(`${width}x?`)
            .fps(fps)
            .complexFilter([
                `[0:v] ${paletteFilters} [palette]`,
                `[0:v][palette] paletteuse=dither=bayer:bayer_scale=3`
            ])
            .on('start', (commandLine) => {
                logger.debug('Commande FFmpeg GIF démarrée', { commandLine });
            })
            .on('progress', (progress) => {
                logger.debug('Progrès création GIF', {
                    percent: progress.percent,
                    timemark: progress.timemark
                });
            })
            .on('end', () => {
                logger.video('GIF animé créé', { outputPath });
                resolve(outputPath);
            })
            .on('error', (err) => {
                logger.error('Erreur lors de la création de GIF', {
                    inputPath,
                    outputPath,
                    error: err.message
                });
                reject(new Error(`Erreur lors de la création de GIF: ${err.message}`));
            })
            .save(outputPath);
    });
};

// Valider si FFmpeg est disponible et fonctionnel
const validateFFmpeg = () => {
    return new Promise((resolve, reject) => {
        ffmpeg.getAvailableFormats((err, formats) => {
            if (err) {
                logger.error('FFmpeg non disponible', { error: err.message });
                reject(new Error('FFmpeg n\'est pas installé ou accessible'));
            } else {
                logger.info('FFmpeg validé avec succès', {
                    formatCount: Object.keys(formats).length
                });
                resolve(true);
            }
        });
    });
};

// Obtenir les codecs disponibles
const getAvailableCodecs = () => {
    return new Promise((resolve, reject) => {
        ffmpeg.getAvailableCodecs((err, codecs) => {
            if (err) {
                reject(err);
            } else {
                resolve(codecs);
            }
        });
    });
};

// Analyser la qualité vidéo et recommander des optimisations
const analyzeVideoQuality = async (inputPath) => {
    try {
        const videoInfo = await getVideoInfo(inputPath);

        const analysis = {
            quality: 'good',
            recommendations: [],
            issues: [],
            optimizations: []
        };

        // Vérifier la résolution
        if (videoInfo.width < 640 || videoInfo.height < 360) {
            analysis.quality = 'poor';
            analysis.issues.push('Résolution très faible');
        } else if (videoInfo.width < 1280 || videoInfo.height < 720) {
            analysis.quality = 'fair';
            analysis.recommendations.push('Considérer une résolution plus élevée pour une meilleure qualité');
        }

        // Vérifier le bitrate
        if (videoInfo.videoBitrate < 500000) { // < 500kbps
            analysis.quality = 'poor';
            analysis.issues.push('Bitrate vidéo très faible');
        }

        // Vérifier le codec
        if (!['h264', 'x264', 'libx264'].includes(videoInfo.videoCodec.toLowerCase())) {
            analysis.recommendations.push('Convertir en H.264 pour une meilleure compatibilité');
        }

        // Recommandations de format
        if (!videoInfo.isStreamable) {
            analysis.optimizations.push('Convertir en MP4 pour un streaming optimal');
        }

        // Vérifier l'audio
        if (!videoInfo.hasAudio) {
            analysis.issues.push('Aucune piste audio détectée');
        } else if (videoInfo.audioCodec !== 'aac') {
            analysis.recommendations.push('Convertir l\'audio en AAC pour une meilleure compatibilité');
        }

        return analysis;

    } catch (error) {
        logger.error('Erreur lors de l\'analyse qualité vidéo', {
            inputPath,
            error: error.message
        });
        throw error;
    }
};

module.exports = {
    getVideoInfo,
    generateThumbnail,
    generateMultipleThumbnails,
    convertToWebMP4,
    generateHLS,
    extractAudio,
    createAnimatedGIF,
    validateFFmpeg,
    getAvailableCodecs,
    analyzeVideoQuality
};