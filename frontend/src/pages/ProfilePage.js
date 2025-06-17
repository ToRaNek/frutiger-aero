// frontend/src/pages/ProfilePage.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
    User,
    Settings,
    Edit3,
    Mail,
    Calendar,
    MapPin,
    Link as LinkIcon,
    Users,
    Video,
    Play,
    Eye,
    Heart,
    Clock,
    Grid,
    List,
    Filter,
    Search,
    Plus,
    Share2,
    Flag,
    UserPlus,
    UserMinus,
    MessageCircle,
    Award,
    TrendingUp,
    Upload,
    Download,
    MoreHorizontal,
    Camera,
    Save,
    X,
    Check,
    AlertCircle,
    Shield,
    Star,
    Zap
} from 'lucide-react';

// Components
import VideoGrid from '../components/video/VideoGrid';
import PlaylistGrid from '../components/playlist/PlaylistGrid';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';

// Hooks
import { useAuth } from '../hooks/useAuth';
import { useVideo } from '../hooks/useVideo';
import { usePlaylist } from '../hooks/usePlaylist';

// Utils
import {
    formatCompactNumber,
    formatRelativeTime,
    formatDateLong,
    generateInitials
} from '../utils/formatters';
import { copyToClipboard, isValidEmail, isValidUrl } from '../utils/helpers';

/**
 * Page de profil utilisateur avec onglets et édition
 */
const ProfilePage = () => {
    // Paramètres URL
    const { username } = useParams();
    const navigate = useNavigate();

    // États locaux
    const [activeTab, setActiveTab] = useState('videos');
    const [viewMode, setViewMode] = useState('grid');
    const [showEditModal, setShowEditModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showFollowersModal, setShowFollowersModal] = useState(false);
    const [showFollowingModal, setShowFollowingModal] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [sortBy, setSortBy] = useState('recent');
    const [filterBy, setFilterBy] = useState('all');

    // Hooks
    const { user: currentUser } = useAuth();
    const { videos, isLoading: videosLoading } = useVideo();
    const { userPlaylist, isLoading: playlistsLoading } = usePlaylist();

    // Profile data (en réalité viendrait d'une API)
    const [profileUser, setProfileUser] = useState(null);
    const [userVideos, setUserVideos] = useState([]);
    const [userPlaylists, setUserPlaylists] = useState([]);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);

    // Déterminer si c'est le profil de l'utilisateur connecté
    const isOwnProfile = currentUser && (
        !username ||
        username === currentUser.username ||
        username === 'me'
    );

    // Chargement du profil
    useEffect(() => {
        const loadProfile = async () => {
            setIsLoadingProfile(true);
            try {
                if (isOwnProfile) {
                    setProfileUser(currentUser);
                } else {
                    // Simulation d'un appel API pour récupérer le profil
                    const mockProfile = {
                        id: 'user-profile',
                        username: username || 'demo-user',
                        firstName: 'John',
                        lastName: 'Doe',
                        email: 'john.doe@example.com',
                        avatar: `/avatars/${username || 'demo'}.jpg`,
                        banner: `/banners/${username || 'demo'}.jpg`,
                        bio: 'Créateur de contenu passionné par la technologie et l\'art numérique. J\'aime partager mes découvertes et créations avec la communauté Frutiger.',
                        location: 'Paris, France',
                        website: 'https://johndoe.example.com',
                        joinedAt: new Date('2023-01-15'),
                        isVerified: true,
                        followersCount: 12500,
                        followingCount: 350,
                        videosCount: 85,
                        playlistsCount: 12,
                        totalViews: 2500000,
                        socialLinks: {
                            twitter: 'https://twitter.com/johndoe',
                            youtube: 'https://youtube.com/@johndoe',
                            instagram: 'https://instagram.com/johndoe'
                        }
                    };
                    setProfileUser(mockProfile);
                }

                // Chargement des vidéos et playlists de l'utilisateur
                const mockUserVideos = Array.from({ length: 24 }, (_, i) => ({
                    id: `user-video-${i}`,
                    title: `Vidéo ${i + 1} de ${username || 'demo-user'}`,
                    description: 'Description de la vidéo...',
                    thumbnail: `/thumbnails/user-video-${i + 1}.jpg`,
                    duration: 300 + Math.random() * 1200,
                    viewCount: Math.floor(Math.random() * 100000),
                    likesCount: Math.floor(Math.random() * 5000),
                    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
                    category: ['Tech', 'Art', 'Music', 'Gaming'][Math.floor(Math.random() * 4)],
                    tags: ['tag1', 'tag2', 'tag3']
                }));

                const mockUserPlaylists = Array.from({ length: 8 }, (_, i) => ({
                    id: `user-playlist-${i}`,
                    title: `Playlist ${i + 1}`,
                    description: 'Ma collection de vidéos...',
                    thumbnail: `/thumbnails/playlist-${i + 1}.jpg`,
                    videoCount: Math.floor(Math.random() * 50) + 5,
                    isPublic: Math.random() > 0.3,
                    createdAt: new Date(Date.now() - Math.random() * 200 * 24 * 60 * 60 * 1000),
                    updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
                }));

                setUserVideos(mockUserVideos);
                setUserPlaylists(mockUserPlaylists);

                // Vérifier si on suit cet utilisateur
                if (!isOwnProfile) {
                    setIsFollowing(Math.random() > 0.5);
                }

            } catch (error) {
                console.error('Erreur lors du chargement du profil:', error);
            } finally {
                setIsLoadingProfile(false);
            }
        };

        loadProfile();
    }, [username, currentUser, isOwnProfile]);

    // Onglets du profil
    const profileTabs = useMemo(() => [
        {
            id: 'videos',
            label: 'Vidéos',
            icon: Video,
            count: userVideos.length,
            visible: true
        },
        {
            id: 'playlists',
            label: 'Playlists',
            icon: Play,
            count: userPlaylists.filter(p => isOwnProfile || p.isPublic).length,
            visible: true
        },
        {
            id: 'favorites',
            label: 'Favoris',
            icon: Heart,
            count: 0,
            visible: isOwnProfile
        },
        {
            id: 'history',
            label: 'Historique',
            icon: Clock,
            count: 0,
            visible: isOwnProfile
        },
        {
            id: 'analytics',
            label: 'Analytics',
            icon: TrendingUp,
            count: 0,
            visible: isOwnProfile && profileUser?.videosCount > 0
        }
    ].filter(tab => tab.visible), [userVideos.length, userPlaylists.length, isOwnProfile, profileUser]);

    // Options de tri
    const sortOptions = [
        { value: 'recent', label: 'Plus récent' },
        { value: 'oldest', label: 'Plus ancien' },
        { value: 'popular', label: 'Plus populaire' },
        { value: 'title', label: 'Titre A-Z' }
    ];

    // Gestion du suivi
    const handleFollowToggle = useCallback(async () => {
        if (!currentUser) {
            navigate('/login');
            return;
        }

        try {
            setIsFollowing(!isFollowing);
            // API call pour suivre/ne plus suivre
        } catch (error) {
            console.error('Erreur lors du suivi:', error);
            setIsFollowing(isFollowing); // Rollback
        }
    }, [currentUser, navigate, isFollowing]);

    // Gestion du contenu selon l'onglet actif
    const getCurrentTabContent = () => {
        const currentData = getCurrentTabData();

        if (currentData.isLoading) {
            return <LoadingSpinner text={`Chargement des ${activeTab}...`} />;
        }

        if (currentData.items.length === 0) {
            return (
                <EmptyTabContent
                    tab={activeTab}
                    isOwnProfile={isOwnProfile}
                    onCreateAction={getCreateAction()}
                />
            );
        }

        switch (activeTab) {
            case 'videos':
                return (
                    <VideoGrid
                        videos={currentData.items}
                        viewMode={viewMode}
                        showStats={true}
                        showChannel={false}
                        onVideoClick={(video) => navigate(`/video/${video.id}`)}
                    />
                );
            case 'playlists':
                return (
                    <PlaylistGrid
                        playlists={currentData.items}
                        viewMode={viewMode}
                        showStats={true}
                        onPlaylistClick={(playlist) => navigate(`/playlist/${playlist.id}`)}
                    />
                );
            case 'analytics':
                return <AnalyticsContent user={profileUser} videos={userVideos} />;
            default:
                return <div>Contenu en développement</div>;
        }
    };

    const getCurrentTabData = () => {
        switch (activeTab) {
            case 'videos':
                return { items: userVideos, isLoading: videosLoading };
            case 'playlists':
                return { items: userPlaylists.filter(p => isOwnProfile || p.isPublic), isLoading: playlistsLoading };
            default:
                return { items: [], isLoading: false };
        }
    };

    const getCreateAction = () => {
        switch (activeTab) {
            case 'videos':
                return isOwnProfile ? () => navigate('/upload') : null;
            case 'playlists':
                return isOwnProfile ? () => navigate('/playlists/create') : null;
            default:
                return null;
        }
    };

    // Animation variants
    const pageVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                duration: 0.5,
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5 }
        }
    };

    // Chargement
    if (isLoadingProfile) {
        return (
            <div className="page-container">
                <LoadingSpinner size="large" text="Chargement du profil..." />
            </div>
        );
    }

    // Profil non trouvé
    if (!profileUser) {
        return (
            <div className="page-container">
                <div className="error-page">
                    <div className="glass-panel error-content">
                        <h2>Profil non trouvé</h2>
                        <p>L'utilisateur demandé n'existe pas ou n'est plus disponible.</p>
                        <button
                            onClick={() => navigate('/')}
                            className="frutiger-btn frutiger-btn-primary"
                        >
                            Retour à l'accueil
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>{profileUser.firstName} {profileUser.lastName} (@{profileUser.username}) - Frutiger Streaming</title>
                <meta name="description" content={profileUser.bio} />
                <meta property="og:title" content={`${profileUser.firstName} ${profileUser.lastName} sur Frutiger Streaming`} />
                <meta property="og:description" content={profileUser.bio} />
                <meta property="og:image" content={profileUser.avatar} />
                <meta property="og:type" content="profile" />
            </Helmet>

            <motion.div
                className="profile-page"
                variants={pageVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Bannière et informations principales */}
                <motion.section
                    className="profile-header"
                    variants={itemVariants}
                >
                    <div className="profile-banner">
                        <img
                            src={profileUser.banner || '/images/default-banner.jpg'}
                            alt="Bannière"
                            className="banner-image"
                        />
                        <div className="banner-overlay frutiger-aurora-bg"></div>

                        {isOwnProfile && (
                            <button className="edit-banner-btn frutiger-btn frutiger-btn-glass">
                                <Camera size={16} />
                                Modifier la bannière
                            </button>
                        )}
                    </div>

                    <div className="profile-info glass-panel">
                        <div className="profile-main">
                            <div className="profile-avatar-section">
                                <div className="avatar-container">
                                    <img
                                        src={profileUser.avatar}
                                        alt={profileUser.username}
                                        className="profile-avatar"
                                    />
                                    {profileUser.isVerified && (
                                        <div className="verified-badge">
                                            <Check size={16} />
                                        </div>
                                    )}
                                    {isOwnProfile && (
                                        <button className="edit-avatar-btn">
                                            <Camera size={14} />
                                        </button>
                                    )}
                                </div>

                                <div className="profile-identity">
                                    <h1 className="profile-name">
                                        {profileUser.firstName} {profileUser.lastName}
                                        {profileUser.isVerified && <Star size={20} className="verified-star" />}
                                    </h1>
                                    <p className="profile-username">@{profileUser.username}</p>
                                    {profileUser.bio && (
                                        <p className="profile-bio">{profileUser.bio}</p>
                                    )}
                                </div>
                            </div>

                            {/* Actions du profil */}
                            <div className="profile-actions">
                                {isOwnProfile ? (
                                    <div className="own-profile-actions">
                                        <button
                                            onClick={() => setShowEditModal(true)}
                                            className="frutiger-btn frutiger-btn-primary"
                                        >
                                            <Edit3 size={16} />
                                            Modifier le profil
                                        </button>
                                        <button
                                            onClick={() => navigate('/settings')}
                                            className="frutiger-btn frutiger-btn-glass"
                                        >
                                            <Settings size={16} />
                                            Paramètres
                                        </button>
                                    </div>
                                ) : (
                                    <div className="other-profile-actions">
                                        <button
                                            onClick={handleFollowToggle}
                                            className={`frutiger-btn ${isFollowing ? 'frutiger-btn-secondary' : 'frutiger-btn-primary'}`}
                                        >
                                            {isFollowing ? (
                                                <>
                                                    <UserMinus size={16} />
                                                    Ne plus suivre
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus size={16} />
                                                    Suivre
                                                </>
                                            )}
                                        </button>
                                        <button className="frutiger-btn frutiger-btn-glass">
                                            <MessageCircle size={16} />
                                            Message
                                        </button>
                                        <button className="frutiger-btn frutiger-btn-glass">
                                            <Share2 size={16} />
                                            Partager
                                        </button>
                                        <button
                                            onClick={() => setShowReportModal(true)}
                                            className="frutiger-btn frutiger-btn-glass"
                                        >
                                            <Flag size={16} />
                                            Signaler
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Statistiques et métadonnées */}
                        <div className="profile-meta">
                            <div className="profile-stats">
                                <button
                                    onClick={() => setShowFollowersModal(true)}
                                    className="stat-item"
                                >
                                    <span className="stat-number">
                                        {formatCompactNumber(profileUser.followersCount)}
                                    </span>
                                    <span className="stat-label">Abonnés</span>
                                </button>
                                <button
                                    onClick={() => setShowFollowingModal(true)}
                                    className="stat-item"
                                >
                                    <span className="stat-number">
                                        {formatCompactNumber(profileUser.followingCount)}
                                    </span>
                                    <span className="stat-label">Abonnements</span>
                                </button>
                                <div className="stat-item">
                                    <span className="stat-number">
                                        {formatCompactNumber(profileUser.totalViews)}
                                    </span>
                                    <span className="stat-label">Vues totales</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-number">
                                        {profileUser.videosCount}
                                    </span>
                                    <span className="stat-label">Vidéos</span>
                                </div>
                            </div>

                            <div className="profile-details">
                                <div className="detail-item">
                                    <Calendar size={16} />
                                    <span>Inscrit en {formatDateLong(profileUser.joinedAt)}</span>
                                </div>
                                {profileUser.location && (
                                    <div className="detail-item">
                                        <MapPin size={16} />
                                        <span>{profileUser.location}</span>
                                    </div>
                                )}
                                {profileUser.website && (
                                    <div className="detail-item">
                                        <LinkIcon size={16} />
                                        <a
                                            href={profileUser.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="website-link"
                                        >
                                            {profileUser.website.replace(/^https?:\/\//, '')}
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Liens sociaux */}
                            {profileUser.socialLinks && (
                                <div className="social-links">
                                    {Object.entries(profileUser.socialLinks).map(([platform, url]) => (
                                        <a
                                            key={platform}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="social-link frutiger-btn frutiger-btn-glass"
                                        >
                                            <img
                                                src={`/icons/${platform}.svg`}
                                                alt={platform}
                                                width={16}
                                                height={16}
                                            />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.section>

                {/* Navigation par onglets */}
                <motion.section
                    className="profile-navigation glass-panel"
                    variants={itemVariants}
                >
                    <div className="nav-tabs">
                        {profileTabs.map(tab => {
                            const IconComponent = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`nav-tab frutiger-btn ${
                                        activeTab === tab.id
                                            ? 'frutiger-btn-primary'
                                            : 'frutiger-btn-glass'
                                    }`}
                                >
                                    <IconComponent size={16} />
                                    <span>{tab.label}</span>
                                    {tab.count > 0 && (
                                        <span className="tab-count">{tab.count}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Contrôles de vue */}
                    <div className="nav-controls">
                        {(activeTab === 'videos' || activeTab === 'playlists') && (
                            <>
                                <div className="view-controls">
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="frutiger-input sort-select"
                                    >
                                        {sortOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>

                                    <div className="view-toggle">
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
                                </div>
                            </>
                        )}
                    </div>
                </motion.section>

                {/* Contenu de l'onglet actif */}
                <motion.section
                    className="profile-content"
                    variants={itemVariants}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {getCurrentTabContent()}
                        </motion.div>
                    </AnimatePresence>
                </motion.section>

                {/* Modals */}
                <EditProfileModal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    user={profileUser}
                />

                <ReportUserModal
                    isOpen={showReportModal}
                    onClose={() => setShowReportModal(false)}
                    user={profileUser}
                />

                <FollowersModal
                    isOpen={showFollowersModal}
                    onClose={() => setShowFollowersModal(false)}
                    user={profileUser}
                    type="followers"
                />

                <FollowingModal
                    isOpen={showFollowingModal}
                    onClose={() => setShowFollowingModal(false)}
                    user={profileUser}
                    type="following"
                />
            </motion.div>
        </>
    );
};

/**
 * Contenu vide selon l'onglet
 */
const EmptyTabContent = ({ tab, isOwnProfile, onCreateAction }) => {
    const getEmptyContent = () => {
        switch (tab) {
            case 'videos':
                return {
                    icon: Video,
                    title: isOwnProfile ? 'Aucune vidéo publiée' : 'Aucune vidéo',
                    description: isOwnProfile
                        ? 'Commencez à partager vos créations avec la communauté'
                        : 'Cet utilisateur n\'a pas encore publié de vidéos',
                    actionText: isOwnProfile ? 'Publier ma première vidéo' : null
                };
            case 'playlists':
                return {
                    icon: Play,
                    title: isOwnProfile ? 'Aucune playlist créée' : 'Aucune playlist',
                    description: isOwnProfile
                        ? 'Organisez vos vidéos préférées dans des playlists'
                        : 'Cet utilisateur n\'a pas de playlists publiques',
                    actionText: isOwnProfile ? 'Créer ma première playlist' : null
                };
            case 'favorites':
                return {
                    icon: Heart,
                    title: 'Aucun favori',
                    description: 'Vos vidéos favorites apparaîtront ici',
                    actionText: null
                };
            case 'history':
                return {
                    icon: Clock,
                    title: 'Historique vide',
                    description: 'Votre historique de visionnage apparaîtra ici',
                    actionText: null
                };
            default:
                return {
                    icon: AlertCircle,
                    title: 'Contenu indisponible',
                    description: 'Ce contenu n\'est pas encore disponible',
                    actionText: null
                };
        }
    };

    const content = getEmptyContent();
    const IconComponent = content.icon;

    return (
        <div className="empty-tab-content glass-panel">
            <div className="empty-icon">
                <IconComponent size={64} />
            </div>
            <h3>{content.title}</h3>
            <p>{content.description}</p>
            {content.actionText && onCreateAction && (
                <button
                    onClick={onCreateAction}
                    className="frutiger-btn frutiger-btn-primary"
                >
                    <Plus size={16} />
                    {content.actionText}
                </button>
            )}
        </div>
    );
};

/**
 * Contenu analytics pour les créateurs
 */
const AnalyticsContent = ({ user, videos }) => {
    const analytics = useMemo(() => {
        const totalViews = videos.reduce((acc, video) => acc + video.viewCount, 0);
        const totalLikes = videos.reduce((acc, video) => acc + video.likesCount, 0);
        const avgViews = totalViews / videos.length || 0;
        const topVideo = videos.reduce((max, video) =>
            video.viewCount > max.viewCount ? video : max, videos[0]
        );

        return {
            totalViews,
            totalLikes,
            avgViews,
            topVideo,
            engagementRate: totalViews > 0 ? (totalLikes / totalViews * 100).toFixed(1) : 0,
            uploadFrequency: videos.length / 12 // Vidéos par mois (approx)
        };
    }, [videos]);

    return (
        <div className="analytics-content">
            <div className="analytics-grid">
                <div className="analytics-card glass-panel">
                    <div className="card-header">
                        <Eye size={24} />
                        <h3>Vues totales</h3>
                    </div>
                    <div className="card-value">
                        {formatCompactNumber(analytics.totalViews)}
                    </div>
                    <div className="card-trend positive">
                        +12% ce mois
                    </div>
                </div>

                <div className="analytics-card glass-panel">
                    <div className="card-header">
                        <Heart size={24} />
                        <h3>Likes totaux</h3>
                    </div>
                    <div className="card-value">
                        {formatCompactNumber(analytics.totalLikes)}
                    </div>
                    <div className="card-trend positive">
                        +8% ce mois
                    </div>
                </div>

                <div className="analytics-card glass-panel">
                    <div className="card-header">
                        <TrendingUp size={24} />
                        <h3>Engagement</h3>
                    </div>
                    <div className="card-value">
                        {analytics.engagementRate}%
                    </div>
                    <div className="card-trend positive">
                        +2.3% ce mois
                    </div>
                </div>

                <div className="analytics-card glass-panel">
                    <div className="card-header">
                        <Upload size={24} />
                        <h3>Fréquence</h3>
                    </div>
                    <div className="card-value">
                        {analytics.uploadFrequency.toFixed(1)}
                    </div>
                    <div className="card-subtitle">
                        vidéos/mois
                    </div>
                </div>
            </div>

            {analytics.topVideo && (
                <div className="top-content glass-panel">
                    <h3>Vidéo la plus populaire</h3>
                    <div className="top-video">
                        <img src={analytics.topVideo.thumbnail} alt={analytics.topVideo.title} />
                        <div className="video-info">
                            <h4>{analytics.topVideo.title}</h4>
                            <p>{formatCompactNumber(analytics.topVideo.viewCount)} vues</p>
                            <p>Publiée {formatRelativeTime(analytics.topVideo.createdAt)}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Modal d'édition de profil
 */
const EditProfileModal = ({ isOpen, onClose, user }) => {
    const [formData, setFormData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        bio: user?.bio || '',
        location: user?.location || '',
        website: user?.website || ''
    });
    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'Le prénom est requis';
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Le nom est requis';
        }

        if (formData.website && !isValidUrl(formData.website)) {
            newErrors.website = 'URL invalide';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        setIsSaving(true);
        try {
            // API call pour sauvegarder le profil
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulation
            onClose();
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Modifier le profil" size="medium">
            <div className="edit-profile-form">
                <div className="form-row">
                    <div className="form-group">
                        <label>Prénom</label>
                        <input
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => handleInputChange('firstName', e.target.value)}
                            className={`frutiger-input ${errors.firstName ? 'error' : ''}`}
                        />
                        {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                    </div>
                    <div className="form-group">
                        <label>Nom</label>
                        <input
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => handleInputChange('lastName', e.target.value)}
                            className={`frutiger-input ${errors.lastName ? 'error' : ''}`}
                        />
                        {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                    </div>
                </div>

                <div className="form-group">
                    <label>Bio</label>
                    <textarea
                        value={formData.bio}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        placeholder="Parlez-nous de vous..."
                        className="frutiger-input"
                        rows={4}
                        maxLength={500}
                    />
                    <span className="char-count">{formData.bio.length}/500</span>
                </div>

                <div className="form-group">
                    <label>Localisation</label>
                    <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        placeholder="Ville, Pays"
                        className="frutiger-input"
                    />
                </div>

                <div className="form-group">
                    <label>Site web</label>
                    <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        placeholder="https://votre-site.com"
                        className={`frutiger-input ${errors.website ? 'error' : ''}`}
                    />
                    {errors.website && <span className="error-text">{errors.website}</span>}
                </div>

                <div className="form-actions">
                    <button
                        onClick={onClose}
                        className="frutiger-btn frutiger-btn-secondary"
                        disabled={isSaving}
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSave}
                        className="frutiger-btn frutiger-btn-primary"
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <>
                                <LoadingSpinner size="small" />
                                Sauvegarde...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Sauvegarder
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

/**
 * Modal de signalement d'utilisateur
 */
const ReportUserModal = ({ isOpen, onClose, user }) => {
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');

    const reportReasons = [
        'Contenu inapproprié',
        'Spam ou publicité',
        'Harcèlement',
        'Usurpation d\'identité',
        'Autre'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason) return;

        try {
            // API call pour signaler l'utilisateur
            onClose();
        } catch (error) {
            console.error('Erreur lors du signalement:', error);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Signaler @${user?.username}`} size="medium">
            <form onSubmit={handleSubmit} className="report-form">
                <div className="form-group">
                    <label>Motif du signalement :</label>
                    <div className="reason-options">
                        {reportReasons.map(reasonOption => (
                            <label key={reasonOption} className="reason-option">
                                <input
                                    type="radio"
                                    name="reason"
                                    value={reasonOption}
                                    checked={reason === reasonOption}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                                <span>{reasonOption}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label>Description :</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Décrivez le problème..."
                        className="frutiger-input"
                        rows={4}
                    />
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        onClick={onClose}
                        className="frutiger-btn frutiger-btn-secondary"
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        disabled={!reason}
                        className="frutiger-btn frutiger-btn-primary"
                    >
                        <Flag size={16} />
                        Signaler
                    </button>
                </div>
            </form>
        </Modal>
    );
};

/**
 * Modal des abonnés
 */
const FollowersModal = ({ isOpen, onClose, user, type }) => {
    const [followers, setFollowers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;

        const loadFollowers = async () => {
            setIsLoading(true);
            try {
                // Simulation d'un appel API
                const mockFollowers = Array.from({ length: 20 }, (_, i) => ({
                    id: `follower-${i}`,
                    username: `user${i + 1}`,
                    firstName: `User`,
                    lastName: `${i + 1}`,
                    avatar: `/avatars/user${i + 1}.jpg`,
                    isVerified: Math.random() > 0.8,
                    isFollowing: Math.random() > 0.5
                }));
                setFollowers(mockFollowers);
            } catch (error) {
                console.error('Erreur lors du chargement:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadFollowers();
    }, [isOpen]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={type === 'followers' ? 'Abonnés' : 'Abonnements'}
            size="medium"
        >
            <div className="followers-modal-content">
                {isLoading ? (
                    <LoadingSpinner text="Chargement..." />
                ) : (
                    <div className="followers-list">
                        {followers.map(follower => (
                            <div key={follower.id} className="follower-item">
                                <Link to={`/user/${follower.username}`} className="follower-info">
                                    <img src={follower.avatar} alt={follower.username} />
                                    <div>
                                        <div className="follower-name">
                                            {follower.firstName} {follower.lastName}
                                            {follower.isVerified && <Check size={14} />}
                                        </div>
                                        <div className="follower-username">@{follower.username}</div>
                                    </div>
                                </Link>
                                <button
                                    className={`frutiger-btn frutiger-btn-small ${
                                        follower.isFollowing ? 'frutiger-btn-secondary' : 'frutiger-btn-primary'
                                    }`}
                                >
                                    {follower.isFollowing ? 'Suivi' : 'Suivre'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
};

/**
 * Modal des abonnements (alias pour FollowersModal)
 */
const FollowingModal = FollowersModal;

export default ProfilePage;