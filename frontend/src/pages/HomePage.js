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
import VideoGrid from '../components/video/VideoGrid';
import VideoCard from '../components/video/VideoCard';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Hooks
import { useVideo } from '../hooks/useVideo';
import { useAuth } from '../hooks/useAuth';
import { usePlaylist } from '../hooks/usePlaylist';

// Utils
import { formatRelativeTime, formatCompactNumber, formatDuration } from '../utils/formatters';

/**
 * Page d'accueil avec vidéos tendances et recommandations personnalisées
 */
const HomePage = () => {
    // États locaux
    const [activeSection, setActiveSection] = useState('trending');
    const [timeframe, setTimeframe] = useState('today');
    const [category, setCategory] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    const [showFilters, setShowFilters] = useState(false);

    // Hooks
    const { user } = useAuth();

    // Hooks avec gestion d'erreur et valeurs par défaut
    const videoHook = useVideo();
    const playlistHook = usePlaylist();

    const {
        videos = [],
        trendingVideos = [],
        categories = [],
        isLoading = false,
        error = null,
        loadVideos = () => {},
        loadTrendingVideos = () => {}
    } = videoHook || {};

    const {
        userPlaylists = [],
        favorites = [],
        watchLater = [],
        watchHistory = []
    } = playlistHook || {};

    // États dérivés
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

    // Chargement initial
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                await Promise.all([
                    loadVideos({ page: 1, limit: 24 }),
                    loadTrendingVideos({ timeframe, category: category === 'all' ? undefined : category })
                ]);
            } catch (error) {
                console.warn('Erreur lors du chargement initial:', error);
            }
        };

        loadInitialData();
    }, [loadVideos, loadTrendingVideos, timeframe, category]);

    // Rafraîchissement des tendances
    const handleRefreshTrending = async () => {
        try {
            await loadTrendingVideos({
                timeframe,
                category: category === 'all' ? undefined : category,
                refresh: true
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

    // Navigation vers une vidéo
    const handleVideoClick = (video) => {
        if (video && video.id) {
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
                    <div className="glass-panel error-content">
                        <h2>Erreur de chargement</h2>
                        <p>{typeof error === 'string' ? error : error?.message || 'Une erreur est survenue'}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="frutiger-btn frutiger-btn-primary"
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
                className="home-page"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Hero Section */}
                <motion.section
                    className="hero-section frutiger-aurora-bg"
                    variants={itemVariants}
                >
                    <div className="hero-content glass-panel">
                        <h1 className="hero-title frutiger-gradient-text">
                            Bienvenue sur Frutiger Streaming
                        </h1>
                        <p className="hero-description">
                            Découvrez une nouvelle façon de regarder et partager des vidéos
                            avec notre esthétique nostalgique Frutiger Aero
                        </p>
                        <div className="hero-stats">
                            <div className="stat-item">
                                <Eye size={24} />
                                <span>{formatCompactNumber(125000)} vues aujourd'hui</span>
                            </div>
                            <div className="stat-item">
                                <Users size={24} />
                                <span>{formatCompactNumber(8500)} utilisateurs actifs</span>
                            </div>
                            <div className="stat-item">
                                <Play size={24} />
                                <span>{formatCompactNumber(450)} vidéos ajoutées cette semaine</span>
                            </div>
                        </div>
                    </div>
                </motion.section>

                {/* Navigation des sections */}
                <motion.section
                    className="sections-nav"
                    variants={itemVariants}
                >
                    <div className="nav-container glass-panel">
                        <div className="nav-tabs">
                            {sections.map(section => {
                                const IconComponent = section.icon;
                                return (
                                    <button
                                        key={section.id}
                                        onClick={() => handleSectionChange(section.id)}
                                        className={`nav-tab frutiger-btn ${
                                            activeSection === section.id
                                                ? 'frutiger-btn-primary'
                                                : 'frutiger-btn-glass'
                                        }`}
                                    >
                                        <IconComponent size={18} />
                                        <span>{section.title}</span>
                                        {section.id === 'trending' && (
                                            <Zap size={14} className="trending-indicator" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="nav-controls">
                            {/* Filtres */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`frutiger-btn ${showFilters ? 'frutiger-btn-primary' : 'frutiger-btn-glass'}`}
                            >
                                <Filter size={16} />
                                Filtres
                            </button>

                            {/* Mode d'affichage */}
                            <div className="view-mode-toggle">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`frutiger-btn ${viewMode === 'grid' ? 'frutiger-btn-primary' : 'frutiger-btn-glass'}`}
                                >
                                    <Grid size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`frutiger-btn ${viewMode === 'list' ? 'frutiger-btn-primary' : 'frutiger-btn-glass'}`}
                                >
                                    <List size={16} />
                                </button>
                            </div>

                            {/* Rafraîchir (pour les tendances) */}
                            {activeSection === 'trending' && (
                                <button
                                    onClick={handleRefreshTrending}
                                    className="frutiger-btn frutiger-btn-glass refresh-btn"
                                    disabled={isLoading}
                                >
                                    <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filtres étendus */}
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                className="filters-panel glass-panel"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                {/* Période (pour les tendances) */}
                                {activeSection === 'trending' && (
                                    <div className="filter-group">
                                        <label>Période :</label>
                                        <div className="filter-buttons">
                                            {timeframes.map(tf => (
                                                <button
                                                    key={tf.value}
                                                    onClick={() => handleTimeframeChange(tf.value)}
                                                    className={`frutiger-btn frutiger-btn-small ${
                                                        timeframe === tf.value
                                                            ? 'frutiger-btn-primary'
                                                            : 'frutiger-btn-secondary'
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
                                    <label>Catégorie :</label>
                                    <div className="filter-buttons">
                                        <button
                                            onClick={() => handleCategoryChange('all')}
                                            className={`frutiger-btn frutiger-btn-small ${
                                                category === 'all'
                                                    ? 'frutiger-btn-primary'
                                                    : 'frutiger-btn-secondary'
                                            }`}
                                        >
                                            Toutes
                                        </button>
                                        {Array.isArray(categories) && categories.map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => handleCategoryChange(cat.name)}
                                                className={`frutiger-btn frutiger-btn-small ${
                                                    category === cat.name
                                                        ? 'frutiger-btn-primary'
                                                        : 'frutiger-btn-secondary'
                                                }`}
                                            >
                                                {cat.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.section>

                {/* Description de la section active */}
                <motion.section
                    className="section-header"
                    variants={itemVariants}
                >
                    <div className="section-info">
                        <h2>{sections.find(s => s.id === activeSection)?.title}</h2>
                        <p>{sections.find(s => s.id === activeSection)?.description}</p>
                        <div className="section-meta">
                            <span>{Array.isArray(filteredData) ? filteredData.length : 0} vidéos</span>
                            {activeSection === 'trending' && (
                                <span>• Mise à jour {formatRelativeTime(new Date())}</span>
                            )}
                        </div>
                    </div>
                </motion.section>

                {/* Contenu principal */}
                <motion.main
                    className="main-content"
                    variants={itemVariants}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeSection}
                            variants={sectionVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            {isLoading ? (
                                <div className="loading-container">
                                    <LoadingSpinner size="large" text="Chargement des vidéos..." />
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
                </motion.main>

                {/* Sections supplémentaires pour utilisateurs connectés */}
                {user && (
                    <motion.section
                        className="user-sections"
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
                    className="insights-section"
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
            <div className="videos-list">
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
        <VideoGrid
            videos={videos}
            onVideoClick={onVideoClick}
            showStats={true}
            showChannel={true}
            layout="responsive"
            columns={{
                desktop: section === 'trending' ? 4 : 3,
                tablet: 2,
                mobile: 1
            }}
        />
    );
};

/**
 * Item de vidéo en mode liste
 */
const VideoListItem = ({ video, onClick, showChannel, showStats }) => {
    if (!video) return null;

    return (
        <div className="video-list-item glass-card" onClick={onClick}>
            <div className="video-thumbnail">
                <img src={video.thumbnail} alt={video.title} />
                <div className="video-duration">
                    {formatDuration(video.duration)}
                </div>
                <button className="play-overlay">
                    <Play size={24} />
                </button>
            </div>

            <div className="video-info">
                <h3 className="video-title">{video.title}</h3>
                <p className="video-description">{video.description}</p>

                {showChannel && video.user && (
                    <div className="video-channel">
                        <img src={video.user.avatar} alt={video.user.username} />
                        <span>{video.user.username}</span>
                    </div>
                )}

                {showStats && (
                    <div className="video-stats">
                        <span>{formatCompactNumber(video.viewCount || 0)} vues</span>
                        <span>•</span>
                        <span>{formatRelativeTime(video.createdAt)}</span>
                        <span>•</span>
                        <span>{formatCompactNumber(video.likesCount || 0)} likes</span>
                    </div>
                )}

                {video.tags && (
                    <div className="video-tags">
                        {video.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="frutiger-badge frutiger-badge-secondary">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
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
        <div className="empty-state glass-panel">
            <div className="empty-icon">
                <Play size={48} />
            </div>
            <h3>Aucun contenu</h3>
            <p>{getEmptyMessage()}</p>
            {category !== 'all' && onReset && (
                <button
                    onClick={onReset}
                    className="frutiger-btn frutiger-btn-primary"
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
        <div className="personalized-sections">
            {/* Favoris récents */}
            {Array.isArray(favorites) && favorites.length > 0 && (
                <div className="section-card glass-panel">
                    <div className="section-header">
                        <h3>Vos favoris récents</h3>
                        <a href="/favorites" className="section-link">
                            Voir tout <ChevronRight size={16} />
                        </a>
                    </div>
                    <div className="videos-row">
                        {favorites.slice(0, 6).map(video => (
                            <VideoCard
                                key={video.id}
                                video={video}
                                size="small"
                                onClick={() => onVideoClick(video)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* À regarder plus tard */}
            {Array.isArray(watchLater) && watchLater.length > 0 && (
                <div className="section-card glass-panel">
                    <div className="section-header">
                        <h3>À regarder plus tard</h3>
                        <a href="/watch-later" className="section-link">
                            Voir tout <ChevronRight size={16} />
                        </a>
                    </div>
                    <div className="videos-row">
                        {watchLater.slice(0, 6).map(video => (
                            <VideoCard
                                key={video.id}
                                video={video}
                                size="small"
                                onClick={() => onVideoClick(video)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Playlists de l'utilisateur */}
            {Array.isArray(userPlaylists) && userPlaylists.length > 0 && (
                <div className="section-card glass-panel">
                    <div className="section-header">
                        <h3>Vos playlists</h3>
                        <a href="/playlists" className="section-link">
                            Voir tout <ChevronRight size={16} />
                        </a>
                    </div>
                    <div className="playlists-row">
                        {userPlaylists.slice(0, 4).map(playlist => (
                            <div key={playlist.id} className="playlist-card glass-card">
                                <div className="playlist-thumbnail">
                                    <img src={playlist.thumbnail} alt={playlist.title} />
                                    <span className="video-count">{playlist.videoCount} vidéos</span>
                                </div>
                                <h4>{playlist.title}</h4>
                                <p>{playlist.description}</p>
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
        <div className="insights-panel glass-panel">
            <h3>Aperçu de la plateforme</h3>
            <div className="insights-grid">
                <div className="insight-item">
                    <div className="insight-icon">
                        <TrendingUp size={24} />
                    </div>
                    <div className="insight-content">
                        <h4>Croissance</h4>
                        <p>+15% de nouveaux contenus cette semaine</p>
                    </div>
                </div>

                <div className="insight-item">
                    <div className="insight-icon">
                        <Users size={24} />
                    </div>
                    <div className="insight-content">
                        <h4>Communauté</h4>
                        <p>Plus de 10k créateurs actifs</p>
                    </div>
                </div>

                <div className="insight-item">
                    <div className="insight-icon">
                        <Clock size={24} />
                    </div>
                    <div className="insight-content">
                        <h4>Temps de visionnage</h4>
                        <p>2.5h en moyenne par utilisateur</p>
                    </div>
                </div>

                <div className="insight-item">
                    <div className="insight-icon">
                        <Calendar size={24} />
                    </div>
                    <div className="insight-content">
                        <h4>Contenu quotidien</h4>
                        <p>Plus de 50 nouvelles vidéos par jour</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;