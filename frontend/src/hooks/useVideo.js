// frontend/src/hooks/useVideo.js
import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    useVideoList,
    useCurrentVideo,
    useVideoSearch,
    useVideoPlayer,
    useVideoUpload,
    useTrendingVideos,
    useVideoActions
} from '../store/videoStore';
import { useAuth } from './useAuth';

/**
 * Hook principal pour la gestion des vidéos
 * Combine toutes les fonctionnalités vidéo avec la logique métier
 */
export const useVideo = () => {
    const videoList = useVideoList();
    const currentVideo = useCurrentVideo();
    const videoSearch = useVideoSearch();
    const videoActions = useVideoActions();
    const { isAuthenticated, permissions } = useAuth();

    // Actions améliorées avec vérifications d'authentification
    const enhancedActions = useMemo(() => ({
        /**
         * Charger les vidéos avec gestion d'erreur
         */
        loadVideos: async (options = {}) => {
            try {
                return await videoList.loadVideos(options);
            } catch (error) {
                console.error('Erreur chargement vidéos:', error);
                return { success: false, error };
            }
        },

        /**
         * Liker une vidéo avec vérification d'authentification
         */
        likeVideo: async (videoId) => {
            if (!isAuthenticated) {
                return {
                    success: false,
                    error: { message: 'Connexion requise pour liker une vidéo' }
                };
            }

            if (!permissions.canComment) {
                return {
                    success: false,
                    error: { message: 'Email non vérifié. Vérifiez votre email pour liker des vidéos.' }
                };
            }

            return await videoActions.toggleVideoReaction(videoId, 'like');
        },

        /**
         * Disliker une vidéo avec vérification d'authentification
         */
        dislikeVideo: async (videoId) => {
            if (!isAuthenticated) {
                return {
                    success: false,
                    error: { message: 'Connexion requise pour disliker une vidéo' }
                };
            }

            if (!permissions.canComment) {
                return {
                    success: false,
                    error: { message: 'Email non vérifié. Vérifiez votre email pour disliker des vidéos.' }
                };
            }

            return await videoActions.toggleVideoReaction(videoId, 'dislike');
        },

        /**
         * Rechercher des vidéos avec debounce
         */
        searchVideos: videoSearch.searchVideos,

        /**
         * Enregistrer une vue (silencieux)
         */
        recordView: videoActions.recordView
    }), [videoList, videoActions, videoSearch, isAuthenticated, permissions]);

    return {
        // État des listes
        videos: videoList.videos,
        pagination: videoList.pagination,
        isLoading: videoList.isLoading,
        isLoadingMore: videoList.isLoadingMore,
        error: videoList.error,

        // Vidéo actuelle
        currentVideo: currentVideo.currentVideo,
        isLoadingVideo: currentVideo.isLoadingVideo,
        videoError: currentVideo.videoError,

        // Recherche
        searchResults: videoSearch.searchResults,
        searchFilters: videoSearch.searchFilters,
        isSearching: videoSearch.isSearching,
        searchError: videoSearch.searchError,

        // Actions
        ...enhancedActions,
        loadVideo: currentVideo.loadVideo,
        updateSearchFilters: videoSearch.updateSearchFilters,
        clearSearch: videoSearch.clearSearch
    };
};

/**
 * Hook pour un lecteur vidéo complet avec gestion HLS
 */
export const useVideoPlayer = (videoId, options = {}) => {
    const { autoplay = false, muted = false, controls = true } = options;
    const player = useVideoPlayer();
    const { currentVideo, loadVideo } = useCurrentVideo();
    const { recordView } = useVideoActions();

    const videoRef = useRef(null);
    const hlsRef = useRef(null);
    const progressTimerRef = useRef(null);
    const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

    // Charger la vidéo quand l'ID change
    useEffect(() => {
        if (videoId && (!currentVideo || currentVideo.id !== videoId)) {
            loadVideo(videoId);
        }
    }, [videoId, currentVideo, loadVideo]);

    // Initialiser HLS quand la vidéo est chargée
    useEffect(() => {
        if (!currentVideo || !videoRef.current) return;

        const video = videoRef.current;

        // Charger HLS.js si disponible
        if (window.Hls && window.Hls.isSupported()) {
            const hls = new window.Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90
            });

            hlsRef.current = hls;

            const streamUrl = `${process.env.REACT_APP_API_BASE_URL}/videos/${currentVideo.id}/stream`;
            hls.loadSource(streamUrl);
            hls.attachMedia(video);

            hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
                player.setDuration(video.duration);
                if (autoplay) {
                    video.play().catch(console.warn);
                }
            });

            hls.on(window.Hls.Events.ERROR, (event, data) => {
                console.error('Erreur HLS:', data);
                player.setError(true);
            });

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Support natif HLS (Safari)
            const streamUrl = `${process.env.REACT_APP_API_BASE_URL}/videos/${currentVideo.id}/stream`;
            video.src = streamUrl;

            if (autoplay) {
                video.play().catch(console.warn);
            }
        }

        // Configuration du lecteur
        video.muted = muted;
        video.controls = controls;

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [currentVideo, autoplay, muted, controls, player]);

    // Gestionnaires d'événements vidéo
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedMetadata = () => {
            player.setDuration(video.duration);
        };

        const handleTimeUpdate = () => {
            player.setCurrentTime(video.currentTime);
        };

        const handlePlay = () => {
            player.play();
            setHasStartedPlaying(true);

            // Démarrer le timer de progression pour les vues
            progressTimerRef.current = setInterval(() => {
                if (video.currentTime > 10 && hasStartedPlaying) {
                    recordView(videoId, video.currentTime);
                    clearInterval(progressTimerRef.current);
                }
            }, 1000);
        };

        const handlePause = () => {
            player.pause();
            if (progressTimerRef.current) {
                clearInterval(progressTimerRef.current);
            }
        };

        const handleVolumeChange = () => {
            player.setVolume(video.volume);
            player.setMuted(video.muted);
        };

        const handleWaiting = () => {
            player.setBuffering(true);
        };

        const handleCanPlay = () => {
            player.setBuffering(false);
        };

        const handleError = () => {
            player.setError(true);
        };

        const handleEnded = () => {
            player.pause();
            recordView(videoId, video.duration);
        };

        // Ajouter les listeners
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('volumechange', handleVolumeChange);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('error', handleError);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('volumechange', handleVolumeChange);
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('error', handleError);
            video.removeEventListener('ended', handleEnded);

            if (progressTimerRef.current) {
                clearInterval(progressTimerRef.current);
            }
        };
    }, [videoId, player, recordView, hasStartedPlaying]);

    // Actions du lecteur
    const playerActions = useMemo(() => ({
        play: () => videoRef.current?.play().catch(console.warn),
        pause: () => videoRef.current?.pause(),
        seek: (time) => {
            if (videoRef.current) {
                videoRef.current.currentTime = time;
                player.setCurrentTime(time);
            }
        },
        setVolume: (volume) => {
            if (videoRef.current) {
                videoRef.current.volume = volume;
                player.setVolume(volume);
            }
        },
        toggleMute: () => {
            if (videoRef.current) {
                videoRef.current.muted = !videoRef.current.muted;
                player.toggleMute();
            }
        },
        setPlaybackRate: (rate) => {
            if (videoRef.current) {
                videoRef.current.playbackRate = rate;
                player.setPlaybackRate(rate);
            }
        },
        enterFullscreen: () => {
            if (videoRef.current?.requestFullscreen) {
                videoRef.current.requestFullscreen();
                player.setFullscreen(true);
            }
        },
        exitFullscreen: () => {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                player.setFullscreen(false);
            }
        }
    }), [player]);

    return {
        videoRef,
        player,
        currentVideo,
        actions: playerActions,
        isLoading: !currentVideo
    };
};

/**
 * Hook pour l'upload de vidéos avec progression
 */
export const useVideoUploadWithProgress = () => {
    const upload = useVideoUpload();
    const { permissions } = useAuth();
    const navigate = useNavigate();

    const [uploadQueue, setUploadQueue] = useState([]);

    // Vérifier les permissions d'upload
    const canUpload = useMemo(() => {
        return permissions.canUploadVideo;
    }, [permissions]);

    const uploadVideo = useCallback(async (videoData, options = {}) => {
        if (!canUpload) {
            return {
                success: false,
                error: {
                    message: 'Vous devez vérifier votre email pour uploader des vidéos',
                    type: 'PERMISSION_ERROR'
                }
            };
        }

        const { onProgress, onComplete } = options;

        const result = await upload.uploadVideo(videoData, (progressData) => {
            // Mettre à jour la queue d'upload
            setUploadQueue(prev =>
                prev.map(item =>
                    item.id === progressData.uploadId
                        ? { ...item, ...progressData }
                        : item
                )
            );

            if (onProgress) {
                onProgress(progressData);
            }

            // Upload terminé
            if (progressData.stage === 'processing' && onComplete) {
                onComplete(progressData);
            }
        });

        // Ajouter à la queue si succès
        if (result.success) {
            setUploadQueue(prev => [...prev, {
                id: result.uploadId,
                fileName: videoData.file.name,
                progress: 0,
                status: 'uploading'
            }]);
        }

        return result;
    }, [canUpload, upload]);

    const removeFromQueue = useCallback((uploadId) => {
        setUploadQueue(prev => prev.filter(item => item.id !== uploadId));
        upload.removeUpload(uploadId);
    }, [upload]);

    return {
        ...upload,
        uploadVideo,
        uploadQueue,
        removeFromQueue,
        canUpload
    };
};

/**
 * Hook pour la recherche de vidéos avec debounce
 */
export const useVideoSearchWithDebounce = (delay = 300) => {
    const search = useVideoSearch();
    const [debouncedTerm, setDebouncedTerm] = useState('');
    const timeoutRef = useRef(null);

    const searchWithDebounce = useCallback((term, options = {}) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            setDebouncedTerm(term);
            if (term.trim().length >= 2) {
                search.searchVideos(term, options);
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
        searchVideos: searchWithDebounce,
        debouncedTerm
    };
};

/**
 * Hook pour une page vidéo avec paramètres d'URL
 */
export const useVideoPage = () => {
    const { videoId } = useParams();
    const navigate = useNavigate();
    const { currentVideo, loadVideo, isLoadingVideo, videoError } = useCurrentVideo();
    const { isAuthenticated } = useAuth();

    // Charger la vidéo depuis l'URL
    useEffect(() => {
        if (videoId) {
            loadVideo(videoId);
        }
    }, [videoId, loadVideo]);

    // Rediriger si vidéo non trouvée
    useEffect(() => {
        if (videoError?.type === 'NOT_FOUND_ERROR') {
            navigate('/404', { replace: true });
        }
    }, [videoError, navigate]);

    // Vérifier si l'utilisateur peut voir cette vidéo
    const canViewVideo = useMemo(() => {
        if (!currentVideo) return false;
        if (!currentVideo.isPrivate) return true;
        if (!isAuthenticated) return false;

        // Vérifier si l'utilisateur est propriétaire
        return currentVideo.userId === isAuthenticated.id;
    }, [currentVideo, isAuthenticated]);

    return {
        videoId,
        currentVideo,
        isLoading: isLoadingVideo,
        error: videoError,
        canViewVideo
    };
};

/**
 * Hook pour les vidéos tendances avec rafraîchissement automatique
 */
export const useTrendingWithRefresh = (refreshInterval = 5 * 60 * 1000) => {
    const trending = useTrendingVideos();

    // Charger au montage
    useEffect(() => {
        trending.loadTrendingVideos();
    }, []);

    // Rafraîchissement automatique
    useEffect(() => {
        const interval = setInterval(() => {
            trending.loadTrendingVideos();
        }, refreshInterval);

        return () => clearInterval(interval);
    }, [trending, refreshInterval]);

    return trending;
};

// Hooks simplifiés pour des cas d'usage spécifiques
export const useSimpleVideoList = () => useVideoList();
export const useSimpleCurrentVideo = () => useCurrentVideo();
export const useSimpleVideoSearch = () => useVideoSearch();
export const useSimpleVideoPlayer = () => useVideoPlayer();
export const useSimpleVideoUpload = () => useVideoUpload();
export const useSimpleTrendingVideos = () => useTrendingVideos();

export default useVideo;