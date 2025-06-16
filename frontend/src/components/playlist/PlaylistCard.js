// frontend/src/components/playlist/PlaylistCard.js

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    PlaySquare, Play, Lock, Users, MoreHorizontal,
    Edit3, Trash2, Share2, Copy, Eye, User,
    Calendar, Video, Clock
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePlaylist } from '../../hooks/usePlaylist';
import Modal, { useModal } from '../common/Modal';
import { ROUTES } from '../../utils/constants';
import {
    formatRelativeTime,
    formatVideoCount,
    truncateText,
    formatViews
} from '../../utils/formatters';
import { copyToClipboard } from '../../utils/helpers';

/**
 * Carte de playlist avec design Frutiger Aero
 *
 * Props:
 * - playlist: object - Données de la playlist
 * - size: string - Taille (small, medium, large)
 * - showOwner: boolean - Afficher le propriétaire
 * - showDescription: boolean - Afficher la description
 * - showStats: boolean - Afficher les statistiques
 * - showThumbnails: boolean - Afficher les miniatures des vidéos
 * - onClick: function - Callback de clic personnalisé
 * - onOwnerClick: function - Callback de clic sur le propriétaire
 * - layout: string - Layout (card, list, compact)
 * - editable: boolean - Playlist éditable par l'utilisateur
 * - draggable: boolean - Permettre le drag & drop
 */

const PlaylistCard = ({
                          playlist,
                          size = 'medium',
                          showOwner = true,
                          showDescription = false,
                          showStats = true,
                          showThumbnails = true,
                          onClick,
                          onOwnerClick,
                          layout = 'card',
                          editable = false,
                          draggable = false
                      }) => {
    const navigate = useNavigate();
    const cardRef = useRef(null);

    // État local
    const [isHovered, setIsHovered] = useState(false);
    const [showOptions, setShowOptions] = useState(false);

    // Hooks
    const { user } = useAuth();
    const {
        deletePlaylist,
        duplicatePlaylist,
        canManagePlaylist
    } = usePlaylist();

    const {
        isOpen: isShareOpen,
        openModal: openShare,
        closeModal: closeShare
    } = useModal();

    const {
        isOpen: isDeleteOpen,
        openModal: openDelete,
        closeModal: closeDelete
    } = useModal();

    // Vérification des permissions
    const canEdit = editable && canManagePlaylist(playlist.id, user?.id);
    const isOwner = user?.id === playlist.userId;

    // Navigation vers la playlist
    const handlePlaylistClick = (e) => {
        // Évite la navigation si on clique sur un bouton interactif
        if (e.target.closest('.playlist-card-interactive')) {
            return;
        }

        if (onClick) {
            onClick(playlist);
        } else {
            navigate(`${ROUTES.PLAYLIST.replace(':playlistId', playlist.id)}`);
        }
    };

    // Navigation vers le propriétaire
    const handleOwnerClick = (e) => {
        e.stopPropagation();

        if (onOwnerClick) {
            onOwnerClick(playlist.user);
        } else {
            navigate(`${ROUTES.USER_PROFILE.replace(':userId', playlist.user.id)}`);
        }
    };

    // Édition de la playlist
    const handleEdit = (e) => {
        e.stopPropagation();
        navigate(`/playlist/${playlist.id}/edit`);
    };

    // Duplication de la playlist
    const handleDuplicate = async (e) => {
        e.stopPropagation();

        try {
            await duplicatePlaylist(playlist.id, `${playlist.title} (Copie)`);
        } catch (error) {
            console.error('Erreur lors de la duplication:', error);
        }
    };

    // Suppression de la playlist
    const handleDelete = async () => {
        try {
            await deletePlaylist(playlist.id);
            closeDelete();
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
        }
    };

    // Partage de la playlist
    const handleShare = (e) => {
        e.stopPropagation();
        openShare();
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

    // URLs des images
    const thumbnailUrl = playlist.thumbnail || '/assets/default-playlist.png';
    const avatarUrl = playlist.user?.avatar || '/assets/default-avatar.png';

    // Miniatures des vidéos (pour l'effet mosaïque)
    const videoThumbnails = playlist.videos?.slice(0, 4) || [];

    return (
        <div
            ref={cardRef}
            onClick={handlePlaylistClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false);
                setShowOptions(false);
            }}
            className={`
        ${currentSizeClasses.container}
        ${currentLayoutClasses}
        cursor-pointer group transition-all duration-300
        hover:scale-105 hover:shadow-xl
        ${isHovered ? 'frutiger-aurora-subtle' : ''}
        ${draggable ? 'draggable' : ''}
      `}
            draggable={draggable}
        >
            {/* Miniature de la playlist */}
            <div className={`
        relative overflow-hidden rounded-xl bg-white/10
        ${layout === 'card' ? currentSizeClasses.thumbnail : 'w-48 h-28 flex-shrink-0'}
        ${isHovered ? 'glass-shine' : ''}
      `}>
                {/* Miniatures en mosaïque ou image principale */}
                {showThumbnails && videoThumbnails.length > 0 ? (
                    <div className="w-full h-full relative">
                        {videoThumbnails.length === 1 ? (
                            <img
                                src={videoThumbnails[0].thumbnail}
                                alt={playlist.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                        ) : (
                            <div className="grid grid-cols-2 h-full gap-1">
                                {videoThumbnails.map((video, index) => (
                                    <img
                                        key={video.id || index}
                                        src={video.thumbnail}
                                        alt=""
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ))}
                                {/* Remplissage si moins de 4 vidéos */}
                                {Array.from({ length: 4 - videoThumbnails.length }).map((_, index) => (
                                    <div
                                        key={`empty-${index}`}
                                        className="w-full h-full bg-white/5 flex items-center justify-center"
                                    >
                                        <Video className="w-6 h-6 text-white/30" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <img
                        src={thumbnailUrl}
                        alt={playlist.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                )}

                {/* Overlay avec informations */}
                <div className={`
          absolute inset-0 bg-black/30 transition-opacity duration-300
          ${isHovered ? 'opacity-100' : 'opacity-0'}
        `}>
                    {/* Bouton play central */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <button className="
              p-4 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm
              transition-all duration-300 transform hover:scale-110
            ">
                            <Play className="w-8 h-8 text-white ml-1" />
                        </button>
                    </div>
                </div>

                {/* Indicateur de confidentialité */}
                {playlist.isPrivate && (
                    <div className="absolute top-2 left-2 p-1 bg-black/70 rounded backdrop-blur-sm">
                        <Lock className="w-4 h-4 text-white" />
                    </div>
                )}

                {/* Nombre de vidéos */}
                <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white">
                    {formatVideoCount(playlist.videoCount || playlist.videos?.length || 0)}
                </div>

                {/* Boutons d'actions */}
                {(canEdit || isHovered) && (
                    <div className="absolute top-2 right-2 playlist-card-interactive">
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
                                        {canEdit && (
                                            <button
                                                onClick={handleEdit}
                                                className="
                          w-full flex items-center px-4 py-2 text-white/90 hover:text-white
                          hover:bg-white/10 transition-colors text-left
                        "
                                            >
                                                <Edit3 className="w-4 h-4 mr-3" />
                                                Modifier
                                            </button>
                                        )}

                                        <button
                                            onClick={handleDuplicate}
                                            className="
                        w-full flex items-center px-4 py-2 text-white/90 hover:text-white
                        hover:bg-white/10 transition-colors text-left
                      "
                                        >
                                            <Copy className="w-4 h-4 mr-3" />
                                            Dupliquer
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

                                        {canEdit && (
                                            <>
                                                <hr className="border-white/20 my-2" />
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openDelete();
                                                    }}
                                                    className="
                            w-full flex items-center px-4 py-2 text-red-400 hover:text-red-300
                            hover:bg-red-500/10 transition-colors text-left
                          "
                                                >
                                                    <Trash2 className="w-4 h-4 mr-3" />
                                                    Supprimer
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Informations de la playlist */}
            <div className={`
        ${layout === 'card' ? 'mt-3' : 'flex-1 min-w-0'}
      `}>
                {/* Layout carte */}
                {layout === 'card' && (
                    <div className="flex space-x-3">
                        {/* Icône de playlist */}
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                                <PlaySquare className="w-5 h-5 text-blue-400" />
                            </div>
                        </div>

                        {/* Titre et métadonnées */}
                        <div className="flex-1 min-w-0">
                            <h3 className={`
                ${currentSizeClasses.title} font-semibold text-white
                line-clamp-2 mb-1 group-hover:text-blue-300 transition-colors
              `}>
                                {playlist.title}
                            </h3>

                            {showOwner && playlist.user && (
                                <button
                                    onClick={handleOwnerClick}
                                    className="
                    text-white/70 hover:text-white transition-colors text-sm
                    playlist-card-interactive
                  "
                                >
                                    {playlist.user.firstName} {playlist.user.lastName}
                                </button>
                            )}

                            {/* Statistiques */}
                            {showStats && (
                                <div className={`
                  ${currentSizeClasses.stats} text-white/60 mt-1
                  flex items-center space-x-2
                `}>
                  <span className="flex items-center">
                    <Video className="w-3 h-3 mr-1" />
                      {formatVideoCount(playlist.videoCount || playlist.videos?.length || 0)}
                  </span>
                                    <span>•</span>
                                    <span className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                                        {formatRelativeTime(playlist.updatedAt)}
                  </span>
                                    {playlist.views && (
                                        <>
                                            <span>•</span>
                                            <span className="flex items-center">
                        <Eye className="w-3 h-3 mr-1" />
                                                {formatViews(playlist.views)}
                      </span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Layout liste/compact */}
                {(layout === 'list' || layout === 'compact') && (
                    <div className="space-y-2">
                        <div className="flex items-start justify-between">
                            <h3 className={`
                ${currentSizeClasses.title} font-semibold text-white
                line-clamp-2 group-hover:text-blue-300 transition-colors
                flex-1 mr-3
              `}>
                                {playlist.title}
                            </h3>

                            <div className="flex items-center space-x-1 text-white/60">
                                <PlaySquare className="w-4 h-4" />
                                {playlist.isPrivate && <Lock className="w-3 h-3" />}
                            </div>
                        </div>

                        {showOwner && playlist.user && (
                            <button
                                onClick={handleOwnerClick}
                                className="
                  flex items-center space-x-2 text-white/70 hover:text-white
                  transition-colors text-sm playlist-card-interactive
                "
                            >
                                <img
                                    src={avatarUrl}
                                    alt={playlist.user.username}
                                    className="w-6 h-6 rounded-full object-cover bg-white/10"
                                />
                                <span>{playlist.user.firstName} {playlist.user.lastName}</span>
                            </button>
                        )}

                        {showDescription && playlist.description && (
                            <p className="text-white/70 text-sm line-clamp-2">
                                {truncateText(playlist.description, 100)}
                            </p>
                        )}

                        {showStats && (
                            <div className={`
                ${currentSizeClasses.stats} text-white/60
                flex items-center space-x-4
              `}>
                <span className="flex items-center">
                  <Video className="w-3 h-3 mr-1" />
                    {formatVideoCount(playlist.videoCount || playlist.videos?.length || 0)}
                </span>

                                <span className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                                    {formatRelativeTime(playlist.updatedAt)}
                </span>

                                {playlist.views && (
                                    <span className="flex items-center">
                    <Eye className="w-3 h-3 mr-1" />
                                        {formatViews(playlist.views)}
                  </span>
                                )}

                                {playlist.isPrivate && (
                                    <span className="flex items-center text-yellow-400">
                    <Lock className="w-3 h-3 mr-1" />
                    Privé
                  </span>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal de partage */}
            <SharePlaylistModal
                isOpen={isShareOpen}
                onClose={closeShare}
                playlist={playlist}
            />

            {/* Modal de suppression */}
            <DeletePlaylistModal
                isOpen={isDeleteOpen}
                onClose={closeDelete}
                playlist={playlist}
                onConfirm={handleDelete}
            />
        </div>
    );
};

/**
 * Modal de partage de playlist
 */
const SharePlaylistModal = ({ isOpen, onClose, playlist }) => {
    const [copied, setCopied] = useState(false);

    const playlistUrl = `${window.location.origin}/playlist/${playlist.id}`;

    const handleCopyLink = async () => {
        try {
            await copyToClipboard(playlistUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Erreur lors de la copie:', err);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Partager la playlist" size="sm">
            <div className="space-y-6">
                {/* Aperçu de la playlist */}
                <div className="flex space-x-3 p-4 bg-white/5 rounded-lg">
                    <div className="w-20 h-12 bg-white/10 rounded flex items-center justify-center flex-shrink-0">
                        <PlaySquare className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium line-clamp-1 mb-1">
                            {playlist.title}
                        </h4>
                        <p className="text-white/60 text-sm">
                            {formatVideoCount(playlist.videoCount || playlist.videos?.length || 0)}
                        </p>
                    </div>
                </div>

                {/* Lien de partage */}
                <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                        Lien de la playlist
                    </label>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={playlistUrl}
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
                            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(playlistUrl)}&text=${encodeURIComponent(playlist.title)}`}
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
                            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(playlistUrl)}`}
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

/**
 * Modal de confirmation de suppression
 */
const DeletePlaylistModal = ({ isOpen, onClose, playlist, onConfirm }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await onConfirm();
        } catch (error) {
            console.error('Erreur:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Supprimer la playlist"
            size="sm"
        >
            <div className="space-y-6">
                {/* Message de confirmation */}
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="w-8 h-8 text-red-600" />
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-2">
                        Êtes-vous sûr ?
                    </h3>

                    <p className="text-white/70 mb-4">
                        Cette action supprimera définitivement la playlist
                        <strong className="text-white"> "{playlist.title}"</strong>.
                        Cette action est irréversible.
                    </p>

                    <div className="text-sm text-white/60 bg-white/5 p-3 rounded-lg">
                        <p>
                            <strong>{formatVideoCount(playlist.videoCount || playlist.videos?.length || 0)}</strong>
                            {' '}seront retirées de cette playlist
                        </p>
                    </div>
                </div>

                {/* Boutons d'action */}
                <div className="flex justify-center space-x-3">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="frutiger-btn frutiger-btn-glass px-6 py-2"
                    >
                        Annuler
                    </button>

                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="
              px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed
            "
                    >
                        {isDeleting ? (
                            <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Suppression...</span>
                            </div>
                        ) : (
                            'Supprimer définitivement'
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default PlaylistCard;