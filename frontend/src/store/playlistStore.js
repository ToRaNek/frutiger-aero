// frontend/src/store/playlistStore.js
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import playlistService, { DEFAULT_PLAYLISTS, PLAYLIST_PRIVACY } from '../services/playlistService';

/**
 * Store Zustand pour la gestion des playlists
 * Utilise le pattern recommandé avec actions séparées et gestion optimisée du cache
 */
const usePlaylistStore = create(
    devtools(
        subscribeWithSelector((set, get) => ({
            // État des listes de playlists
            playlists: [],
            userPlaylists: [],
            currentPlaylist: null,
            searchResults: [],

            // Playlists spéciales
            favorites: [],
            watchLater: [],
            watchHistory: [],

            // État de pagination
            pagination: {
                page: 1,
                limit: 20,
                total: 0,
                hasMore: false
            },

            // État de chargement
            isLoading: false,
            isLoadingMore: false,
            isLoadingPlaylist: false,
            isSearching: false,
            isCreating: false,
            isUpdating: false,
            isDeleting: false,

            // Erreurs
            error: null,
            playlistError: null,
            searchError: null,

            // État du drag & drop
            dragState: {
                isDragging: false,
                draggedItem: null,
                dropTarget: null,
                dragType: null
            },

            // Actions
            actions: {
                /**
                 * Charger la liste des playlists publiques
                 */
                async loadPlaylists(options = {}) {
                    const { refresh = false, loadMore = false } = options;

                    if (!refresh && !loadMore) {
                        set({ isLoading: true, error: null });
                    } else if (loadMore) {
                        set({ isLoadingMore: true });
                    }

                    try {
                        const currentPagination = get().pagination;
                        const page = loadMore ? currentPagination.page + 1 : 1;

                        const { data, error } = await playlistService.getPlaylists({
                            page,
                            limit: currentPagination.limit,
                            isPublic: PLAYLIST_PRIVACY.PUBLIC,
                            ...options
                        });

                        if (error) {
                            set({
                                isLoading: false,
                                isLoadingMore: false,
                                error
                            });
                            return { success: false, error };
                        }

                        const newPlaylists = data.playlists || [];
                        const existingPlaylists = get().playlists;

                        set({
                            playlists: loadMore ? [...existingPlaylists, ...newPlaylists] : newPlaylists,
                            pagination: {
                                page: data.pagination.page,
                                limit: data.pagination.limit,
                                total: data.pagination.total,
                                hasMore: data.pagination.hasMore
                            },
                            isLoading: false,
                            isLoadingMore: false,
                            error: null
                        });

                        return { success: true, data };
                    } catch (error) {
                        set({
                            isLoading: false,
                            isLoadingMore: false,
                            error: {
                                message: 'Erreur lors du chargement des playlists',
                                type: 'LOAD_ERROR'
                            }
                        });
                        return { success: false, error };
                    }
                },

                /**
                 * Charger les playlists d'un utilisateur
                 */
                async loadUserPlaylists(userId, options = {}) {
                    set({ isLoading: true, error: null });

                    try {
                        const { data, error } = await playlistService.getUserPlaylists(userId, options);

                        if (error) {
                            set({ isLoading: false, error });
                            return { success: false, error };
                        }

                        set({
                            userPlaylists: data.playlists || [],
                            isLoading: false,
                            error: null
                        });

                        return { success: true, data };
                    } catch (error) {
                        const errorData = {
                            message: 'Erreur lors du chargement des playlists utilisateur',
                            type: 'USER_PLAYLISTS_ERROR'
                        };

                        set({ isLoading: false, error: errorData });
                        return { success: false, error: errorData };
                    }
                },

                /**
                 * Charger une playlist spécifique
                 */
                async loadPlaylist(playlistId, includeVideos = true, includeUser = true) {
                    if (!playlistId) return { success: false, error: { message: 'ID requis' } };

                    set({ isLoadingPlaylist: true, playlistError: null });

                    try {
                        const { data, error } = await playlistService.getPlaylistById(
                            playlistId,
                            includeVideos,
                            includeUser
                        );

                        if (error) {
                            set({
                                isLoadingPlaylist: false,
                                playlistError: error
                            });
                            return { success: false, error };
                        }

                        set({
                            currentPlaylist: data.playlist,
                            isLoadingPlaylist: false,
                            playlistError: null
                        });

                        return { success: true, data };
                    } catch (error) {
                        const errorData = {
                            message: 'Erreur lors du chargement de la playlist',
                            type: 'PLAYLIST_LOAD_ERROR'
                        };

                        set({
                            isLoadingPlaylist: false,
                            playlistError: errorData
                        });
                        return { success: false, error: errorData };
                    }
                },

                /**
                 * Créer une nouvelle playlist
                 */
                async createPlaylist(playlistData) {
                    set({ isCreating: true, error: null });

                    try {
                        const { data, error } = await playlistService.createPlaylist(playlistData);

                        if (error) {
                            set({ isCreating: false, error });
                            return { success: false, error };
                        }

                        // Ajouter la nouvelle playlist à la liste
                        set(state => ({
                            userPlaylists: [data.playlist, ...state.userPlaylists],
                            isCreating: false,
                            error: null
                        }));

                        return { success: true, data };
                    } catch (error) {
                        const errorData = {
                            message: 'Erreur lors de la création de la playlist',
                            type: 'CREATE_ERROR'
                        };

                        set({ isCreating: false, error: errorData });
                        return { success: false, error: errorData };
                    }
                },

                /**
                 * Mettre à jour une playlist
                 */
                async updatePlaylist(playlistId, updateData) {
                    set({ isUpdating: true, error: null });

                    try {
                        const { data, error } = await playlistService.updatePlaylist(playlistId, updateData);

                        if (error) {
                            set({ isUpdating: false, error });
                            return { success: false, error };
                        }

                        // Mettre à jour dans les différentes listes
                        get().actions._updatePlaylistInStore(playlistId, data.playlist);

                        set({ isUpdating: false, error: null });
                        return { success: true, data };
                    } catch (error) {
                        const errorData = {
                            message: 'Erreur lors de la mise à jour de la playlist',
                            type: 'UPDATE_ERROR'
                        };

                        set({ isUpdating: false, error: errorData });
                        return { success: false, error: errorData };
                    }
                },

                /**
                 * Supprimer une playlist
                 */
                async deletePlaylist(playlistId) {
                    set({ isDeleting: true, error: null });

                    try {
                        const { data, error } = await playlistService.deletePlaylist(playlistId);

                        if (error) {
                            set({ isDeleting: false, error });
                            return { success: false, error };
                        }

                        // Supprimer de toutes les listes
                        set(state => ({
                            playlists: state.playlists.filter(p => p.id !== playlistId),
                            userPlaylists: state.userPlaylists.filter(p => p.id !== playlistId),
                            currentPlaylist: state.currentPlaylist?.id === playlistId ? null : state.currentPlaylist,
                            isDeleting: false,
                            error: null
                        }));

                        return { success: true, data };
                    } catch (error) {
                        const errorData = {
                            message: 'Erreur lors de la suppression de la playlist',
                            type: 'DELETE_ERROR'
                        };

                        set({ isDeleting: false, error: errorData });
                        return { success: false, error: errorData };
                    }
                },

                /**
                 * Ajouter une vidéo à une playlist
                 */
                async addVideoToPlaylist(playlistId, videoId, position = null) {
                    try {
                        const { data, error } = await playlistService.addVideoToPlaylist(
                            playlistId,
                            videoId,
                            position
                        );

                        if (error) return { success: false, error };

                        // Mettre à jour la playlist actuelle si c'est la même
                        if (get().currentPlaylist?.id === playlistId) {
                            set(state => ({
                                currentPlaylist: {
                                    ...state.currentPlaylist,
                                    videos: data.videos || state.currentPlaylist.videos,
                                    videoCount: data.videoCount || state.currentPlaylist.videoCount
                                }
                            }));
                        }

                        return { success: true, data };
                    } catch (error) {
                        return { success: false, error };
                    }
                },

                /**
                 * Supprimer une vidéo d'une playlist
                 */
                async removeVideoFromPlaylist(playlistId, videoId) {
                    try {
                        const { data, error } = await playlistService.removeVideoFromPlaylist(
                            playlistId,
                            videoId
                        );

                        if (error) return { success: false, error };

                        // Mettre à jour la playlist actuelle si c'est la même
                        if (get().currentPlaylist?.id === playlistId) {
                            set(state => ({
                                currentPlaylist: {
                                    ...state.currentPlaylist,
                                    videos: state.currentPlaylist.videos?.filter(v => v.id !== videoId) || [],
                                    videoCount: Math.max(0, (state.currentPlaylist.videoCount || 1) - 1)
                                }
                            }));
                        }

                        return { success: true, data };
                    } catch (error) {
                        return { success: false, error };
                    }
                },

                /**
                 * Réorganiser les vidéos d'une playlist
                 */
                async reorderPlaylistVideos(playlistId, videoOrders) {
                    try {
                        const { data, error } = await playlistService.reorderPlaylistVideos(
                            playlistId,
                            videoOrders
                        );

                        if (error) return { success: false, error };

                        // Mettre à jour la playlist actuelle
                        if (get().currentPlaylist?.id === playlistId) {
                            set(state => ({
                                currentPlaylist: {
                                    ...state.currentPlaylist,
                                    videos: data.videos || state.currentPlaylist.videos
                                }
                            }));
                        }

                        return { success: true, data };
                    } catch (error) {
                        return { success: false, error };
                    }
                },

                /**
                 * Rechercher des playlists
                 */
                async searchPlaylists(searchTerm, options = {}) {
                    if (!searchTerm || searchTerm.trim().length < 2) {
                        set({ searchResults: [], searchError: null });
                        return { success: true, data: { playlists: [] } };
                    }

                    set({ isSearching: true, searchError: null });

                    try {
                        const { data, error } = await playlistService.searchPlaylists(searchTerm, options);

                        if (error) {
                            set({ isSearching: false, searchError: error });
                            return { success: false, error };
                        }

                        set({
                            searchResults: data.playlists || [],
                            isSearching: false,
                            searchError: null
                        });

                        return { success: true, data };
                    } catch (error) {
                        const errorData = {
                            message: 'Erreur lors de la recherche de playlists',
                            type: 'SEARCH_ERROR'
                        };

                        set({ isSearching: false, searchError: errorData });
                        return { success: false, error: errorData };
                    }
                },

                /**
                 * Gestion des favoris
                 */
                async addToFavorites(videoId) {
                    try {
                        const { data, error } = await playlistService.addToFavorites(videoId);
                        if (error) return { success: false, error };

                        // Ajouter aux favoris locaux
                        set(state => ({
                            favorites: [videoId, ...state.favorites.filter(id => id !== videoId)]
                        }));

                        return { success: true, data };
                    } catch (error) {
                        return { success: false, error };
                    }
                },

                async removeFromFavorites(videoId) {
                    try {
                        const { data, error } = await playlistService.removeFromFavorites(videoId);
                        if (error) return { success: false, error };

                        // Supprimer des favoris locaux
                        set(state => ({
                            favorites: state.favorites.filter(id => id !== videoId)
                        }));

                        return { success: true, data };
                    } catch (error) {
                        return { success: false, error };
                    }
                },

                /**
                 * Gestion de "À regarder plus tard"
                 */
                async addToWatchLater(videoId) {
                    try {
                        const { data, error } = await playlistService.addToWatchLater(videoId);
                        if (error) return { success: false, error };

                        set(state => ({
                            watchLater: [videoId, ...state.watchLater.filter(id => id !== videoId)]
                        }));

                        return { success: true, data };
                    } catch (error) {
                        return { success: false, error };
                    }
                },

                async removeFromWatchLater(videoId) {
                    try {
                        const { data, error } = await playlistService.removeFromWatchLater(videoId);
                        if (error) return { success: false, error };

                        set(state => ({
                            watchLater: state.watchLater.filter(id => id !== videoId)
                        }));

                        return { success: true, data };
                    } catch (error) {
                        return { success: false, error };
                    }
                },

                /**
                 * Charger l'historique de visionnage
                 */
                async loadWatchHistory(options = {}) {
                    try {
                        const { data, error } = await playlistService.getWatchHistory(options);

                        if (error) return { success: false, error };

                        set({ watchHistory: data.videos || [] });
                        return { success: true, data };
                    } catch (error) {
                        return { success: false, error };
                    }
                },

                /**
                 * Nettoyer l'historique
                 */
                async clearWatchHistory(olderThan = null) {
                    try {
                        const { data, error } = await playlistService.clearWatchHistory(olderThan);

                        if (error) return { success: false, error };

                        set({ watchHistory: [] });
                        return { success: true, data };
                    } catch (error) {
                        return { success: false, error };
                    }
                },

                /**
                 * Dupliquer une playlist
                 */
                async duplicatePlaylist(playlistId, newTitle) {
                    try {
                        const { data, error } = await playlistService.duplicatePlaylist(playlistId, newTitle);

                        if (error) return { success: false, error };

                        // Ajouter la playlist dupliquée
                        set(state => ({
                            userPlaylists: [data.playlist, ...state.userPlaylists]
                        }));

                        return { success: true, data };
                    } catch (error) {
                        return { success: false, error };
                    }
                },

                /**
                 * Actions de drag & drop
                 */
                dragActions: {
                    startDrag(item, dragType) {
                        set({
                            dragState: {
                                isDragging: true,
                                draggedItem: item,
                                dropTarget: null,
                                dragType
                            }
                        });
                    },

                    setDropTarget(target) {
                        set(state => ({
                            dragState: {
                                ...state.dragState,
                                dropTarget: target
                            }
                        }));
                    },

                    endDrag() {
                        set({
                            dragState: {
                                isDragging: false,
                                draggedItem: null,
                                dropTarget: null,
                                dragType: null
                            }
                        });
                    },

                    async handleDrop() {
                        const { dragState } = get();
                        const { draggedItem, dropTarget, dragType } = dragState;

                        if (!draggedItem || !dropTarget) return { success: false };

                        try {
                            let result = { success: true };

                            if (dragType === 'video-to-playlist') {
                                // Ajouter une vidéo à une playlist
                                result = await get().actions.addVideoToPlaylist(
                                    dropTarget.playlistId,
                                    draggedItem.videoId
                                );
                            } else if (dragType === 'video-reorder') {
                                // Réorganiser les vidéos dans une playlist
                                const newOrder = dropTarget.newOrder;
                                result = await get().actions.reorderPlaylistVideos(
                                    dropTarget.playlistId,
                                    newOrder
                                );
                            }

                            get().actions.dragActions.endDrag();
                            return result;
                        } catch (error) {
                            get().actions.dragActions.endDrag();
                            return { success: false, error };
                        }
                    }
                },

                /**
                 * Nettoyer les erreurs
                 */
                clearErrors() {
                    set({
                        error: null,
                        playlistError: null,
                        searchError: null
                    });
                },

                /**
                 * Réinitialiser la recherche
                 */
                clearSearch() {
                    set({
                        searchResults: [],
                        searchError: null
                    });
                },

                /**
                 * Méthode privée pour mettre à jour une playlist dans le store
                 */
                _updatePlaylistInStore(playlistId, updates) {
                    set(state => {
                        const updatePlaylistInArray = (playlists) =>
                            playlists.map(playlist =>
                                playlist.id === playlistId ? { ...playlist, ...updates } : playlist
                            );

                        return {
                            playlists: updatePlaylistInArray(state.playlists),
                            userPlaylists: updatePlaylistInArray(state.userPlaylists),
                            searchResults: updatePlaylistInArray(state.searchResults),
                            currentPlaylist: state.currentPlaylist?.id === playlistId
                                ? { ...state.currentPlaylist, ...updates }
                                : state.currentPlaylist
                        };
                    });
                }
            },

            // Getters (sélecteurs)
            getters: {
                getPlaylistById: (playlistId) => {
                    const state = get();
                    return state.playlists.find(p => p.id === playlistId) ||
                        state.userPlaylists.find(p => p.id === playlistId) ||
                        state.searchResults.find(p => p.id === playlistId) ||
                        null;
                },

                isVideoInFavorites: (videoId) => {
                    return get().favorites.includes(videoId);
                },

                isVideoInWatchLater: (videoId) => {
                    return get().watchLater.includes(videoId);
                },

                getVideoPosition: (playlistId, videoId) => {
                    const playlist = get().getters.getPlaylistById(playlistId);
                    if (!playlist?.videos) return -1;
                    return playlist.videos.findIndex(v => v.id === videoId);
                },

                canManagePlaylist: (playlistId, userId) => {
                    const playlist = get().getters.getPlaylistById(playlistId);
                    return playlist?.userId === userId;
                },

                getPlaylistsByUser: (userId) => {
                    const state = get();
                    return [...state.playlists, ...state.userPlaylists]
                        .filter(p => p.userId === userId);
                }
            }
        })),
        {
            name: 'playlist-store',
            enabled: process.env.NODE_ENV === 'development'
        }
    )
);

// Hooks spécialisés pour les playlists
export const usePlaylistList = () => {
    return usePlaylistStore(state => ({
        playlists: state.playlists,
        pagination: state.pagination,
        isLoading: state.isLoading,
        isLoadingMore: state.isLoadingMore,
        error: state.error,
        loadPlaylists: state.actions.loadPlaylists
    }));
};

export const useCurrentPlaylist = () => {
    return usePlaylistStore(state => ({
        currentPlaylist: state.currentPlaylist,
        isLoadingPlaylist: state.isLoadingPlaylist,
        playlistError: state.playlistError,
        loadPlaylist: state.actions.loadPlaylist
    }));
};

export const useUserPlaylists = () => {
    return usePlaylistStore(state => ({
        userPlaylists: state.userPlaylists,
        isLoading: state.isLoading,
        error: state.error,
        loadUserPlaylists: state.actions.loadUserPlaylists,
        createPlaylist: state.actions.createPlaylist,
        updatePlaylist: state.actions.updatePlaylist,
        deletePlaylist: state.actions.deletePlaylist,
        isCreating: state.isCreating,
        isUpdating: state.isUpdating,
        isDeleting: state.isDeleting
    }));
};

export const usePlaylistSearch = () => {
    return usePlaylistStore(state => ({
        searchResults: state.searchResults,
        isSearching: state.isSearching,
        searchError: state.searchError,
        searchPlaylists: state.actions.searchPlaylists,
        clearSearch: state.actions.clearSearch
    }));
};

export const useFavorites = () => {
    return usePlaylistStore(state => ({
        favorites: state.favorites,
        addToFavorites: state.actions.addToFavorites,
        removeFromFavorites: state.actions.removeFromFavorites,
        isVideoInFavorites: state.getters.isVideoInFavorites
    }));
};

export const useWatchLater = () => {
    return usePlaylistStore(state => ({
        watchLater: state.watchLater,
        addToWatchLater: state.actions.addToWatchLater,
        removeFromWatchLater: state.actions.removeFromWatchLater,
        isVideoInWatchLater: state.getters.isVideoInWatchLater
    }));
};

export const useWatchHistory = () => {
    return usePlaylistStore(state => ({
        watchHistory: state.watchHistory,
        loadWatchHistory: state.actions.loadWatchHistory,
        clearWatchHistory: state.actions.clearWatchHistory
    }));
};

export const usePlaylistDragDrop = () => {
    return usePlaylistStore(state => ({
        dragState: state.dragState,
        ...state.actions.dragActions
    }));
};

export const usePlaylistActions = () => {
    return usePlaylistStore(state => ({
        addVideoToPlaylist: state.actions.addVideoToPlaylist,
        removeVideoFromPlaylist: state.actions.removeVideoFromPlaylist,
        reorderPlaylistVideos: state.actions.reorderPlaylistVideos,
        duplicatePlaylist: state.actions.duplicatePlaylist
    }));
};

export default usePlaylistStore;