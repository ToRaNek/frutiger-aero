// frontend/src/components/video/VideoControls.js

import React, { useState, useRef, useEffect } from 'react';
import {
    Play, Pause, Volume2, VolumeX, Volume1, Maximize, Minimize,
    SkipBack, SkipForward, Settings, Download, Share2,
    PictureInPicture, RotateCcw, RotateCw, Maximize2
} from 'lucide-react';
import { formatDuration } from '../../utils/formatters';
import { VIDEO_CONFIG, DEBOUNCE_DELAYS } from '../../utils/constants';
import { debounce } from '../../utils/helpers';

/**
 * Contrôles personnalisés pour le lecteur vidéo avec design Frutiger Aero
 *
 * Props:
 * - player: object - État du lecteur vidéo
 * - actions: object - Actions du lecteur vidéo
 * - qualities: array - Qualités disponibles
 * - subtitles: array - Sous-titres disponibles
 * - onSettings: function - Callback ouverture paramètres
 * - onShare: function - Callback partage
 * - onDownload: function - Callback téléchargement
 * - onPictureInPicture: function - Callback Picture-in-Picture
 * - showAdvanced: boolean - Afficher contrôles avancés
 * - showQualitySelector: boolean - Afficher sélecteur qualité
 * - showPlaybackRate: boolean - Afficher vitesse lecture
 * - compact: boolean - Mode compact
 */

const VideoControls = ({
                           player,
                           actions,
                           qualities = [],
                           subtitles = [],
                           onSettings,
                           onShare,
                           onDownload,
                           onPictureInPicture,
                           showAdvanced = true,
                           showQualitySelector = true,
                           showPlaybackRate = true,
                           compact = false
                       }) => {
    // État local
    const [isDragging, setIsDragging] = useState(false);
    const [isVolumeDragging, setIsVolumeDragging] = useState(false);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [previewTime, setPreviewTime] = useState(null);
    const [previewPosition, setPreviewPosition] = useState(0);

    // Refs
    const progressRef = useRef(null);
    const volumeRef = useRef(null);
    const containerRef = useRef(null);

    // Gestion de la barre de progression
    const handleProgressMouseDown = (e) => {
        if (!progressRef.current) return;

        setIsDragging(true);
        updateProgress(e);
    };

    const handleProgressMouseMove = (e) => {
        if (!progressRef.current) return;

        if (isDragging) {
            updateProgress(e);
        } else {
            // Preview du temps au survol
            updatePreview(e);
        }
    };

    const handleProgressMouseUp = () => {
        setIsDragging(false);
    };

    const updateProgress = (e) => {
        if (!progressRef.current || !player.duration) return;

        const rect = progressRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newTime = percent * player.duration;

        actions.setCurrentTime(newTime);
        if (player.isPlaying || isDragging) {
            actions.seek(newTime);
        }
    };

    const updatePreview = (e) => {
        if (!progressRef.current || !player.duration || isDragging) return;

        const rect = progressRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const time = percent * player.duration;

        setPreviewTime(time);
        setPreviewPosition(e.clientX - rect.left);
    };

    // Gestion du volume
    const handleVolumeMouseDown = (e) => {
        if (!volumeRef.current) return;

        setIsVolumeDragging(true);
        updateVolume(e);
    };

    const handleVolumeMouseMove = (e) => {
        if (isVolumeDragging) {
            updateVolume(e);
        }
    };

    const handleVolumeMouseUp = () => {
        setIsVolumeDragging(false);
    };

    const updateVolume = (e) => {
        if (!volumeRef.current) return;

        const rect = volumeRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

        actions.setVolume(percent);
        if (percent > 0) {
            actions.setMuted(false);
        }
    };

    // Gestionnaires d'événements globaux
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) {
                handleProgressMouseMove(e);
            }
            if (isVolumeDragging) {
                handleVolumeMouseMove(e);
            }
        };

        const handleMouseUp = () => {
            handleProgressMouseUp();
            handleVolumeMouseUp();
        };

        if (isDragging || isVolumeDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isVolumeDragging]);

    // Calculs pour les barres de progression
    const progressPercent = player.duration ? (player.currentTime / player.duration) * 100 : 0;
    const bufferPercent = player.duration && player.buffered?.length > 0
        ? (player.buffered.end(player.buffered.length - 1) / player.duration) * 100
        : 0;

    // Icône de volume selon le niveau
    const getVolumeIcon = () => {
        if (player.isMuted || player.volume === 0) return VolumeX;
        if (player.volume < 0.5) return Volume1;
        return Volume2;
    };

    const VolumeIcon = getVolumeIcon();

    // Actions rapides
    const handleSkipBackward = () => {
        actions.seek(Math.max(0, player.currentTime - 10));
    };

    const handleSkipForward = () => {
        actions.seek(Math.min(player.duration, player.currentTime + 10));
    };

    const handlePlaybackRateChange = () => {
        const rates = VIDEO_CONFIG.PLAYBACK_RATES;
        const currentIndex = rates.indexOf(player.playbackRate);
        const nextIndex = (currentIndex + 1) % rates.length;
        actions.setPlaybackRate(rates[nextIndex]);
    };

    return (
        <div
            ref={containerRef}
            className={`
        px-4 py-3 space-y-3 backdrop-blur-md
        ${compact ? 'px-2 py-2 space-y-2' : ''}
      `}
        >
            {/* Barre de progression */}
            <div className="relative group">
                {/* Preview tooltip */}
                {previewTime !== null && !isDragging && (
                    <div
                        className="
              absolute bottom-full mb-2 px-2 py-1 bg-black/90 text-white text-xs
              rounded backdrop-blur-sm transform -translate-x-1/2 pointer-events-none
            "
                        style={{ left: `${previewPosition}px` }}
                    >
                        {formatDuration(previewTime)}
                    </div>
                )}

                {/* Container de la barre de progression */}
                <div
                    ref={progressRef}
                    className="relative h-2 bg-white/20 rounded-full cursor-pointer group-hover:h-3 transition-all duration-200"
                    onMouseDown={handleProgressMouseDown}
                    onMouseMove={handleProgressMouseMove}
                    onMouseLeave={() => setPreviewTime(null)}
                >
                    {/* Barre de buffer */}
                    <div
                        className="absolute inset-y-0 left-0 bg-white/30 rounded-full transition-all duration-300"
                        style={{ width: `${bufferPercent}%` }}
                    />

                    {/* Barre de progression */}
                    <div
                        className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                    />

                    {/* Curseur */}
                    <div
                        className="
              absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2
              w-4 h-4 bg-blue-500 rounded-full shadow-lg
              opacity-0 group-hover:opacity-100 transition-opacity duration-200
            "
                        style={{ left: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Contrôles principaux */}
            <div className={`flex items-center justify-between ${compact ? 'text-sm' : ''}`}>
                {/* Groupe gauche - Lecture */}
                <div className="flex items-center space-x-3">
                    {/* Bouton Play/Pause */}
                    <button
                        onClick={actions.togglePlay}
                        className="
              p-2 text-white hover:text-blue-400 transition-colors
              hover:bg-white/10 rounded-full
            "
                        title={player.isPlaying ? 'Pause' : 'Lecture'}
                    >
                        {player.isPlaying ? (
                            <Pause className={compact ? 'w-5 h-5' : 'w-6 h-6'} />
                        ) : (
                            <Play className={compact ? 'w-5 h-5' : 'w-6 h-6 ml-0.5'} />
                        )}
                    </button>

                    {/* Boutons de saut */}
                    {!compact && (
                        <>
                            <button
                                onClick={handleSkipBackward}
                                className="
                  p-2 text-white/70 hover:text-white transition-colors
                  hover:bg-white/10 rounded-full
                "
                                title="Reculer de 10s"
                            >
                                <SkipBack className="w-5 h-5" />
                            </button>

                            <button
                                onClick={handleSkipForward}
                                className="
                  p-2 text-white/70 hover:text-white transition-colors
                  hover:bg-white/10 rounded-full
                "
                                title="Avancer de 10s"
                            >
                                <SkipForward className="w-5 h-5" />
                            </button>
                        </>
                    )}

                    {/* Contrôle du volume */}
                    <div
                        className="flex items-center space-x-2 group"
                        onMouseEnter={() => setShowVolumeSlider(true)}
                        onMouseLeave={() => setShowVolumeSlider(false)}
                    >
                        <button
                            onClick={actions.toggleMute}
                            className="
                p-2 text-white hover:text-blue-400 transition-colors
                hover:bg-white/10 rounded-full
              "
                            title={player.isMuted ? 'Activer le son' : 'Couper le son'}
                        >
                            <VolumeIcon className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
                        </button>

                        {/* Slider de volume */}
                        <div className={`
              overflow-hidden transition-all duration-300
              ${showVolumeSlider || isVolumeDragging ? 'w-20 opacity-100' : 'w-0 opacity-0'}
            `}>
                            <div
                                ref={volumeRef}
                                className="relative h-1 bg-white/20 rounded-full cursor-pointer"
                                onMouseDown={handleVolumeMouseDown}
                            >
                                <div
                                    className="absolute inset-y-0 left-0 bg-blue-500 rounded-full"
                                    style={{ width: `${player.volume * 100}%` }}
                                />
                                <div
                                    className="
                    absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2
                    w-3 h-3 bg-blue-500 rounded-full
                  "
                                    style={{ left: `${player.volume * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Temps */}
                    <div className="flex items-center space-x-1 text-white/90 text-sm">
                        <span>{formatDuration(player.currentTime)}</span>
                        <span className="text-white/60">/</span>
                        <span className="text-white/60">{formatDuration(player.duration)}</span>
                    </div>
                </div>

                {/* Groupe droite - Paramètres */}
                <div className="flex items-center space-x-2">
                    {/* Vitesse de lecture */}
                    {showPlaybackRate && !compact && (
                        <button
                            onClick={handlePlaybackRateChange}
                            className="
                px-2 py-1 text-white/70 hover:text-white transition-colors
                hover:bg-white/10 rounded text-sm min-w-12
              "
                            title="Vitesse de lecture"
                        >
                            {player.playbackRate}x
                        </button>
                    )}

                    {/* Sélecteur de qualité */}
                    {showQualitySelector && qualities.length > 0 && !compact && (
                        <QualitySelector
                            qualities={qualities}
                            currentQuality={player.quality}
                            onQualityChange={actions.setQuality}
                        />
                    )}

                    {/* Actions avancées */}
                    {showAdvanced && !compact && (
                        <>
                            {/* Sous-titres */}
                            {subtitles.length > 0 && (
                                <SubtitleSelector
                                    subtitles={subtitles}
                                    currentSubtitle={player.subtitle}
                                    onSubtitleChange={actions.setSubtitle}
                                />
                            )}

                            {/* Picture-in-Picture */}
                            {onPictureInPicture && (
                                <button
                                    onClick={onPictureInPicture}
                                    className="
                    p-2 text-white/70 hover:text-white transition-colors
                    hover:bg-white/10 rounded-full
                  "
                                    title="Picture-in-Picture"
                                >
                                    <PictureInPicture className="w-4 h-4" />
                                </button>
                            )}

                            {/* Téléchargement */}
                            {onDownload && (
                                <button
                                    onClick={onDownload}
                                    className="
                    p-2 text-white/70 hover:text-white transition-colors
                    hover:bg-white/10 rounded-full
                  "
                                    title="Télécharger"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                            )}

                            {/* Partage */}
                            {onShare && (
                                <button
                                    onClick={onShare}
                                    className="
                    p-2 text-white/70 hover:text-white transition-colors
                    hover:bg-white/10 rounded-full
                  "
                                    title="Partager"
                                >
                                    <Share2 className="w-4 h-4" />
                                </button>
                            )}
                        </>
                    )}

                    {/* Paramètres */}
                    {onSettings && (
                        <button
                            onClick={onSettings}
                            className="
                p-2 text-white/70 hover:text-white transition-colors
                hover:bg-white/10 rounded-full
              "
                            title="Paramètres"
                        >
                            <Settings className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
                        </button>
                    )}

                    {/* Plein écran */}
                    <button
                        onClick={actions.toggleFullscreen}
                        className="
              p-2 text-white hover:text-blue-400 transition-colors
              hover:bg-white/10 rounded-full
            "
                        title={player.isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
                    >
                        {player.isFullscreen ? (
                            <Minimize className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
                        ) : (
                            <Maximize className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * Sélecteur de qualité vidéo
 */
const QualitySelector = ({ qualities, currentQuality, onQualityChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    const availableQualities = [
        { value: 'auto', label: 'Auto' },
        ...qualities.map(q => ({
            value: q.height + 'p',
            label: `${q.height}p${q.fps > 30 ? ` ${q.fps}fps` : ''}`
        }))
    ];

    const currentLabel = availableQualities.find(q => q.value === currentQuality)?.label || 'Auto';

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="
          px-2 py-1 text-white/70 hover:text-white transition-colors
          hover:bg-white/10 rounded text-sm min-w-16
        "
                title="Qualité vidéo"
            >
                {currentLabel}
            </button>

            {isOpen && (
                <>
                    {/* Overlay pour fermer */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Menu déroulant */}
                    <div className="
            absolute bottom-full right-0 mb-2 py-2 bg-black/90 backdrop-blur-md
            rounded-lg border border-white/20 shadow-xl z-50 min-w-24
          ">
                        {availableQualities.map(quality => (
                            <button
                                key={quality.value}
                                onClick={() => {
                                    onQualityChange(quality.value);
                                    setIsOpen(false);
                                }}
                                className={`
                  w-full px-3 py-2 text-left text-sm transition-colors
                  ${quality.value === currentQuality
                                    ? 'text-blue-400 bg-blue-500/20'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                }
                `}
                            >
                                {quality.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

/**
 * Sélecteur de sous-titres
 */
const SubtitleSelector = ({ subtitles, currentSubtitle, onSubtitleChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    const availableSubtitles = [
        { value: 'off', label: 'Désactivés' },
        ...subtitles.map(sub => ({
            value: sub.language,
            label: sub.label || sub.language
        }))
    ];

    const currentLabel = availableSubtitles.find(s => s.value === currentSubtitle)?.label || 'CC';

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
          px-2 py-1 text-sm transition-colors rounded
          ${currentSubtitle !== 'off'
                    ? 'text-blue-400 bg-blue-500/20'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }
        `}
                title="Sous-titres"
            >
                CC
            </button>

            {isOpen && (
                <>
                    {/* Overlay pour fermer */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Menu déroulant */}
                    <div className="
            absolute bottom-full right-0 mb-2 py-2 bg-black/90 backdrop-blur-md
            rounded-lg border border-white/20 shadow-xl z-50 min-w-32
          ">
                        {availableSubtitles.map(subtitle => (
                            <button
                                key={subtitle.value}
                                onClick={() => {
                                    onSubtitleChange(subtitle.value);
                                    setIsOpen(false);
                                }}
                                className={`
                  w-full px-3 py-2 text-left text-sm transition-colors
                  ${subtitle.value === currentSubtitle
                                    ? 'text-blue-400 bg-blue-500/20'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                }
                `}
                            >
                                {subtitle.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

/**
 * Contrôles simplifiés pour mobile
 */
export const MobileVideoControls = ({ player, actions, onSettings }) => (
    <div className="px-3 py-2 space-y-2 backdrop-blur-md">
        {/* Barre de progression simplifiée */}
        <div className="relative">
            <div className="h-1 bg-white/20 rounded-full">
                <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${player.duration ? (player.currentTime / player.duration) * 100 : 0}%` }}
                />
            </div>
        </div>

        {/* Contrôles basiques */}
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
                <button
                    onClick={actions.togglePlay}
                    className="p-2 text-white hover:text-blue-400 transition-colors"
                >
                    {player.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>

                <button
                    onClick={actions.toggleMute}
                    className="p-2 text-white/70 hover:text-white transition-colors"
                >
                    {player.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <div className="text-white/90 text-sm">
                    {formatDuration(player.currentTime)} / {formatDuration(player.duration)}
                </div>
            </div>

            <div className="flex items-center space-x-2">
                {onSettings && (
                    <button
                        onClick={onSettings}
                        className="p-2 text-white/70 hover:text-white transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                )}

                <button
                    onClick={actions.toggleFullscreen}
                    className="p-2 text-white hover:text-blue-400 transition-colors"
                >
                    <Maximize className="w-4 h-4" />
                </button>
            </div>
        </div>
    </div>
);

/**
 * Contrôles avec gestes tactiles pour mobile
 */
export const TouchVideoControls = ({ player, actions, containerRef }) => {
    const [touchStart, setTouchStart] = useState(null);
    const [isSeeking, setIsSeeking] = useState(false);
    const [isVolumeChanging, setIsVolumeChanging] = useState(false);

    const handleTouchStart = (e) => {
        const touch = e.touches[0];
        setTouchStart({
            x: touch.clientX,
            y: touch.clientY,
            time: player.currentTime,
            volume: player.volume
        });
    };

    const handleTouchMove = (e) => {
        if (!touchStart || !containerRef.current) return;

        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStart.x;
        const deltaY = touch.clientY - touchStart.y;
        const containerWidth = containerRef.current.offsetWidth;

        // Geste horizontal pour le seek
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
            setIsSeeking(true);
            const seekDelta = (deltaX / containerWidth) * player.duration * 0.5;
            const newTime = Math.max(0, Math.min(player.duration, touchStart.time + seekDelta));
            actions.setCurrentTime(newTime);
        }

        // Geste vertical pour le volume (côté droit)
        else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 20 && touchStart.x > containerWidth / 2) {
            setIsVolumeChanging(true);
            const volumeDelta = -deltaY / 200; // Inverser Y car vers le haut = +volume
            const newVolume = Math.max(0, Math.min(1, touchStart.volume + volumeDelta));
            actions.setVolume(newVolume);
        }
    };

    const handleTouchEnd = () => {
        if (isSeeking) {
            actions.seek(player.currentTime);
        }

        setTouchStart(null);
        setIsSeeking(false);
        setIsVolumeChanging(false);
    };

    return (
        <div
            className="absolute inset-0 touch-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Indicateurs de geste */}
            {isSeeking && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <div className="bg-black/80 px-4 py-2 rounded-lg text-white">
                        {formatDuration(player.currentTime)}
                    </div>
                </div>
            )}

            {isVolumeChanging && (
                <div className="absolute top-1/2 right-8 transform -translate-y-1/2">
                    <div className="bg-black/80 px-4 py-2 rounded-lg text-white">
                        <div className="flex items-center space-x-2">
                            <Volume2 className="w-4 h-4" />
                            <span>{Math.round(player.volume * 100)}%</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoControls;