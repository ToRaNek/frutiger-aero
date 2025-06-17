// frontend/src/pages/PlaylistPage.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
    Play,
    Pause,
    Shuffle,
    Repeat,
    Edit3,
    Trash2,
    Share2,
    Download,
    Plus,
    Minus,
    MoreHorizontal,
    Lock,
    Unlock,
    Eye,
    EyeOff,
    Calendar,
    Clock,
    Users,
    Heart,
    Copy,
    Settings,
    Filter,
    Search,
    Grid,
    List,
    Save,
    X
} from 'lucide-react';

import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';


// Components
import VideoCard from '../components/video/VideoCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import PlaylistForm from '../components/playlist/PlaylistForm';

// Hooks
import { usePlaylistPage } from '../hooks/usePlaylist';
import { useAuth } from '../hooks/useAuth';
import { useVideo } from '../hooks/useVideo';

// Utils
import {
    formatDuration,
    formatRelativeTime,
    formatCompactNumber,
    formatDateLong
} from '../utils/formatters';
import { copyToClipboard, nativeShare } from '../utils/helpers';

/**
 * Page de playlist avec gestion complète et lecture continue
 */
const PlaylistPage = () => {
    // Paramètres URL
    const { id: playlistId } = useParams();
    const navigate = useNavigate();

    // États locaux
    const [isEditing, setIsEditing] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showAddVideoModal, setShowAddVideoModal] = useState(false);
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [shuffle, setShuffle] = useState(false);
    const [repeat, setRepeat] = useState('none'); // 'none', 'all', 'one'
    const [viewMode, setViewMode] = useState('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('position');
    const [filterBy, setFilterBy] = useState('all');

    // Hooks
    const { user } = useAuth();
    const {
        playlistId: hookPlaylistId,
        currentPlaylist,
        isLoading,
        error,
        canViewPlaylist,
        canEditPlaylist
    } = usePlaylistPage(playlistId);

    const { searchVideos } = useVideo();

    // États dérivés
    const playlistVideos = currentPlaylist?.videos || [];
    const totalDuration = useMemo(() =>
            playlistVideos.reduce((acc, video) => acc + (video.duration || 0), 0),
        [playlistVideos]
    );

    const filteredAndSortedVideos = useMemo(() => {
        let videos = [...playlistVideos];

        // Filtrage par recherche
        if (searchTerm) {
            videos = videos.filter(video =>
                video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                video.user?.username.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filtrage par type
        if (filterBy !== 'all') {
            videos = videos.filter(video => {
                switch (filterBy) {
                    case 'recent':
                        return new Date(video.addedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    case 'long':
                        return video.duration > 600; // Plus de 10 minutes
                    case 'short':
                        return video.duration <= 600; // 10 minutes ou moins
                    default:
                        return true;
                }
            });
        }

        // Tri
        videos.sort((a, b) => {
            switch (sortBy) {
                case 'position':
                    return a.position - b.position;
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'duration':
                    return b.duration - a.duration;
                case 'added':
                    return new Date(b.addedAt) - new Date(a.addedAt);
                case 'views':
                    return b.viewCount - a.viewCount;
                default:
                    return 0;
            }
        });

        return videos;
    }, [playlistVideos, searchTerm, filterBy, sortBy]);

    // Navigation vidéo
    const currentVideo = filteredAndSortedVideos[currentVideoIndex];

    const handleVideoSelect = useCallback((index) => {
        setCurrentVideoIndex(index);
    }, []);

    const handleNextVideo = useCallback(() => {
        if (shuffle) {
            const randomIndex = Math.floor(Math.random() * filteredAndSortedVideos.length);
            setCurrentVideoIndex(randomIndex);
        } else {
            const nextIndex = currentVideoIndex + 1;
            if (nextIndex < filteredAndSortedVideos.length) {
                setCurrentVideoIndex(nextIndex);
            } else if (repeat === 'all') {
                setCurrentVideoIndex(0);
            } else {
                setIsPlaying(false);
            }
        }
    }, [currentVideoIndex, filteredAndSortedVideos.length, shuffle, repeat]);

    const handlePrevVideo = useCallback(() => {
        if (shuffle) {
            const randomIndex = Math.floor(Math.random() * filteredAndSortedVideos.length);
            setCurrentVideoIndex(randomIndex);
        } else {
            const prevIndex = currentVideoIndex - 1;
            if (prevIndex >= 0) {
                setCurrentVideoIndex(prevIndex);
            } else if (repeat === 'all') {
                setCurrentVideoIndex(filteredAndSortedVideos.length - 1);
            }
        }
    }, [currentVideoIndex, filteredAndSortedVideos.length, shuffle, repeat]);

    // Gestion des actions playlist
    const handleEdit = () => {
        if (!canEditPlaylist) return;
        setIsEditing(true);
    };

    const handleDelete = async () => {
        if (!canEditPlaylist) return;
        try {
            // API call pour supprimer la playlist
            navigate('/playlists');
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
        }
    };

    const handleShare = async () => {
        if (navigator.share && currentPlaylist) {
            try {
                await nativeShare({
                    title: currentPlaylist.title,
                    text: currentPlaylist.description,
                    url: window.location.href,
                });
            } catch (error) {
                setShowShareModal(true);
            }
        } else {
            setShowShareModal(true);
        }
    };

    const handleDuplicate = async () => {
        try {
            // API call pour dupliquer la playlist
        } catch (error) {
            console.error('Erreur lors de la duplication:', error);
        }
    };

    const handleVideoRemove = async (videoId) => {
        if (!canEditPlaylist) return;
        try {
            // API call pour supprimer la vidéo de la playlist
        } catch (error) {
            console.error('Erreur lors de la suppression de la vidéo:', error);
        }
    };

    const handleReorder = async (result) => {
        if (!canEditPlaylist) return;
        if (!result.destination) return;

        const items = Array.from(filteredAndSortedVideos);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        try {
            // API call pour réorganiser les vidéos
        } catch (error) {
            console.error('Erreur lors de la réorganisation:', error);
        }
    };

    // Options de tri et filtrage
    const sortOptions = [
        { value: 'position', label: 'Position' },
        { value: 'title', label: 'Titre' },
        { value: 'duration', label: 'Durée' },
        { value: 'added', label: 'Ajouté' },
        { value: 'views', label: 'Vues' }
    ];

    const filterOptions = [
        { value: 'all', label: 'Toutes' },
        { value: 'recent', label: 'Récentes' },
        { value: 'long', label: 'Longues (10m+)' },
        { value: 'short', label: 'Courtes (-10m)' }
    ];

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
    if (isLoading || !currentPlaylist) {
        return (
            <div className="page-container">
                <LoadingSpinner size="large" text="Chargement de la playlist..." />
            </div>
        );
    }

    // Vérification des permissions
    if (!canViewPlaylist) {
        return (
            <div className="page-container">
                <div className="access-denied">
                    <div className="glass-panel access-content">
                        <h2>Playlist privée</h2>
                        <p>Cette playlist n'est pas accessible.</p>
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
                <title>{currentPlaylist.title} - Playlist - Frutiger Streaming</title>
                <meta name="description" content={currentPlaylist.description} />
                <meta property="og:title" content={currentPlaylist.title} />
                <meta property="og:description" content={currentPlaylist.description} />
                <meta property="og:image" content={currentPlaylist.thumbnail} />
                <meta property="og:type" content="music.playlist" />
            </Helmet>

            <motion.div
                className="playlist-page"
                variants={pageVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Header de la playlist */}
                <motion.section
                    className="playlist-header glass-panel"
                    variants={itemVariants}
                >
                    <div className="playlist-hero">
                        <div className="playlist-thumbnail">
                            <img
                                src={currentPlaylist.thumbnail}
                                alt={currentPlaylist.title}
                                className="thumbnail-image"
                            />
                            <div className="thumbnail-overlay">
                                <button
                                    onClick={() => setIsPlaying(!isPlaying)}
                                    className="play-all-btn frutiger-btn frutiger-btn-primary"
                                >
                                    {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                                    {isPlaying ? 'Pause' : 'Lire tout'}
                                </button>
                            </div>
                            <div className="video-count-badge">
                                {playlistVideos.length} vidéos
                            </div>
                        </div>

                        <div className="playlist-info">
                            <div className="playlist-meta">
                                <span className="playlist-type">
                                    {currentPlaylist.isPublic ? (
                                        <>
                                            <Unlock size={16} />
                                            Playlist publique
                                        </>
                                    ) : (
                                        <>
                                            <Lock size={16} />
                                            Playlist privée
                                        </>
                                    )}
                                </span>
                                <span className="playlist-created">
                                    <Calendar size={16} />
                                    Créée {formatRelativeTime(currentPlaylist.createdAt)}
                                </span>
                            </div>

                            <h1 className="playlist-title">{currentPlaylist.title}</h1>
                            {currentPlaylist.description && (
                                <p className="playlist-description">{currentPlaylist.description}</p>
                            )}

                            <div className="playlist-owner">
                                <Link to={`/user/${currentPlaylist.user.username}`} className="owner-link">
                                    <img
                                        src={currentPlaylist.user.avatar}
                                        alt={currentPlaylist.user.username}
                                        className="owner-avatar"
                                    />
                                    <span>{currentPlaylist.user.username}</span>
                                </Link>
                            </div>

                            <div className="playlist-stats">
                                <div className="stat-item">
                                    <Clock size={16} />
                                    <span>{formatDuration(totalDuration)}</span>
                                </div>
                                <div className="stat-item">
                                    <Eye size={16} />
                                    <span>{formatCompactNumber(currentPlaylist.viewCount || 0)} vues</span>
                                </div>
                                <div className="stat-item">
                                    <Calendar size={16} />
                                    <span>Mise à jour {formatRelativeTime(currentPlaylist.updatedAt)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions de la playlist */}
                    <div className="playlist-actions">
                        <div className="primary-actions">
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="frutiger-btn frutiger-btn-primary"
                            >
                                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                                {isPlaying ? 'Pause' : 'Lire'}
                            </button>

                            <button
                                onClick={() => setShuffle(!shuffle)}
                                className={`frutiger-btn ${shuffle ? 'frutiger-btn-primary' : 'frutiger-btn-glass'}`}
                            >
                                <Shuffle size={18} />
                                Aléatoire
                            </button>

                            <div className="repeat-control">
                                <button
                                    onClick={() => {
                                        const nextRepeat = repeat === 'none' ? 'all' : repeat === 'all' ? 'one' : 'none';
                                        setRepeat(nextRepeat);
                                    }}
                                    className={`frutiger-btn ${repeat !== 'none' ? 'frutiger-btn-primary' : 'frutiger-btn-glass'}`}
                                >
                                    <Repeat size={18} />
                                    {repeat === 'one' && <span className="repeat-indicator">1</span>}
                                </button>
                            </div>
                        </div>

                        <div className="secondary-actions">
                            <button
                                onClick={handleShare}
                                className="frutiger-btn frutiger-btn-glass"
                            >
                                <Share2 size={18} />
                                Partager
                            </button>

                            <button
                                onClick={handleDuplicate}
                                className="frutiger-btn frutiger-btn-glass"
                            >
                                <Copy size={18} />
                                Dupliquer
                            </button>

                            {canEditPlaylist && (
                                <>
                                    <button
                                        onClick={handleEdit}
                                        className="frutiger-btn frutiger-btn-glass"
                                    >
                                        <Edit3 size={18} />
                                        Modifier
                                    </button>

                                    <button
                                        onClick={() => setShowDeleteModal(true)}
                                        className="frutiger-btn frutiger-btn-glass text-red"
                                    >
                                        <Trash2 size={18} />
                                        Supprimer
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </motion.section>

                {/* Contrôles et filtres */}
                <motion.section
                    className="playlist-controls glass-panel"
                    variants={itemVariants}
                >
                    <div className="controls-left">
                        <div className="search-box">
                            <Search size={16} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Rechercher dans la playlist..."
                                className="frutiger-input search-input"
                            />
                        </div>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="frutiger-input sort-select"
                        >
                            {sortOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    Trier par {option.label}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filterBy}
                            onChange={(e) => setFilterBy(e.target.value)}
                            className="frutiger-input filter-select"
                        >
                            {filterOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="controls-right">
                        <div className="view-toggle">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`frutiger-btn ${viewMode === 'list' ? 'frutiger-btn-primary' : 'frutiger-btn-glass'}`}
                            >
                                <List size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`frutiger-btn ${viewMode === 'grid' ? 'frutiger-btn-primary' : 'frutiger-btn-glass'}`}
                            >
                                <Grid size={16} />
                            </button>
                        </div>

                        {canEditPlaylist && (
                            <button
                                onClick={() => setShowAddVideoModal(true)}
                                className="frutiger-btn frutiger-btn-primary"
                            >
                                <Plus size={16} />
                                Ajouter vidéo
                            </button>
                        )}
                    </div>
                </motion.section>

                {/* Liste des vidéos */}
                <motion.section
                    className="playlist-content"
                    variants={itemVariants}
                >
                    {filteredAndSortedVideos.length === 0 ? (
                        <div className="empty-playlist glass-panel">
                            <div className="empty-content">
                                <Play size={48} />
                                <h3>
                                    {searchTerm || filterBy !== 'all'
                                        ? 'Aucune vidéo trouvée'
                                        : 'Playlist vide'
                                    }
                                </h3>
                                <p>
                                    {searchTerm || filterBy !== 'all'
                                        ? 'Essayez de modifier vos critères de recherche'
                                        : 'Cette playlist ne contient pas encore de vidéos'
                                    }
                                </p>
                                {canEditPlaylist && (
                                    <button
                                        onClick={() => setShowAddVideoModal(true)}
                                        className="frutiger-btn frutiger-btn-primary"
                                    >
                                        Ajouter des vidéos
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className={`playlist-videos ${viewMode}-view`}>
                            {viewMode === 'list' ? (
                                <PlaylistVideoList
                                    videos={filteredAndSortedVideos}
                                    currentIndex={currentVideoIndex}
                                    isPlaying={isPlaying}
                                    canEdit={canEditPlaylist}
                                    onVideoSelect={handleVideoSelect}
                                    onVideoRemove={handleVideoRemove}
                                    onReorder={handleReorder}
                                />
                            ) : (
                                <PlaylistVideoGrid
                                    videos={filteredAndSortedVideos}
                                    currentIndex={currentVideoIndex}
                                    onVideoSelect={handleVideoSelect}
                                />
                            )}
                        </div>
                    )}
                </motion.section>

                {/* Modals */}
                <PlaylistEditModal
                    isOpen={isEditing}
                    onClose={() => setIsEditing(false)}
                    playlist={currentPlaylist}
                />

                <SharePlaylistModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    playlist={currentPlaylist}
                />

                <DeletePlaylistModal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    playlist={currentPlaylist}
                    onConfirm={handleDelete}
                />

                <AddVideoModal
                    isOpen={showAddVideoModal}
                    onClose={() => setShowAddVideoModal(false)}
                    playlistId={currentPlaylist.id}
                />
            </motion.div>
        </>
    );
};

/**
 * Liste des vidéos de la playlist
 */
const PlaylistVideoList = ({
                               videos,
                               currentIndex,
                               isPlaying,
                               canEdit,
                               onVideoSelect,
                               onVideoRemove,
                               onReorder
                           }) => {
    return (
        <DragDropContext onDragEnd={onReorder}>
            <Droppable droppableId="playlist-videos">
                {(provided) => (
                    <div
                        className="video-list"
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                    >
                        {videos.map((video, index) => (
                            <Draggable
                                key={video.id}
                                draggableId={video.id}
                                index={index}
                                isDragDisabled={!canEdit}
                            >
                                {(provided, snapshot) => (
                                    <PlaylistVideoItem
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        dragHandleProps={provided.dragHandleProps}
                                        video={video}
                                        index={index}
                                        isActive={index === currentIndex}
                                        isPlaying={isPlaying && index === currentIndex}
                                        canEdit={canEdit}
                                        isDragging={snapshot.isDragging}
                                        onSelect={() => onVideoSelect(index)}
                                        onRemove={() => onVideoRemove(video.id)}
                                    />
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
};

/**
 * Item de vidéo dans la liste
 */
const PlaylistVideoItem = React.forwardRef(({
                                                video,
                                                index,
                                                isActive,
                                                isPlaying,
                                                canEdit,
                                                isDragging,
                                                onSelect,
                                                onRemove,
                                                dragHandleProps,
                                                ...props
                                            }, ref) => {
    const [showActions, setShowActions] = useState(false);

    return (
        <div
            ref={ref}
            {...props}
            className={`playlist-video-item glass-card ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className="video-index">
                {isPlaying ? (
                    <div className="playing-indicator">
                        <div className="equalizer">
                            <div className="bar"></div>
                            <div className="bar"></div>
                            <div className="bar"></div>
                        </div>
                    </div>
                ) : (
                    <span>{index + 1}</span>
                )}
            </div>

            <div className="video-thumbnail" onClick={onSelect}>
                <img src={video.thumbnail} alt={video.title} />
                <div className="video-duration">
                    {formatDuration(video.duration)}
                </div>
                <div className="play-overlay">
                    <Play size={16} />
                </div>
            </div>

            <div className="video-info" onClick={onSelect}>
                <h4 className="video-title">{video.title}</h4>
                <div className="video-meta">
                    <Link to={`/user/${video.user.username}`} className="video-channel">
                        {video.user.username}
                    </Link>
                    <span>•</span>
                    <span>{formatCompactNumber(video.viewCount)} vues</span>
                    <span>•</span>
                    <span>{formatRelativeTime(video.createdAt)}</span>
                </div>
                <div className="video-added">
                    Ajoutée {formatRelativeTime(video.addedAt)}
                </div>
            </div>

            <div className="video-actions">
                <AnimatePresence>
                    {(showActions || isActive) && (
                        <motion.div
                            className="action-buttons"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                        >
                            <Link
                                to={`/video/${video.id}`}
                                className="frutiger-btn frutiger-btn-glass btn-small"
                            >
                                <ExternalLink size={14} />
                            </Link>

                            {canEdit && (
                                <>
                                    <button
                                        className="frutiger-btn frutiger-btn-glass btn-small drag-handle"
                                        {...dragHandleProps}
                                    >
                                        <MoreHorizontal size={14} />
                                    </button>

                                    <button
                                        onClick={onRemove}
                                        className="frutiger-btn frutiger-btn-glass btn-small text-red"
                                    >
                                        <Minus size={14} />
                                    </button>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
});

/**
 * Grille des vidéos de la playlist
 */
const PlaylistVideoGrid = ({ videos, currentIndex, onVideoSelect }) => {
    return (
        <div className="video-grid">
            {videos.map((video, index) => (
                <div
                    key={video.id}
                    className={`grid-video-item ${index === currentIndex ? 'active' : ''}`}
                >
                    <VideoCard
                        video={video}
                        size="medium"
                        showChannel={true}
                        showStats={true}
                        onClick={() => onVideoSelect(index)}
                        playlistIndex={index + 1}
                    />
                </div>
            ))}
        </div>
    );
};

/**
 * Modal d'édition de playlist
 */
const PlaylistEditModal = ({ isOpen, onClose, playlist }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Modifier la playlist" size="large">
            <PlaylistForm
                playlist={playlist}
                onSave={(updatedPlaylist) => {
                    // Traitement de la sauvegarde
                    onClose();
                }}
                onCancel={onClose}
                embedded={true}
            />
        </Modal>
    );
};

/**
 * Modal de partage de playlist
 */
const SharePlaylistModal = ({ isOpen, onClose, playlist }) => {
    const [copied, setCopied] = useState(false);
    const shareUrl = window.location.href;

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
        <Modal isOpen={isOpen} onClose={onClose} title="Partager la playlist" size="medium">
            <div className="share-modal-content">
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
                        {copied ? 'Copié !' : 'Copier'}
                    </button>
                </div>

                <div className="social-share">
                    <h4>Partager sur</h4>
                    <div className="social-buttons">
                        <button className="frutiger-btn frutiger-btn-secondary">Twitter</button>
                        <button className="frutiger-btn frutiger-btn-secondary">Facebook</button>
                        <button className="frutiger-btn frutiger-btn-secondary">LinkedIn</button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

/**
 * Modal de suppression de playlist
 */
const DeletePlaylistModal = ({ isOpen, onClose, playlist, onConfirm }) => {
    const [confirmText, setConfirmText] = useState('');
    const canDelete = confirmText === playlist?.title;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Supprimer la playlist" size="medium">
            <div className="delete-modal-content">
                <div className="warning-message">
                    <p>
                        ⚠️ Cette action est irréversible. La playlist "{playlist?.title}"
                        et toutes ses vidéos seront définitivement supprimées.
                    </p>
                </div>

                <div className="confirmation-input">
                    <label>
                        Pour confirmer, tapez le nom de la playlist :
                    </label>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder={playlist?.title}
                        className="frutiger-input"
                    />
                </div>

                <div className="modal-actions">
                    <button
                        onClick={onClose}
                        className="frutiger-btn frutiger-btn-secondary"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!canDelete}
                        className="frutiger-btn frutiger-btn-primary btn-danger"
                    >
                        Supprimer définitivement
                    </button>
                </div>
            </div>
        </Modal>
    );
};

/**
 * Modal d'ajout de vidéo
 */
const AddVideoModal = ({ isOpen, onClose, playlistId }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedVideos, setSelectedVideos] = useState(new Set());

    const { searchVideos } = useVideo();

    const handleSearch = async (term) => {
        if (!term.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const { data } = await searchVideos(term, { limit: 20 });
            setSearchResults(data?.videos || []);
        } catch (error) {
            console.error('Erreur de recherche:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleVideoToggle = (videoId) => {
        const newSelected = new Set(selectedVideos);
        if (newSelected.has(videoId)) {
            newSelected.delete(videoId);
        } else {
            newSelected.add(videoId);
        }
        setSelectedVideos(newSelected);
    };

    const handleAddVideos = async () => {
        try {
            // API call pour ajouter les vidéos sélectionnées
            onClose();
        } catch (error) {
            console.error('Erreur lors de l\'ajout:', error);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ajouter des vidéos" size="large">
            <div className="add-video-modal-content">
                <div className="search-section">
                    <div className="search-box">
                        <Search size={16} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                handleSearch(e.target.value);
                            }}
                            placeholder="Rechercher des vidéos à ajouter..."
                            className="frutiger-input"
                        />
                    </div>
                </div>

                <div className="search-results">
                    {isSearching ? (
                        <LoadingSpinner text="Recherche en cours..." />
                    ) : searchResults.length === 0 ? (
                        <div className="no-results">
                            <Search size={48} />
                            <p>Recherchez des vidéos à ajouter à votre playlist</p>
                        </div>
                    ) : (
                        <div className="results-grid">
                            {searchResults.map(video => (
                                <div
                                    key={video.id}
                                    className={`search-result-item ${selectedVideos.has(video.id) ? 'selected' : ''}`}
                                >
                                    <label className="video-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={selectedVideos.has(video.id)}
                                            onChange={() => handleVideoToggle(video.id)}
                                        />
                                        <VideoCard
                                            video={video}
                                            size="small"
                                            showChannel={true}
                                            interactive={false}
                                        />
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="modal-actions">
                    <button
                        onClick={onClose}
                        className="frutiger-btn frutiger-btn-secondary"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleAddVideos}
                        disabled={selectedVideos.size === 0}
                        className="frutiger-btn frutiger-btn-primary"
                    >
                        Ajouter {selectedVideos.size} vidéo{selectedVideos.size > 1 ? 's' : ''}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default PlaylistPage;