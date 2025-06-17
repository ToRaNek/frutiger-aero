// frontend/src/pages/VideoPage.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
    Play,
    Pause,
    ThumbsUp,
    ThumbsDown,
    Share2,
    Download,
    Flag,
    Plus,
    Check,
    Clock,
    Eye,
    Calendar,
    Tag,
    Users,
    MessageCircle,
    Heart,
    Bookmark,
    ExternalLink,
    MoreHorizontal,
    ChevronDown,
    ChevronUp,
    Shuffle,
    Repeat,
    SkipForward,
    Volume2,
    TrendingUp
} from 'lucide-react';

// Components
import VideoPlayer from '../components/video/VideoPlayer';
import VideoCard from '../components/video/VideoCard';
import VideoGrid from '../components/video/VideoGrid';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Hooks
import { useVideoPlayer } from '../hooks/useVideo';
import { useAuth } from '../hooks/useAuth';
import { usePlaylist } from '../hooks/usePlaylist';

// Utils
import {
    formatDuration,
    formatRelativeTime,
    formatCompactNumber,
    formatDateLong
} from '../utils/formatters';
import { copyToClipboard, nativeShare } from '../utils/helpers';

/**
 * Page de lecture vidéo avec player, informations et recommandations
 */
const VideoPage = () => {
    // Paramètres URL
    const { id: videoId } = useParams();
    const navigate = useNavigate();

    // États locaux
    const [showDescription, setShowDescription] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);
    const [autoplay, setAutoplay] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [relatedVideosType, setRelatedVideosType] = useState('recommended');

    // Hooks
    const { user } = useAuth();
    const {
        videoId: hookVideoId,
        currentVideo,
        isLoading,
        error,
        canViewVideo
    } = useVideoPage(videoId);

    const {
        addToFavorites,
        removeFromFavorites,
        addToWatchLater,
        removeFromWatchLater,
        isVideoInFavorites,
        isVideoInWatchLater,
        userPlaylists
    } = usePlaylist();

    // États dérivés
    const isVideoFavorited = useMemo(() =>
            currentVideo ? isVideoInFavorites(currentVideo.id) : false,
        [currentVideo, isVideoInFavorites]
    );

    const isVideoInWatchLaterList = useMemo(() =>
            currentVideo ? isVideoInWatchLater(currentVideo.id) : false,
        [currentVideo, isVideoInWatchLater]
    );

    // Vidéos recommandées/similaires
    const [relatedVideos, setRelatedVideos] = useState([]);
    const [relatedVideosLoading, setRelatedVideosLoading] = useState(false);

    // Types de vidéos liées
    const relatedVideoTypes = [
        { id: 'recommended', label: 'Recommandées', icon: Heart },
        { id: 'channel', label: 'Même chaîne', icon: Users },
        { id: 'category', label: 'Même catégorie', icon: Tag },
        { id: 'trending', label: 'Tendances', icon: TrendingUp }
    ];

    // Chargement des vidéos liées
    useEffect(() => {
        if (!currentVideo) return;

        const loadRelatedVideos = async () => {
            setRelatedVideosLoading(true);
            try {
                // Simulation du chargement des vidéos liées
                // Dans une vraie app, on ferait un appel API
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Mock data pour les vidéos liées
                const mockRelated = Array.from({ length: 12 }, (_, i) => ({
                    id: `related-${i}`,
                    title: `Vidéo liée ${i + 1}`,
                    description: 'Description de la vidéo liée...',
                    thumbnail: `/thumbnails/related-${i + 1}.jpg`,
                    duration: 300 + Math.random() * 600,
                    viewCount: Math.floor(Math.random() * 100000),
                    likesCount: Math.floor(Math.random() * 5000),
                    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
                    user: {
                        id: `user-${i}`,
                        username: `Créateur ${i + 1}`,
                        avatar: `/avatars/user-${i + 1}.jpg`
                    },
                    category: currentVideo.category
                }));

                setRelatedVideos(mockRelated);
            } catch (error) {
                console.error('Erreur lors du chargement des vidéos liées:', error);
            } finally {
                setRelatedVideosLoading(false);
            }
        };

        loadRelatedVideos();
    }, [currentVideo, relatedVideosType]);

    // Gestion des réactions
    const handleLike = useCallback(async () => {
        if (!user) {
            navigate('/login', { state: { from: location } });
            return;
        }

        // Logique de like
        try {
            // API call pour liker la vidéo
        } catch (error) {
            console.error('Erreur lors du like:', error);
        }
    }, [user, navigate]);

    const handleDislike = useCallback(async () => {
        if (!user) {
            navigate('/login', { state: { from: location } });
            return;
        }

        // Logique de dislike
        try {
            // API call pour disliker la vidéo
        } catch (error) {
            console.error('Erreur lors du dislike:', error);
        }
    }, [user, navigate]);

    // Gestion des favoris
    const handleFavoriteToggle = useCallback(async () => {
        if (!user) {
            navigate('/login', { state: { from: location } });
            return;
        }

        try {
            if (isVideoFavorited) {
                await removeFromFavorites(currentVideo.id);
            } else {
                await addToFavorites(currentVideo.id);
            }
        } catch (error) {
            console.error('Erreur lors de la gestion des favoris:', error);
        }
    }, [user, navigate, isVideoFavorited, currentVideo, addToFavorites, removeFromFavorites]);

    // Gestion "À regarder plus tard"
    const handleWatchLaterToggle = useCallback(async () => {
        if (!user) {
            navigate('/login', { state: { from: location } });
            return;
        }

        try {
            if (isVideoInWatchLaterList) {
                await removeFromWatchLater(currentVideo.id);
            } else {
                await addToWatchLater(currentVideo.id);
            }
        } catch (error) {
            console.error('Erreur lors de la gestion "À regarder plus tard":', error);
        }
    }, [user, navigate, isVideoInWatchLaterList, currentVideo, addToWatchLater, removeFromWatchLater]);

    // Gestion du partage
    const handleShare = useCallback(async () => {
        if (navigator.share && currentVideo) {
            try {
                await nativeShare({
                    title: currentVideo.title,
                    text: currentVideo.description,
                    url: window.location.href,
                });
            } catch (error) {
                setShowShareModal(true);
            }
        } else {
            setShowShareModal(true);
        }
    }, [currentVideo]);

    // Navigation vers une vidéo liée
    const handleRelatedVideoClick = useCallback((video) => {
        navigate(`/video/${video.id}`);
    }, [navigate]);

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

    // Gestion des erreurs
    if (error) {
        return (
            <div className="page-container">
                <div className="error-page">
                    <div className="glass-panel error-content">
                        <h2>Erreur de chargement</h2>
                        <p>{error}</p>
                        <div className="error-actions">
                            <button
                                onClick={() => window.history.back()}
                                className="frutiger-btn frutiger-btn-secondary"
                            >
                                Retour
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="frutiger-btn frutiger-btn-primary"
                            >
                                Réessayer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Chargement
    if (isLoading || !currentVideo) {
        return (
            <div className="page-container">
                <LoadingSpinner size="large" text="Chargement de la vidéo..." />
            </div>
        );
    }

    // Vérification des permissions
    if (!canViewVideo) {
        return (
            <div className="page-container">
                <div className="access-denied">
                    <div className="glass-panel access-content">
                        <h2>Accès restreint</h2>
                        <p>Cette vidéo n'est pas accessible avec votre compte actuel.</p>
                        {!user && (
                            <button
                                onClick={() => navigate('/login', { state: { from: location } })}
                                className="frutiger-btn frutiger-btn-primary"
                            >
                                Se connecter
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>{currentVideo.title} - Frutiger Streaming</title>
                <meta name="description" content={currentVideo.description} />
                <meta name="keywords" content={currentVideo.tags?.join(', ')} />
                <meta property="og:title" content={currentVideo.title} />
                <meta property="og:description" content={currentVideo.description} />
                <meta property="og:image" content={currentVideo.thumbnail} />
                <meta property="og:type" content="video.other" />
                <meta property="video:duration" content={currentVideo.duration} />
            </Helmet>

            <motion.div
                className="video-page"
                variants={pageVariants}
                initial="hidden"
                animate="visible"
            >
                <div className="video-page-container">
                    {/* Lecteur vidéo principal */}
                    <motion.section
                        className="video-player-section"
                        variants={itemVariants}
                    >
                        <VideoPlayer
                            videoId={currentVideo.id}
                            src={currentVideo.streamUrl}
                            poster={currentVideo.thumbnail}
                            autoplay={autoplay}
                            qualities={currentVideo.qualities}
                            subtitles={currentVideo.subtitles}
                            onTimeUpdate={setCurrentTime}
                            responsive={true}
                        />
                    </motion.section>

                    <div className="video-content-layout">
                        {/* Informations vidéo */}
                        <motion.main
                            className="video-main-content"
                            variants={itemVariants}
                        >
                            <VideoInfo
                                video={currentVideo}
                                user={user}
                                showDescription={showDescription}
                                onToggleDescription={() => setShowDescription(!showDescription)}
                                onLike={handleLike}
                                onDislike={handleDislike}
                                onFavoriteToggle={handleFavoriteToggle}
                                onWatchLaterToggle={handleWatchLaterToggle}
                                onShare={handleShare}
                                onReport={() => setShowReportModal(true)}
                                onAddToPlaylist={() => setShowPlaylistModal(true)}
                                isFavorited={isVideoFavorited}
                                isInWatchLater={isVideoInWatchLaterList}
                            />

                            {/* Section commentaires */}
                            <CommentsSection
                                videoId={currentVideo.id}
                                user={user}
                            />
                        </motion.main>

                        {/* Sidebar avec vidéos liées */}
                        <motion.aside
                            className="video-sidebar"
                            variants={itemVariants}
                        >
                            <RelatedVideos
                                videos={relatedVideos}
                                isLoading={relatedVideosLoading}
                                currentType={relatedVideosType}
                                types={relatedVideoTypes}
                                onTypeChange={setRelatedVideosType}
                                onVideoClick={handleRelatedVideoClick}
                                autoplay={autoplay}
                                onAutoplayToggle={setAutoplay}
                            />
                        </motion.aside>
                    </div>
                </div>

                {/* Modals */}
                <ShareModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    video={currentVideo}
                    currentTime={currentTime}
                />

                <ReportModal
                    isOpen={showReportModal}
                    onClose={() => setShowReportModal(false)}
                    video={currentVideo}
                />

                <PlaylistModal
                    isOpen={showPlaylistModal}
                    onClose={() => setShowPlaylistModal(false)}
                    video={currentVideo}
                    playlists={userPlaylists}
                />
            </motion.div>
        </>
    );
};

/**
 * Composant d'informations sur la vidéo
 */
const VideoInfo = ({
                       video,
                       user,
                       showDescription,
                       onToggleDescription,
                       onLike,
                       onDislike,
                       onFavoriteToggle,
                       onWatchLaterToggle,
                       onShare,
                       onReport,
                       onAddToPlaylist,
                       isFavorited,
                       isInWatchLater
                   }) => {
    return (
        <div className="video-info glass-panel">
            {/* Titre et métadonnées */}
            <div className="video-header">
                <h1 className="video-title">{video.title}</h1>
                <div className="video-meta">
                    <div className="meta-left">
                        <span className="view-count">
                            <Eye size={16} />
                            {formatCompactNumber(video.viewCount)} vues
                        </span>
                        <span className="upload-date">
                            <Calendar size={16} />
                            {formatRelativeTime(video.createdAt)}
                        </span>
                        <span className="duration">
                            <Clock size={16} />
                            {formatDuration(video.duration)}
                        </span>
                    </div>
                    <div className="meta-right">
                        <div className="video-tags">
                            {video.tags?.slice(0, 3).map(tag => (
                                <Link
                                    key={tag}
                                    to={`/search?q=${encodeURIComponent(tag)}`}
                                    className="frutiger-badge frutiger-badge-secondary"
                                >
                                    <Tag size={12} />
                                    {tag}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions de la vidéo */}
            <div className="video-actions">
                <div className="primary-actions">
                    <button
                        onClick={onLike}
                        className="frutiger-btn frutiger-btn-glass action-btn"
                    >
                        <ThumbsUp size={18} />
                        {formatCompactNumber(video.likesCount)}
                    </button>
                    <button
                        onClick={onDislike}
                        className="frutiger-btn frutiger-btn-glass action-btn"
                    >
                        <ThumbsDown size={18} />
                        {formatCompactNumber(video.dislikesCount || 0)}
                    </button>
                    <button
                        onClick={onShare}
                        className="frutiger-btn frutiger-btn-glass action-btn"
                    >
                        <Share2 size={18} />
                        Partager
                    </button>
                    <button
                        onClick={onFavoriteToggle}
                        className={`frutiger-btn action-btn ${
                            isFavorited ? 'frutiger-btn-primary' : 'frutiger-btn-glass'
                        }`}
                    >
                        <Heart size={18} />
                        {isFavorited ? 'Favoris' : 'Ajouter aux favoris'}
                    </button>
                </div>

                <div className="secondary-actions">
                    <button
                        onClick={onWatchLaterToggle}
                        className={`frutiger-btn action-btn ${
                            isInWatchLater ? 'frutiger-btn-primary' : 'frutiger-btn-glass'
                        }`}
                    >
                        <Clock size={18} />
                        {isInWatchLater ? 'Dans la liste' : 'À regarder plus tard'}
                    </button>
                    <button
                        onClick={onAddToPlaylist}
                        className="frutiger-btn frutiger-btn-glass action-btn"
                    >
                        <Plus size={18} />
                        Playlist
                    </button>
                    <button
                        onClick={onReport}
                        className="frutiger-btn frutiger-btn-glass action-btn"
                    >
                        <Flag size={18} />
                        Signaler
                    </button>
                </div>
            </div>

            {/* Informations du créateur */}
            <div className="creator-info">
                <Link to={`/user/${video.user.username}`} className="creator-profile">
                    <img
                        src={video.user.avatar}
                        alt={video.user.username}
                        className="creator-avatar"
                    />
                    <div className="creator-details">
                        <h3 className="creator-name">{video.user.username}</h3>
                        <p className="creator-stats">
                            {formatCompactNumber(video.user.subscribersCount || 0)} abonnés
                        </p>
                    </div>
                </Link>

                {user && user.id !== video.user.id && (
                    <button className="frutiger-btn frutiger-btn-primary subscribe-btn">
                        <Users size={16} />
                        S'abonner
                    </button>
                )}
            </div>

            {/* Description */}
            <div className="video-description">
                <button
                    onClick={onToggleDescription}
                    className="description-toggle frutiger-btn frutiger-btn-glass"
                >
                    {showDescription ? 'Masquer' : 'Voir'} la description
                    {showDescription ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                <AnimatePresence>
                    {showDescription && (
                        <motion.div
                            className="description-content"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="description-text">
                                {video.description}
                            </div>
                            <div className="description-meta">
                                <p><strong>Publié le :</strong> {formatDateLong(video.createdAt)}</p>
                                <p><strong>Catégorie :</strong> {video.category}</p>
                                {video.tags && (
                                    <div className="description-tags">
                                        <strong>Tags :</strong>
                                        {video.tags.map(tag => (
                                            <Link
                                                key={tag}
                                                to={`/search?q=${encodeURIComponent(tag)}`}
                                                className="tag-link"
                                            >
                                                #{tag}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

/**
 * Section des commentaires
 */
const CommentsSection = ({ videoId, user }) => {
    const [comments, setComments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newComment, setNewComment] = useState('');

    useEffect(() => {
        // Charger les commentaires
        const loadComments = async () => {
            setIsLoading(true);
            try {
                // Mock data pour les commentaires
                const mockComments = Array.from({ length: 5 }, (_, i) => ({
                    id: `comment-${i}`,
                    content: `Commentaire exemple ${i + 1}. Ceci est un commentaire de test pour cette vidéo.`,
                    createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
                    user: {
                        id: `user-${i}`,
                        username: `Utilisateur ${i + 1}`,
                        avatar: `/avatars/user-${i + 1}.jpg`
                    },
                    likesCount: Math.floor(Math.random() * 50),
                    replies: []
                }));

                setComments(mockComments);
            } catch (error) {
                console.error('Erreur lors du chargement des commentaires:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadComments();
    }, [videoId]);

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !user) return;

        try {
            // API call pour ajouter le commentaire
            setNewComment('');
        } catch (error) {
            console.error('Erreur lors de l\'ajout du commentaire:', error);
        }
    };

    return (
        <div className="comments-section glass-panel">
            <div className="comments-header">
                <h3>
                    <MessageCircle size={20} />
                    Commentaires ({comments.length})
                </h3>
            </div>

            {/* Formulaire de nouveau commentaire */}
            {user && (
                <form onSubmit={handleSubmitComment} className="new-comment-form">
                    <div className="comment-input-container">
                        <img src={user.avatar} alt={user.username} className="user-avatar" />
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Ajouter un commentaire..."
                            className="frutiger-input comment-input"
                            rows={3}
                        />
                    </div>
                    <div className="comment-actions">
                        <button
                            type="button"
                            onClick={() => setNewComment('')}
                            className="frutiger-btn frutiger-btn-glass"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={!newComment.trim()}
                            className="frutiger-btn frutiger-btn-primary"
                        >
                            Commenter
                        </button>
                    </div>
                </form>
            )}

            {/* Liste des commentaires */}
            <div className="comments-list">
                {isLoading ? (
                    <LoadingSpinner text="Chargement des commentaires..." />
                ) : comments.length === 0 ? (
                    <div className="no-comments">
                        <MessageCircle size={48} />
                        <p>Aucun commentaire pour le moment</p>
                        {user && <p>Soyez le premier à commenter !</p>}
                    </div>
                ) : (
                    comments.map(comment => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            currentUser={user}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

/**
 * Item de commentaire individuel
 */
const CommentItem = ({ comment, currentUser }) => {
    const [showReplies, setShowReplies] = useState(false);
    const [isLiked, setIsLiked] = useState(false);

    return (
        <div className="comment-item">
            <div className="comment-header">
                <img src={comment.user.avatar} alt={comment.user.username} className="comment-avatar" />
                <div className="comment-meta">
                    <span className="comment-author">{comment.user.username}</span>
                    <span className="comment-date">{formatRelativeTime(comment.createdAt)}</span>
                </div>
            </div>

            <div className="comment-content">
                <p>{comment.content}</p>
            </div>

            <div className="comment-actions">
                <button
                    onClick={() => setIsLiked(!isLiked)}
                    className={`comment-action ${isLiked ? 'liked' : ''}`}
                >
                    <ThumbsUp size={14} />
                    {comment.likesCount + (isLiked ? 1 : 0)}
                </button>
                <button className="comment-action">
                    <MessageCircle size={14} />
                    Répondre
                </button>
                {currentUser && currentUser.id === comment.user.id && (
                    <button className="comment-action">
                        <MoreHorizontal size={14} />
                    </button>
                )}
            </div>
        </div>
    );
};

/**
 * Section des vidéos liées
 */
const RelatedVideos = ({
                           videos,
                           isLoading,
                           currentType,
                           types,
                           onTypeChange,
                           onVideoClick,
                           autoplay,
                           onAutoplayToggle
                       }) => {
    return (
        <div className="related-videos glass-panel">
            <div className="related-header">
                <div className="related-tabs">
                    {types.map(type => {
                        const IconComponent = type.icon;
                        return (
                            <button
                                key={type.id}
                                onClick={() => onTypeChange(type.id)}
                                className={`related-tab frutiger-btn ${
                                    currentType === type.id
                                        ? 'frutiger-btn-primary'
                                        : 'frutiger-btn-glass'
                                }`}
                            >
                                <IconComponent size={14} />
                                {type.label}
                            </button>
                        );
                    })}
                </div>

                <div className="autoplay-toggle">
                    <label className="frutiger-switch">
                        <input
                            type="checkbox"
                            checked={autoplay}
                            onChange={(e) => onAutoplayToggle(e.target.checked)}
                            className="frutiger-switch-input"
                        />
                        <span className="frutiger-switch-slider"></span>
                    </label>
                    <span>Lecture automatique</span>
                </div>
            </div>

            <div className="related-content">
                {isLoading ? (
                    <LoadingSpinner text="Chargement..." />
                ) : (
                    <div className="related-videos-list">
                        {videos.map(video => (
                            <RelatedVideoCard
                                key={video.id}
                                video={video}
                                onClick={() => onVideoClick(video)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * Carte de vidéo liée
 */
const RelatedVideoCard = ({ video, onClick }) => {
    return (
        <div className="related-video-card" onClick={onClick}>
            <div className="related-thumbnail">
                <img src={video.thumbnail} alt={video.title} />
                <div className="related-duration">
                    {formatDuration(video.duration)}
                </div>
                <div className="play-overlay">
                    <Play size={16} />
                </div>
            </div>

            <div className="related-info">
                <h4 className="related-title">{video.title}</h4>
                <p className="related-channel">{video.user.username}</p>
                <div className="related-stats">
                    <span>{formatCompactNumber(video.viewCount)} vues</span>
                    <span>•</span>
                    <span>{formatRelativeTime(video.createdAt)}</span>
                </div>
            </div>
        </div>
    );
};

/**
 * Modal de partage
 */
const ShareModal = ({ isOpen, onClose, video, currentTime }) => {
    const [withTimestamp, setWithTimestamp] = useState(false);
    const [copied, setCopied] = useState(false);

    const shareUrl = withTimestamp
        ? `${window.location.href}?t=${Math.floor(currentTime)}`
        : window.location.href;

    const handleCopyLink = async () => {
        try {
            await copyToClipboard(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Erreur de copie:', error);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Partager cette vidéo" size="medium">
            <div className="share-modal-content">
                <div className="share-options">
                    <label className="share-option">
                        <input
                            type="checkbox"
                            checked={withTimestamp}
                            onChange={(e) => setWithTimestamp(e.target.checked)}
                        />
                        <span>Commencer à {formatDuration(currentTime)}</span>
                    </label>
                </div>

                <div className="share-link">
                    <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="frutiger-input"
                    />
                    <button
                        onClick={handleCopyLink}
                        className={`frutiger-btn ${copied ? 'frutiger-btn-success' : 'frutiger-btn-primary'}`}
                    >
                        {copied ? <Check size={16} /> : 'Copier'}
                    </button>
                </div>

                <div className="social-share">
                    <h4>Partager sur</h4>
                    <div className="social-buttons">
                        <button className="frutiger-btn frutiger-btn-secondary">Twitter</button>
                        <button className="frutiger-btn frutiger-btn-secondary">Facebook</button>
                        <button className="frutiger-btn frutiger-btn-secondary">LinkedIn</button>
                        <button className="frutiger-btn frutiger-btn-secondary">Reddit</button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

/**
 * Modal de signalement
 */
const ReportModal = ({ isOpen, onClose, video }) => {
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');

    const reportReasons = [
        'Contenu inapproprié',
        'Spam ou publicité',
        'Violation de droits d\'auteur',
        'Contenu violent ou choquant',
        'Harcèlement ou intimidation',
        'Autre'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason) return;

        try {
            // API call pour signaler la vidéo
            onClose();
        } catch (error) {
            console.error('Erreur lors du signalement:', error);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Signaler cette vidéo" size="medium">
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
                    <label>Description (optionnel) :</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Décrivez le problème en détail..."
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
                        Signaler
                    </button>
                </div>
            </form>
        </Modal>
    );
};

/**
 * Modal d'ajout à une playlist
 */
const PlaylistModal = ({ isOpen, onClose, video, playlists }) => {
    const [selectedPlaylists, setSelectedPlaylists] = useState(new Set());
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');

    const handlePlaylistToggle = (playlistId) => {
        const newSelected = new Set(selectedPlaylists);
        if (newSelected.has(playlistId)) {
            newSelected.delete(playlistId);
        } else {
            newSelected.add(playlistId);
        }
        setSelectedPlaylists(newSelected);
    };

    const handleSave = async () => {
        try {
            // API calls pour ajouter/supprimer des playlists
            onClose();
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ajouter à une playlist" size="medium">
            <div className="playlist-modal-content">
                {!showCreateForm ? (
                    <>
                        <div className="playlists-list">
                            {playlists?.map(playlist => (
                                <label key={playlist.id} className="playlist-option">
                                    <input
                                        type="checkbox"
                                        checked={selectedPlaylists.has(playlist.id)}
                                        onChange={() => handlePlaylistToggle(playlist.id)}
                                    />
                                    <div className="playlist-info">
                                        <span className="playlist-name">{playlist.title}</span>
                                        <span className="playlist-count">{playlist.videoCount} vidéos</span>
                                    </div>
                                </label>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="frutiger-btn frutiger-btn-glass create-playlist-btn"
                        >
                            <Plus size={16} />
                            Créer une nouvelle playlist
                        </button>

                        <div className="modal-actions">
                            <button
                                onClick={onClose}
                                className="frutiger-btn frutiger-btn-secondary"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSave}
                                className="frutiger-btn frutiger-btn-primary"
                            >
                                Sauvegarder
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="create-playlist-form">
                        <input
                            type="text"
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            placeholder="Nom de la playlist"
                            className="frutiger-input"
                            autoFocus
                        />
                        <div className="form-actions">
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="frutiger-btn frutiger-btn-secondary"
                            >
                                Retour
                            </button>
                            <button
                                onClick={() => {/* Créer playlist */}}
                                disabled={!newPlaylistName.trim()}
                                className="frutiger-btn frutiger-btn-primary"
                            >
                                Créer
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default VideoPage;