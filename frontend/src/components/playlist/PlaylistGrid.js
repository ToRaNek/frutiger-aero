// frontend/src/components/playlist/PlaylistGrid.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Grid, List, Filter, SortAsc, RefreshCw, AlertCircle, Plus } from 'lucide-react';
import PlaylistCard from './PlaylistCard';
import LoadingSpinner from '../common/LoadingSpinner';
import { usePlaylist } from '../../hooks/usePlaylist';
import {
    PAGINATION,
    SORT_OPTIONS,
    ANIMATION_DURATION
} from '../../utils/constants';
import { debounce, shuffleArray } from '../../utils/helpers';
import { formatSearchResults } from '../../utils/formatters';

/**
 * Grille de playlists responsive avec pagination infinie et filtres
 *
 * Props:
 * - playlists: array - Tableau de playlists à afficher
 * - isLoading: boolean - État de chargement
 * - error: string - Message d'erreur
 * - onPlaylistClick: function - Callback de clic sur playlist
 * - onLoadMore: function - Callback pour charger plus
 * - hasMore: boolean - S'il y a plus de contenu
 * - showFilters: boolean - Afficher les filtres
 * - showLayoutToggle: boolean - Afficher le toggle layout
 * - showStats: boolean - Afficher les statistiques
 * - showCreateButton: boolean - Afficher bouton création
 * - initialLayout: string - Layout initial (grid, list)
 * - columns: object - Nombre de colonnes par breakpoint
 * - enableInfiniteScroll: boolean - Scroll infini
 * - emptyMessage: string - Message si vide
 * - emptyAction: function - Action si vide
 * - userPlaylists: boolean - Playlists de l'utilisateur connecté
 */

const PlaylistGrid = ({
                          playlists = [],
                          isLoading = false,
                          error = null,
                          onPlaylistClick,
                          onLoadMore,
                          hasMore = false,
                          showFilters = true,
                          showLayoutToggle = true,
                          showStats = true,
                          showCreateButton = false,
                          initialLayout = 'grid',
                          columns = {
                              xs: 1,
                              sm: 2,
                              md: 3,
                              lg: 4,
                              xl: 5
                          },
                          enableInfiniteScroll = true,
                          emptyMessage = "Aucune playlist à afficher",
                          emptyAction,
                          userPlaylists = false
                      }) => {
    // État local
    const [layout, setLayout] = useState(initialLayout);
    const [sortBy, setSortBy] = useState(SORT_OPTIONS.NEWEST);
    const [filterType, setFilterType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredPlaylists, setFilteredPlaylists] = useState(playlists);
    const [displayedPlaylists, setDisplayedPlaylists] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isFiltering, setIsFiltering] = useState(false);

    // Refs
    const gridRef = useRef(null);
    const observerRef = useRef(null);
    const loadMoreRef = useRef(null);

    // Hook playlist pour les actions
    const {
        loadPlaylists,
        loadUserPlaylists,
        searchPlaylists,
        isLoading: playlistLoading
    } = usePlaylist();

    // Filtrage et tri des playlists
    const applyFiltersAndSort = useCallback(() => {
        setIsFiltering(true);

        setTimeout(() => {
            let result = [...playlists];

            // Filtrage par recherche
            if (searchTerm) {
                result = result.filter(playlist =>
                    playlist.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    playlist.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    playlist.user?.username.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }

            // Filtrage par type
            if (filterType !== 'all') {
                switch (filterType) {
                    case 'public':
                        result = result.filter(playlist => !playlist.isPrivate);
                        break;
                    case 'private':
                        result = result.filter(playlist => playlist.isPrivate);
                        break;
                    case 'favorites':
                        result = result.filter(playlist => playlist.isFavorite);
                        break;
                    case 'collaborative':
                        result = result.filter(playlist => playlist.isCollaborative);
                        break;
                    default:
                        break;
                }
            }

            // Tri
            switch (sortBy) {
                case SORT_OPTIONS.NEWEST:
                    result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                    break;
                case SORT_OPTIONS.OLDEST:
                    result.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
                    break;
                case SORT_OPTIONS.MOST_VIEWED:
                    result.sort((a, b) => (b.views || 0) - (a.views || 0));
                    break;
                case SORT_OPTIONS.ALPHABETICAL:
                    result.sort((a, b) => a.title.localeCompare(b.title));
                    break;
                case 'video_count':
                    result.sort((a, b) => (b.videoCount || b.videos?.length || 0) - (a.videoCount || a.videos?.length || 0));
                    break;
                case 'random':
                    result = shuffleArray(result);
                    break;
                default:
                    break;
            }

            setFilteredPlaylists(result);
            setIsFiltering(false);
        }, 300); // Délai pour l'animation
    }, [playlists, searchTerm, filterType, sortBy]);

    // Application des filtres quand les dépendances changent
    useEffect(() => {
        applyFiltersAndSort();
    }, [applyFiltersAndSort]);

    // Mise à jour des playlists affichées avec pagination
    useEffect(() => {
        const playlistsPerPage = PAGINATION.PLAYLIST_GRID_LIMIT;
        const endIndex = currentPage * playlistsPerPage;
        setDisplayedPlaylists(filteredPlaylists.slice(0, endIndex));
    }, [filteredPlaylists, currentPage]);

    // Configuration de l'observateur pour le scroll infini
    useEffect(() => {
        if (!enableInfiniteScroll || !loadMoreRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting && hasMore && !isLoading && !playlistLoading) {
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
    }, [enableInfiniteScroll, hasMore, isLoading, playlistLoading, onLoadMore]);

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

    // Changement de type
    const handleTypeChange = (type) => {
        setFilterType(type);
        setCurrentPage(1);
    };

    // Rafraîchissement
    const handleRefresh = () => {
        setCurrentPage(1);
        setSearchTerm('');
        setFilterType('all');
        setSortBy(SORT_OPTIONS.NEWEST);

        if (onLoadMore) {
            onLoadMore(true); // Force refresh
        }
    };

    // Création de playlist
    const handleCreatePlaylist = () => {
        if (emptyAction) {
            emptyAction();
        } else {
            // Navigation vers création
            window.location.href = '/playlist/create';
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
        { value: SORT_OPTIONS.ALPHABETICAL, label: 'A-Z' },
        { value: 'video_count', label: 'Plus de vidéos' },
        { value: 'random', label: 'Aléatoire' }
    ];

    // Types de playlists
    const playlistTypes = [
        { value: 'all', label: 'Toutes' },
        { value: 'public', label: 'Publiques' },
        { value: 'private', label: 'Privées' },
        ...(userPlaylists ? [
            { value: 'favorites', label: 'Favoris' },
            { value: 'collaborative', label: 'Collaboratives' }
        ] : [])
    ];

    return (
        <div className="space-y-6">
            {/* Header avec filtres et contrôles */}
            {(showFilters || showLayoutToggle || showStats || showCreateButton) && (
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Statistiques */}
                    <div className="flex items-center justify-between">
                        {showStats && (
                            <div className="text-white/70">
                                {isFiltering ? (
                                    <div className="flex items-center space-x-2">
                                        <LoadingSpinner size="small" />
                                        <span>Filtrage...</span>
                                    </div>
                                ) : (
                                    <span>
                    {formatSearchResults(filteredPlaylists.length, searchTerm || 'playlists')}
                  </span>
                                )}
                            </div>
                        )}

                        {/* Bouton création */}
                        {showCreateButton && (
                            <button
                                onClick={handleCreatePlaylist}
                                className="frutiger-btn frutiger-btn-primary px-4 py-2"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Nouvelle playlist
                            </button>
                        )}
                    </div>

                    {/* Contrôles */}
                    <div className="flex items-center space-x-3 flex-wrap gap-2">
                        {/* Barre de recherche */}
                        {showFilters && (
                            <div className="flex-1 min-w-64">
                                <input
                                    type="text"
                                    placeholder="Rechercher des playlists..."
                                    onChange={handleSearchChange}
                                    className="
                    w-full frutiger-input py-2 px-4 text-sm
                    bg-white/10 border border-white/20 rounded-lg
                    focus:border-white/40 transition-colors
                  "
                                />
                            </div>
                        )}

                        {/* Filtre par type */}
                        {showFilters && (
                            <select
                                value={filterType}
                                onChange={(e) => handleTypeChange(e.target.value)}
                                className="
                  frutiger-input py-2 px-3 text-sm
                  bg-white/10 border border-white/20 rounded-lg
                  focus:border-white/40 transition-colors min-w-32
                "
                            >
                                {playlistTypes.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
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
                            disabled={isLoading || playlistLoading}
                            className="
                p-2 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              "
                            title="Rafraîchir"
                        >
                            <RefreshCw
                                size={16}
                                className={`text-white/70 ${(isLoading || playlistLoading) ? 'animate-spin' : ''}`}
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
                {isLoading && !displayedPlaylists.length && (
                    <div className="flex justify-center py-12">
                        <LoadingSpinner size="large" text="Chargement des playlists..." />
                    </div>
                )}

                {/* Grille de playlists */}
                {!error && !isLoading && displayedPlaylists.length > 0 && (
                    <div className={`
            ${getGridClasses()}
            ${isFiltering ? 'opacity-50 pointer-events-none' : 'opacity-100'}
            transition-opacity duration-300
          `}>
                        {displayedPlaylists.map((playlist, index) => (
                            <div
                                key={playlist.id}
                                className="animate-fade-in"
                                style={{
                                    animationDelay: `${Math.min(index * 50, 1000)}ms`,
                                    animationFillMode: 'both'
                                }}
                            >
                                <PlaylistCard
                                    playlist={playlist}
                                    layout={layout}
                                    size={layout === 'list' ? 'large' : 'medium'}
                                    onClick={onPlaylistClick}
                                    showDescription={layout === 'list'}
                                    editable={userPlaylists}
                                    draggable={userPlaylists}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* État vide */}
                {!error && !isLoading && displayedPlaylists.length === 0 && !isFiltering && (
                    <div className="text-center py-12">
                        <div className="max-w-md mx-auto">
                            <div className="w-24 h-24 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center">
                                <Grid className="w-12 h-12 text-white/30" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                {emptyMessage}
                            </h3>
                            <p className="text-white/60 mb-6">
                                {searchTerm || filterType !== 'all'
                                    ? 'Essayez de modifier vos filtres de recherche'
                                    : userPlaylists
                                        ? 'Créez votre première playlist pour organiser vos vidéos'
                                        : 'Il n\'y a pas encore de playlists à afficher'
                                }
                            </p>

                            {/* Actions */}
                            <div className="space-x-3">
                                {showCreateButton && (
                                    <button
                                        onClick={handleCreatePlaylist}
                                        className="frutiger-btn frutiger-btn-primary px-6 py-3"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Créer une playlist
                                    </button>
                                )}

                                {emptyAction && !showCreateButton && (
                                    <button
                                        onClick={emptyAction}
                                        className="frutiger-btn frutiger-btn-primary px-6 py-3"
                                    >
                                        Découvrir des playlists
                                    </button>
                                )}

                                {(searchTerm || filterType !== 'all') && (
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setFilterType('all');
                                            setCurrentPage(1);
                                        }}
                                        className="frutiger-btn frutiger-btn-glass px-6 py-3"
                                    >
                                        Effacer les filtres
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Indicateur de chargement pour pagination */}
                {isLoading && displayedPlaylists.length > 0 && (
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
                            Charger plus de playlists
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
                {!hasMore && displayedPlaylists.length > 0 && (
                    <div className="text-center py-8 text-white/60">
                        <p>Vous avez vu toutes les playlists disponibles</p>
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * Composant de grille simple sans filtres
 */
export const SimplePlaylistGrid = ({
                                       playlists,
                                       columns = { xs: 1, sm: 2, md: 3, lg: 4 },
                                       onPlaylistClick
                                   }) => (
    <div className={`
    grid gap-4 sm:gap-6
    grid-cols-${columns.xs}
    sm:grid-cols-${columns.sm}
    md:grid-cols-${columns.md}
    lg:grid-cols-${columns.lg}
  `}>
        {playlists.map(playlist => (
            <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                onClick={onPlaylistClick}
                size="medium"
                layout="card"
            />
        ))}
    </div>
);

/**
 * Grille spécialisée pour les playlists utilisateur
 */
export const UserPlaylistGrid = ({
                                     playlists,
                                     onPlaylistClick,
                                     onCreatePlaylist,
                                     isLoading,
                                     error
                                 }) => {
    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <LoadingSpinner size="large" text="Chargement de vos playlists..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="p-6 bg-red-500/20 border border-red-500/30 rounded-lg glass-panel max-w-md mx-auto">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                        Erreur de chargement
                    </h3>
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            </div>
        );
    }

    if (playlists.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                    <div className="w-24 h-24 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center">
                        <Plus className="w-12 h-12 text-white/30" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                        Aucune playlist créée
                    </h3>
                    <p className="text-white/60 mb-6">
                        Créez votre première playlist pour organiser vos vidéos favorites
                    </p>
                    <button
                        onClick={onCreatePlaylist}
                        className="frutiger-btn frutiger-btn-primary px-6 py-3"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Créer ma première playlist
                    </button>
                </div>
            </div>
        );
    }

    return (
        <PlaylistGrid
            playlists={playlists}
            onPlaylistClick={onPlaylistClick}
            userPlaylists={true}
            showCreateButton={true}
            emptyAction={onCreatePlaylist}
            showFilters={true}
            showLayoutToggle={true}
            showStats={true}
        />
    );
};

// Styles CSS pour les animations
const playlistGridStyles = `
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
    styleSheet.textContent = playlistGridStyles;
    document.head.appendChild(styleSheet);
}

export default PlaylistGrid;