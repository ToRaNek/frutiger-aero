// frontend/src/pages/UploadPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
    Upload,
    Video,
    Image,
    File,
    X,
    Play,
    Pause,
    Edit3,
    Save,
    Eye,
    EyeOff,
    Calendar,
    Tag,
    Users,
    Globe,
    Lock,
    Clock,
    Check,
    AlertCircle,
    Info,
    Trash2,
    Plus,
    Settings,
    Zap,
    Star,
    Heart,
    Share2,
    Download,
    RotateCcw,
    Crop,
    Palette,
    Volume2,
    VolumeX,
    FastForward,
    Rewind,
    SkipBack,
    SkipForward
} from 'lucide-react';

// Components
import VideoUpload from '../components/video/VideoUpload';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';

// Hooks
import { useAuth } from '../hooks/useAuth';
import { useVideo } from '../hooks/useVideo';

// Utils
import {
    formatFileSize,
    formatDuration,
    formatRelativeTime
} from '../utils/formatters';
import {
    isValidVideoFile,
    isValidImageFile,
    generateSafeFilename
} from '../utils/helpers';

/**
 * Page d'upload de vidéo avec éditeur et paramètres avancés
 */
const UploadPage = () => {
    // Navigation
    const navigate = useNavigate();

    // États principaux
    const [currentStep, setCurrentStep] = useState('upload'); // upload, details, processing, complete
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
    const [showPreview, setShowPreview] = useState(false);
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

    // États des métadonnées
    const [videoDetails, setVideoDetails] = useState({
        title: '',
        description: '',
        tags: [],
        category: '',
        thumbnail: null,
        customThumbnail: null,
        isPrivate: false,
        allowComments: true,
        allowDownload: false,
        scheduledDate: null,
        monetization: false,
        ageRestriction: false,
        language: 'fr',
        captions: []
    });

    // États de l'interface
    const [dragActive, setDragActive] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const [processingStatus, setProcessingStatus] = useState({});
    const [errors, setErrors] = useState({});
    const [showErrorModal, setShowErrorModal] = useState(false);

    // Hooks
    const { user } = useAuth();
    const { uploadVideo, categories, isLoading } = useVideo();

    // Vérification des permissions
    useEffect(() => {
        if (!user) {
            navigate('/login', { state: { from: location } });
            return;
        }

        // Vérifier si l'utilisateur peut uploader
        if (!user.canUpload) {
            navigate('/', {
                state: {
                    message: 'Vous n\'avez pas les permissions pour uploader des vidéos.'
                }
            });
            return;
        }
    }, [user, navigate]);

    // Étapes du processus d'upload
    const uploadSteps = [
        {
            id: 'upload',
            title: 'Upload',
            description: 'Sélectionnez vos fichiers vidéo',
            icon: Upload,
            completed: uploadedFiles.length > 0
        },
        {
            id: 'details',
            title: 'Détails',
            description: 'Ajoutez titre, description et métadonnées',
            icon: Edit3,
            completed: currentStep === 'processing' || currentStep === 'complete'
        },
        {
            id: 'processing',
            title: 'Traitement',
            description: 'Traitement et optimisation des vidéos',
            icon: Settings,
            completed: currentStep === 'complete'
        },
        {
            id: 'complete',
            title: 'Terminé',
            description: 'Upload terminé avec succès',
            icon: Check,
            completed: currentStep === 'complete'
        }
    ];

    // Catégories disponibles
    const videoCategories = [
        { value: '', label: 'Sélectionner une catégorie' },
        { value: 'tech', label: 'Technologie' },
        { value: 'music', label: 'Musique' },
        { value: 'gaming', label: 'Gaming' },
        { value: 'art', label: 'Art & Design' },
        { value: 'education', label: 'Éducation' },
        { value: 'entertainment', label: 'Divertissement' },
        { value: 'sports', label: 'Sports' },
        { value: 'cooking', label: 'Cuisine' },
        { value: 'travel', label: 'Voyage' },
        { value: 'lifestyle', label: 'Style de vie' }
    ];

    // Langues disponibles
    const languages = [
        { value: 'fr', label: 'Français' },
        { value: 'en', label: 'Anglais' },
        { value: 'es', label: 'Espagnol' },
        { value: 'de', label: 'Allemand' },
        { value: 'it', label: 'Italien' },
        { value: 'pt', label: 'Portugais' }
    ];

    // Fichier actuel
    const currentFile = uploadedFiles[currentFileIndex];

    // Gestion du drag & drop
    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const files = Array.from(e.dataTransfer.files);
        handleFilesSelected(files);
    }, []);

    // Gestion de la sélection de fichiers
    const handleFilesSelected = useCallback((files) => {
        const validFiles = [];
        const fileErrors = {};

        files.forEach((file, index) => {
            const validation = isValidVideoFile(file);

            if (validation.isValid) {
                const fileData = {
                    id: `file-${Date.now()}-${index}`,
                    file,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    url: URL.createObjectURL(file),
                    duration: null,
                    thumbnail: null,
                    metadata: {
                        title: file.name.replace(/\.[^/.]+$/, ""),
                        description: '',
                        tags: [],
                        category: '',
                        isPrivate: false
                    },
                    uploadProgress: 0,
                    uploadStatus: 'pending' // pending, uploading, processing, completed, error
                };
                validFiles.push(fileData);
            } else {
                fileErrors[file.name] = validation.error;
            }
        });

        if (Object.keys(fileErrors).length > 0) {
            setErrors(fileErrors);
            setShowErrorModal(true);
        }

        if (validFiles.length > 0) {
            setUploadedFiles(prev => [...prev, ...validFiles]);
            if (currentStep === 'upload' && validFiles.length > 0) {
                setCurrentStep('details');
            }
        }
    }, [currentStep]);

    // Suppression d'un fichier
    const handleRemoveFile = useCallback((fileId) => {
        setUploadedFiles(prev => {
            const newFiles = prev.filter(f => f.id !== fileId);
            if (newFiles.length === 0) {
                setCurrentStep('upload');
                setCurrentFileIndex(0);
            } else if (currentFileIndex >= newFiles.length) {
                setCurrentFileIndex(newFiles.length - 1);
            }
            return newFiles;
        });
    }, [currentFileIndex]);

    // Mise à jour des métadonnées d'une vidéo
    const handleUpdateVideoDetails = useCallback((fileId, updates) => {
        setUploadedFiles(prev =>
            prev.map(file =>
                file.id === fileId
                    ? { ...file, metadata: { ...file.metadata, ...updates } }
                    : file
            )
        );
    }, []);

    // Upload des miniatures personnalisées
    const handleThumbnailUpload = useCallback((fileId, thumbnailFile) => {
        const validation = isValidImageFile(thumbnailFile);

        if (!validation.isValid) {
            setErrors(prev => ({ ...prev, thumbnail: validation.error }));
            return;
        }

        const thumbnailUrl = URL.createObjectURL(thumbnailFile);

        setUploadedFiles(prev =>
            prev.map(file =>
                file.id === fileId
                    ? { ...file, customThumbnail: thumbnailUrl, thumbnailFile }
                    : file
            )
        );
    }, []);

    // Ajout de tags
    const handleAddTag = useCallback((tag) => {
        if (!tag.trim()) return;

        const currentTags = currentFile?.metadata?.tags || [];
        if (currentTags.includes(tag.trim())) return;

        handleUpdateVideoDetails(currentFile.id, {
            tags: [...currentTags, tag.trim()]
        });
    }, [currentFile, handleUpdateVideoDetails]);

    // Suppression de tag
    const handleRemoveTag = useCallback((tagToRemove) => {
        const currentTags = currentFile?.metadata?.tags || [];
        handleUpdateVideoDetails(currentFile.id, {
            tags: currentTags.filter(tag => tag !== tagToRemove)
        });
    }, [currentFile, handleUpdateVideoDetails]);

    // Validation du formulaire
    const validateForm = useCallback(() => {
        const formErrors = {};

        if (!currentFile) return false;

        const metadata = currentFile.metadata;

        if (!metadata.title?.trim()) {
            formErrors.title = 'Le titre est requis';
        }

        if (!metadata.description?.trim()) {
            formErrors.description = 'La description est requise';
        }

        if (!metadata.category) {
            formErrors.category = 'La catégorie est requise';
        }

        if (metadata.tags.length === 0) {
            formErrors.tags = 'Au moins un tag est requis';
        }

        setErrors(formErrors);
        return Object.keys(formErrors).length === 0;
    }, [currentFile]);

    // Début de l'upload
    const handleStartUpload = useCallback(async () => {
        if (!validateForm()) return;

        setCurrentStep('processing');

        try {
            for (const fileData of uploadedFiles) {
                // Mettre à jour le statut
                setUploadedFiles(prev =>
                    prev.map(f =>
                        f.id === fileData.id
                            ? { ...f, uploadStatus: 'uploading' }
                            : f
                    )
                );

                // Préparer les données pour l'upload
                const uploadData = {
                    file: fileData.file,
                    title: fileData.metadata.title,
                    description: fileData.metadata.description,
                    category: fileData.metadata.category,
                    tags: fileData.metadata.tags,
                    isPrivate: fileData.metadata.isPrivate,
                    thumbnail: fileData.thumbnailFile,
                    allowComments: fileData.metadata.allowComments,
                    allowDownload: fileData.metadata.allowDownload,
                    scheduledDate: fileData.metadata.scheduledDate,
                    language: fileData.metadata.language
                };

                // Fonction de progression
                const onProgress = (progress) => {
                    setUploadProgress(prev => ({
                        ...prev,
                        [fileData.id]: progress
                    }));
                };

                // Upload de la vidéo
                const result = await uploadVideo(uploadData, onProgress);

                // Mettre à jour le statut de succès
                setUploadedFiles(prev =>
                    prev.map(f =>
                        f.id === fileData.id
                            ? {
                                ...f,
                                uploadStatus: 'completed',
                                videoId: result.data.id,
                                videoUrl: result.data.url
                            }
                            : f
                    )
                );
            }

            setCurrentStep('complete');

        } catch (error) {
            console.error('Erreur lors de l\'upload:', error);
            setErrors({ upload: 'Erreur lors de l\'upload des vidéos' });
            setShowErrorModal(true);
        }
    }, [uploadedFiles, validateForm, uploadVideo]);

    // Navigation entre les fichiers
    const handlePrevFile = () => {
        setCurrentFileIndex(prev => Math.max(0, prev - 1));
    };

    const handleNextFile = () => {
        setCurrentFileIndex(prev => Math.min(uploadedFiles.length - 1, prev + 1));
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

    const stepVariants = {
        hidden: { opacity: 0, x: 100 },
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -100 }
    };

    return (
        <>
            <Helmet>
                <title>Upload - Frutiger Streaming</title>
                <meta name="description" content="Uploadez et partagez vos vidéos sur Frutiger Streaming" />
                <meta name="robots" content="noindex" />
            </Helmet>

            <motion.div
                className="upload-page"
                variants={pageVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Header avec progression */}
                <motion.section
                    className="upload-header glass-panel"
                    variants={itemVariants}
                >
                    <div className="upload-progress-bar">
                        {uploadSteps.map((step, index) => (
                            <div
                                key={step.id}
                                className={`progress-step ${
                                    currentStep === step.id ? 'active' : ''
                                } ${step.completed ? 'completed' : ''}`}
                            >
                                <div className="step-icon">
                                    <step.icon size={20} />
                                </div>
                                <div className="step-info">
                                    <h4>{step.title}</h4>
                                    <p>{step.description}</p>
                                </div>
                                {index < uploadSteps.length - 1 && (
                                    <div className="step-connector" />
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="upload-stats">
                        <div className="stat-item">
                            <span className="stat-number">{uploadedFiles.length}</span>
                            <span className="stat-label">Fichier{uploadedFiles.length > 1 ? 's' : ''}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">
                                {formatFileSize(uploadedFiles.reduce((acc, file) => acc + file.size, 0))}
                            </span>
                            <span className="stat-label">Taille totale</span>
                        </div>
                    </div>
                </motion.section>

                {/* Contenu principal selon l'étape */}
                <motion.section
                    className="upload-content"
                    variants={itemVariants}
                >
                    <AnimatePresence mode="wait">
                        {currentStep === 'upload' && (
                            <UploadStep
                                key="upload"
                                dragActive={dragActive}
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onFilesSelected={handleFilesSelected}
                                uploadedFiles={uploadedFiles}
                                onRemoveFile={handleRemoveFile}
                                onNextStep={() => setCurrentStep('details')}
                            />
                        )}

                        {currentStep === 'details' && (
                            <DetailsStep
                                key="details"
                                files={uploadedFiles}
                                currentFileIndex={currentFileIndex}
                                onPrevFile={handlePrevFile}
                                onNextFile={handleNextFile}
                                onUpdateDetails={handleUpdateVideoDetails}
                                onThumbnailUpload={handleThumbnailUpload}
                                onAddTag={handleAddTag}
                                onRemoveTag={handleRemoveTag}
                                categories={videoCategories}
                                languages={languages}
                                errors={errors}
                                onStartUpload={handleStartUpload}
                                showAdvanced={showAdvancedSettings}
                                onToggleAdvanced={() => setShowAdvancedSettings(!showAdvancedSettings)}
                            />
                        )}

                        {currentStep === 'processing' && (
                            <ProcessingStep
                                key="processing"
                                files={uploadedFiles}
                                uploadProgress={uploadProgress}
                                processingStatus={processingStatus}
                            />
                        )}

                        {currentStep === 'complete' && (
                            <CompleteStep
                                key="complete"
                                files={uploadedFiles}
                                onViewVideo={(videoId) => navigate(`/video/${videoId}`)}
                                onUploadMore={() => {
                                    setCurrentStep('upload');
                                    setUploadedFiles([]);
                                    setCurrentFileIndex(0);
                                }}
                            />
                        )}
                    </AnimatePresence>
                </motion.section>

                {/* Modal d'erreur */}
                <ErrorModal
                    isOpen={showErrorModal}
                    onClose={() => setShowErrorModal(false)}
                    errors={errors}
                />
            </motion.div>
        </>
    );
};

/**
 * Étape 1: Upload des fichiers
 */
const UploadStep = ({
                        dragActive,
                        onDragEnter,
                        onDragLeave,
                        onDragOver,
                        onDrop,
                        onFilesSelected,
                        uploadedFiles,
                        onRemoveFile,
                        onNextStep
                    }) => {
    const fileInputRef = React.useRef(null);

    const handleFileInputChange = (e) => {
        const files = Array.from(e.target.files);
        onFilesSelected(files);
    };

    return (
        <motion.div
            className="upload-step"
            variants={{ hidden: { opacity: 0, x: 100 }, visible: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -100 } }}
            initial="hidden"
            animate="visible"
            exit="exit"
        >
            <div className="upload-zone-container">
                <div
                    className={`upload-zone glass-panel ${dragActive ? 'drag-active' : ''}`}
                    onDragEnter={onDragEnter}
                    onDragLeave={onDragLeave}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="upload-zone-content">
                        <div className="upload-icon">
                            <Upload size={64} />
                        </div>
                        <h2>Glissez vos vidéos ici</h2>
                        <p>ou cliquez pour sélectionner des fichiers</p>
                        <div className="upload-formats">
                            <span>Formats supportés: MP4, MOV, AVI, MKV, WebM</span>
                            <span>Taille max: 5GB par fichier</span>
                        </div>
                        <button className="frutiger-btn frutiger-btn-primary select-files-btn">
                            <Plus size={16} />
                            Sélectionner les fichiers
                        </button>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="video/*"
                        onChange={handleFileInputChange}
                        style={{ display: 'none' }}
                    />
                </div>

                {/* Liste des fichiers uploadés */}
                {uploadedFiles.length > 0 && (
                    <div className="uploaded-files-list">
                        <h3>Fichiers sélectionnés ({uploadedFiles.length})</h3>
                        <div className="files-grid">
                            {uploadedFiles.map((file) => (
                                <div key={file.id} className="file-item glass-card">
                                    <div className="file-thumbnail">
                                        <video
                                            src={file.url}
                                            className="thumbnail-video"
                                            muted
                                        />
                                        <div className="file-overlay">
                                            <Play size={24} />
                                        </div>
                                    </div>
                                    <div className="file-info">
                                        <h4 className="file-name">{file.name}</h4>
                                        <div className="file-meta">
                                            <span>{formatFileSize(file.size)}</span>
                                            <span>•</span>
                                            <span>{file.type}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onRemoveFile(file.id)}
                                        className="remove-file-btn frutiger-btn frutiger-btn-glass btn-small"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="step-actions">
                            <button
                                onClick={onNextStep}
                                className="frutiger-btn frutiger-btn-primary"
                            >
                                Continuer vers les détails
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

/**
 * Étape 2: Détails et métadonnées
 */
const DetailsStep = ({
                         files,
                         currentFileIndex,
                         onPrevFile,
                         onNextFile,
                         onUpdateDetails,
                         onThumbnailUpload,
                         onAddTag,
                         onRemoveTag,
                         categories,
                         languages,
                         errors,
                         onStartUpload,
                         showAdvanced,
                         onToggleAdvanced
                     }) => {
    const currentFile = files[currentFileIndex];
    const [newTag, setNewTag] = useState('');

    if (!currentFile) return null;

    const handleTagSubmit = (e) => {
        e.preventDefault();
        if (newTag.trim()) {
            onAddTag(newTag);
            setNewTag('');
        }
    };

    return (
        <motion.div
            className="details-step"
            variants={{ hidden: { opacity: 0, x: 100 }, visible: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -100 } }}
            initial="hidden"
            animate="visible"
            exit="exit"
        >
            <div className="details-container">
                {/* Navigation entre fichiers */}
                {files.length > 1 && (
                    <div className="file-navigation glass-panel">
                        <button
                            onClick={onPrevFile}
                            disabled={currentFileIndex === 0}
                            className="frutiger-btn frutiger-btn-glass"
                        >
                            <SkipBack size={16} />
                            Précédent
                        </button>

                        <div className="file-counter">
                            {currentFileIndex + 1} / {files.length}
                        </div>

                        <button
                            onClick={onNextFile}
                            disabled={currentFileIndex === files.length - 1}
                            className="frutiger-btn frutiger-btn-glass"
                        >
                            Suivant
                            <SkipForward size={16} />
                        </button>
                    </div>
                )}

                <div className="details-content">
                    {/* Preview vidéo */}
                    <div className="video-preview glass-panel">
                        <div className="preview-container">
                            <video
                                src={currentFile.url}
                                controls
                                className="preview-video"
                            />

                            {/* Sélection de miniature */}
                            <div className="thumbnail-selector">
                                <h4>Miniature</h4>
                                <div className="thumbnail-options">
                                    <div className="auto-thumbnails">
                                        {/* Miniatures automatiques générées */}
                                        {Array.from({ length: 3 }, (_, i) => (
                                            <button
                                                key={i}
                                                className="thumbnail-option"
                                                onClick={() => {/* Sélectionner miniature auto */}}
                                            >
                                                <img
                                                    src={`${currentFile.url}#t=${(i + 1) * 10}`}
                                                    alt={`Miniature ${i + 1}`}
                                                />
                                            </button>
                                        ))}
                                    </div>

                                    <div className="custom-thumbnail">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) onThumbnailUpload(currentFile.id, file);
                                            }}
                                            style={{ display: 'none' }}
                                            id="thumbnail-upload"
                                        />
                                        <label
                                            htmlFor="thumbnail-upload"
                                            className="frutiger-btn frutiger-btn-glass"
                                        >
                                            <Upload size={16} />
                                            Miniature personnalisée
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Formulaire de détails */}
                    <div className="details-form glass-panel">
                        <h3>Détails de la vidéo</h3>

                        <div className="form-group">
                            <label>Titre *</label>
                            <input
                                type="text"
                                value={currentFile.metadata.title}
                                onChange={(e) => onUpdateDetails(currentFile.id, { title: e.target.value })}
                                className={`frutiger-input ${errors.title ? 'error' : ''}`}
                                placeholder="Titre de votre vidéo"
                                maxLength={100}
                            />
                            {errors.title && <span className="error-text">{errors.title}</span>}
                            <span className="char-count">{currentFile.metadata.title.length}/100</span>
                        </div>

                        <div className="form-group">
                            <label>Description *</label>
                            <textarea
                                value={currentFile.metadata.description}
                                onChange={(e) => onUpdateDetails(currentFile.id, { description: e.target.value })}
                                className={`frutiger-input ${errors.description ? 'error' : ''}`}
                                placeholder="Décrivez votre vidéo..."
                                rows={4}
                                maxLength={5000}
                            />
                            {errors.description && <span className="error-text">{errors.description}</span>}
                            <span className="char-count">{currentFile.metadata.description.length}/5000</span>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Catégorie *</label>
                                <select
                                    value={currentFile.metadata.category}
                                    onChange={(e) => onUpdateDetails(currentFile.id, { category: e.target.value })}
                                    className={`frutiger-input ${errors.category ? 'error' : ''}`}
                                >
                                    {categories.map(cat => (
                                        <option key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.category && <span className="error-text">{errors.category}</span>}
                            </div>

                            <div className="form-group">
                                <label>Langue</label>
                                <select
                                    value={currentFile.metadata.language}
                                    onChange={(e) => onUpdateDetails(currentFile.id, { language: e.target.value })}
                                    className="frutiger-input"
                                >
                                    {languages.map(lang => (
                                        <option key={lang.value} value={lang.value}>
                                            {lang.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="form-group">
                            <label>Tags *</label>
                            <form onSubmit={handleTagSubmit} className="tag-input-form">
                                <input
                                    type="text"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    className="frutiger-input"
                                    placeholder="Ajouter un tag..."
                                />
                                <button
                                    type="submit"
                                    className="frutiger-btn frutiger-btn-primary btn-small"
                                >
                                    <Plus size={16} />
                                </button>
                            </form>

                            {currentFile.metadata.tags.length > 0 && (
                                <div className="tags-list">
                                    {currentFile.metadata.tags.map((tag, index) => (
                                        <span key={index} className="tag-item frutiger-badge">
                                            {tag}
                                            <button
                                                onClick={() => onRemoveTag(tag)}
                                                className="tag-remove"
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            {errors.tags && <span className="error-text">{errors.tags}</span>}
                        </div>

                        {/* Paramètres de base */}
                        <div className="basic-settings">
                            <div className="setting-group">
                                <label className="setting-toggle">
                                    <input
                                        type="checkbox"
                                        checked={currentFile.metadata.isPrivate}
                                        onChange={(e) => onUpdateDetails(currentFile.id, { isPrivate: e.target.checked })}
                                    />
                                    <span className="toggle-slider"></span>
                                    <div className="setting-info">
                                        <span className="setting-title">Vidéo privée</span>
                                        <span className="setting-description">Seul vous pourrez voir cette vidéo</span>
                                    </div>
                                </label>
                            </div>

                            <div className="setting-group">
                                <label className="setting-toggle">
                                    <input
                                        type="checkbox"
                                        checked={currentFile.metadata.allowComments}
                                        onChange={(e) => onUpdateDetails(currentFile.id, { allowComments: e.target.checked })}
                                    />
                                    <span className="toggle-slider"></span>
                                    <div className="setting-info">
                                        <span className="setting-title">Autoriser les commentaires</span>
                                        <span className="setting-description">Les utilisateurs peuvent commenter</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Paramètres avancés */}
                        <button
                            onClick={onToggleAdvanced}
                            className="frutiger-btn frutiger-btn-glass advanced-toggle"
                        >
                            <Settings size={16} />
                            Paramètres avancés
                            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        <AnimatePresence>
                            {showAdvanced && (
                                <motion.div
                                    className="advanced-settings"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    <div className="setting-group">
                                        <label className="setting-toggle">
                                            <input
                                                type="checkbox"
                                                checked={currentFile.metadata.allowDownload}
                                                onChange={(e) => onUpdateDetails(currentFile.id, { allowDownload: e.target.checked })}
                                            />
                                            <span className="toggle-slider"></span>
                                            <div className="setting-info">
                                                <span className="setting-title">Autoriser le téléchargement</span>
                                                <span className="setting-description">Les utilisateurs peuvent télécharger</span>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="form-group">
                                        <label>Publication programmée</label>
                                        <input
                                            type="datetime-local"
                                            value={currentFile.metadata.scheduledDate || ''}
                                            onChange={(e) => onUpdateDetails(currentFile.id, { scheduledDate: e.target.value })}
                                            className="frutiger-input"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Actions */}
                        <div className="form-actions">
                            <button
                                onClick={() => window.history.back()}
                                className="frutiger-btn frutiger-btn-secondary"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={onStartUpload}
                                className="frutiger-btn frutiger-btn-primary"
                            >
                                <Upload size={16} />
                                Publier {files.length > 1 ? `${files.length} vidéos` : 'la vidéo'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

/**
 * Étape 3: Traitement
 */
const ProcessingStep = ({ files, uploadProgress, processingStatus }) => {
    const totalProgress = useMemo(() => {
        const progressValues = Object.values(uploadProgress);
        return progressValues.length > 0
            ? progressValues.reduce((acc, val) => acc + val, 0) / progressValues.length
            : 0;
    }, [uploadProgress]);

    return (
        <motion.div
            className="processing-step"
            variants={{ hidden: { opacity: 0, x: 100 }, visible: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -100 } }}
            initial="hidden"
            animate="visible"
            exit="exit"
        >
            <div className="processing-container glass-panel">
                <div className="processing-header">
                    <div className="processing-icon">
                        <div className="frutiger-loading-aurora"></div>
                    </div>
                    <h2>Traitement en cours...</h2>
                    <p>Vos vidéos sont en cours d'upload et de traitement. Cela peut prendre quelques minutes.</p>
                </div>

                <div className="overall-progress">
                    <div className="progress-info">
                        <span>Progression globale</span>
                        <span>{Math.round(totalProgress)}%</span>
                    </div>
                    <div className="frutiger-progress">
                        <div
                            className="frutiger-progress-bar"
                            style={{ width: `${totalProgress}%` }}
                        />
                    </div>
                </div>

                <div className="files-progress">
                    {files.map((file) => (
                        <div key={file.id} className="file-progress-item">
                            <div className="file-info">
                                <div className="file-thumbnail">
                                    <video src={file.url} />
                                </div>
                                <div className="file-details">
                                    <h4>{file.metadata.title}</h4>
                                    <span>{formatFileSize(file.size)}</span>
                                </div>
                            </div>

                            <div className="file-progress">
                                <div className="progress-status">
                                    <span className={`status-badge ${file.uploadStatus}`}>
                                        {file.uploadStatus === 'uploading' && <Upload size={14} />}
                                        {file.uploadStatus === 'processing' && <Settings size={14} />}
                                        {file.uploadStatus === 'completed' && <Check size={14} />}
                                        {file.uploadStatus === 'error' && <AlertCircle size={14} />}
                                        {file.uploadStatus.charAt(0).toUpperCase() + file.uploadStatus.slice(1)}
                                    </span>
                                    <span>{Math.round(uploadProgress[file.id] || 0)}%</span>
                                </div>
                                <div className="frutiger-progress">
                                    <div
                                        className="frutiger-progress-bar"
                                        style={{ width: `${uploadProgress[file.id] || 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="processing-tips">
                    <h4>Pendant le traitement...</h4>
                    <ul>
                        <li>✓ Optimisation de la qualité vidéo</li>
                        <li>✓ Génération des miniatures</li>
                        <li>✓ Création des versions multi-qualité</li>
                        <li>✓ Indexation pour la recherche</li>
                    </ul>
                    <p><Info size={16} /> Vous pouvez fermer cette page, vous recevrez une notification à la fin du traitement.</p>
                </div>
            </div>
        </motion.div>
    );
};

/**
 * Étape 4: Terminé
 */
const CompleteStep = ({ files, onViewVideo, onUploadMore }) => {
    return (
        <motion.div
            className="complete-step"
            variants={{ hidden: { opacity: 0, x: 100 }, visible: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -100 } }}
            initial="hidden"
            animate="visible"
            exit="exit"
        >
            <div className="complete-container glass-panel">
                <div className="success-header">
                    <div className="success-icon">
                        <Check size={64} />
                    </div>
                    <h2>Upload terminé avec succès !</h2>
                    <p>
                        {files.length === 1
                            ? 'Votre vidéo a été publiée avec succès.'
                            : `Vos ${files.length} vidéos ont été publiées avec succès.`
                        }
                    </p>
                </div>

                <div className="uploaded-videos">
                    {files.map((file) => (
                        <div key={file.id} className="uploaded-video-item glass-card">
                            <div className="video-thumbnail">
                                <video src={file.url} />
                                <div className="video-overlay">
                                    <Play size={24} />
                                </div>
                            </div>
                            <div className="video-info">
                                <h4>{file.metadata.title}</h4>
                                <div className="video-meta">
                                    <span>{formatFileSize(file.size)}</span>
                                    <span>•</span>
                                    <span>{file.metadata.isPrivate ? 'Privée' : 'Publique'}</span>
                                </div>
                                <div className="video-tags">
                                    {file.metadata.tags.slice(0, 3).map(tag => (
                                        <span key={tag} className="frutiger-badge frutiger-badge-secondary">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="video-actions">
                                <button
                                    onClick={() => onViewVideo(file.videoId)}
                                    className="frutiger-btn frutiger-btn-primary"
                                >
                                    <Eye size={16} />
                                    Voir
                                </button>
                                <button className="frutiger-btn frutiger-btn-glass">
                                    <Share2 size={16} />
                                    Partager
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="complete-actions">
                    <button
                        onClick={onUploadMore}
                        className="frutiger-btn frutiger-btn-secondary"
                    >
                        <Plus size={16} />
                        Uploader d'autres vidéos
                    </button>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="frutiger-btn frutiger-btn-primary"
                    >
                        Retour à l'accueil
                    </button>
                </div>

                <div className="next-steps">
                    <h4>Prochaines étapes</h4>
                    <div className="next-steps-grid">
                        <div className="next-step-item">
                            <Users size={24} />
                            <h5>Promouvoir vos vidéos</h5>
                            <p>Partagez sur les réseaux sociaux pour toucher plus d'audience</p>
                        </div>
                        <div className="next-step-item">
                            <TrendingUp size={24} />
                            <h5>Analyser les performances</h5>
                            <p>Consultez les analytics pour comprendre votre audience</p>
                        </div>
                        <div className="next-step-item">
                            <Heart size={24} />
                            <h5>Interagir avec la communauté</h5>
                            <p>Répondez aux commentaires et créez de l'engagement</p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

/**
 * Modal d'erreur
 */
const ErrorModal = ({ isOpen, onClose, errors }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Erreurs détectées" size="medium">
            <div className="error-modal-content">
                <div className="error-icon">
                    <AlertCircle size={32} />
                </div>
                <div className="error-list">
                    {Object.entries(errors).map(([key, error]) => (
                        <div key={key} className="error-item">
                            <strong>{key}:</strong> {error}
                        </div>
                    ))}
                </div>
                <div className="modal-actions">
                    <button
                        onClick={onClose}
                        className="frutiger-btn frutiger-btn-primary"
                    >
                        Compris
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default UploadPage;