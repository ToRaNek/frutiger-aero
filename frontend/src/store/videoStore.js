// frontend/src/store/videoStore.js
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import videoService, { VIDEO_QUALITIES, UPLOAD_STATUS } from '../services/videoService';

/**
 * Store Zustand pour la gestion des vidéos
 * Utilise le pattern recommandé avec actions séparées et sélecteurs optimisés
 */
const useVideoStore = create(
    devtools(
        subscribeWithSelector((set, get) => ({
            // État des listes de vidéos
            videos: [],
            currentVideo: null,
            trendingVideos: [],
            searchResults: [],
            categories: [],

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
            isLoadingVideo: false,
            isSearching: false,
            isTrendingLoading: false,

            // Erreurs
            error: null,
            videoError: null,
            searchError: null,

            // Upload d'État
            uploads: new Map(), // Map<uploadId, uploadData>

            // Lecteur vidéo
            player: {
                isPlaying: false,
                currentTime: 0,
                duration: 0,
                volume: 1,
                quality: VIDEO_QUALITIES.AUTO,
                playbackRate: 1,
                isFullscreen: false,
                isMuted: false,
                isBuffering: false,
                hasError: false
            },

            // Filtres de recherche
            searchFilters: {
                category: null,
                duration: null,
                uploadDate: null,
                sortBy: 'relevance'
            },

            // Actions
            actions: {
                /**
                 * Charger la liste des vidéos
                 */
                async loadVideos(options = {}) {
                    const { refresh = false, loadMore = false } = options;

                    if (!refresh && !loadMore) {
                        set({ isLoading: true, error: null });
                    } else if (loadMore) {
                        set({ isLoadingMore: true });
                    }

                    try {
                        const currentPagination = get().pagination;
                        const page = loadMore ? currentPagination.page + 1 : 1;

                        const { data, error } = await videoService.getVideos({
                            page,
                            limit: currentPagination.limit,
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

                        const newVideos = data.videos || [];
                        const existingVideos = get().videos;

                        set({
                            videos: loadMore ? [...existingVideos, ...newVideos] : newVideos,
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
                                message: 'Erreur lors du chargement des vidéos',
                                type: 'LOAD_ERROR'
                            }
                        });
                        return { success: false, error };
                    }
                },

                /**
                 * Charger une vidéo spécifique
                 */
                async loadVideo(videoId, includeUser = true) {
                    if (!videoId) return { success: false, error: { message: 'ID requis' } };

                    set({ isLoadingVideo: true, videoError: null });

                    try {
                        const { data, error } = await videoService.getVideoById(videoId, includeUser);

                        if (error) {
                            set({
                                isLoadingVideo: false,
                                videoError: error
                            });
                            return { success: false, error };
                        }

                        set({
                            currentVideo: data.video,
                            isLoadingVideo: false,
                            videoError: null
                        });

                        // Enregistrer la vue automatiquement
                        setTimeout(() => {
                            get().actions.recordView(videoId);
                        }, 3000); // Après 3 secondes

                        return { success: true, data };
                    } catch (error) {
                        const errorData = {
                            message: 'Erreur lors du chargement de la vidéo',
                            type: 'VIDEO_LOAD_ERROR'
                        };

                        set({
                            isLoadingVideo: false,
                            videoError: errorData
                        });
                        return { success: false, error: errorData };
                    }
                },

                /**
                 * Rechercher des vidéos
                 */
                async searchVideos(searchTerm, options = {}) {
                    if (!searchTerm || searchTerm.trim().length < 2) {
                        set({
                            searchResults: [],
                            searchError: null
                        });
                        return { success: true, data: { videos: [] } };
                    }

                    set({ isSearching: true, searchError: null });

                    try {
                        const searchOptions = {
                            ...get().searchFilters,
                            ...options
                        };

                        const { data, error } = await videoService.searchVideos(searchTerm, searchOptions);

                        if (error) {
                            set({
                                isSearching: false,
                                searchError: error
                            });
                            return { success: false, error };
                        }

                        set({
                            searchResults: data.videos || [],
                            isSearching: false,
                            searchError: null
                        });

                        return { success: true, data };
                    } catch (error) {
                        const errorData = {
                            message: 'Erreur lors de la recherche',
                            type: 'SEARCH_ERROR'
                        };

                        set({
                            isSearching: false,
                            searchError: errorData
                        });
                        return { success: false, error: errorData };
                    }
                },

                /**
                 * Charger les vidéos tendances
                 */
                async loadTrendingVideos(options = {}) {
                    set({ isTrendingLoading: true });

                    try {
                        const { data, error } = await videoService.getTrendingVideos(options);

                        if (error) {
                            set({ isTrendingLoading: false });
                            return { success: false, error };
                        }

                        set({
                            trendingVideos: data.videos || [],
                            isTrendingLoading: false
                        });

                        return { success: true, data };
                    } catch (error) {
                        set({ isTrendingLoading: false });
                        return { success: false, error };
                    }
                },

                /**
                 * Upload d'une vidéo
                 */
                async uploadVideo(videoData, onProgress = null) {
                    const uploadId = Date.now().toString();

                    // Initialiser l'upload dans le store
                    set(state => ({
                        uploads: new Map(state.uploads).set(uploadId, {
                            id: uploadId,
                            status: UPLOAD_STATUS.UPLOADING,
                            progress: 0,
                            videoData,
                            startTime: Date.now(),
                            error: null
                        })
                    }));

                    try {
                        const { data, error } = await videoService.uploadVideo(videoData, (progressData) => {
                            // Mettre à jour le progrès dans le store
                            set(state => {
                                const newUploads = new Map(state.uploads);
                                const upload = newUploads.get(uploadId);
                                if (upload) {
                                    newUploads.set(uploadId, {
                                        ...upload,
                                        progress: progressData.progress,
                                        status: progressData.stage === 'processing' ? UPLOAD_STATUS.PROCESSING : UPLOAD_STATUS.UPLOADING
                                    });
                                }
                                return { uploads: newUploads };
                            });

                            // Callback externe
                            if (onProgress) {
                                onProgress({ ...progressData, uploadId });
                            }
                        });

                        if (error) {
                            // Marquer l'upload comme échoué
                            set(state => {
                                const newUploads = new Map(state.uploads);
                                const upload = newUploads.get(uploadId);
                                if (upload) {
                                    newUploads.set(uploadId, {
                                        ...upload,
                                        status: UPLOAD_STATUS.ERROR,
                                        error
                                    });
                                }
                                return { uploads: newUploads };
                            });

                            return { success: false, error, uploadId };
                        }

                        // Upload réussi
                        set(state => {
                            const newUploads = new Map(state.uploads);
                            const upload = newUploads.get(uploadId);
                            if (upload) {
                                newUploads.set(uploadId, {
                                    ...upload,
                                    status: UPLOAD_STATUS.COMPLETED,
                                    progress: 100,
                                    videoId: data.video.id,
                                    video: data.video
                                });
                            }
                            return { uploads: newUploads };
                        });

                        // Recharger la liste des vidéos
                        setTimeout(() => {
                            get().actions.loadVideos({ refresh: true });
                        }, 2000);

                        return { success: true, data, uploadId };
                    } catch (error) {
                        set(state => {
                            const newUploads = new Map(state.uploads);
                            const upload = newUploads.get(uploadId);
                            if (upload) {
                                newUploads.set(uploadId, {
                                    ...upload,
                                    status: UPLOAD_STATUS.ERROR,
                                    error
                                });
                            }
                            return { uploads: newUploads };
                        });

                        return { success: false, error, uploadId };
                    }
                },

                /**
                 * Supprimer un upload du store
                 */
                removeUpload(uploadId) {
                    set(state => {
                        const newUploads = new Map(state.uploads);
                        newUploads.delete(uploadId);
                        return { uploads: newUploads };
                    });
                },

                /**
                 * Liker/Disliker une vidéo
                 */
                async toggleVideoReaction(videoId, reactionType) {
                    if (!videoId || !['like', 'dislike'].includes(reactionType)) {
                        return { success: false, error: { message: 'Paramètres invalides' } };
                    }

                    try {
                        const { data, error } = reactionType === 'like'
                            ? await videoService.likeVideo(videoId)
                            : await videoService.dislikeVideo(videoId);

                        if (error) return { success: false, error };

                        // Mettre à jour la vidéo dans le store
                        get().actions._updateVideoInStore(videoId, {
                            likes: data.likes,
                            dislikes: data.dislikes,
                            userReaction: data.userReaction
                        });

                        return { success: true, data };
                    } catch (error) {
                        return { success: false, error };
                    }
                },

                /**
                 * Enregistrer une vue
                 */
                async recordView(videoId, watchTime = 0) {
                    try {
                        await videoService.recordView(videoId, watchTime);
                    } catch (error) {
                        // Erreur silencieuse pour les vues
                        console.warn('Erreur enregistrement vue:', error);
                    }
                },

                /**
                 * Charger les catégories
                 */
                async loadCategories() {
                    try {
                        const { data, error } = await videoService.getCategories();

                        if (!error && data) {
                            set({ categories: data.categories || [] });
                        }

                        return { success: !error, data, error };
                    } catch (error) {
                        return { success: false, error };
                    }
                },

                /**
                 * Mettre à jour les filtres de recherche
                 */
                updateSearchFilters(filters) {
                    set(state => ({
                        searchFilters: { ...state.searchFilters, ...filters }
                    }));
                },

                /**
                 * Actions du lecteur vidéo
                 */
                playerActions: {
                    play() {
                        set(state => ({
                            player: { ...state.player, isPlaying: true }
                        }));
                    },

                    pause() {
                        set(state => ({
                            player: { ...state.player, isPlaying: false }
                        }));
                    },

                    setCurrentTime(time) {
                        set(state => ({
                            player: { ...state.player, currentTime: time }
                        }));
                    },

                    setDuration(duration) {
                        set(state => ({
                            player: { ...state.player, duration }
                        }));
                    },

                    setVolume(volume) {
                        set(state => ({
                            player: { ...state.player, volume: Math.max(0, Math.min(1, volume)) }
                        }));
                    },

                    setQuality(quality) {
                        set(state => ({
                            player: { ...state.player, quality }
                        }));
                    },

                    setPlaybackRate(rate) {
                        set(state => ({
                            player: { ...state.player, playbackRate: rate }
                        }));
                    },

                    toggleMute() {
                        set(state => ({
                            player: { ...state.player, isMuted: !state.player.isMuted }
                        }));
                    },

                    setFullscreen(isFullscreen) {
                        set(state => ({
                            player: { ...state.player, isFullscreen }
                        }));
                    },

                    setBuffering(isBuffering) {
                        set(state => ({
                            player: { ...state.player, isBuffering }
                        }));
                    },

                    setError(hasError) {
                        set(state => ({
                            player: { ...state.player, hasError }
                        }));
                    },

                    reset() {
                        set(state => ({
                            player: {
                                ...state.player,
                                isPlaying: false,
                                currentTime: 0,
                                duration: 0,
                                isBuffering: false,
                                hasError: false
                            }
                        }));
                    }
                },

                /**
                 * Nettoyer les erreurs
                 */
                clearErrors() {
                    set({
                        error: null,
                        videoError: null,
                        searchError: null
                    });
                },

                /**
                 * Réinitialiser la recherche
                 */
                clearSearch() {
                    set({
                        searchResults: [],
                        searchError: null,
                        searchFilters: {
                            category: null,
                            duration: null,
                            uploadDate: null,
                            sortBy: 'relevance'
                        }
                    });
                },

                /**
                 * Méthode privée pour mettre à jour une vidéo dans le store
                 */
                _updateVideoInStore(videoId, updates) {
                    set(state => {
                        // Mettre à jour dans videos
                        const updatedVideos = state.videos.map(video =>
                            video.id === videoId ? { ...video, ...updates } : video
                        );

                        // Mettre à jour dans searchResults
                        const updatedSearchResults = state.searchResults.map(video =>
                            video.id === videoId ? { ...video, ...updates } : video
                        );

                        // Mettre à jour dans trendingVideos
                        const updatedTrendingVideos = state.trendingVideos.map(video =>
                            video.id === videoId ? { ...video, ...updates } : video
                        );

                        // Mettre à jour currentVideo si c'est la même
                        const updatedCurrentVideo = state.currentVideo?.id === videoId
                            ? { ...state.currentVideo, ...updates }
                            : state.currentVideo;

                        return {
                            videos: updatedVideos,
                            searchResults: updatedSearchResults,
                            trendingVideos: updatedTrendingVideos,
                            currentVideo: updatedCurrentVideo
                        };
                    });
                }
            },

            // Getters (sélecteurs)
            getters: {
                getVideoById: (videoId) => {
                    const state = get();
                    return state.videos.find(v => v.id === videoId) ||
                        state.searchResults.find(v => v.id === videoId) ||
                        state.trendingVideos.find(v => v.id === videoId) ||
                        null;
                },

                getUploadById: (uploadId) => {
                    return get().uploads.get(uploadId) || null;
                },

                getActiveUploads: () => {
                    const uploads = Array.from(get().uploads.values());
                    return uploads.filter(upload =>
                        upload.status === UPLOAD_STATUS.UPLOADING ||
                        upload.status === UPLOAD_STATUS.PROCESSING
                    );
                },

                getCompletedUploads: () => {
                    const uploads = Array.from(get().uploads.values());
                    return uploads.filter(upload => upload.status === UPLOAD_STATUS.COMPLETED);
                },

                getFailedUploads: () => {
                    const uploads = Array.from(get().uploads.values());
                    return uploads.filter(upload => upload.status === UPLOAD_STATUS.ERROR);
                },

                isVideoLiked: (videoId) => {
                    const video = get().getters.getVideoById(videoId);
                    return video?.userReaction === 'like';
                },

                isVideoDisliked: (videoId) => {
                    const video = get().getters.getVideoById(videoId);
                    return video?.userReaction === 'dislike';
                },

                getStreamUrl: (videoId, quality) => {
                    return videoService.getStreamUrl(videoId, quality);
                },

                getThumbnailUrl: (videoId, size) => {
                    return videoService.getThumbnailUrl(videoId, size);
                }
            }
        })),
        {
            name: 'video-store',
            enabled: process.env.NODE_ENV === 'development'
        }
    )
);

// Hooks spécialisés pour les vidéos
export const useVideoList = () => {
    return useVideoStore(state => ({
        videos: state.videos,
        pagination: state.pagination,
        isLoading: state.isLoading,
        isLoadingMore: state.isLoadingMore,
        error: state.error,
        loadVideos: state.actions.loadVideos
    }));
};

export const useCurrentVideo = () => {
    return useVideoStore(state => ({
        currentVideo: state.currentVideo,
        isLoadingVideo: state.isLoadingVideo,
        videoError: state.videoError,
        loadVideo: state.actions.loadVideo,
        recordView: state.actions.recordView
    }));
};

export const useVideoSearch = () => {
    return useVideoStore(state => ({
        searchResults: state.searchResults,
        searchFilters: state.searchFilters,
        isSearching: state.isSearching,
        searchError: state.searchError,
        searchVideos: state.actions.searchVideos,
        updateSearchFilters: state.actions.updateSearchFilters,
        clearSearch: state.actions.clearSearch
    }));
};

export const useVideoPlayer = () => {
    return useVideoStore(state => ({
        player: state.player,
        ...state.actions.playerActions
    }));
};

export const useVideoUpload = () => {
    return useVideoStore(state => ({
        uploads: state.uploads,
        uploadVideo: state.actions.uploadVideo,
        removeUpload: state.actions.removeUpload,
        getUploadById: state.getters.getUploadById,
        getActiveUploads: state.getters.getActiveUploads,
        getCompletedUploads: state.getters.getCompletedUploads,
        getFailedUploads: state.getters.getFailedUploads
    }));
};

export const useTrendingVideos = () => {
    return useVideoStore(state => ({
        trendingVideos: state.trendingVideos,
        isTrendingLoading: state.isTrendingLoading,
        loadTrendingVideos: state.actions.loadTrendingVideos
    }));
};

export const useVideoActions = () => {
    return useVideoStore(state => ({
        toggleVideoReaction: state.actions.toggleVideoReaction,
        recordView: state.actions.recordView,
        loadCategories: state.actions.loadCategories
    }));
};

export default useVideoStore;