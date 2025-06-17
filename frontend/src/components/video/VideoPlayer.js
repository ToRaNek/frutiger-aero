// frontend/src/components/video/VideoPlayer.js
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    Maximize,
    Minimize,
    Settings,
    SkipBack,
    SkipForward,
    Download,
    Share2,
    PictureInPicture,
    RotateCcw,
    RotateCw,
    Loader
} from 'lucide-react';
import { useVideo } from '../../hooks/useVideo';
import Modal from '../common/Modal';
import { formatDuration } from '../../utils/formatters';
import { debounce } from '../../utils/helpers';

/**
 * Lecteur vidéo HLS complet avec contrôles personnalisés Frutiger Aero
 */
const VideoPlayer = ({
                         videoId,
                         src,
                         poster,
                         autoplay = false,
                         muted = false,
                         controls = true,
                         loop = false,
                         preload = 'metadata',
                         qualities = [],
                         subtitles = [],
                         onPlay,
                         onPause,
                         onEnded,
                         onTimeUpdate,
                         onError,
                         className = '',
                         height = 'auto',
                         width = '100%',
                         responsive = true
                     }) => {
    // États locaux du lecteur
    const [isControlsVisible, setIsControlsVisible] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [showSkipIndicator, setShowSkipIndicator] = useState({ direction: null, show: false });
    const [touchStart, setTouchStart] = useState({ x: 0, y: 0, time: 0 });
    const [isGestureActive, setIsGestureActive] = useState(false);
    const [networkQuality, setNetworkQuality] = useState('auto');
    const [bufferHealth, setBufferHealth] = useState(0);

    // Refs
    const containerRef = useRef(null);
    const videoRef = useRef(null);
    const controlsTimeoutRef = useRef(null);
    const gestureTimeoutRef = useRef(null);
    const progressRef = useRef(null);
    const volumeRef = useRef(null);

    // Hook personnalisé pour la gestion vidéo
    const {
        player,
        actions,
        isLoading,
        currentVideo,
        videoRef: hookVideoRef
    } = useVideoPlayer(videoId, {
        autoplay,
        muted,
        controls: false // On utilise nos propres contrôles
    });

    // Synchroniser les refs
    useEffect(() => {
        if (hookVideoRef.current) {
            videoRef.current = hookVideoRef.current;
        }
    }, [hookVideoRef]);

    // Surveillance de la qualité réseau
    const monitorNetworkQuality = useCallback(() => {
        if (!videoRef.current) return;

        const video = videoRef.current;
        const buffered = video.buffered;
        const currentTime = video.currentTime;

        if (buffered.length > 0) {
            const bufferEnd = buffered.end(buffered.length - 1);
            const bufferAhead = bufferEnd - currentTime;
            setBufferHealth(Math.min(bufferAhead / 10, 1)); // 10 secondes = 100%

            // Ajuster la qualité selon le buffer
            if (bufferAhead < 2 && networkQuality !== 'low') {
                setNetworkQuality('low');
            } else if (bufferAhead > 5 && networkQuality !== 'auto') {
                setNetworkQuality('auto');
            }
        }
    }, [networkQuality]);

    // Timer pour masquer les contrôles
    const hideControlsTimer = useCallback(() => {
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            if (player.isPlaying && !player.isFullscreen) {
                setIsControlsVisible(false);
            }
        }, 3000);
    }, [player.isPlaying, player.isFullscreen]);

    // Gestion du mouvement de souris
    const handleMouseMove = useCallback(() => {
        setIsControlsVisible(true);
        hideControlsTimer();
    }, [hideControlsTimer]);

    // Gestion des touches clavier
    const handleKeyDown = useCallback((e) => {
        if (!videoRef.current) return;

        const video = videoRef.current;
        const { key } = e;

        switch (key) {
            case ' ':
            case 'k':
                e.preventDefault();
                actions.togglePlay();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                actions.setCurrentTime(Math.max(0, player.currentTime - 10));
                setShowSkipIndicator({ direction: 'backward', show: true });
                setTimeout(() => setShowSkipIndicator({ direction: null, show: false }), 800);
                break;
            case 'ArrowRight':
                e.preventDefault();
                actions.setCurrentTime(Math.min(player.duration, player.currentTime + 10));
                setShowSkipIndicator({ direction: 'forward', show: true });
                setTimeout(() => setShowSkipIndicator({ direction: null, show: false }), 800);
                break;
            case 'ArrowUp':
                e.preventDefault();
                actions.setVolume(Math.min(1, player.volume + 0.1));
                break;
            case 'ArrowDown':
                e.preventDefault();
                actions.setVolume(Math.max(0, player.volume - 0.1));
                break;
            case 'm':
                e.preventDefault();
                actions.toggleMute();
                break;
            case 'f':
                e.preventDefault();
                actions.toggleFullscreen();
                break;
            case 'Escape':
                if (player.isFullscreen) {
                    actions.setFullscreen(false);
                }
                break;
            default:
                break;
        }
    }, [actions, player]);

    // Gestion Picture-in-Picture
    const handlePictureInPicture = useCallback(async () => {
        if (!videoRef.current) return;

        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await videoRef.current.requestPictureInPicture();
            }
        } catch (error) {
            console.error('Picture-in-Picture error:', error);
        }
    }, []);

    // Gestion du téléchargement
    const handleDownload = useCallback(() => {
        if (currentVideo?.downloadUrl) {
            const link = document.createElement('a');
            link.href = currentVideo.downloadUrl;
            link.download = `${currentVideo.title}.mp4`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }, [currentVideo]);

    // Gestion du partage
    const handleShare = useCallback(async () => {
        if (navigator.share && currentVideo) {
            try {
                await navigator.share({
                    title: currentVideo.title,
                    text: currentVideo.description,
                    url: window.location.href,
                });
            } catch (error) {
                // Fallback vers le modal de partage
                setIsShareModalOpen(true);
            }
        } else {
            setIsShareModalOpen(true);
        }
    }, [currentVideo]);

    // Gestion des gestes tactiles
    const handleTouchStart = useCallback((e) => {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            setTouchStart({
                x: touch.clientX,
                y: touch.clientY,
                time: Date.now()
            });
        }
    }, []);

    const handleTouchEnd = useCallback((e) => {
        if (!touchStart.x || e.touches.length > 0) return;

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStart.x;
        const deltaY = touch.clientY - touchStart.y;
        const deltaTime = Date.now() - touchStart.time;

        // Détection des gestes
        if (Math.abs(deltaX) > 50 && deltaTime < 500) {
            if (deltaX > 0) {
                // Swipe vers la droite - avancer
                actions.setCurrentTime(Math.min(player.duration, player.currentTime + 10));
                setShowSkipIndicator({ direction: 'forward', show: true });
            } else {
                // Swipe vers la gauche - reculer
                actions.setCurrentTime(Math.max(0, player.currentTime - 10));
                setShowSkipIndicator({ direction: 'backward', show: true });
            }
            setTimeout(() => setShowSkipIndicator({ direction: null, show: false }), 800);
        } else if (Math.abs(deltaY) > 50 && deltaTime < 500) {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                const isLeftSide = touchStart.x < rect.width / 2;

                if (isLeftSide) {
                    // Côté gauche - luminosité (simulé avec opacité)
                    const brightness = deltaY > 0 ? -0.1 : 0.1;
                    // Note: la vraie luminosité nécessiterait une API native
                } else {
                    // Côté droit - volume
                    const volumeChange = deltaY > 0 ? -0.1 : 0.1;
                    actions.setVolume(Math.max(0, Math.min(1, player.volume + volumeChange)));
                }
            }
        } else if (deltaTime < 300 && Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20) {
            // Tap simple - toggle play/pause
            actions.togglePlay();
        }

        setTouchStart({ x: 0, y: 0, time: 0 });
    }, [touchStart, actions, player]);

    // Double tap pour fullscreen
    const handleDoubleClick = useCallback(() => {
        actions.toggleFullscreen();
    }, [actions]);

    // Debounced monitoring
    const debouncedMonitoring = useMemo(
        () => debounce(monitorNetworkQuality, 1000),
        [monitorNetworkQuality]
    );

    // Effects
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Event listeners
        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('touchstart', handleTouchStart);
        container.addEventListener('touchend', handleTouchEnd);
        container.addEventListener('dblclick', handleDoubleClick);
        document.addEventListener('keydown', handleKeyDown);

        // Monitoring interval
        const monitoringInterval = setInterval(debouncedMonitoring, 2000);

        return () => {
            container.removeEventListener('mousemove', handleMouseMove);
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchend', handleTouchEnd);
            container.removeEventListener('dblclick', handleDoubleClick);
            document.removeEventListener('keydown', handleKeyDown);
            clearInterval(monitoringInterval);

            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, [handleMouseMove, handleTouchStart, handleTouchEnd, handleDoubleClick, handleKeyDown, debouncedMonitoring]);

    // Callbacks vers le parent
    useEffect(() => {
        if (player.isPlaying && onPlay) onPlay();
        if (!player.isPlaying && onPause) onPause();
    }, [player.isPlaying, onPlay, onPause]);

    useEffect(() => {
        if (onTimeUpdate) onTimeUpdate(player.currentTime);
    }, [player.currentTime, onTimeUpdate]);

    // Classes CSS
    const containerClasses = [
        'frutiger-video-player',
        responsive && 'responsive',
        player.isFullscreen && 'fullscreen',
        isControlsVisible && 'controls-visible',
        isLoading && 'loading',
        className
    ].filter(Boolean).join(' ');

    return (
        <div
            ref={containerRef}
            className={containerClasses}
            style={{ width, height }}
            tabIndex={0}
        >
            {/* Aurora overlay */}
            <div className="frutiger-video-aurora-overlay" />

            {/* Video element */}
            <video
                ref={hookVideoRef}
                src={src}
                poster={poster}
                loop={loop}
                preload={preload}
                playsInline
                className="video-element"
            />

            {/* Loading overlay */}
            {isLoading && (
                <div className="loading-overlay glass-panel">
                    <div className="frutiger-loading-aurora"></div>
                    <span>Chargement...</span>
                </div>
            )}

            {/* Skip indicators */}
            <SkipIndicators
                show={showSkipIndicator.show}
                direction={showSkipIndicator.direction}
            />

            {/* Buffer indicator */}
            <div className="buffer-indicator">
                <div
                    className="buffer-bar"
                    style={{ width: `${bufferHealth * 100}%` }}
                />
            </div>

            {/* Main controls */}
            {controls && (
                <VideoControls
                    player={player}
                    actions={actions}
                    qualities={qualities}
                    subtitles={subtitles}
                    isVisible={isControlsVisible}
                    onSettings={() => setIsSettingsOpen(true)}
                    onShare={handleShare}
                    onDownload={handleDownload}
                    onPictureInPicture={handlePictureInPicture}
                    networkQuality={networkQuality}
                    bufferHealth={bufferHealth}
                />
            )}

            {/* Settings Modal */}
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                player={player}
                actions={actions}
                qualities={qualities}
                subtitles={subtitles}
            />

            {/* Share Modal */}
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                video={currentVideo}
                currentTime={player.currentTime}
            />
        </div>
    );
};

/**
 * Indicateurs visuels pour les gestes de skip
 */
const SkipIndicators = ({ show, direction }) => {
    if (!show) return null;

    return (
        <div className={`skip-indicators ${direction}`}>
            <div className="skip-indicator">
                {direction === 'forward' ? (
                    <SkipForward size={48} />
                ) : (
                    <SkipBack size={48} />
                )}
                <span>{direction === 'forward' ? '+10s' : '-10s'}</span>
            </div>
        </div>
    );
};

/**
 * Contrôles personnalisés du lecteur vidéo
 */
const VideoControls = ({
                           player,
                           actions,
                           qualities,
                           subtitles,
                           isVisible,
                           onSettings,
                           onShare,
                           onDownload,
                           onPictureInPicture,
                           networkQuality,
                           bufferHealth
                       }) => {
    const [isDraggingProgress, setIsDraggingProgress] = useState(false);
    const [isDraggingVolume, setIsDraggingVolume] = useState(false);
    const [previewTime, setPreviewTime] = useState(0);
    const [showPreview, setShowPreview] = useState(false);

    // Gestion de la progression
    const handleProgressMouseDown = useCallback((e) => {
        setIsDraggingProgress(true);
        updateProgress(e);
    }, []);

    const handleProgressMouseMove = useCallback((e) => {
        if (isDraggingProgress) {
            updateProgress(e);
        } else {
            updatePreview(e);
        }
    }, [isDraggingProgress]);

    const handleProgressMouseUp = useCallback(() => {
        setIsDraggingProgress(false);
    }, []);

    const updateProgress = useCallback((e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const time = Math.max(0, Math.min(player.duration, percent * player.duration));
        actions.setCurrentTime(time);
    }, [player.duration, actions]);

    const updatePreview = useCallback((e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const time = Math.max(0, Math.min(player.duration, percent * player.duration));
        setPreviewTime(time);
        setShowPreview(true);
    }, [player.duration]);

    // Gestion du volume
    const handleVolumeMouseDown = useCallback((e) => {
        setIsDraggingVolume(true);
        updateVolume(e);
    }, []);

    const handleVolumeMouseMove = useCallback((e) => {
        if (isDraggingVolume) {
            updateVolume(e);
        }
    }, [isDraggingVolume]);

    const handleVolumeMouseUp = useCallback(() => {
        setIsDraggingVolume(false);
    }, []);

    const updateVolume = useCallback((e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const volume = Math.max(0, Math.min(1, percent));
        actions.setVolume(volume);
    }, [actions]);

    // Raccourcis
    const handleSkipBackward = () => {
        actions.setCurrentTime(Math.max(0, player.currentTime - 10));
    };

    const handleSkipForward = () => {
        actions.setCurrentTime(Math.min(player.duration, player.currentTime + 10));
    };

    const handlePlaybackRateChange = (rate) => {
        actions.setPlaybackRate(rate);
    };

    // Icône de volume selon le niveau
    const getVolumeIcon = () => {
        if (player.isMuted || player.volume === 0) return VolumeX;
        return Volume2;
    };

    const VolumeIcon = getVolumeIcon();

    if (!isVisible) return null;

    return (
        <div className="video-controls glass-panel">
            {/* Barre de progression */}
            <div
                className="progress-container"
                onMouseDown={handleProgressMouseDown}
                onMouseMove={handleProgressMouseMove}
                onMouseUp={handleProgressMouseUp}
                onMouseLeave={() => setShowPreview(false)}
            >
                <div className="progress-bar">
                    <div
                        className="progress-filled"
                        style={{ width: `${(player.currentTime / player.duration) * 100}%` }}
                    />
                    <div
                        className="progress-buffered"
                        style={{ width: `${bufferHealth * 100}%` }}
                    />
                </div>

                {/* Preview tooltip */}
                {showPreview && (
                    <div
                        className="progress-preview glass-tooltip"
                        style={{ left: `${(previewTime / player.duration) * 100}%` }}
                    >
                        {formatDuration(previewTime)}
                    </div>
                )}
            </div>

            {/* Contrôles principaux */}
            <div className="controls-main">
                {/* Contrôles de lecture */}
                <div className="controls-left">
                    <button
                        className="frutiger-btn frutiger-btn-glass control-btn"
                        onClick={handleSkipBackward}
                        aria-label="Reculer de 10 secondes"
                    >
                        <SkipBack size={18} />
                    </button>

                    <button
                        className="frutiger-btn frutiger-btn-primary control-btn play-btn"
                        onClick={actions.togglePlay}
                        aria-label={player.isPlaying ? 'Pause' : 'Lecture'}
                    >
                        {player.isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>

                    <button
                        className="frutiger-btn frutiger-btn-glass control-btn"
                        onClick={handleSkipForward}
                        aria-label="Avancer de 10 secondes"
                    >
                        <SkipForward size={18} />
                    </button>

                    {/* Volume */}
                    <div className="volume-container">
                        <button
                            className="frutiger-btn frutiger-btn-glass control-btn"
                            onClick={actions.toggleMute}
                            aria-label={player.isMuted ? 'Activer le son' : 'Couper le son'}
                        >
                            <VolumeIcon size={18} />
                        </button>

                        <div
                            className="volume-slider"
                            onMouseDown={handleVolumeMouseDown}
                            onMouseMove={handleVolumeMouseMove}
                            onMouseUp={handleVolumeMouseUp}
                        >
                            <div className="volume-bar">
                                <div
                                    className="volume-filled"
                                    style={{ width: `${player.isMuted ? 0 : player.volume * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Temps */}
                    <div className="time-display">
                        <span>{formatDuration(player.currentTime)}</span>
                        <span>/</span>
                        <span>{formatDuration(player.duration)}</span>
                    </div>
                </div>

                {/* Contrôles de droite */}
                <div className="controls-right">
                    {/* Vitesse de lecture */}
                    <div className="playback-rate">
                        <select
                            value={player.playbackRate}
                            onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                            className="frutiger-input"
                        >
                            <option value={0.5}>0.5x</option>
                            <option value={0.75}>0.75x</option>
                            <option value={1}>1x</option>
                            <option value={1.25}>1.25x</option>
                            <option value={1.5}>1.5x</option>
                            <option value={2}>2x</option>
                        </select>
                    </div>

                    {/* Boutons d'action */}
                    <button
                        className="frutiger-btn frutiger-btn-glass control-btn"
                        onClick={onPictureInPicture}
                        aria-label="Picture-in-Picture"
                    >
                        <PictureInPicture size={18} />
                    </button>

                    <button
                        className="frutiger-btn frutiger-btn-glass control-btn"
                        onClick={onDownload}
                        aria-label="Télécharger"
                    >
                        <Download size={18} />
                    </button>

                    <button
                        className="frutiger-btn frutiger-btn-glass control-btn"
                        onClick={onShare}
                        aria-label="Partager"
                    >
                        <Share2 size={18} />
                    </button>

                    <button
                        className="frutiger-btn frutiger-btn-glass control-btn"
                        onClick={onSettings}
                        aria-label="Paramètres"
                    >
                        <Settings size={18} />
                    </button>

                    <button
                        className="frutiger-btn frutiger-btn-glass control-btn"
                        onClick={actions.toggleFullscreen}
                        aria-label={player.isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
                    >
                        {player.isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                    </button>
                </div>
            </div>

            {/* Indicateur de qualité réseau */}
            <div className={`network-indicator quality-${networkQuality}`}>
                <div className="network-dots">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                </div>
            </div>
        </div>
    );
};

/**
 * Modal des paramètres du lecteur
 */
const SettingsModal = ({ isOpen, onClose, player, actions, qualities, subtitles }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Paramètres du lecteur" size="medium">
            <div className="settings-content">
                <QualitySettings
                    qualities={qualities}
                    currentQuality={player.quality}
                    onQualityChange={actions.setQuality}
                />

                <SpeedSettings
                    currentSpeed={player.playbackRate}
                    onSpeedChange={actions.setPlaybackRate}
                />

                <SubtitleSettings
                    subtitles={subtitles}
                    currentSubtitle={player.subtitle}
                    onSubtitleChange={actions.setSubtitle}
                />
            </div>
        </Modal>
    );
};

/**
 * Paramètres de qualité
 */
const QualitySettings = ({ qualities, currentQuality, onQualityChange }) => {
    return (
        <div className="setting-group">
            <h4>Qualité</h4>
            <div className="quality-options">
                <label className="setting-option">
                    <input
                        type="radio"
                        name="quality"
                        value="auto"
                        checked={currentQuality === 'auto'}
                        onChange={() => onQualityChange('auto')}
                    />
                    <span>Auto</span>
                </label>
                {qualities.map(quality => (
                    <label key={quality.value} className="setting-option">
                        <input
                            type="radio"
                            name="quality"
                            value={quality.value}
                            checked={currentQuality === quality.value}
                            onChange={() => onQualityChange(quality.value)}
                        />
                        <span>{quality.label}</span>
                    </label>
                ))}
            </div>
        </div>
    );
};

/**
 * Paramètres de vitesse
 */
const SpeedSettings = ({ currentSpeed, onSpeedChange }) => {
    const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

    return (
        <div className="setting-group">
            <h4>Vitesse de lecture</h4>
            <div className="speed-options">
                {speeds.map(speed => (
                    <label key={speed} className="setting-option">
                        <input
                            type="radio"
                            name="speed"
                            value={speed}
                            checked={currentSpeed === speed}
                            onChange={() => onSpeedChange(speed)}
                        />
                        <span>{speed}x</span>
                    </label>
                ))}
            </div>
        </div>
    );
};

/**
 * Paramètres de sous-titres
 */
const SubtitleSettings = ({ subtitles, currentSubtitle, onSubtitleChange }) => {
    return (
        <div className="setting-group">
            <h4>Sous-titres</h4>
            <div className="subtitle-options">
                <label className="setting-option">
                    <input
                        type="radio"
                        name="subtitle"
                        value="off"
                        checked={currentSubtitle === 'off'}
                        onChange={() => onSubtitleChange('off')}
                    />
                    <span>Désactivés</span>
                </label>
                {subtitles.map(subtitle => (
                    <label key={subtitle.value} className="setting-option">
                        <input
                            type="radio"
                            name="subtitle"
                            value={subtitle.value}
                            checked={currentSubtitle === subtitle.value}
                            onChange={() => onSubtitleChange(subtitle.value)}
                        />
                        <span>{subtitle.label}</span>
                    </label>
                ))}
            </div>
        </div>
    );
};

/**
 * Modal de partage
 */
const ShareModal = ({ isOpen, onClose, video, currentTime }) => {
    const [withTimestamp, setWithTimestamp] = useState(false);

    const shareUrl = withTimestamp
        ? `${window.location.href}?t=${Math.floor(currentTime)}`
        : window.location.href;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            // Toast success
        } catch (error) {
            console.error('Copy failed:', error);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Partager cette vidéo" size="medium">
            <div className="share-content">
                <div className="share-option">
                    <label className="frutiger-switch">
                        <input
                            type="checkbox"
                            checked={withTimestamp}
                            onChange={(e) => setWithTimestamp(e.target.checked)}
                            className="frutiger-switch-input"
                        />
                        <span className="frutiger-switch-slider"></span>
                    </label>
                    <span>Commencer à {formatDuration(currentTime)}</span>
                </div>

                <div className="share-link">
                    <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="frutiger-input"
                    />
                    <button
                        onClick={handleCopyLink}
                        className="frutiger-btn frutiger-btn-primary"
                    >
                        Copier
                    </button>
                </div>

                <div className="share-social">
                    <h4>Partager sur</h4>
                    <div className="social-buttons">
                        <button className="frutiger-btn frutiger-btn-secondary">
                            Twitter
                        </button>
                        <button className="frutiger-btn frutiger-btn-secondary">
                            Facebook
                        </button>
                        <button className="frutiger-btn frutiger-btn-secondary">
                            LinkedIn
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default VideoPlayer;