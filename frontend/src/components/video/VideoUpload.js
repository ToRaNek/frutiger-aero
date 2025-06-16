// frontend/src/components/video/VideoUpload.js

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Upload, Video, Image, X, Play, Pause, Check,
    AlertCircle, FileVideo, Eye, Settings, Save,
    Clock, HardDrive, Wifi, ChevronDown
} from 'lucide-react';
import { useVideoUploadWithProgress } from '../../hooks/useVideo';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal, { useModal } from '../common/Modal';
import {
    VIDEO_CONFIG,
    IMAGE_CONFIG,
    VIDEO_CATEGORIES,
    UPLOAD_STATES,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES
} from '../../utils/constants';
import {
    formatFileSize,
    formatDuration,
    formatUploadProgress,
    formatUploadSpeed,
    formatUploadTimeRemaining
} from '../../utils/formatters';
import {
    isValidVideoFile,
    isValidImageFile,
    generateSafeFilename,
    readFileAsDataURL,
    resizeImage
} from '../../utils/helpers';

/**
 * Composant d'upload de vidéo avec preview et design Frutiger Aero
 *
 * Props:
 * - onUploadComplete: function - Callback de fin d'upload
 * - onUploadError: function - Callback d'erreur
 * - allowMultiple: boolean - Autoriser plusieurs fichiers
 * - maxFiles: number - Nombre max de fichiers
 * - autoStart: boolean - Démarrer automatiquement l'upload
 * - showPreview: boolean - Afficher la preview
 * - showProgress: boolean - Afficher la progression
 * - acceptedFormats: array - Formats acceptés
 * - maxFileSize: number - Taille max par fichier
 */

const VideoUpload = ({
                         onUploadComplete,
                         onUploadError,
                         allowMultiple = false,
                         maxFiles = 1,
                         autoStart = true,
                         showPreview = true,
                         showProgress = true,
                         acceptedFormats = VIDEO_CONFIG.ALLOWED_MIME_TYPES,
                         maxFileSize = VIDEO_CONFIG.MAX_FILE_SIZE
                     }) => {
    // État local
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadQueue, setUploadQueue] = useState([]);
    const [currentUpload, setCurrentUpload] = useState(null);
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    const [uploadSettings, setUploadSettings] = useState({
        quality: 'auto',
        privacy: 'public',
        allowComments: true,
        allowDownloads: false,
        category: VIDEO_CATEGORIES.ENTERTAINMENT,
        tags: [],
        schedule: null
    });

    // Refs
    const fileInputRef = useRef(null);
    const previewRef = useRef(null);

    // Hooks
    const { user } = useAuth();
    const {
        uploadVideo,
        uploadQueue: hookUploadQueue,
        removeFromQueue,
        canUpload
    } = useVideoUploadWithProgress();

    const {
        isOpen: isPreviewOpen,
        openModal: openPreview,
        closeModal: closePreview
    } = useModal();

    // Configuration du dropzone
    const {
        getRootProps,
        getInputProps,
        isDragActive,
        isDragReject,
        fileRejections
    } = useDropzone({
        accept: {
            'video/*': acceptedFormats
        },
        maxFiles: allowMultiple ? maxFiles : 1,
        maxSize: maxFileSize,
        multiple: allowMultiple,
        onDrop: handleFileDrop,
        onDropRejected: handleDropRejected,
        disabled: !canUpload
    });

    // Gestion des fichiers droppés
    function handleFileDrop(acceptedFiles) {
        const validFiles = [];
        const errors = [];

        acceptedFiles.forEach(file => {
            const validation = isValidVideoFile(file);
            if (validation.valid) {
                const fileWithMetadata = {
                    id: generateSafeFilename(file.name),
                    file,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    preview: null,
                    metadata: {
                        title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
                        description: '',
                        category: uploadSettings.category,
                        tags: [],
                        thumbnail: null,
                        isPrivate: uploadSettings.privacy === 'private'
                    },
                    status: UPLOAD_STATES.IDLE,
                    progress: 0,
                    error: null
                };
                validFiles.push(fileWithMetadata);
            } else {
                errors.push({ file: file.name, error: validation.error });
            }
        });

        if (validFiles.length > 0) {
            setSelectedFiles(prev => [...prev, ...validFiles]);

            // Générer les previews
            validFiles.forEach(generatePreview);

            if (autoStart) {
                validFiles.forEach(startUpload);
            }
        }

        if (errors.length > 0) {
            onUploadError?.(errors);
        }
    }

    // Gestion des fichiers rejetés
    function handleDropRejected(rejections) {
        const errors = rejections.map(rejection => ({
            file: rejection.file.name,
            error: rejection.errors.map(err => err.message).join(', ')
        }));
        onUploadError?.(errors);
    }

    // Génération de preview vidéo
    const generatePreview = useCallback(async (fileData) => {
        try {
            const video = document.createElement('video');
            const url = URL.createObjectURL(fileData.file);

            video.src = url;
            video.currentTime = 5; // Capture à 5 secondes

            await new Promise((resolve, reject) => {
                video.onloadedmetadata = () => {
                    // Mise à jour des métadonnées
                    setSelectedFiles(prev => prev.map(f =>
                        f.id === fileData.id
                            ? {
                                ...f,
                                metadata: {
                                    ...f.metadata,
                                    duration: video.duration,
                                    width: video.videoWidth,
                                    height: video.videoHeight
                                }
                            }
                            : f
                    ));
                    resolve();
                };
                video.onerror = reject;
            });

            // Capture de la preview
            await new Promise(resolve => {
                video.onseeked = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    canvas.width = 320;
                    canvas.height = (video.videoHeight / video.videoWidth) * 320;

                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    canvas.toBlob(blob => {
                        const previewUrl = URL.createObjectURL(blob);
                        setSelectedFiles(prev => prev.map(f =>
                            f.id === fileData.id ? { ...f, preview: previewUrl } : f
                        ));
                        resolve();
                    }, 'image/jpeg', 0.8);
                };
            });

            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Erreur génération preview:', error);
        }
    }, []);

    // Démarrage de l'upload
    const startUpload = async (fileData) => {
        try {
            setSelectedFiles(prev => prev.map(f =>
                f.id === fileData.id
                    ? { ...f, status: UPLOAD_STATES.UPLOADING }
                    : f
            ));

            const uploadData = {
                file: fileData.file,
                title: fileData.metadata.title,
                description: fileData.metadata.description,
                category: fileData.metadata.category,
                tags: fileData.metadata.tags,
                thumbnail: fileData.metadata.thumbnail,
                isPrivate: fileData.metadata.isPrivate,
                allowComments: uploadSettings.allowComments,
                allowDownloads: uploadSettings.allowDownloads
            };

            const result = await uploadVideo(uploadData, (progress) => {
                setSelectedFiles(prev => prev.map(f =>
                    f.id === fileData.id
                        ? { ...f, progress }
                        : f
                ));
            });

            if (result.success) {
                setSelectedFiles(prev => prev.map(f =>
                    f.id === fileData.id
                        ? { ...f, status: UPLOAD_STATES.COMPLETED, result: result.data }
                        : f
                ));
                onUploadComplete?.(result.data);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            setSelectedFiles(prev => prev.map(f =>
                f.id === fileData.id
                    ? { ...f, status: UPLOAD_STATES.FAILED, error: error.message }
                    : f
            ));
            onUploadError?.([{ file: fileData.name, error: error.message }]);
        }
    };

    // Suppression d'un fichier
    const removeFile = (fileId) => {
        setSelectedFiles(prev => {
            const file = prev.find(f => f.id === fileId);
            if (file?.preview) {
                URL.revokeObjectURL(file.preview);
            }
            return prev.filter(f => f.id !== fileId);
        });
        removeFromQueue(fileId);
    };

    // Mise à jour des métadonnées
    const updateFileMetadata = (fileId, updates) => {
        setSelectedFiles(prev => prev.map(f =>
            f.id === fileId
                ? { ...f, metadata: { ...f.metadata, ...updates } }
                : f
        ));
    };

    // Upload de thumbnail personnalisée
    const uploadThumbnail = async (fileId, thumbnailFile) => {
        const validation = isValidImageFile(thumbnailFile);
        if (!validation.valid) {
            onUploadError?.([{ file: thumbnailFile.name, error: validation.error }]);
            return;
        }

        try {
            // Redimensionnement de l'image
            const resizedBlob = await resizeImage(thumbnailFile, 1280, 720, 0.8);
            const thumbnailUrl = URL.createObjectURL(resizedBlob);

            updateFileMetadata(fileId, { thumbnail: thumbnailUrl });
        } catch (error) {
            onUploadError?.([{ file: thumbnailFile.name, error: 'Erreur lors du traitement de l\'image' }]);
        }
    };

    // Nettoyage lors du démontage
    useEffect(() => {
        return () => {
            selectedFiles.forEach(file => {
                if (file.preview) {
                    URL.revokeObjectURL(file.preview);
                }
                if (file.metadata.thumbnail) {
                    URL.revokeObjectURL(file.metadata.thumbnail);
                }
            });
        };
    }, []);

    // Vérification des permissions
    if (!canUpload) {
        return (
            <div className="text-center py-12">
                <div className="max-w-md mx-auto p-6 bg-yellow-500/20 border border-yellow-500/30 rounded-lg glass-panel">
                    <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                        Upload non autorisé
                    </h3>
                    <p className="text-yellow-400 text-sm">
                        Vous devez vérifier votre email pour pouvoir uploader des vidéos.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Zone de drop */}
            <div
                {...getRootProps()}
                className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-300 min-h-64 flex flex-col justify-center
          ${isDragActive && !isDragReject
                    ? 'border-blue-500 bg-blue-500/10 frutiger-aurora-subtle'
                    : isDragReject
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-white/30 hover:border-white/50 bg-white/5 hover:bg-white/10'
                }
        `}
            >
                <input {...getInputProps()} />

                {/* Icône et contenu de la zone de drop */}
                <div className="space-y-4">
                    {isDragActive ? (
                        <>
                            <Upload className="w-16 h-16 text-blue-400 mx-auto animate-bounce" />
                            <div className="text-blue-400">
                                <p className="text-xl font-semibold">Déposez vos fichiers ici</p>
                                <p className="text-sm">Release to upload</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <Video className="w-16 h-16 text-white/60 mx-auto" />
                            <div className="text-white">
                                <p className="text-xl font-semibold mb-2">
                                    Uploadez vos vidéos
                                </p>
                                <p className="text-white/70 mb-4">
                                    Glissez-déposez vos fichiers ou cliquez pour parcourir
                                </p>
                                <button
                                    type="button"
                                    className="frutiger-btn frutiger-btn-primary px-6 py-3"
                                >
                                    Choisir des fichiers
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Informations sur les formats acceptés */}
                <div className="absolute bottom-4 left-4 right-4 text-xs text-white/50">
                    <div className="flex flex-wrap justify-center gap-2 mb-2">
                        {VIDEO_CONFIG.ALLOWED_FORMATS.map(format => (
                            <span key={format} className="px-2 py-1 bg-white/10 rounded">
                .{format}
              </span>
                        ))}
                    </div>
                    <p>Taille max: {formatFileSize(maxFileSize)}</p>
                </div>
            </div>

            {/* Erreurs de fichiers rejetés */}
            {fileRejections.length > 0 && (
                <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <h4 className="text-red-400 font-medium mb-2">Fichiers rejetés :</h4>
                    {fileRejections.map(({ file, errors }) => (
                        <div key={file.name} className="text-sm text-red-300 mb-1">
                            <strong>{file.name}</strong>: {errors.map(e => e.message).join(', ')}
                        </div>
                    ))}
                </div>
            )}

            {/* Paramètres avancés */}
            {selectedFiles.length > 0 && (
                <div className="glass-panel rounded-xl p-6">
                    <button
                        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                        className="
              flex items-center justify-between w-full text-left text-white
              hover:text-blue-400 transition-colors
            "
                    >
                        <h3 className="text-lg font-semibold">Paramètres d'upload</h3>
                        <ChevronDown
                            className={`
                w-5 h-5 transition-transform duration-200
                ${showAdvancedSettings ? 'rotate-180' : ''}
              `}
                        />
                    </button>

                    {showAdvancedSettings && (
                        <div className="mt-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Confidentialité */}
                                <div>
                                    <label className="block text-sm font-medium text-white/90 mb-2">
                                        Confidentialité
                                    </label>
                                    <select
                                        value={uploadSettings.privacy}
                                        onChange={(e) => setUploadSettings(prev => ({ ...prev, privacy: e.target.value }))}
                                        className="w-full frutiger-input py-2"
                                    >
                                        <option value="public">Public</option>
                                        <option value="unlisted">Non répertorié</option>
                                        <option value="private">Privé</option>
                                    </select>
                                </div>

                                {/* Catégorie par défaut */}
                                <div>
                                    <label className="block text-sm font-medium text-white/90 mb-2">
                                        Catégorie par défaut
                                    </label>
                                    <select
                                        value={uploadSettings.category}
                                        onChange={(e) => setUploadSettings(prev => ({ ...prev, category: e.target.value }))}
                                        className="w-full frutiger-input py-2"
                                    >
                                        {Object.entries(VIDEO_CATEGORIES).map(([key, value]) => (
                                            <option key={value} value={value}>
                                                {key.charAt(0) + key.slice(1).toLowerCase()}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Options */}
                            <div className="space-y-3">
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={uploadSettings.allowComments}
                                        onChange={(e) => setUploadSettings(prev => ({ ...prev, allowComments: e.target.checked }))}
                                        className="rounded"
                                    />
                                    <span className="text-white/90">Autoriser les commentaires</span>
                                </label>

                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={uploadSettings.allowDownloads}
                                        onChange={(e) => setUploadSettings(prev => ({ ...prev, allowDownloads: e.target.checked }))}
                                        className="rounded"
                                    />
                                    <span className="text-white/90">Autoriser les téléchargements</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Liste des fichiers sélectionnés */}
            {selectedFiles.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">
                        Fichiers à uploader ({selectedFiles.length})
                    </h3>

                    {selectedFiles.map(file => (
                        <UploadFileItem
                            key={file.id}
                            file={file}
                            onRemove={() => removeFile(file.id)}
                            onUpdateMetadata={(updates) => updateFileMetadata(file.id, updates)}
                            onUploadThumbnail={(thumbnailFile) => uploadThumbnail(file.id, thumbnailFile)}
                            onStartUpload={() => startUpload(file)}
                            onPreview={() => {
                                setCurrentUpload(file);
                                openPreview();
                            }}
                            showPreview={showPreview}
                            showProgress={showProgress}
                            autoStart={autoStart}
                        />
                    ))}
                </div>
            )}

            {/* Modal de preview */}
            <UploadPreviewModal
                isOpen={isPreviewOpen}
                onClose={closePreview}
                file={currentUpload}
            />
        </div>
    );
};

/**
 * Item de fichier en cours d'upload
 */
const UploadFileItem = ({
                            file,
                            onRemove,
                            onUpdateMetadata,
                            onUploadThumbnail,
                            onStartUpload,
                            onPreview,
                            showPreview,
                            showProgress,
                            autoStart
                        }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localMetadata, setLocalMetadata] = useState(file.metadata);
    const thumbnailInputRef = useRef(null);

    const handleSaveMetadata = () => {
        onUpdateMetadata(localMetadata);
        setIsEditing(false);
    };

    const handleThumbnailChange = (e) => {
        const thumbnailFile = e.target.files[0];
        if (thumbnailFile) {
            onUploadThumbnail(thumbnailFile);
        }
    };

    const getStatusIcon = () => {
        switch (file.status) {
            case UPLOAD_STATES.UPLOADING:
                return <LoadingSpinner size="small" />;
            case UPLOAD_STATES.COMPLETED:
                return <Check className="w-5 h-5 text-green-400" />;
            case UPLOAD_STATES.FAILED:
                return <AlertCircle className="w-5 h-5 text-red-400" />;
            default:
                return <FileVideo className="w-5 h-5 text-white/60" />;
        }
    };

    const getStatusText = () => {
        switch (file.status) {
            case UPLOAD_STATES.UPLOADING:
                return 'Upload en cours...';
            case UPLOAD_STATES.PROCESSING:
                return 'Traitement...';
            case UPLOAD_STATES.COMPLETED:
                return 'Upload terminé';
            case UPLOAD_STATES.FAILED:
                return 'Échec de l\'upload';
            default:
                return 'En attente';
        }
    };

    return (
        <div className="glass-panel rounded-xl p-4">
            <div className="flex space-x-4">
                {/* Thumbnail/Preview */}
                <div className="flex-shrink-0 w-32 h-20 relative">
                    {file.preview ? (
                        <img
                            src={file.metadata.thumbnail || file.preview}
                            alt={file.name}
                            className="w-full h-full object-cover rounded-lg bg-white/10"
                        />
                    ) : (
                        <div className="w-full h-full bg-white/10 rounded-lg flex items-center justify-center">
                            <Video className="w-8 h-8 text-white/60" />
                        </div>
                    )}

                    {/* Boutons overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center space-x-2">
                        {showPreview && (
                            <button
                                onClick={onPreview}
                                className="p-1 bg-black/70 rounded hover:bg-black/90 transition-colors"
                                title="Preview"
                            >
                                <Eye className="w-4 h-4 text-white" />
                            </button>
                        )}

                        <button
                            onClick={() => thumbnailInputRef.current?.click()}
                            className="p-1 bg-black/70 rounded hover:bg-black/90 transition-colors"
                            title="Changer la miniature"
                        >
                            <Image className="w-4 h-4 text-white" />
                        </button>
                    </div>

                    <input
                        ref={thumbnailInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailChange}
                        className="hidden"
                    />
                </div>

                {/* Métadonnées */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                            {getStatusIcon()}
                            <span className="text-sm text-white/70">{getStatusText()}</span>
                        </div>

                        <div className="flex items-center space-x-2">
                            {!autoStart && file.status === UPLOAD_STATES.IDLE && (
                                <button
                                    onClick={onStartUpload}
                                    className="frutiger-btn frutiger-btn-primary text-xs px-3 py-1"
                                >
                                    Démarrer
                                </button>
                            )}

                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className="p-1 text-white/60 hover:text-white transition-colors"
                                title="Modifier"
                            >
                                <Settings className="w-4 h-4" />
                            </button>

                            <button
                                onClick={onRemove}
                                className="p-1 text-white/60 hover:text-red-400 transition-colors"
                                title="Supprimer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Édition des métadonnées */}
                    {isEditing ? (
                        <div className="space-y-3">
                            <input
                                type="text"
                                value={localMetadata.title}
                                onChange={(e) => setLocalMetadata(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Titre de la vidéo"
                                className="w-full frutiger-input py-2 text-sm"
                            />

                            <textarea
                                value={localMetadata.description}
                                onChange={(e) => setLocalMetadata(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Description de la vidéo"
                                rows={2}
                                className="w-full frutiger-input py-2 text-sm resize-none"
                            />

                            <div className="flex space-x-2">
                                <select
                                    value={localMetadata.category}
                                    onChange={(e) => setLocalMetadata(prev => ({ ...prev, category: e.target.value }))}
                                    className="flex-1 frutiger-input py-2 text-sm"
                                >
                                    {Object.entries(VIDEO_CATEGORIES).map(([key, value]) => (
                                        <option key={value} value={value}>
                                            {key.charAt(0) + key.slice(1).toLowerCase()}
                                        </option>
                                    ))}
                                </select>

                                <label className="flex items-center space-x-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={localMetadata.isPrivate}
                                        onChange={(e) => setLocalMetadata(prev => ({ ...prev, isPrivate: e.target.checked }))}
                                        className="rounded"
                                    />
                                    <span className="text-white/90">Privé</span>
                                </label>
                            </div>

                            <div className="flex space-x-2">
                                <button
                                    onClick={handleSaveMetadata}
                                    className="frutiger-btn frutiger-btn-primary text-xs px-3 py-1"
                                >
                                    <Save className="w-3 h-3 mr-1" />
                                    Sauvegarder
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setLocalMetadata(file.metadata);
                                    }}
                                    className="frutiger-btn frutiger-btn-glass text-xs px-3 py-1"
                                >
                                    Annuler
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <h4 className="text-white font-medium truncate">
                                {file.metadata.title || file.name}
                            </h4>

                            <div className="flex items-center space-x-4 text-xs text-white/60">
                <span className="flex items-center">
                  <HardDrive className="w-3 h-3 mr-1" />
                    {formatFileSize(file.size)}
                </span>

                                {file.metadata.duration && (
                                    <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                                        {formatDuration(file.metadata.duration)}
                  </span>
                                )}

                                {file.metadata.width && file.metadata.height && (
                                    <span>
                    {file.metadata.width}x{file.metadata.height}
                  </span>
                                )}
                            </div>

                            {file.metadata.description && (
                                <p className="text-sm text-white/70 line-clamp-2">
                                    {file.metadata.description}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Barre de progression */}
                    {showProgress && file.status === UPLOAD_STATES.UPLOADING && (
                        <div className="mt-3 space-y-2">
                            <div className="flex justify-between text-xs text-white/70">
                                <span>Upload: {formatUploadProgress(file.progress.loaded, file.progress.total)}</span>
                                <span>{formatUploadSpeed(file.progress.speed)}</span>
                            </div>

                            <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-300 frutiger-aurora"
                                    style={{
                                        width: `${file.progress.total ? (file.progress.loaded / file.progress.total) * 100 : 0}%`
                                    }}
                                />
                            </div>

                            <div className="flex justify-between text-xs text-white/60">
                <span>
                  {formatUploadTimeRemaining(
                      file.progress.total - file.progress.loaded,
                      file.progress.speed
                  )}
                </span>
                                <span>
                  {formatFileSize(file.progress.loaded)} / {formatFileSize(file.progress.total)}
                </span>
                            </div>
                        </div>
                    )}

                    {/* Message d'erreur */}
                    {file.error && (
                        <div className="mt-2 p-2 bg-red-500/20 border border-red-500/30 rounded text-sm text-red-400">
                            {file.error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Modal de preview de vidéo avant upload
 */
const UploadPreviewModal = ({ isOpen, onClose, file }) => {
    const videoRef = useRef(null);

    if (!file) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Preview - ${file.metadata.title || file.name}`}
            size="lg"
        >
            <div className="space-y-4">
                {/* Preview vidéo */}
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                        ref={videoRef}
                        src={URL.createObjectURL(file.file)}
                        controls
                        className="w-full h-full"
                        preload="metadata"
                    />
                </div>

                {/* Métadonnées */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-white/60">Taille:</span>
                        <span className="text-white ml-2">{formatFileSize(file.size)}</span>
                    </div>

                    {file.metadata.duration && (
                        <div>
                            <span className="text-white/60">Durée:</span>
                            <span className="text-white ml-2">{formatDuration(file.metadata.duration)}</span>
                        </div>
                    )}

                    {file.metadata.width && file.metadata.height && (
                        <div>
                            <span className="text-white/60">Résolution:</span>
                            <span className="text-white ml-2">
                {file.metadata.width}x{file.metadata.height}
              </span>
                        </div>
                    )}

                    <div>
                        <span className="text-white/60">Format:</span>
                        <span className="text-white ml-2">{file.type}</span>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default VideoUpload;