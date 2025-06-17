// frontend/src/pages/HomePage.js
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
    TrendingUp,
    Clock,
    Eye,
    Users,
    Play,
    ChevronRight,
    Filter,
    RefreshCw,
    Star,
    Calendar,
    Grid,
    List,
    Zap
} from 'lucide-react';

// Components
import VideoCard from '../components/video/VideoCard';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Utils
import { formatRelativeTime, formatCompactNumber, formatDuration } from '../utils/formatters';
import { API_ENDPOINTS, PAGINATION, VIDEO_CATEGORIES } from '../utils/constants';

/**
 * Page d'accueil avec vidéos tendances et recommandations personnalisées
 * Corrigée selon la documentation backend fournie
 */
const HomePage = () => {
    // États locaux
    const [activeSection, setActiveSection] = useState('trending');
    const [timeframe, setTimeframe] = useState('today');
    const [category, setCategory] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    const [showFilters, setShowFilters] = useState(false);

    // États des données selon la documentation backend
    const [videos, setVideos] = useState([]);
    const [trendingVideos, setTrendingVideos] = useState([]);
    const [categories] = useState(Object.values(VIDEO_CATEGORIES));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // États utilisateur selon la doc backend (User model)
    const [user, setUser] = useState(null);
    const [userPlaylists, setUserPlaylists] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [watchLater, setWatchLater] = useState([]);
    const [watchHistory, setWatchHistory] = useState([]);

    // Récupération de l'utilisateur depuis le localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem('frutiger_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error('Erreur parsing user:', error);
            }
        }
    }, []);

    // États dérivés avec sections selon l'utilisateur connecté
    const sections = useMemo(() => [
        {
            id: 'trending',
            title: 'Tendances',
            icon: TrendingUp,
            description: 'Les vidéos les plus populaires du moment'
        },
        {
            id: 'recent',
            title: 'Récentes',
            icon: Clock,
            description: 'Les dernières vidéos ajoutées'
        },
        ...(user ? [
            {
                id: 'recommended',
                title: 'Recommandées',
                icon: Star,
                description: 'Basées sur vos préférences'
            },
            {
                id: 'continue-watching',
                title: 'Continuer le visionnage',
                icon: Play,
                description: 'Reprendre où vous vous êtes arrêté'
            }
        ] : []),
        {
            id: 'popular',
            title: 'Populaires',
            icon: Eye,
            description: 'Les plus regardées cette semaine'
        }
    ], [user]);

    const timeframes = [
        { value: 'today', label: "Aujourd'hui" },
        { value: 'week', label: 'Cette semaine' },
        { value: 'month', label: 'Ce mois' },
        { value: 'year', label: 'Cette année' }
    ];

    // Fonction pour charger les vidéos selon Video.findTrending de la doc
    const loadTrendingVideos = async (options = {}) => {
        const { timeframe: tf = timeframe, category: cat = category } = options;

        try {
            setIsLoading(true);

            const params = new URLSearchParams({
                timeframe: tf,
                ...(cat !== 'all' && { category: cat }),
                limit: PAGINATION.VIDEO_GRID_LIMIT
            });

            const response = await fetch(
                `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${API_ENDPOINTS.VIDEOS.TRENDING}?${params}`,
                {
                    headers: {
                        'Authorization': user ? `Bearer ${localStorage.getItem('frutiger_access_token')}` : undefined,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                setTrendingVideos(data.videos || data);
            } else {
                throw new Error('Erreur lors du chargement des tendances');
            }
        } catch (error) {
            setError(error.message);
            console.error('Erreur tendances:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Fonction pour charger les vidéos générales selon getVideos de la doc
    const loadVideos = async (options = {}) => {
        const { page = 1, limit = PAGINATION.VIDEO_GRID_LIMIT } = options;

        try {
            setIsLoading(true);

            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                sort: 'newest'
            });

            const response = await fetch(
                `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${API_ENDPOINTS.VIDEOS.LIST}?${params}`,
                {
                    headers: {
                        'Authorization': user ? `Bearer ${localStorage.getItem('frutiger_access_token')}` : undefined,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                setVideos(data.videos || data.data || []);
            } else {
                throw new Error('Erreur lors du chargement des vidéos');
            }
        } catch (error) {
            setError(error.message);
            console.error('Erreur vidéos:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Chargement des playlists utilisateur selon la doc backend
    const loadUserPlaylists = async () => {
        if (!user) return;

        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${API_ENDPOINTS.PLAYLISTS.LIST}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('frutiger_access_token')}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                setUserPlaylists(data.playlists || data.data || []);

                // Séparer les playlists spéciales selon la doc
                const favoritesPlaylist = data.playlists?.find(p => p.type === 'favorites');
                const watchLaterPlaylist = data.playlists?.find(p => p.type === 'watch_later');
                const historyPlaylist = data.playlists?.find(p => p.type === 'history');

                if (favoritesPlaylist) setFavorites(favoritesPlaylist.videos || []);
                if (watchLaterPlaylist) setWatchLater(watchLaterPlaylist.videos || []);
                if (historyPlaylist) setWatchHistory(historyPlaylist.videos || []);
            }
        } catch (error) {
            console.error('Erreur playlists:', error);
        }
    };

    // Données pour la section active avec protection contre undefined
    const currentData = useMemo(() => {
        try {
            switch (activeSection) {
                case 'trending':
                    return Array.isArray(trendingVideos) ? trendingVideos : [];

                case 'recent':
                    if (!Array.isArray(videos)) return [];
                    return videos.filter(v => {
                        if (!v || !v.createdAt) return false;
                        const daysSinceUpload = (Date.now() - new Date(v.createdAt)) / (1000 * 60 * 60 * 24);
                        return daysSinceUpload <= 7;
                    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                case 'recommended':
                    if (!Array.isArray(videos)) return [];
                    return videos.filter(v => v && v.isRecommended);

                case 'continue-watching':
                    return Array.isArray(watchHistory) ? watchHistory.slice(0, 12) : [];

                case 'popular':
                    if (!Array.isArray(videos)) return [];
                    return videos.filter(v => v && v.viewCount && v.viewCount > 1000)
                        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));

                default:
                    return Array.isArray(videos) ? videos : [];
            }
        } catch (error) {
            console.warn('Erreur lors du calcul des données courantes:', error);
            return [];
        }
    }, [activeSection, videos, trendingVideos, watchHistory]);

    // Filtrage par catégorie avec protection
    const filteredData = useMemo(() => {
        try {
            if (!Array.isArray(currentData)) {
                return [];
            }

            if (category === 'all') {
                return currentData;
            }

            return currentData.filter(video => {
                if (!video || !video.category) return false;
                return video.category.toLowerCase() === category.toLowerCase();
            });
        } catch (error) {
            console.warn('Erreur lors du filtrage des données:', error);
            return [];
        }
    }, [currentData, category]);

    // Chargement initial selon la documentation backend
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                await Promise.all([
                    loadVideos({ page: 1, limit: 24 }),
                    loadTrendingVideos({ timeframe, category: category === 'all' ? undefined : category })
                ]);

                if (user) {
                    await loadUserPlaylists();
                }
            } catch (error) {
                console.warn('Erreur lors du chargement initial:', error);
            }
        };

        loadInitialData();
    }, [timeframe, category, user]);

    // Rafraîchissement des tendances
    const handleRefreshTrending = async () => {
        try {
            await loadTrendingVideos({
                timeframe,
                category: category === 'all' ? undefined : category
            });
        } catch (error) {
            console.warn('Erreur lors du rafraîchissement:', error);
        }
    };

    // Changement de section
    const handleSectionChange = (sectionId) => {
        setActiveSection(sectionId);
    };

    // Changement de période
    const handleTimeframeChange = (newTimeframe) => {
        setTimeframe(newTimeframe);
    };

    // Changement de catégorie
    const handleCategoryChange = (newCategory) => {
        setCategory(newCategory);
    };

    // Navigation vers une vidéo selon Video.findById de la doc
    const handleVideoClick = (video) => {
        if (video && video.id) {
            // Incrémenter les vues selon video.incrementViews() de la doc
            if (user) {
                fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${API_ENDPOINTS.VIDEOS.VIEW}/${video.id}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('frutiger_access_token')}`,
                        'Content-Type': 'application/json'
                    }
                }).catch(console.error);
            }

            window.location.href = `/video/${video.id}`;
        }
    };

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: "easeOut"
            }
        }
    };

    const sectionVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: {
            opacity: 1,
            x: 0,
            transition: { duration: 0.3 }
        },
        exit: {
            opacity: 0,
            x: -20,
            transition: { duration: 0.2 }
        }
    };

    if (error) {
        return (
            <div className="page-container">
                <div className="error-page">
                    <div className="frutiger-glass-error error-content p-8 rounded-2xl max-w-md mx-auto mt-20">
                        <h2 className="frutiger-title text-xl mb-4">Erreur de chargement</h2>
                        <p className="text-red-800 mb-6">{typeof error === 'string' ? error : error?.message || 'Une erreur est survenue'}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="frutiger-btn frutiger-btn-primary-aero w-full"
                        >
                            Réessayer
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>Accueil - Frutiger Streaming</title>
                <meta
                    name="description"
                    content="Découvrez les vidéos tendances et les dernières nouveautés sur Frutiger Streaming. Plateforme de streaming avec esthétique Frutiger Aero."
                />
                <meta name="keywords" content="streaming, vidéos, tendances, frutiger aero, nouveautés" />
            </Helmet>

            <motion.div
                className="home-page min-h-screen"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Hero Section avec style Frutiger Aero */}
                <motion.section
                    className="hero-section frutiger-aurora-bg relative py-20 px-6"
                    variants={itemVariants}
                >
                    <div className="hero-content frutiger-glass-info max-w-4xl mx-auto text-center p-8 rounded-3xl">
                        <h1 className="hero-title frutiger-title text-5xl font-light mb-6">
                            Bienvenue sur Frutiger Streaming
                        </h1>
                        <p className="hero-description text-xl text-white/90 mb-8 leading-relaxed">
                            Découvrez une nouvelle façon de regarder et partager des vidéos
                            avec notre esthétique nostalgique Frutiger Aero
                        </p>
                        <div className="hero-stats flex justify-center gap-8 flex-wrap">
                            <div className="stat-item flex items-center gap-3 frutiger-glass-success p-4 rounded-2xl">
                                <Eye size={24} className="text-blue-400" />
                                <span className="text-white font-medium">{formatCompactNumber(125000)} vues aujourd'hui</span>
                            </div>
                            <div className="stat-item flex items-center gap-3 frutiger-glass-success p-4 rounded-2xl">
                                <Users size={24} className="text-green-400" />
                                <span className="text-white font-medium">{formatCompactNumber(8500)} utilisateurs actifs</span>
                            </div>
                            <div className="stat-item flex items-center gap-3 frutiger-glass-success p-4 rounded-2xl">
                                <Play size={24} className="text-purple-400" />
                                <span className="text-white font-medium">{formatCompactNumber(450)} vidéos cette semaine</span>
                            </div>
                        </div>
                    </div>
                </motion.section>

                {/* Navigation des sections avec style Frutiger */}
                <motion.section
                    className="sections-nav px-6 py-8"
                    variants={itemVariants}
                >
                    <div className="nav-container frutiger-glass-info max-w-7xl mx-auto p-6 rounded-2xl">
                        <div className="nav-tabs flex flex-wrap gap-3 justify-center mb-6">
                            {sections.map(section => {
                                const IconComponent = section.icon;
                                return (
                                    <button
                                        key={section.id}
                                        onClick={() => handleSectionChange(section.id)}
                                        className={`nav-tab frutiger-btn flex items-center gap-2 ${
                                            activeSection === section.id
                                                ? 'frutiger-btn-primary-aero'
                                                : 'frutiger-glass-info'
                                        }`}
                                    >
                                        <IconComponent size={18} />
                                        <span>{section.title}</span>
                                        {section.id === 'trending' && (
                                            <Zap size={14} className="frutiger-icon-pulse text-yellow-400" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="nav-controls flex flex-wrap gap-3 justify-center">
                            {/* Filtres */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`frutiger-btn ${showFilters ? 'frutiger-btn-primary-aero' : 'frutiger-glass-info'} flex items-center gap-2`}
                            >
                                <Filter size={16} />
                                Filtres
                            </button>

                            {/* Mode d'affichage */}
                            <div className="view-mode-toggle flex gap-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`frutiger-btn ${viewMode === 'grid' ? 'frutiger-btn-primary-aero' : 'frutiger-glass-info'}`}
                                >
                                    <Grid size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`frutiger-btn ${viewMode === 'list' ? 'frutiger-btn-primary-aero' : 'frutiger-glass-info'}`}
                                >
                                    <List size={16} />
                                </button>
                            </div>

                            {/* Rafraîchir (pour les tendances) */}
                            {activeSection === 'trending' && (
                                <button
                                    onClick={handleRefreshTrending}
                                    className="frutiger-btn frutiger-glass-info refresh-btn"
                                    disabled={isLoading}
                                >
                                    <RefreshCw size={16} className={isLoading ? 'frutiger-icon-pulse' : ''} />
                                </button>
                            )}
                        </div>

                        {/* Filtres étendus */}
                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    className="filters-panel frutiger-glass-info mt-6 p-6 rounded-xl"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {/* Période (pour les tendances) */}
                                    {activeSection === 'trending' && (
                                        <div className="filter-group mb-4">
                                            <label className="block text-white font-medium mb-3">Période :</label>
                                            <div className="filter-buttons flex flex-wrap gap-2">
                                                {timeframes.map(tf => (
                                                    <button
                                                        key={tf.value}
                                                        onClick={() => handleTimeframeChange(tf.value)}
                                                        className={`frutiger-btn frutiger-btn-small ${
                                                            timeframe === tf.value
                                                                ? 'frutiger-btn-primary-aero'
                                                                : 'frutiger-glass-info'
                                                        }`}
                                                    >
                                                        {tf.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Catégories */}
                                    <div className="filter-group">
                                        <label className="block text-white font-medium mb-3">Catégorie :</label>
                                        <div className="filter-buttons flex flex-wrap gap-2">
                                            <button
                                                onClick={() => handleCategoryChange('all')}
                                                className={`frutiger-btn frutiger-btn-small ${
                                                    category === 'all'
                                                        ? 'frutiger-btn-primary-aero'
                                                        : 'frutiger-glass-info'
                                                }`}
                                            >
                                                Toutes
                                            </button>
                                            {categories.map(cat => (
                                                <button
                                                    key={cat}
                                                    onClick={() => handleCategoryChange(cat)}
                                                    className={`frutiger-btn frutiger-btn-small ${
                                                        category === cat
                                                            ? 'frutiger-btn-primary-aero'
                                                            : 'frutiger-glass-info'
                                                    }`}
                                                >
                                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.section>

                {/* Description de la section active */}
                <motion.section
                    className="section-header px-6"
                    variants={itemVariants}
                >
                    <div className="section-info max-w-4xl mx-auto text-center mb-8">
                        <h2 className="frutiger-title text-3xl mb-3">{sections.find(s => s.id === activeSection)?.title}</h2>
                        <p className="text-white/90 text-lg mb-4">{sections.find(s => s.id === activeSection)?.description}</p>
                        <div className="section-meta text-white/70">
                            <span>{Array.isArray(filteredData) ? filteredData.length : 0} vidéos</span>
                            {activeSection === 'trending' && (
                                <span> • Mise à jour {formatRelativeTime(new Date())}</span>
                            )}
                        </div>
                    </div>
                </motion.section>

                {/* Contenu principal */}
                <motion.main
                    className="main-content px-6 pb-12"
                    variants={itemVariants}
                >
                    <div className="max-w-7xl mx-auto">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeSection}
                                variants={sectionVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                            >
                                {isLoading ? (
                                    <div className="loading-container flex justify-center py-20">
                                        <LoadingSpinner size="large" className="frutiger-spinner-aero" />
                                        <p className="ml-4 text-white">Chargement des vidéos...</p>
                                    </div>
                                ) : (!Array.isArray(filteredData) || filteredData.length === 0) ? (
                                    <EmptyState
                                        section={activeSection}
                                        category={category}
                                        onReset={() => {
                                            setCategory('all');
                                            setTimeframe('today');
                                        }}
                                    />
                                ) : (
                                    <VideoContent
                                        videos={filteredData}
                                        viewMode={viewMode}
                                        section={activeSection}
                                        onVideoClick={handleVideoClick}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </motion.main>

                {/* Sections supplémentaires pour utilisateurs connectés */}
                {user && (
                    <motion.section
                        className="user-sections px-6 pb-12"
                        variants={itemVariants}
                    >
                        <UserPersonalizedSections
                            userPlaylists={userPlaylists}
                            favorites={favorites}
                            watchLater={watchLater}
                            onVideoClick={handleVideoClick}
                        />
                    </motion.section>
                )}

                {/* Statistiques et insights */}
                <motion.section
                    className="insights-section px-6 pb-12"
                    variants={itemVariants}
                >
                    <InsightsPanel />
                </motion.section>
            </motion.div>
        </>
    );
};

/**
 * Contenu vidéo selon le mode d'affichage
 */
const VideoContent = ({ videos, viewMode, section, onVideoClick }) => {
    if (!Array.isArray(videos)) {
        return <EmptyState section={section} />;
    }

    if (viewMode === 'list') {
        return (
            <div className="videos-list space-y-4">
                {videos.map((video, index) => (
                    <motion.div
                        key={video.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <VideoListItem
                            video={video}
                            onClick={() => onVideoClick(video)}
                            showChannel={true}
                            showStats={true}
                        />
                    </motion.div>
                ))}
            </div>
        );
    }

    return (
        <div className={`videos-grid grid gap-6 ${
            section === 'trending'
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}>
            {videos.map((video, index) => (
                <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                >
                    <VideoCard
                        video={video}
                        onClick={() => onVideoClick(video)}
                        showStats={true}
                        showChannel={true}
                        className="frutiger-glass-info"
                    />
                </motion.div>
            ))}
        </div>
    );
};

/**
 * Item de vidéo en mode liste
 */
const VideoListItem = ({ video, onClick, showChannel, showStats }) => {
    if (!video) return null;

    return (
        <div className="video-list-item frutiger-glass-info p-4 rounded-xl cursor-pointer frutiger-transition hover:scale-[1.02]" onClick={onClick}>
            <div className="flex gap-4">
                <div className="video-thumbnail relative flex-shrink-0 w-48 aspect-video rounded-lg overflow-hidden">
                    <img
                        src={video.thumbnail || '/assets/default-thumbnail.png'}
                        alt={video.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 right-2 frutiger-glass-success px-2 py-1 rounded text-xs text-white font-medium">
                        {formatDuration(video.duration)}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 frutiger-transition">
                        <Play size={24} className="text-white" />
                    </div>
                </div>

                <div className="video-info flex-1">
                    <h3 className="video-title text-white font-medium text-lg mb-2 line-clamp-2">{video.title}</h3>
                    <p className="video-description text-white/70 text-sm mb-3 line-clamp-2">{video.description}</p>

                    {showChannel && video.user && (
                        <div className="video-channel flex items-center gap-2 mb-3">
                            <img
                                src={video.user.avatar || '/assets/default-avatar.png'}
                                alt={video.user.username}
                                className="w-6 h-6 rounded-full"
                            />
                            <span className="text-white/80 text-sm">{video.user.username}</span>
                        </div>
                    )}

                    {showStats && (
                        <div className="video-stats flex items-center gap-4 text-white/60 text-sm">
                            <span>{formatCompactNumber(video.viewCount || 0)} vues</span>
                            <span>•</span>
                            <span>{formatRelativeTime(video.createdAt)}</span>
                            <span>•</span>
                            <span>{formatCompactNumber(video.likesCount || 0)} likes</span>
                        </div>
                    )}

                    {video.tags && (
                        <div className="video-tags flex gap-2 mt-3">
                            {video.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="frutiger-glass-success px-2 py-1 rounded-full text-xs text-white">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * État vide selon la section
 */
const EmptyState = ({ section, category, onReset }) => {
    const getEmptyMessage = () => {
        switch (section) {
            case 'trending':
                return category === 'all'
                    ? "Aucune vidéo tendance pour le moment"
                    : `Aucune vidéo tendance dans la catégorie ${category}`;
            case 'recent':
                return "Aucune nouvelle vidéo cette semaine";
            case 'recommended':
                return "Regardez plus de vidéos pour recevoir des recommandations personnalisées";
            case 'continue-watching':
                return "Vous n'avez pas d'historique de visionnage";
            case 'popular':
                return "Aucune vidéo populaire disponible";
            default:
                return "Aucune vidéo disponible";
        }
    };

    return (
        <div className="empty-state frutiger-glass-info text-center py-20 rounded-2xl">
            <div className="empty-icon mb-6">
                <Play size={48} className="mx-auto text-white/50" />
            </div>
            <h3 className="frutiger-title text-xl mb-3">Aucun contenu</h3>
            <p className="text-white/70 mb-6">{getEmptyMessage()}</p>
            {category !== 'all' && onReset && (
                <button
                    onClick={onReset}
                    className="frutiger-btn frutiger-btn-primary-aero"
                >
                    Voir toutes les catégories
                </button>
            )}
        </div>
    );
};

/**
 * Sections personnalisées pour utilisateurs connectés
 */
const UserPersonalizedSections = ({ userPlaylists, favorites, watchLater, onVideoClick }) => {
    return (
        <div className="personalized-sections max-w-7xl mx-auto space-y-8">
            {/* Favoris récents */}
            {Array.isArray(favorites) && favorites.length > 0 && (
                <div className="section-card frutiger-glass-info p-6 rounded-2xl">
                    <div className="section-header flex justify-between items-center mb-6">
                        <h3 className="frutiger-title text-xl">Vos favoris récents</h3>
                        <a href="/favorites" className="frutiger-link-primary flex items-center gap-1">
                            Voir tout <ChevronRight size={16} />
                        </a>
                    </div>
                    <div className="videos-row grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {favorites.slice(0, 6).map(video => (
                            <VideoCard
                                key={video.id}
                                video={video}
                                size="small"
                                onClick={() => onVideoClick(video)}
                                className="frutiger-glass-success"
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* À regarder plus tard */}
            {Array.isArray(watchLater) && watchLater.length > 0 && (
                <div className="section-card frutiger-glass-info p-6 rounded-2xl">
                    <div className="section-header flex justify-between items-center mb-6">
                        <h3 className="frutiger-title text-xl">À regarder plus tard</h3>
                        <a href="/watch-later" className="frutiger-link-primary flex items-center gap-1">
                            Voir tout <ChevronRight size={16} />
                        </a>
                    </div>
                    <div className="videos-row grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {watchLater.slice(0, 6).map(video => (
                            <VideoCard
                                key={video.id}
                                video={video}
                                size="small"
                                onClick={() => onVideoClick(video)}
                                className="frutiger-glass-success"
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Playlists de l'utilisateur */}
            {Array.isArray(userPlaylists) && userPlaylists.length > 0 && (
                <div className="section-card frutiger-glass-info p-6 rounded-2xl">
                    <div className="section-header flex justify-between items-center mb-6">
                        <h3 className="frutiger-title text-xl">Vos playlists</h3>
                        <a href="/playlists" className="frutiger-link-primary flex items-center gap-1">
                            Voir tout <ChevronRight size={16} />
                        </a>
                    </div>
                    <div className="playlists-row grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {userPlaylists.slice(0, 4).map(playlist => (
                            <div key={playlist.id} className="playlist-card frutiger-glass-success p-4 rounded-xl cursor-pointer frutiger-transition hover:scale-105">
                                <div className="playlist-thumbnail relative aspect-video rounded-lg overflow-hidden mb-3">
                                    <img
                                        src={playlist.thumbnail || '/assets/default-thumbnail.png'}
                                        alt={playlist.title}
                                        className="w-full h-full object-cover"
                                    />
                                    <span className="absolute bottom-2 right-2 frutiger-glass-info px-2 py-1 rounded text-xs text-white">
                                        {playlist.videoCount || 0} vidéos
                                    </span>
                                </div>
                                <h4 className="text-white font-medium mb-1">{playlist.title}</h4>
                                <p className="text-white/70 text-sm line-clamp-2">{playlist.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Panneau d'insights et statistiques
 */
const InsightsPanel = () => {
    return (
        <div className="insights-panel frutiger-glass-info max-w-7xl mx-auto p-8 rounded-2xl">
            <h3 className="frutiger-title text-2xl mb-6 text-center">Aperçu de la plateforme</h3>
            <div className="insights-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="insight-item frutiger-glass-success p-6 rounded-xl text-center">
                    <div className="insight-icon mb-4">
                        <TrendingUp size={32} className="mx-auto text-green-400" />
                    </div>
                    <div className="insight-content">
                        <h4 className="text-white font-semibold mb-2">Croissance</h4>
                        <p className="text-white/80 text-sm">+15% de nouveaux contenus cette semaine</p>
                    </div>
                </div>

                <div className="insight-item frutiger-glass-success p-6 rounded-xl text-center">
                    <div className="insight-icon mb-4">
                        <Users size={32} className="mx-auto text-blue-400" />
                    </div>
                    <div className="insight-content">
                        <h4 className="text-white font-semibold mb-2">Communauté</h4>
                        <p className="text-white/80 text-sm">Plus de 10k créateurs actifs</p>
                    </div>
                </div>

                <div className="insight-item frutiger-glass-success p-6 rounded-xl text-center">
                    <div className="insight-icon mb-4">
                        <Clock size={32} className="mx-auto text-purple-400" />
                    </div>
                    <div className="insight-content">
                        <h4 className="text-white font-semibold mb-2">Temps de visionnage</h4>
                        <p className="text-white/80 text-sm">2.5h en moyenne par utilisateur</p>
                    </div>
                </div>

                <div className="insight-item frutiger-glass-success p-6 rounded-xl text-center">
                    <div className="insight-icon mb-4">
                        <Calendar size={32} className="mx-auto text-orange-400" />
                    </div>
                    <div className="insight-content">
                        <h4 className="text-white font-semibold mb-2">Contenu quotidien</h4>
                        <p className="text-white/80 text-sm">Plus de 50 nouvelles vidéos par jour</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;