// frontend/src/components/video/VideoCard.js

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Play, Pause, Clock, Eye, ThumbsUp, ThumbsDown,
    MoreHorizontal, Plus, Share2, Flag, Bookmark,
    User, Calendar, Volume2, VolumeX
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useVideo } from '../../hooks/useVideo';
import { usePlaylist } from '../../hooks/usePlaylist';
import Modal, { useModal } from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';
import {
    formatDuration,
    formatViews,
    formatRelativeTime,
    formatLikes,
    truncateText
} from '../../utils/formatters';
import { ROUTES, VIDEO_CONFIG } from '../../utils/constants';

/**
 * Carte vidéo avec preview au survol et design Frutiger Aero
 *
 * Props:
 * - video: object - Données de la vidéo
 * - size: string - Taille (small, medium, large)
 * - showChannel: boolean - Afficher les infos du channel
 * - showDescription: boolean - Afficher la description
 * - showDuration: boolean - Afficher la durée
 * - showStats: boolean - Afficher les statistiques
 * - autoPreview: boolean - Preview automatique au survol
 * - onClick: function - Callback de clic personnalisé
 * - onChannelClick: function - Callback de clic sur le channel
 * - layout: string - Layout (card, list, compact)
 * - interactive: boolean - Boutons d'interaction
 */

const VideoCard = ({
                       video,
                       size = 'medium',
                       showChannel = true,
                       showDescription = false,
                       showDuration = true,
                       showStats = true,
                       autoPreview = true,
                       onClick,
                       onChannelClick,
                       layout = 'card',
                       interactive = true
                   }) => {
    const navigate = useNavigate();
    const cardRef = useRef(null);
    const previewRef = useRef(null);
    const hoverTimeoutRef = useRef(null);

    // État local
    const [isHovered, setIsHovered] = useState(false);
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
    const [previewMuted, setPreviewMuted] = useState(true);
    const [showOptions, setShowOptions] = useState(false);

    // Hooks
    const { user, isAuthenticated } = useAuth();
    const { toggleVideoReaction, isVideoLiked, isVideoDisliked } = useVideo();
    const {
        addToFavorites,
        removeFromFavorites,
        isVideoInFavorites,
        addToWatchLater,
        removeFromWatchLater,
        isVideoInWatchLater,
        openPlaylistSelector
    } = usePlaylist();

    const {
        isOpen: isShareModalOpen,
        openModal: openShareModal,
        closeModal: closeShareModal
    } = useModal();

    // Nettoyage des timeouts
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

    // Gestion du survol pour la preview
    const handleMouseEnter = () => {
        setIsHovered(true);

        if (autoPreview) {
            hoverTimeoutRef.current = setTimeout(() => {
                setIsPreviewPlaying(true);
            }, 1000); // Délai avant preview
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        setIsPreviewPlaying(false);
        setShowOptions(false);

        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
    };

    // Navigation vers la vidéo
    const handleVideoClick = (e) => {
        // Évite la navigation si on clique sur un bouton interactif
        if (e.target.closest('.video-card-interactive')) {
            return;
        }

        if (onClick) {
            onClick(video);
        } else {
            navigate(`${ROUTES.VIDEO.replace(':videoId', video.id)}`);
        }
    };

    // Navigation vers le channel
    const handleChannelClick = (e) => {
        e.stopPropagation();

        if (onChannelClick) {
            onChannelClick(video.user);
        } else {
            navigate(`${ROUTES.USER_PROFILE.replace(':userId', video.user.id)}`);
        }
    };

    // Gestion des likes/dislikes
    const handleReaction = async (e, type) => {
        e.stopPropagation();

        if (!isAuthenticated) {
            navigate(ROUTES.LOGIN);
            return;
        }

        try {
            await toggleVideoReaction(video.id, type);
        } catch (error) {
            console.error('Erreur lors de la réaction:', error);
        }
    };

    // Ajout aux favoris
    const handleFavoriteToggle = async (e) => {
        e.stopPropagation();

        if (!isAuthenticated) {
            navigate(ROUTES.LOGIN);
            return;
        }

        try {
            if (isVideoInFavorites(video.id)) {
                await removeFromFavorites(video.id);
            } else {
                await addToFavorites(video.id);
            }
        } catch (error) {
            console.error('Erreur lors de l\'ajout aux favoris:', error);
        }
    };

    // Ajout à "À regarder plus tard"
    const handleWatchLaterToggle = async (e) => {
        e.stopPropagation();

        if (!isAuthenticated) {
            navigate(ROUTES.LOGIN);
            return;
        }

        try {
            if (isVideoInWatchLater(video.id)) {
                await removeFromWatchLater(video.id);
            } else {
                await addToWatchLater(video.id);
            }
        } catch (error) {
            console.error('Erreur lors de l\'ajout à regarder plus tard:', error);
        }
    };

    // Ajout à une playlist
    const handleAddToPlaylist = (e) => {
        e.stopPropagation();

        if (!isAuthenticated) {
            navigate(ROUTES.LOGIN);
            return;
        }

        openPlaylistSelector(video.id);
    };

    // Partage de la vidéo
    const handleShare = (e) => {
        e.stopPropagation();
        openShareModal();
    };

    // Signalement de la vidéo
    const handleReport = (e) => {
        e.stopPropagation();
        // Logique de signalement
        console.log('Signaler la vidéo:', video.id);
    };

    // Classes CSS selon la taille
    const sizeClasses = {
        small: {
            container: 'w-full max-w-xs',
            thumbnail: 'h-32',
            title: 'text-sm',
            stats: 'text-xs'
        },
        medium: {
            container: 'w-full',
            thumbnail: 'h-40 sm:h-48',
            title: 'text-base',
            stats: 'text-sm'
        },
        large: {
            container: 'w-full',
            thumbnail: 'h-48 sm:h-56',
            title: 'text-lg',
            stats: 'text-base'
        }
    };

    // Classes CSS selon le layout
    const layoutClasses = {
        card: 'flex flex-col',
        list: 'flex flex-row space-x-4',
        compact: 'flex flex-row space-x-3'
    };

    const currentSizeClasses = sizeClasses[size];
    const currentLayoutClasses = layoutClasses[layout];

    const thumbnailUrl = video.thumbnail || '/assets/default-thumbnail.png';
    const avatarUrl = video.user?.avatar || '/assets/default-avatar.png';

    return (
        <div
            ref={cardRef}
            onClick={handleVideoClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`
        ${currentSizeClasses.container}
        ${currentLayoutClasses}
        cursor-pointer group transition-all duration-300
        hover:scale-105 hover:shadow-xl
        ${isHovered ? 'frutiger-aurora-subtle' : ''}
      `}
        >
            {/* Miniature vidéo */}
            <div className={`
        relative overflow-hidden rounded-xl bg-white/10
        ${layout === 'card' ? currentSizeClasses.thumbnail : 'w-48 h-28 flex-shrink-0'}
        ${isHovered ? 'glass-shine' : ''}
      `}>
                {/* Image de base */}
                <img
                    src={thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover transition-all duration-300"
                    loading="lazy"
                />

                {/* Preview vidéo au survol */}
                {isPreviewPlaying && autoPreview && (
                    <video
                        ref={previewRef}
                        src={`/api/videos/${video.id}/preview`}
                        className="absolute inset-0 w-full h-full object-cover"
                        autoPlay
                        muted={previewMuted}
                        loop
                        playsInline
                    />
                )}

                {/* Overlay avec contrôles */}
                <div className={`
          absolute inset-0 bg-black/30 transition-opacity duration-300
          ${isHovered ? 'opacity-100' : 'opacity-0'}
        `}>
                    {/* Bouton play/pause central */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <button className="
              p-4 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm
              transition-all duration-300 transform hover:scale-110
            ">
                            {isPreviewPlaying ? (
                                <Pause className="w-8 h-8 text-white" />
                            ) : (
                                <Play className="w-8 h-8 text-white ml-1" />
                            )}
                        </button>
                    </div>

                    {/* Contrôles de preview */}
                    {isPreviewPlaying && (
                        <div className="absolute bottom-2 right-2 video-card-interactive">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewMuted(!previewMuted);
                                }}
                                className="
                  p-1 bg-black/50 hover:bg-black/70 rounded
                  transition-colors duration-200
                "
                            >
                                {previewMuted ? (
                                    <VolumeX className="w-4 h-4 text-white" />
                                ) : (
                                    <Volume2 className="w-4 h-4 text-white" />
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Durée de la vidéo */}
                {showDuration && video.duration && (
                    <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-1 rounded text-xs text-white">
                        {formatDuration(video.duration)}
                    </div>
                )}

                {/* Boutons d'actions rapides */}
                {interactive && isHovered && (
                    <div className="absolute top-2 right-2 video-card-interactive">
                        <div className="flex flex-col space-y-1">
                            {/* Bouton options */}
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowOptions(!showOptions);
                                    }}
                                    className="
                    p-2 bg-black/50 hover:bg-black/70 rounded-full
                    transition-colors duration-200
                  "
                                >
                                    <MoreHorizontal className="w-4 h-4 text-white" />
                                </button>

                                {/* Menu déroulant des options */}
                                {showOptions && (
                                    <div className="
                    absolute top-full right-0 mt-1 w-48
                    bg-black/90 backdrop-blur-md rounded-lg border border-white/20
                    shadow-xl z-10 glass-panel
                  ">
                                        <div className="py-2">
                                            <button
                                                onClick={handleAddToPlaylist}
                                                className="
                          w-full flex items-center px-4 py-2 text-white/90 hover:text-white
                          hover:bg-white/10 transition-colors text-left
                        "
                                            >
                                                <Plus className="w-4 h-4 mr-3" />
                                                Ajouter à une playlist
                                            </button>

                                            <button
                                                onClick={handleWatchLaterToggle}
                                                className="
                          w-full flex items-center px-4 py-2 text-white/90 hover:text-white
                          hover:bg-white/10 transition-colors text-left
                        "
                                            >
                                                <Clock className="w-4 h-4 mr-3" />
                                                {isVideoInWatchLater(video.id) ? 'Retirer de' : 'Ajouter à'} regarder plus tard
                                            </button>

                                            <button
                                                onClick={handleShare}
                                                className="
                          w-full flex items-center px-4 py-2 text-white/90 hover:text-white
                          hover:bg-white/10 transition-colors text-left
                        "
                                            >
                                                <Share2 className="w-4 h-4 mr-3" />
                                                Partager
                                            </button>

                                            <hr className="border-white/20 my-2" />

                                            <button
                                                onClick={handleReport}
                                                className="
                          w-full flex items-center px-4 py-2 text-red-400 hover:text-red-300
                          hover:bg-red-500/10 transition-colors text-left
                        "
                                            >
                                                <Flag className="w-4 h-4 mr-3" />
                                                Signaler
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Informations de la vidéo */}
            <div className={`
        ${layout === 'card' ? 'mt-3' : 'flex-1 min-w-0'}
      `}>
                {/* Titre et channel (layout card) */}
                {layout === 'card' && (
                    <div className="flex space-x-3">
                        {/* Avatar du channel */}
                        {showChannel && (
                            <button
                                onClick={handleChannelClick}
                                className="flex-shrink-0 video-card-interactive"
                            >
                                <img
                                    src={avatarUrl}
                                    alt={video.user?.username}
                                    className="w-10 h-10 rounded-full object-cover bg-white/10"
                                />
                            </button>
                        )}

                        {/* Titre et métadonnées */}
                        <div className="flex-1 min-w-0">
                            <h3 className={`
                ${currentSizeClasses.title} font-semibold text-white
                line-clamp-2 mb-1 group-hover:text-blue-300 transition-colors
              `}>
                                {video.title}
                            </h3>

                            {showChannel && (
                                <button
                                    onClick={handleChannelClick}
                                    className="
                    text-white/70 hover:text-white transition-colors text-sm
                    video-card-interactive
                  "
                                >
                                    {video.user?.firstName} {video.user?.lastName}
                                </button>
                            )}

                            {/* Statistiques */}
                            {showStats && (
                                <div className={`
                  ${currentSizeClasses.stats} text-white/60 mt-1
                  flex items-center space-x-2
                `}>
                  <span className="flex items-center">
                    <Eye className="w-3 h-3 mr-1" />
                      {formatViews(video.views)}
                  </span>
                                    <span>•</span>
                                    <span className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                                        {formatRelativeTime(video.createdAt)}
                  </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Layout liste/compact */}
                {(layout === 'list' || layout === 'compact') && (
                    <div className="space-y-2">
                        <h3 className={`
              ${currentSizeClasses.title} font-semibold text-white
              line-clamp-2 group-hover:text-blue-300 transition-colors
            `}>
                            {video.title}
                        </h3>

                        {showChannel && (
                            <button
                                onClick={handleChannelClick}
                                className="
                  flex items-center space-x-2 text-white/70 hover:text-white
                  transition-colors text-sm video-card-interactive
                "
                            >
                                <img
                                    src={avatarUrl}
                                    alt={video.user?.username}
                                    className="w-6 h-6 rounded-full object-cover bg-white/10"
                                />
                                <span>{video.user?.firstName} {video.user?.lastName}</span>
                            </button>
                        )}

                        {showDescription && video.description && (
                            <p className="text-white/70 text-sm line-clamp-2">
                                {truncateText(video.description, 100)}
                            </p>
                        )}

                        {showStats && (
                            <div className={`
                ${currentSizeClasses.stats} text-white/60
                flex items-center space-x-4
              `}>
                <span className="flex items-center">
                  <Eye className="w-3 h-3 mr-1" />
                    {formatViews(video.views)}
                </span>
                                <span className="flex items-center">
                  <ThumbsUp className="w-3 h-3 mr-1" />
                                    {formatLikes(video.likes)}
                </span>
                                <span className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                                    {formatRelativeTime(video.createdAt)}
                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Boutons d'interaction (layout liste) */}
                {interactive && layout === 'list' && (
                    <div className="flex items-center space-x-2 mt-3 video-card-interactive">
                        <button
                            onClick={(e) => handleReaction(e, 'like')}
                            className={`
                flex items-center space-x-1 px-3 py-1 rounded-full text-sm
                transition-all duration-200
                ${isVideoLiked(video.id)
                                ? 'bg-blue-500 text-white'
                                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                            }
              `}
                        >
                            <ThumbsUp className="w-4 h-4" />
                            <span>{formatLikes(video.likes)}</span>
                        </button>

                        <button
                            onClick={handleFavoriteToggle}
                            className={`
                p-2 rounded-full transition-all duration-200
                ${isVideoInFavorites(video.id)
                                ? 'bg-red-500 text-white'
                                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                            }
              `}
                        >
                            <Bookmark className="w-4 h-4" />
                        </button>

                        <button
                            onClick={handleShare}
                            className="
                p-2 rounded-full bg-white/10 text-white/70 hover:bg-white/20
                hover:text-white transition-all duration-200
              "
                        >
                            <Share2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Modal de partage */}
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={closeShareModal}
                video={video}
            />
        </div>
    );
};

/**
 * Modal de partage de vidéo
 */
const ShareModal = ({ isOpen, onClose, video }) => {
    const [copied, setCopied] = useState(false);

    const videoUrl = `${window.location.origin}/video/${video.id}`;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(videoUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Erreur lors de la copie:', err);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Partager la vidéo" size="sm">
            <div className="space-y-6">
                {/* Aperçu de la vidéo */}
                <div className="flex space-x-3 p-4 bg-white/5 rounded-lg">
                    <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-20 h-12 rounded object-cover bg-white/10"
                    />
                    <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium line-clamp-1 mb-1">
                            {video.title}
                        </h4>
                        <p className="text-white/60 text-sm">
                            {video.user?.firstName} {video.user?.lastName}
                        </p>
                    </div>
                </div>

                {/* Lien de partage */}
                <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                        Lien de la vidéo
                    </label>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={videoUrl}
                            readOnly
                            className="flex-1 frutiger-input py-2 bg-white/5 text-white/90"
                        />
                        <button
                            onClick={handleCopyLink}
                            className={`
                px-4 py-2 rounded-lg transition-all duration-200
                ${copied
                                ? 'bg-green-500 text-white'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }
              `}
                        >
                            {copied ? 'Copié !' : 'Copier'}
                        </button>
                    </div>
                </div>

                {/* Réseaux sociaux */}
                <div>
                    <label className="block text-sm font-medium text-white/90 mb-3">
                        Partager sur
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <a
                            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(videoUrl)}&text=${encodeURIComponent(video.title)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="
                flex items-center justify-center space-x-2 p-3 bg-blue-500 hover:bg-blue-600
                rounded-lg transition-colors text-white
              "
                        >
                            <Share2 className="w-4 h-4" />
                            <span>Twitter</span>
                        </a>

                        <a
                            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(videoUrl)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="
                flex items-center justify-center space-x-2 p-3 bg-blue-700 hover:bg-blue-800
                rounded-lg transition-colors text-white
              "
                        >
                            <Share2 className="w-4 h-4" />
                            <span>Facebook</span>
                        </a>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default VideoCard;