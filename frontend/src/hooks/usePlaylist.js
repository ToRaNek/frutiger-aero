// frontend/src/hooks/usePlaylist.js
import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    usePlaylistList,
    useCurrentPlaylist,
    useUserPlaylists,
    usePlaylistSearch,
    useFavorites,
    useWatchLater,
    useWatchHistory,
    usePlaylistDragDrop,
    usePlaylistActions
} from '../store/playlistStore';
import { useAuth } from './useAuth';

/**
 * Hook principal pour la gestion des playlists
 * Combine toutes les fonctionnalités playlist avec la logique métier
 */
export const usePlaylist = () => {
    const playlistList = usePlaylistList();
    const userPlaylists = useUserPlaylists();
    const playlistActions = usePlaylistActions();
    const { isAuthenticated, currentUser, permissions } = useAuth();

    // Actions améliorées avec vérifications d'authentification
    const enhancedActions = useMemo(() => ({
        /**
         * Créer une playlist avec vérification
         */
        createPlaylist: async (playlistData) => {
            if (!isAuthenticated) {
                return {
                    success: false,
                    error: { message: 'Connexion requise pour créer une playlist' }
                };
            }

            if (!permissions.canCreatePlaylist) {
                return {
                    success: false,
                    error: { message: 'Permissions insuffisantes' }
                };
            }

            return await userPlaylists.createPlaylist(playlistData);
        },

        /**
         * Mettre à jour une playlist avec vérification de propriété
         */
        updatePlaylist: async (playlistId, updateData) => {
            if (!isAuthenticated) {
                return {
                    success: false,
                    error: { message: 'Connexion requise' }
                };
            }

            // Vérifier si l'utilisateur peut modifier cette playlist
            const playlist = playlistList.playlists.find(p => p.id === playlistId) ||
                userPlaylists.userPlaylists.find(p => p.id === playlistId);

            if (playlist && playlist.userId !== currentUser.id && !permissions.canModerate) {
                return {
                    success: false,
                    error: { message: 'Vous ne pouvez pas modifier cette playlist' }
                };
            }

            return await userPlaylists.updatePlaylist(playlistId, updateData);
        },

        /**
         * Supprimer une playlist avec vérification
         */
        deletePlaylist: async (playlistId) => {
            if (!isAuthenticated) {
                return {
                    success: false,
                    error: { message: 'Connexion requise' }
                };
            }

            const playlist = playlistList.playlists.find(p => p.id === playlistId) ||
                userPlaylists.userPlaylists.find(p => p.id === playlistId);

            if (playlist && playlist.userId !== currentUser.id && !permissions.canModerate) {
                return {
                    success: false,
                    error: { message: 'Vous ne pouvez pas supprimer cette playlist' }
                };
            }

            return await userPlaylists.deletePlaylist(playlistId);
        },

        /**
         * Ajouter une vidéo à une playlist avec vérification
         */
        addVideoToPlaylist: async (playlistId, videoId, position = null) => {
            if (!isAuthenticated) {
                return {
                    success: false,
                    error: { message: 'Connexion requise pour ajouter des vidéos' }
                };
            }

            return await playlistActions.addVideoToPlaylist(playlistId, videoId, position);
        },

        /**
         * Supprimer une vidéo d'une playlist
         */
        removeVideoFromPlaylist: async (playlistId, videoId) => {
            if (!isAuthenticated) {
                return {
                    success: false,
                    error: { message: 'Connexion requise' }
                };
            }

            return await playlistActions.removeVideoFromPlaylist(playlistId, videoId);
        }
    }), [playlistList, userPlaylists, playlistActions, isAuthenticated, currentUser, permissions]);

    return {
        // État des listes
        playlists: playlistList.playlists,
        userPlaylists: userPlaylists.userPlaylists,
        pagination: playlistList.pagination,
        isLoading: playlistList.isLoading || userPlaylists.isLoading,
        isLoadingMore: playlistList.isLoadingMore,
        error: playlistList.error || userPlaylists.error,

        // États de création/modification
        isCreating: userPlaylists.isCreating,
        isUpdating: userPlaylists.isUpdating,
        isDeleting: userPlaylists.isDeleting,

        // Actions
        ...enhancedActions,
        loadPlaylists: playlistList.loadPlaylists,
        loadUserPlaylists: userPlaylists.loadUserPlaylists,
        reorderPlaylistVideos: playlistActions.reorderPlaylistVideos,
        duplicatePlaylist: playlistActions.duplicatePlaylist
    };
};

/**
 * Hook pour une page playlist spécifique
 */
export const usePlaylistPage = () => {
    const { playlistId } = useParams();
    const navigate = useNavigate();
    const { currentPlaylist, loadPlaylist, isLoadingPlaylist, playlistError } = useCurrentPlaylist();
    const { isAuthenticated, currentUser } = useAuth();

    // Charger la playlist depuis l'URL
    useEffect(() => {
        if (playlistId) {
            loadPlaylist(playlistId);
        }
    }, [playlistId, loadPlaylist]);

    // Rediriger si playlist non trouvée
    useEffect(() => {
        if (playlistError?.type === 'NOT_FOUND_ERROR') {
            navigate('/404', { replace: true });
        }
    }, [playlistError, navigate]);

    // Vérifier si l'utilisateur peut voir cette playlist
    const canViewPlaylist = useMemo(() => {
        if (!currentPlaylist) return false;
        if (currentPlaylist.isPublic) return true;
        if (!isAuthenticated) return false;

        // Playlist privée : vérifier si l'utilisateur est propriétaire
        return currentPlaylist.userId === currentUser?.id;
    }, [currentPlaylist, isAuthenticated, currentUser]);

    // Vérifier si l'utilisateur peut modifier cette playlist
    const canEditPlaylist = useMemo(() => {
        if (!currentPlaylist || !isAuthenticated) return false;
        return currentPlaylist.userId === currentUser?.id;
    }, [currentPlaylist, isAuthenticated, currentUser]);

    return {
        playlistId,
        currentPlaylist,
        isLoading: isLoadingPlaylist,
        error: playlistError,
        canViewPlaylist,
        canEditPlaylist
    };
};

/**
 * Hook pour les favoris avec actions simplifiées
 */
export const useFavoritesManager = () => {
    const favorites = useFavorites();
    const { isAuthenticated } = useAuth();

    const toggleFavorite = useCallback(async (videoId) => {
        if (!isAuthenticated) {
            return {
                success: false,
                error: { message: 'Connexion requise pour gérer les favoris' }
            };
        }

        const isCurrentlyFavorite = favorites.isVideoInFavorites(videoId);

        if (isCurrentlyFavorite) {
            return await favorites.removeFromFavorites(videoId);
        } else {
            return await favorites.addToFavorites(videoId);
        }
    }, [favorites, isAuthenticated]);

    return {
        favorites: favorites.favorites,
        isVideoInFavorites: favorites.isVideoInFavorites,
        toggleFavorite,
        addToFavorites: favorites.addToFavorites,
        removeFromFavorites: favorites.removeFromFavorites
    };
};

/**
 * Hook pour "À regarder plus tard"
 */
export const useWatchLaterManager = () => {
    const watchLater = useWatchLater();
    const { isAuthenticated } = useAuth();

    const toggleWatchLater = useCallback(async (videoId) => {
        if (!isAuthenticated) {
            return {
                success: false,
                error: { message: 'Connexion requise pour gérer "À regarder plus tard"' }
            };
        }

        const isCurrentlyInWatchLater = watchLater.isVideoInWatchLater(videoId);

        if (isCurrentlyInWatchLater) {
            return await watchLater.removeFromWatchLater(videoId);
        } else {
            return await watchLater.addToWatchLater(videoId);
        }
    }, [watchLater, isAuthenticated]);

    return {
        watchLater: watchLater.watchLater,
        isVideoInWatchLater: watchLater.isVideoInWatchLater,
        toggleWatchLater,
        addToWatchLater: watchLater.addToWatchLater,
        removeFromWatchLater: watchLater.removeFromWatchLater
    };
};

/**
 * Hook pour l'historique de visionnage
 */
export const useWatchHistoryManager = () => {
    const history = useWatchHistory();
    const { isAuthenticated } = useAuth();

    // Charger l'historique au montage si connecté
    useEffect(() => {
        if (isAuthenticated) {
            history.loadWatchHistory();
        }
    }, [isAuthenticated, history.loadWatchHistory]);

    const clearHistory = useCallback(async (olderThan = null) => {
        if (!isAuthenticated) {
            return {
                success: false,
                error: { message: 'Connexion requise' }
            };
        }

        return await history.clearWatchHistory(olderThan);
    }, [history, isAuthenticated]);

    return {
        watchHistory: history.watchHistory,
        loadWatchHistory: history.loadWatchHistory,
        clearWatchHistory: clearHistory
    };
};

/**
 * Hook pour le drag & drop de vidéos dans les playlists
 */
export const usePlaylistDragAndDrop = () => {
    const dragDrop = usePlaylistDragDrop();
    const [dragPreview, setDragPreview] = useState(null);

    const startDrag = useCallback((item, dragType, event) => {
        dragDrop.startDrag(item, dragType);

        // Créer un aperçu de drag personnalisé
        if (event?.dataTransfer) {
            const preview = document.createElement('div');
            preview.textContent = item.title || `Video ${item.videoId}`;
            preview.style.cssText = `
        position: absolute;
        top: -1000px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 14px;
      `;

            document.body.appendChild(preview);
            event.dataTransfer.setDragImage(preview, 0, 0);

            setTimeout(() => document.body.removeChild(preview), 0);
        }

        setDragPreview(item);
    }, [dragDrop]);

    const handleDragOver = useCallback((event, dropTarget) => {
        event.preventDefault();
        dragDrop.setDropTarget(dropTarget);
    }, [dragDrop]);

    const handleDrop = useCallback(async (event) => {
        event.preventDefault();
        const result = await dragDrop.handleDrop();
        setDragPreview(null);
        return result;
    }, [dragDrop]);

    const endDrag = useCallback(() => {
        dragDrop.endDrag();
        setDragPreview(null);
    }, [dragDrop]);

    return {
        dragState: dragDrop.dragState,
        dragPreview,
        startDrag,
        handleDragOver,
        handleDrop,
        endDrag,
        setDropTarget: dragDrop.setDropTarget
    };
};

/**
 * Hook pour la recherche de playlists avec debounce
 */
export const usePlaylistSearchWithDebounce = (delay = 300) => {
    const search = usePlaylistSearch();
    const [debouncedTerm, setDebouncedTerm] = useState('');
    const timeoutRef = useRef(null);

    const searchWithDebounce = useCallback((term, options = {}) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            setDebouncedTerm(term);
            if (term.trim().length >= 2) {
                search.searchPlaylists(term, options);
            } else {
                search.clearSearch();
            }
        }, delay);
    }, [search, delay]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return {
        ...search,
        searchPlaylists: searchWithDebounce,
        debouncedTerm
    };
};

/**
 * Hook pour un sélecteur de playlist (modal d'ajout)
 */
export const usePlaylistSelector = () => {
    const { userPlaylists, loadUserPlaylists } = useUserPlaylists();
    const { addVideoToPlaylist } = usePlaylistActions();
    const { currentUser, isAuthenticated } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);

    // Charger les playlists utilisateur au montage
    useEffect(() => {
        if (isAuthenticated && currentUser) {
            loadUserPlaylists(currentUser.id, { includePrivate: true });
        }
    }, [isAuthenticated, currentUser, loadUserPlaylists]);

    const openSelector = useCallback((videoId) => {
        setSelectedVideo(videoId);
        setIsOpen(true);
    }, []);

    const closeSelector = useCallback(() => {
        setIsOpen(false);
        setSelectedVideo(null);
    }, []);

    const addToPlaylist = useCallback(async (playlistId) => {
        if (!selectedVideo) return { success: false };

        const result = await addVideoToPlaylist(playlistId, selectedVideo);

        if (result.success) {
            closeSelector();
        }

        return result;
    }, [selectedVideo, addVideoToPlaylist, closeSelector]);

    return {
        isOpen,
        selectedVideo,
        userPlaylists,
        openSelector,
        closeSelector,
        addToPlaylist
    };
};

/**
 * Hook pour la création rapide de playlist
 */
export const useQuickPlaylistCreation = () => {
    const { createPlaylist } = useUserPlaylists();
    const [isCreating, setIsCreating] = useState(false);

    const createQuickPlaylist = useCallback(async (title, description = '', isPublic = true) => {
        setIsCreating(true);

        const result = await createPlaylist({
            title,
            description,
            isPublic
        });

        setIsCreating(false);
        return result;
    }, [createPlaylist]);

    const createPlaylistWithVideo = useCallback(async (videoId, playlistTitle) => {
        setIsCreating(true);

        // Créer la playlist
        const createResult = await createPlaylist({
            title: playlistTitle,
            description: '',
            isPublic: true
        });

        if (createResult.success) {
            // Ajouter la vidéo à la nouvelle playlist
            const { addVideoToPlaylist } = usePlaylistActions();
            const addResult = await addVideoToPlaylist(createResult.data.playlist.id, videoId);

            setIsCreating(false);
            return addResult;
        }

        setIsCreating(false);
        return createResult;
    }, [createPlaylist]);

    return {
        isCreating,
        createQuickPlaylist,
        createPlaylistWithVideo
    };
};

// Export des hooks de base pour usage direct
export const useSimplePlaylistList = () => usePlaylistList();
export const useSimpleCurrentPlaylist = () => useCurrentPlaylist();
export const useSimpleUserPlaylists = () => useUserPlaylists();
export const useSimplePlaylistSearch = () => usePlaylistSearch();
export const useSimpleFavorites = () => useFavorites();
export const useSimpleWatchLater = () => useWatchLater();
export const useSimpleWatchHistory = () => useWatchHistory();

export default usePlaylist;