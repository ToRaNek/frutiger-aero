// frontend/src/components/video/VideoGrid.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Grid, List, Filter, SortAsc, RefreshCw, AlertCircle } from 'lucide-react';
import VideoCard from './VideoCard';
import LoadingSpinner from '../common/LoadingSpinner';
import { useVideo } from '../../hooks/useVideo';
import {
    PAGINATION,
    SORT_OPTIONS,
    VIDEO_CATEGORIES,
    ANIMATION_DURATION
} from '../../utils/constants';
import { debounce, shuffleArray } from '../../utils/helpers';
import { formatSearchResults } from '../../utils/formatters';

/**
 * Grille de vidéos responsive avec pagination infinie et filtres
 *
 * Props:
 * - videos: array - Tableau de vidéos à afficher
 * - isLoading: boolean - État de chargement
 * - error: string - Message d'erreur
 * - onVideoClick: function - Callback de clic sur vidéo
 * - onLoadMore: function - Callback pour charger plus
 * - hasMore: boolean - S'il y a plus de contenu
 * - showFilters: boolean - Afficher les filtres
 * - showLayoutToggle: boolean - Afficher le toggle layout
 * - showStats: boolean - Afficher les statistiques
 * - initialLayout: string - Layout initial (grid, list)
 * - columns: object - Nombre de colonnes par breakpoint
 * - enableInfiniteScroll: boolean - Scroll infini
 * - virtualScrolling: boolean - Virtualisation pour performance
 * - emptyMessage: string - Message si vide
 * - emptyAction: function - Action si vide
 */

const VideoGrid = ({
                       videos = [],
                       isLoading = false,
                       error = null,
                       onVideoClick,
                       onLoadMore,
                       hasMore = false,
                       showFilters = true,
                       showLayoutToggle = true,
                       showStats = true,
                       initialLayout = 'grid',
                       columns = {
                           xs: 1,
                           sm: 2,
                           md: 3,
                           lg: 4,
                           xl: 5
                       },
                       enableInfiniteScroll = true,
                       virtualScrolling = false,
                       emptyMessage = "Aucune vidéo à afficher",
                       emptyAction
                   }) => {
    // État local
    const [layout, setLayout] = useState(initialLayout);
    const [sortBy, setSortBy] = useState(SORT_OPTIONS.NEWEST);
    const [filterCategory, setFilterCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredVideos, setFilteredVideos] = useState(videos);
    const [displayedVideos, setDisplayedVideos] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isFiltering, setIsFiltering] = useState(false);

    // Refs
    const gridRef = useRef(null);
    const observerRef = useRef(null);
    const loadMoreRef = useRef(null);

    // Hook vidéo pour les actions
    const {
        loadVideos,
        searchVideos,
        isLoading: videoLoading
    } = useVideo();

    // Filtrage et tri des vidéos
    const applyFiltersAndSort = useCallback(() => {
        setIsFiltering(true);

        setTimeout(() => {
            let result = [...videos];

            // Filtrage par recherche
            if (searchTerm) {
                result = result.filter(video =>
                    video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    video.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    video.user?.username.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }

            // Filtrage par catégorie
            if (filterCategory !== 'all') {
                result = result.filter(video =>
                    video.category === filterCategory
                );
            }

            // Tri
            switch (sortBy) {
                case SORT_OPTIONS.NEWEST:
                    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    break;
                case SORT_OPTIONS.OLDEST:
                    result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                    break;
                case SORT_OPTIONS.MOST_VIEWED:
                    result.sort((a, b) => (b.views || 0) - (a.views || 0));
                    break;
                case SORT_OPTIONS.MOST_LIKED:
                    result.sort((a, b) => (b.likes || 0) - (a.likes || 0));
                    break;
                case SORT_OPTIONS.ALPHABETICAL:
                    result.sort((a, b) => a.title.localeCompare(b.title));
                    break;
                case 'random':
                    result = shuffleArray(result);
                    break;
                default:
                    break;
            }

            setFilteredVideos(result);
            setIsFiltering(false);
        }, 300); // Délai pour l'animation
    }, [videos, searchTerm, filterCategory, sortBy]);

    // Application des filtres quand les dépendances changent
    useEffect(() => {
        applyFiltersAndSort();
    }, [applyFiltersAndSort]);

    // Mise à jour des vidéos affichées avec pagination
    useEffect(() => {
        const videosPerPage = virtualScrolling ? 20 : PAGINATION.VIDEO_GRID_LIMIT;
        const endIndex = currentPage * videosPerPage;
        setDisplayedVideos(filteredVideos.slice(0, endIndex));
    }, [filteredVideos, currentPage, virtualScrolling]);

    // Configuration de l'observateur pour le scroll infini
    useEffect(() => {
        if (!enableInfiniteScroll || !loadMoreRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting && hasMore && !isLoading && !videoLoading) {
                    if (onLoadMore) {
                        onLoadMore();
                    } else {
                        // Pagination locale
                        setCurrentPage(prev => prev + 1);
                    }
                }
            },
            {
                rootMargin: '100px',
                threshold: 0.1
            }
        );

        observer.observe(loadMoreRef.current);
        observerRef.current = observer;

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [enableInfiniteScroll, hasMore, isLoading, videoLoading, onLoadMore]);

    // Debounced search
    const debouncedSearch = useCallback(
        debounce((term) => {
            setSearchTerm(term);
            setCurrentPage(1);
        }, 300),
        []
    );

    // Gestion du changement de recherche
    const handleSearchChange = (e) => {
        debouncedSearch(e.target.value);
    };

    // Changement de tri
    const handleSortChange = (newSort) => {
        setSortBy(newSort);
        setCurrentPage(1);
    };

    // Changement de catégorie
    const handleCategoryChange = (category) => {
        setFilterCategory(category);
        setCurrentPage(1);
    };

    // Rafraîchissement
    const handleRefresh = () => {
        setCurrentPage(1);
        setSearchTerm('');
        setFilterCategory('all');
        setSortBy(SORT_OPTIONS.NEWEST);

        if (onLoadMore) {
            onLoadMore(true); // Force refresh
        }
    };

    // Classes CSS pour la grille
    const getGridClasses = () => {
        if (layout === 'list') {
            return 'space-y-4';
        }

        return `
      grid gap-4 sm:gap-6
      grid-cols-${columns.xs}
      sm:grid-cols-${columns.sm}
      md:grid-cols-${columns.md}
      lg:grid-cols-${columns.lg}
      xl:grid-cols-${columns.xl}
    `;
    };

    // Options de tri
    const sortOptions = [
        { value: SORT_OPTIONS.NEWEST, label: 'Plus récent' },
        { value: SORT_OPTIONS.OLDEST, label: 'Plus ancien' },
        { value: SORT_OPTIONS.MOST_VIEWED, label: 'Plus vues' },
        { value: SORT_OPTIONS.MOST_LIKED, label: 'Plus aimées' },
        { value: SORT_OPTIONS.ALPHABETICAL, label: 'A-Z' },
        { value: 'random', label: 'Aléatoire' }
    ];

    // Catégories de vidéos
    const categories = [
        { value: 'all', label: 'Toutes' },
        ...Object.entries(VIDEO_CATEGORIES).map(([key, value]) => ({
            value,
            label: key.charAt(0) + key.slice(1).toLowerCase()
        }))
    ];

    return (
        <div className="space-y-6">
            {/* Header avec filtres et contrôles */}
            {(showFilters || showLayoutToggle || showStats) && (
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Statistiques */}
                    {showStats && (
                        <div className="text-white/70">
                            {isFiltering ? (
                                <div className="flex items-center space-x-2">
                                    <LoadingSpinner size="small" />
                                    <span>Filtrage...</span>
                                </div>
                            ) : (
                                <span>
                  {formatSearchResults(filteredVideos.length, searchTerm || 'vidéos')}
                </span>
                            )}
                        </div>
                    )}

                    {/* Contrôles */}
                    <div className="flex items-center space-x-3 flex-wrap gap-2">
                        {/* Barre de recherche */}
                        {showFilters && (
                            <div className="flex-1 min-w-64">
                                <input
                                    type="text"
                                    placeholder="Rechercher des vidéos..."
                                    onChange={handleSearchChange}
                                    className="
                    w-full frutiger-input py-2 px-4 text-sm
                    bg-white/10 border border-white/20 rounded-lg
                    focus:border-white/40 transition-colors
                  "
                                />
                            </div>
                        )}

                        {/* Filtre par catégorie */}
                        {showFilters && (
                            <select
                                value={filterCategory}
                                onChange={(e) => handleCategoryChange(e.target.value)}
                                className="
                  frutiger-input py-2 px-3 text-sm
                  bg-white/10 border border-white/20 rounded-lg
                  focus:border-white/40 transition-colors min-w-32
                "
                            >
                                {categories.map(category => (
                                    <option key={category.value} value={category.value}>
                                        {category.label}
                                    </option>
                                ))}
                            </select>
                        )}

                        {/* Tri */}
                        {showFilters && (
                            <select
                                value={sortBy}
                                onChange={(e) => handleSortChange(e.target.value)}
                                className="
                  frutiger-input py-2 px-3 text-sm
                  bg-white/10 border border-white/20 rounded-lg
                  focus:border-white/40 transition-colors min-w-32
                "
                            >
                                {sortOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        )}

                        {/* Bouton refresh */}
                        <button
                            onClick={handleRefresh}
                            disabled={isLoading || videoLoading}
                            className="
                p-2 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              "
                            title="Rafraîchir"
                        >
                            <RefreshCw
                                size={16}
                                className={`text-white/70 ${(isLoading || videoLoading) ? 'animate-spin' : ''}`}
                            />
                        </button>

                        {/* Toggle layout */}
                        {showLayoutToggle && (
                            <div className="flex bg-white/10 rounded-lg overflow-hidden border border-white/20">
                                <button
                                    onClick={() => setLayout('grid')}
                                    className={`
                    p-2 transition-colors
                    ${layout === 'grid'
                                        ? 'bg-white/20 text-white'
                                        : 'text-white/60 hover:text-white hover:bg-white/10'
                                    }
                  `}
                                    title="Vue grille"
                                >
                                    <Grid size={16} />
                                </button>
                                <button
                                    onClick={() => setLayout('list')}
                                    className={`
                    p-2 transition-colors
                    ${layout === 'list'
                                        ? 'bg-white/20 text-white'
                                        : 'text-white/60 hover:text-white hover:bg-white/10'
                                    }
                  `}
                                    title="Vue liste"
                                >
                                    <List size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Contenu principal */}
            <div ref={gridRef} className="relative">
                {/* État d'erreur */}
                {error && (
                    <div className="text-center py-12">
                        <div className="p-6 bg-red-500/20 border border-red-500/30 rounded-lg glass-panel max-w-md mx-auto">
                            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-white mb-2">
                                Erreur de chargement
                            </h3>
                            <p className="text-red-400 text-sm mb-4">{error}</p>
                            <button
                                onClick={handleRefresh}
                                className="frutiger-btn frutiger-btn-primary px-6 py-2"
                            >
                                Réessayer
                            </button>
                        </div>
                    </div>
                )}

                {/* État de chargement initial */}
                {isLoading && !displayedVideos.length && (
                    <div className="flex justify-center py-12">
                        <LoadingSpinner size="large" text="Chargement des vidéos..." />
                    </div>
                )}

                {/* Grille de vidéos */}
                {!error && !isLoading && displayedVideos.length > 0 && (
                    <div className={`
            ${getGridClasses()}
            ${isFiltering ? 'opacity-50 pointer-events-none' : 'opacity-100'}
            transition-opacity duration-300
          `}>
                        {displayedVideos.map((video, index) => (
                            <div
                                key={video.id}
                                className="animate-fade-in"
                                style={{
                                    animationDelay: `${Math.min(index * 50, 1000)}ms`,
                                    animationFillMode: 'both'
                                }}
                            >
                                <VideoCard
                                    video={video}
                                    layout={layout}
                                    size={layout === 'list' ? 'large' : 'medium'}
                                    onClick={onVideoClick}
                                    showDescription={layout === 'list'}
                                    autoPreview={layout === 'grid'}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* État vide */}
                {!error && !isLoading && displayedVideos.length === 0 && !isFiltering && (
                    <div className="text-center py-12">
                        <div className="max-w-md mx-auto">
                            <div className="w-24 h-24 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center">
                                <Grid className="w-12 h-12 text-white/30" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                {emptyMessage}
                            </h3>
                            <p className="text-white/60 mb-6">
                                {searchTerm || filterCategory !== 'all'
                                    ? 'Essayez de modifier vos filtres de recherche'
                                    : 'Il n\'y a pas encore de contenu à afficher'
                                }
                            </p>
                            {emptyAction && (
                                <button
                                    onClick={emptyAction}
                                    className="frutiger-btn frutiger-btn-primary px-6 py-3"
                                >
                                    Découvrir du contenu
                                </button>
                            )}
                            {(searchTerm || filterCategory !== 'all') && (
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setFilterCategory('all');
                                        setCurrentPage(1);
                                    }}
                                    className="frutiger-btn frutiger-btn-glass px-6 py-3 ml-3"
                                >
                                    Effacer les filtres
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Indicateur de chargement pour pagination */}
                {isLoading && displayedVideos.length > 0 && (
                    <div className="text-center py-8">
                        <LoadingSpinner size="medium" text="Chargement..." />
                    </div>
                )}

                {/* Bouton "Charger plus" */}
                {!enableInfiniteScroll && hasMore && !isLoading && (
                    <div className="text-center py-8">
                        <button
                            onClick={() => onLoadMore ? onLoadMore() : setCurrentPage(prev => prev + 1)}
                            className="frutiger-btn frutiger-btn-glass px-8 py-3"
                        >
                            Charger plus de vidéos
                        </button>
                    </div>
                )}

                {/* Sentinel pour infinite scroll */}
                {enableInfiniteScroll && hasMore && (
                    <div
                        ref={loadMoreRef}
                        className="h-4 w-full"
                    />
                )}

                {/* Message fin de contenu */}
                {!hasMore && displayedVideos.length > 0 && (
                    <div className="text-center py-8 text-white/60">
                        <p>Vous avez vu toutes les vidéos disponibles</p>
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * Composant de grille simple sans filtres
 */
export const SimpleVideoGrid = ({
                                    videos,
                                    columns = { xs: 1, sm: 2, md: 3, lg: 4 },
                                    onVideoClick
                                }) => (
    <div className={`
    grid gap-4 sm:gap-6
    grid-cols-${columns.xs}
    sm:grid-cols-${columns.sm}
    md:grid-cols-${columns.md}
    lg:grid-cols-${columns.lg}
  `}>
        {videos.map(video => (
            <VideoCard
                key={video.id}
                video={video}
                onClick={onVideoClick}
                size="medium"
                layout="card"
            />
        ))}
    </div>
);

/**
 * Composant de grille avec virtualisation (pour de très grosses listes)
 */
export const VirtualizedVideoGrid = ({
                                         videos,
                                         onVideoClick,
                                         itemHeight = 300,
                                         containerHeight = 600
                                     }) => {
    const [startIndex, setStartIndex] = useState(0);
    const [endIndex, setEndIndex] = useState(0);
    const containerRef = useRef(null);

    const itemsPerRow = 4;
    const totalRows = Math.ceil(videos.length / itemsPerRow);

    useEffect(() => {
        const visibleRows = Math.ceil(containerHeight / itemHeight);
        const buffer = 5; // Rows de buffer

        const handleScroll = () => {
            if (!containerRef.current) return;

            const scrollTop = containerRef.current.scrollTop;
            const newStartIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
            const newEndIndex = Math.min(totalRows, newStartIndex + visibleRows + buffer * 2);

            setStartIndex(newStartIndex);
            setEndIndex(newEndIndex);
        };

        // Initial calculation
        handleScroll();

        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [itemHeight, containerHeight, totalRows]);

    const visibleVideos = videos.slice(
        startIndex * itemsPerRow,
        endIndex * itemsPerRow
    );

    return (
        <div
            ref={containerRef}
            className="overflow-auto"
            style={{ height: containerHeight }}
        >
            <div style={{ height: totalRows * itemHeight, position: 'relative' }}>
                <div
                    style={{
                        transform: `translateY(${startIndex * itemHeight}px)`,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0
                    }}
                >
                    <SimpleVideoGrid
                        videos={visibleVideos}
                        onVideoClick={onVideoClick}
                    />
                </div>
            </div>
        </div>
    );
};

// Styles CSS pour les animations
const videoGridStyles = `
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out;
}
`;

// Injection des styles
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = videoGridStyles;
    document.head.appendChild(styleSheet);
}

export default VideoGrid;