// frontend/src/components/search/SearchResults.js

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Search, Filter, SortAsc, SortDesc, Grid, List,
    Video, Users, PlaySquare, Calendar, Clock,
    Eye, ThumbsUp, MoreHorizontal
} from 'lucide-react';
import { useSearch, useSearchFilters } from '../../hooks/useSearch';
import LoadingSpinner from '../common/LoadingSpinner';
import VideoCard from '../video/VideoCard';
import PlaylistCard from '../playlist/PlaylistCard';
import Modal from '../common/Modal';
import {
    SEARCH_TYPES,
    SORT_OPTIONS,
    DATE_RANGES,
    DURATION_FILTERS,
    PAGINATION
} from '../../utils/constants';
import {
    formatSearchResults,
    formatRelativeTime,
    formatViews,
    formatDuration
} from '../../utils/formatters';
import { debounce } from '../../utils/helpers';

/**
 * Composant d'affichage des résultats de recherche
 *
 * Props:
 * - searchQuery: string - Terme de recherche
 * - initialTab: string - Onglet initial (all, videos, playlists, users)
 * - showFilters: boolean - Afficher les filtres
 * - layout: string - Layout (grid, list)
 * - onResultClick: function - Callback de clic sur résultat
 */

const SearchResults = ({
                           searchQuery,
                           initialTab = SEARCH_TYPES.ALL,
                           showFilters = true,
                           layout: initialLayout = 'grid',
                           onResultClick
                       }) => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // État local
    const [activeTab, setActiveTab] = useState(initialTab);
    const [layout, setLayout] = useState(initialLayout);
    const [showFiltersModal, setShowFiltersModal] = useState(false);

    // Hooks personnalisés
    const {
        searchTerm,
        searchResults,
        performSearch,
        updateFilters,
        clearSearch,
        activeFilters,
        isLoading,
        error,
        hasMore,
        loadMore
    } = useSearch();

    const {
        filters,
        updateFilter,
        applyFilters,
        resetFilters,
        hasActiveFilters
    } = useSearchFilters();

    // Synchronisation avec l'URL
    useEffect(() => {
        const query = searchParams.get('q') || searchQuery || '';
        const tab = searchParams.get('tab') || initialTab;
        const sort = searchParams.get('sort') || SORT_OPTIONS.NEWEST;
        const duration = searchParams.get('duration') || DURATION_FILTERS.ALL;
        const date = searchParams.get('date') || DATE_RANGES.ALL;

        if (query !== searchTerm || tab !== activeTab) {
            setActiveTab(tab);
            performSearch(query, {
                type: tab,
                sortBy: sort,
                duration,
                date,
                ...filters
            });
        }
    }, [searchParams, searchQuery, initialTab]);

    // Changement d'onglet
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        updateUrlParams({ tab, page: 1 });
        performSearch(searchTerm, {
            type: tab,
            ...activeFilters
        });
    };

    // Mise à jour des paramètres URL
    const updateUrlParams = (params) => {
        const newParams = new URLSearchParams(searchParams);
        Object.entries(params).forEach(([key, value]) => {
            if (value && value !== 'all') {
                newParams.set(key, value);
            } else {
                newParams.delete(key);
            }
        });
        setSearchParams(newParams);
    };

    // Application des filtres
    const handleApplyFilters = () => {
        updateUrlParams({ ...filters, page: 1 });
        performSearch(searchTerm, {
            type: activeTab,
            ...filters
        });
        setShowFiltersModal(false);
    };

    // Réinitialisation des filtres
    const handleResetFilters = () => {
        resetFilters();
        updateUrlParams({ page: 1 });
        performSearch(searchTerm, {
            type: activeTab
        });
        setShowFiltersModal(false);
    };

    // Changement de tri
    const handleSortChange = (sortBy) => {
        updateFilter('sortBy', sortBy);
        updateUrlParams({ sort: sortBy, page: 1 });
        performSearch(searchTerm, {
            type: activeTab,
            sortBy,
            ...filters
        });
    };

    // Chargement de plus de résultats
    const handleLoadMore = () => {
        if (!isLoading && hasMore) {
            loadMore();
        }
    };

    // Clic sur un résultat
    const handleResultClick = (result, resultType) => {
        if (onResultClick) {
            onResultClick(result, resultType);
        } else {
            // Navigation par défaut
            if (resultType === 'video') {
                navigate(`/video/${result.id}`);
            } else if (resultType === 'playlist') {
                navigate(`/playlist/${result.id}`);
            } else if (resultType === 'user') {
                navigate(`/user/${result.id}`);
            }
        }
    };

    // Onglets de recherche
    const tabs = [
        {
            key: SEARCH_TYPES.ALL,
            label: 'Tout',
            icon: Search,
            count: searchResults.total || 0
        },
        {
            key: SEARCH_TYPES.VIDEOS,
            label: 'Vidéos',
            icon: Video,
            count: searchResults.videos?.length || 0
        },
        {
            key: SEARCH_TYPES.PLAYLISTS,
            label: 'Playlists',
            icon: PlaySquare,
            count: searchResults.playlists?.length || 0
        },
        {
            key: SEARCH_TYPES.USERS,
            label: 'Utilisateurs',
            icon: Users,
            count: searchResults.users?.length || 0
        }
    ];

    // Options de tri
    const sortOptions = [
        { value: SORT_OPTIONS.NEWEST, label: 'Plus récent' },
        { value: SORT_OPTIONS.OLDEST, label: 'Plus ancien' },
        { value: SORT_OPTIONS.MOST_VIEWED, label: 'Plus vues' },
        { value: SORT_OPTIONS.MOST_LIKED, label: 'Plus aimées' },
        { value: SORT_OPTIONS.ALPHABETICAL, label: 'A-Z' }
    ];

    if (!searchTerm && !searchQuery) {
        return (
            <div className="text-center py-12">
                <Search size={48} className="mx-auto mb-4 text-white/30" />
                <h3 className="text-xl font-semibold text-white mb-2">
                    Commencez votre recherche
                </h3>
                <p className="text-white/70">
                    Recherchez des vidéos, playlists et utilisateurs
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header avec résultats et filtres */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {formatSearchResults(searchResults.total, searchTerm)}
                    </h2>
                    {hasActiveFilters && (
                        <p className="text-white/60 text-sm">
                            Filtres actifs • {Object.keys(activeFilters).length} appliqué(s)
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Bouton tri */}
                    <div className="relative">
                        <select
                            value={filters.sortBy || SORT_OPTIONS.NEWEST}
                            onChange={(e) => handleSortChange(e.target.value)}
                            className="
                frutiger-input pl-10 pr-4 py-2 text-sm
                bg-white/10 border border-white/20 rounded-lg
                focus:border-white/40 transition-colors
              "
                        >
                            {sortOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <SortAsc size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" />
                    </div>

                    {/* Bouton filtres */}
                    {showFilters && (
                        <button
                            onClick={() => setShowFiltersModal(true)}
                            className={`
                frutiger-btn frutiger-btn-glass px-4 py-2 text-sm
                ${hasActiveFilters ? 'frutiger-btn-aurora' : ''}
              `}
                        >
                            <Filter size={16} className="mr-2" />
                            Filtres
                            {hasActiveFilters && (
                                <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  {Object.keys(activeFilters).length}
                </span>
                            )}
                        </button>
                    )}

                    {/* Boutons layout */}
                    <div className="flex bg-white/10 rounded-lg overflow-hidden">
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
                </div>
            </div>

            {/* Onglets de recherche */}
            <div className="border-b border-white/20">
                <nav className="flex space-x-8 overflow-x-auto">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;

                        return (
                            <button
                                key={tab.key}
                                onClick={() => handleTabChange(tab.key)}
                                className={`
                  flex items-center space-x-2 py-4 px-2 border-b-2 transition-all duration-200
                  ${isActive
                                    ? 'border-blue-500 text-white'
                                    : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
                                }
                `}
                            >
                                <Icon size={18} />
                                <span className="font-medium">{tab.label}</span>
                                {tab.count > 0 && (
                                    <span className={`
                    text-xs px-2 py-1 rounded-full
                    ${isActive ? 'bg-blue-500 text-white' : 'bg-white/20 text-white/70'}
                  `}>
                    {tab.count}
                  </span>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Contenu des résultats */}
            {isLoading && (!searchResults.videos?.length && !searchResults.playlists?.length && !searchResults.users?.length) ? (
                <div className="flex justify-center py-12">
                    <LoadingSpinner size="large" text="Recherche en cours..." />
                </div>
            ) : error ? (
                <div className="text-center py-12">
                    <div className="p-6 bg-red-500/20 border border-red-500/30 rounded-lg glass-panel max-w-md mx-auto">
                        <div className="text-red-400 mb-4">
                            <Search size={48} className="mx-auto opacity-50" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                            Erreur de recherche
                        </h3>
                        <p className="text-red-400 text-sm">{error}</p>
                        <button
                            onClick={() => performSearch(searchTerm, { type: activeTab })}
                            className="mt-4 frutiger-btn frutiger-btn-primary px-6 py-2"
                        >
                            Réessayer
                        </button>
                    </div>
                </div>
            ) : (
                <SearchResultsContent
                    results={searchResults}
                    activeTab={activeTab}
                    layout={layout}
                    onResultClick={handleResultClick}
                    onLoadMore={handleLoadMore}
                    hasMore={hasMore}
                    isLoading={isLoading}
                />
            )}

            {/* Modal des filtres */}
            <SearchFiltersModal
                isOpen={showFiltersModal}
                onClose={() => setShowFiltersModal(false)}
                filters={filters}
                updateFilter={updateFilter}
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
                activeTab={activeTab}
            />
        </div>
    );
};

/**
 * Contenu des résultats selon l'onglet actif
 */
const SearchResultsContent = ({
                                  results,
                                  activeTab,
                                  layout,
                                  onResultClick,
                                  onLoadMore,
                                  hasMore,
                                  isLoading
                              }) => {
    if (activeTab === SEARCH_TYPES.ALL) {
        return (
            <div className="space-y-8">
                {/* Vidéos */}
                {results.videos?.length > 0 && (
                    <section>
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                            <Video size={20} className="mr-2" />
                            Vidéos ({results.videos.length})
                        </h3>
                        <VideoResultsGrid
                            videos={results.videos.slice(0, 8)}
                            layout={layout}
                            onVideoClick={(video) => onResultClick(video, 'video')}
                        />
                    </section>
                )}

                {/* Playlists */}
                {results.playlists?.length > 0 && (
                    <section>
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                            <PlaySquare size={20} className="mr-2" />
                            Playlists ({results.playlists.length})
                        </h3>
                        <PlaylistResultsGrid
                            playlists={results.playlists.slice(0, 6)}
                            layout={layout}
                            onPlaylistClick={(playlist) => onResultClick(playlist, 'playlist')}
                        />
                    </section>
                )}

                {/* Utilisateurs */}
                {results.users?.length > 0 && (
                    <section>
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                            <Users size={20} className="mr-2" />
                            Utilisateurs ({results.users.length})
                        </h3>
                        <UserResultsGrid
                            users={results.users.slice(0, 6)}
                            layout={layout}
                            onUserClick={(user) => onResultClick(user, 'user')}
                        />
                    </section>
                )}

                {/* Message si aucun résultat */}
                {!results.videos?.length && !results.playlists?.length && !results.users?.length && (
                    <NoResults />
                )}
            </div>
        );
    }

    // Onglets spécifiques
    if (activeTab === SEARCH_TYPES.VIDEOS) {
        return (
            <VideoResultsGrid
                videos={results.videos || []}
                layout={layout}
                onVideoClick={(video) => onResultClick(video, 'video')}
                onLoadMore={onLoadMore}
                hasMore={hasMore}
                isLoading={isLoading}
            />
        );
    }

    if (activeTab === SEARCH_TYPES.PLAYLISTS) {
        return (
            <PlaylistResultsGrid
                playlists={results.playlists || []}
                layout={layout}
                onPlaylistClick={(playlist) => onResultClick(playlist, 'playlist')}
                onLoadMore={onLoadMore}
                hasMore={hasMore}
                isLoading={isLoading}
            />
        );
    }

    if (activeTab === SEARCH_TYPES.USERS) {
        return (
            <UserResultsGrid
                users={results.users || []}
                layout={layout}
                onUserClick={(user) => onResultClick(user, 'user')}
                onLoadMore={onLoadMore}
                hasMore={hasMore}
                isLoading={isLoading}
            />
        );
    }

    return <NoResults />;
};

/**
 * Grille de résultats vidéos
 */
const VideoResultsGrid = ({ videos, layout, onVideoClick, onLoadMore, hasMore, isLoading }) => {
    if (!videos.length) return <NoResults type="videos" />;

    return (
        <div className="space-y-6">
            <div className={`
        ${layout === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }
      `}>
                {videos.map(video => (
                    layout === 'grid' ? (
                        <VideoCard
                            key={video.id}
                            video={video}
                            onClick={() => onVideoClick(video)}
                            size="medium"
                        />
                    ) : (
                        <VideoListItem
                            key={video.id}
                            video={video}
                            onClick={() => onVideoClick(video)}
                        />
                    )
                ))}
            </div>

            {/* Bouton Load More */}
            {hasMore && (
                <div className="text-center">
                    <button
                        onClick={onLoadMore}
                        disabled={isLoading}
                        className="frutiger-btn frutiger-btn-glass px-8 py-3"
                    >
                        {isLoading ? (
                            <div className="flex items-center space-x-2">
                                <LoadingSpinner size="small" />
                                <span>Chargement...</span>
                            </div>
                        ) : (
                            'Voir plus de vidéos'
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

/**
 * Item vidéo en liste
 */
const VideoListItem = ({ video, onClick }) => (
    <div
        onClick={onClick}
        className="
      flex p-4 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer
      transition-all duration-200 glass-panel hover:glass-shine
    "
    >
        <div className="flex-shrink-0 w-40 h-24 rounded-lg overflow-hidden bg-white/10">
            <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white">
                {formatDuration(video.duration)}
            </div>
        </div>

        <div className="flex-1 ml-4 min-w-0">
            <h4 className="text-white font-medium line-clamp-2 mb-2">
                {video.title}
            </h4>
            <p className="text-white/70 text-sm mb-2 line-clamp-2">
                {video.description}
            </p>
            <div className="flex items-center text-white/60 text-xs space-x-4">
        <span className="flex items-center">
          <Eye size={14} className="mr-1" />
            {formatViews(video.views)}
        </span>
                <span className="flex items-center">
          <ThumbsUp size={14} className="mr-1" />
                    {video.likes}
        </span>
                <span className="flex items-center">
          <Clock size={14} className="mr-1" />
                    {formatRelativeTime(video.createdAt)}
        </span>
            </div>
        </div>
    </div>
);

/**
 * Grille de résultats playlists
 */
const PlaylistResultsGrid = ({ playlists, layout, onPlaylistClick, onLoadMore, hasMore, isLoading }) => {
    if (!playlists.length) return <NoResults type="playlists" />;

    return (
        <div className="space-y-6">
            <div className={`
        ${layout === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }
      `}>
                {playlists.map(playlist => (
                    <PlaylistCard
                        key={playlist.id}
                        playlist={playlist}
                        onClick={() => onPlaylistClick(playlist)}
                        size={layout === 'grid' ? 'medium' : 'large'}
                    />
                ))}
            </div>

            {hasMore && (
                <div className="text-center">
                    <button
                        onClick={onLoadMore}
                        disabled={isLoading}
                        className="frutiger-btn frutiger-btn-glass px-8 py-3"
                    >
                        {isLoading ? (
                            <div className="flex items-center space-x-2">
                                <LoadingSpinner size="small" />
                                <span>Chargement...</span>
                            </div>
                        ) : (
                            'Voir plus de playlists'
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

/**
 * Grille de résultats utilisateurs
 */
const UserResultsGrid = ({ users, layout, onUserClick, onLoadMore, hasMore, isLoading }) => {
    if (!users.length) return <NoResults type="users" />;

    return (
        <div className="space-y-6">
            <div className={`
        ${layout === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }
      `}>
                {users.map(user => (
                    <UserCard
                        key={user.id}
                        user={user}
                        onClick={() => onUserClick(user)}
                        layout={layout}
                    />
                ))}
            </div>

            {hasMore && (
                <div className="text-center">
                    <button
                        onClick={onLoadMore}
                        disabled={isLoading}
                        className="frutiger-btn frutiger-btn-glass px-8 py-3"
                    >
                        {isLoading ? (
                            <div className="flex items-center space-x-2">
                                <LoadingSpinner size="small" />
                                <span>Chargement...</span>
                            </div>
                        ) : (
                            'Voir plus d\'utilisateurs'
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

/**
 * Carte utilisateur
 */
const UserCard = ({ user, onClick, layout }) => (
    <div
        onClick={onClick}
        className={`
      p-6 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer
      transition-all duration-200 glass-panel hover:glass-shine
      ${layout === 'list' ? 'flex items-center' : 'text-center'}
    `}
    >
        <div className={`
      ${layout === 'list' ? 'flex-shrink-0 mr-4' : 'mb-4'}
    `}>
            <img
                src={user.avatar || '/assets/default-avatar.png'}
                alt={user.username}
                className="w-16 h-16 rounded-full object-cover mx-auto bg-white/10"
            />
        </div>

        <div className={layout === 'list' ? 'flex-1' : ''}>
            <h4 className="text-white font-medium mb-1">
                {user.firstName} {user.lastName}
            </h4>
            <p className="text-blue-400 text-sm mb-2">
                @{user.username}
            </p>
            <div className="text-white/60 text-xs space-y-1">
                <p>{user.videosCount || 0} vidéos</p>
                <p>{user.followersCount || 0} abonnés</p>
            </div>
        </div>
    </div>
);

/**
 * Message aucun résultat
 */
const NoResults = ({ type = 'results' }) => {
    const messages = {
        results: 'Aucun résultat trouvé',
        videos: 'Aucune vidéo trouvée',
        playlists: 'Aucune playlist trouvée',
        users: 'Aucun utilisateur trouvé'
    };

    return (
        <div className="text-center py-12">
            <Search size={48} className="mx-auto mb-4 text-white/30" />
            <h3 className="text-lg font-semibold text-white mb-2">
                {messages[type]}
            </h3>
            <p className="text-white/60">
                Essayez avec d'autres mots-clés ou supprimez les filtres
            </p>
        </div>
    );
};

/**
 * Modal des filtres de recherche
 */
const SearchFiltersModal = ({
                                isOpen,
                                onClose,
                                filters,
                                updateFilter,
                                onApply,
                                onReset,
                                activeTab
                            }) => (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Filtres de recherche"
        size="md"
    >
        <div className="space-y-6">
            {/* Filtre par date */}
            <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                    Date de publication
                </label>
                <select
                    value={filters.date || DATE_RANGES.ALL}
                    onChange={(e) => updateFilter('date', e.target.value)}
                    className="w-full frutiger-input py-2"
                >
                    <option value={DATE_RANGES.ALL}>Toutes les dates</option>
                    <option value={DATE_RANGES.TODAY}>Aujourd'hui</option>
                    <option value={DATE_RANGES.THIS_WEEK}>Cette semaine</option>
                    <option value={DATE_RANGES.THIS_MONTH}>Ce mois</option>
                    <option value={DATE_RANGES.THIS_YEAR}>Cette année</option>
                </select>
            </div>

            {/* Filtre par durée (pour les vidéos) */}
            {(activeTab === SEARCH_TYPES.ALL || activeTab === SEARCH_TYPES.VIDEOS) && (
                <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                        Durée
                    </label>
                    <select
                        value={filters.duration || DURATION_FILTERS.ALL}
                        onChange={(e) => updateFilter('duration', e.target.value)}
                        className="w-full frutiger-input py-2"
                    >
                        <option value={DURATION_FILTERS.ALL}>Toutes les durées</option>
                        <option value={DURATION_FILTERS.SHORT}>Courte (&lt; 4 min)</option>
                        <option value={DURATION_FILTERS.MEDIUM}>Moyenne (4-20 min)</option>
                        <option value={DURATION_FILTERS.LONG}>Longue (&gt; 20 min)</option>
                    </select>
                </div>
            )}

            {/* Boutons d'action */}
            <div className="flex justify-between pt-4">
                <button
                    onClick={onReset}
                    className="frutiger-btn frutiger-btn-glass px-6 py-2"
                >
                    Réinitialiser
                </button>

                <button
                    onClick={onApply}
                    className="frutiger-btn frutiger-btn-primary px-6 py-2"
                >
                    Appliquer les filtres
                </button>
            </div>
        </div>
    </Modal>
);

export default SearchResults;