// frontend/src/components/playlist/PlaylistForm.js

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Save, X, Upload, Image, Lock, Users, Eye,
    AlertCircle, CheckCircle, Info, Trash2, Edit3
} from 'lucide-react';
import { usePlaylist } from '../../hooks/usePlaylist';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal, { useModal } from '../common/Modal';
import {
    IMAGE_CONFIG,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    ROUTES
} from '../../utils/constants';
import {
    isValidImageFile,
    readFileAsDataURL,
    resizeImage
} from '../../utils/helpers';
import { formatErrorMessage } from '../../utils/formatters';

/**
 * Formulaire de création/édition de playlist avec design Frutiger Aero
 *
 * Props:
 * - playlist: object - Playlist à éditer (null pour création)
 * - onSave: function - Callback de sauvegarde
 * - onCancel: function - Callback d'annulation
 * - onDelete: function - Callback de suppression
 * - embedded: boolean - Mode intégré (sans navigation)
 * - showAdvanced: boolean - Afficher options avancées
 * - autoSave: boolean - Sauvegarde automatique
 * - validationMode: string - Mode de validation (live, submit)
 */

const PlaylistForm = ({
                          playlist = null,
                          onSave,
                          onCancel,
                          onDelete,
                          embedded = false,
                          showAdvanced = true,
                          autoSave = false,
                          validationMode = 'submit'
                      }) => {
    const navigate = useNavigate();
    const thumbnailInputRef = useRef(null);
    const formRef = useRef(null);

    // Mode édition ou création
    const isEditing = Boolean(playlist);

    // État du formulaire
    const [formData, setFormData] = useState({
        title: playlist?.title || '',
        description: playlist?.description || '',
        isPrivate: playlist?.isPrivate || false,
        allowCollaborators: playlist?.allowCollaborators || false,
        thumbnail: null,
        tags: playlist?.tags || []
    });

    const [validationErrors, setValidationErrors] = useState({});
    const [thumbnailPreview, setThumbnailPreview] = useState(playlist?.thumbnail || null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [tagInput, setTagInput] = useState('');

    // Hooks
    const { user } = useAuth();
    const {
        createPlaylist,
        updatePlaylist,
        deletePlaylist,
        canManagePlaylist
    } = usePlaylist();

    const {
        isOpen: isDeleteOpen,
        openModal: openDelete,
        closeModal: closeDelete
    } = useModal();

    // Vérification des permissions
    const canEdit = !isEditing || canManagePlaylist(playlist?.id, user?.id);

    // Suivi des changements
    useEffect(() => {
        if (isEditing) {
            const hasChanges =
                formData.title !== playlist.title ||
                formData.description !== playlist.description ||
                formData.isPrivate !== playlist.isPrivate ||
                formData.allowCollaborators !== playlist.allowCollaborators ||
                formData.thumbnail !== null ||
                JSON.stringify(formData.tags) !== JSON.stringify(playlist.tags || []);

            setHasUnsavedChanges(hasChanges);
        } else {
            setHasUnsavedChanges(
                formData.title.trim() !== '' ||
                formData.description.trim() !== '' ||
                formData.thumbnail !== null ||
                formData.tags.length > 0
            );
        }
    }, [formData, isEditing, playlist]);

    // Auto-sauvegarde
    useEffect(() => {
        if (autoSave && hasUnsavedChanges && isEditing && canEdit) {
            const autoSaveTimer = setTimeout(() => {
                handleSave(true); // Silent save
            }, 5000);

            return () => clearTimeout(autoSaveTimer);
        }
    }, [formData, autoSave, hasUnsavedChanges, isEditing, canEdit]);

    // Validation du formulaire
    const validateForm = () => {
        const errors = {};

        // Titre requis
        if (!formData.title.trim()) {
            errors.title = 'Le titre est requis';
        } else if (formData.title.length < 3) {
            errors.title = 'Le titre doit contenir au moins 3 caractères';
        } else if (formData.title.length > 100) {
            errors.title = 'Le titre ne peut pas dépasser 100 caractères';
        }

        // Description optionnelle mais limitée
        if (formData.description && formData.description.length > 1000) {
            errors.description = 'La description ne peut pas dépasser 1000 caractères';
        }

        // Tags limités
        if (formData.tags.length > 10) {
            errors.tags = 'Maximum 10 tags autorisés';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Validation en temps réel
    useEffect(() => {
        if (validationMode === 'live') {
            validateForm();
        }
    }, [formData, validationMode]);

    // Gestion des changements de champs
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Nettoie l'erreur du champ modifié
        if (validationErrors[name]) {
            setValidationErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    // Gestion des tags
    const handleTagInputKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag();
        }
    };

    const addTag = () => {
        const tag = tagInput.trim().toLowerCase();
        if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, tag]
            }));
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    // Gestion de la miniature
    const handleThumbnailChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const validation = isValidImageFile(file);
        if (!validation.valid) {
            setValidationErrors(prev => ({
                ...prev,
                thumbnail: validation.error
            }));
            return;
        }

        try {
            // Redimensionnement de l'image
            const resizedBlob = await resizeImage(file, 800, 450, 0.8);
            const thumbnailUrl = URL.createObjectURL(resizedBlob);

            setFormData(prev => ({
                ...prev,
                thumbnail: resizedBlob
            }));
            setThumbnailPreview(thumbnailUrl);

            // Nettoie l'erreur de miniature
            if (validationErrors.thumbnail) {
                setValidationErrors(prev => ({
                    ...prev,
                    thumbnail: ''
                }));
            }
        } catch (error) {
            setValidationErrors(prev => ({
                ...prev,
                thumbnail: 'Erreur lors du traitement de l\'image'
            }));
        }
    };

    // Suppression de la miniature
    const removeThumbnail = () => {
        setFormData(prev => ({
            ...prev,
            thumbnail: null
        }));

        if (thumbnailPreview && !isEditing) {
            URL.revokeObjectURL(thumbnailPreview);
        }

        setThumbnailPreview(null);
    };

    // Sauvegarde
    const handleSave = async (silent = false) => {
        if (!canEdit) return;

        if (!silent && !validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const playlistData = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                isPrivate: formData.isPrivate,
                allowCollaborators: formData.allowCollaborators,
                tags: formData.tags,
                ...(formData.thumbnail && { thumbnail: formData.thumbnail })
            };

            let result;
            if (isEditing) {
                result = await updatePlaylist(playlist.id, playlistData);
            } else {
                result = await createPlaylist(playlistData);
            }

            if (result.success) {
                setHasUnsavedChanges(false);

                if (onSave) {
                    onSave(result.data);
                } else if (!embedded) {
                    navigate(`${ROUTES.PLAYLIST.replace(':playlistId', result.data.id)}`);
                }

                if (!silent) {
                    // Feedback de succès
                    console.log(isEditing ? 'Playlist mise à jour' : 'Playlist créée');
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            setValidationErrors({
                general: formatErrorMessage(error)
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Suppression
    const handleDelete = async () => {
        if (!isEditing || !canEdit) return;

        try {
            await deletePlaylist(playlist.id);
            closeDelete();

            if (onDelete) {
                onDelete(playlist);
            } else if (!embedded) {
                navigate('/playlists');
            }
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
        }
    };

    // Annulation
    const handleCancel = () => {
        if (hasUnsavedChanges) {
            const confirmed = window.confirm(
                'Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir annuler ?'
            );
            if (!confirmed) return;
        }

        if (onCancel) {
            onCancel();
        } else if (!embedded) {
            navigate(-1);
        }
    };

    // Vérification des permissions
    if (!canEdit) {
        return (
            <div className="text-center py-12">
                <div className="max-w-md mx-auto p-6 bg-yellow-500/20 border border-yellow-500/30 rounded-lg glass-panel">
                    <Lock className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                        Accès non autorisé
                    </h3>
                    <p className="text-yellow-400 text-sm">
                        Vous n'avez pas les permissions pour modifier cette playlist.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            {!embedded && (
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white frutiger-title mb-2">
                        {isEditing ? 'Modifier la playlist' : 'Créer une playlist'}
                    </h1>
                    <p className="text-white/80">
                        {isEditing
                            ? 'Modifiez les informations de votre playlist'
                            : 'Organisez vos vidéos dans une nouvelle playlist'
                        }
                    </p>
                </div>
            )}

            {/* Formulaire */}
            <form ref={formRef} onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                {/* Erreur générale */}
                {validationErrors.general && (
                    <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg glass-panel">
                        <div className="flex items-start space-x-2 text-red-400">
                            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                            <p className="text-sm">{validationErrors.general}</p>
                        </div>
                    </div>
                )}

                {/* Miniature */}
                <div className="space-y-4">
                    <label className="block text-sm font-medium text-white/90">
                        Miniature de la playlist
                    </label>

                    <div className="flex items-start space-x-6">
                        {/* Preview de la miniature */}
                        <div className="relative w-48 h-28 bg-white/10 rounded-lg overflow-hidden flex-shrink-0">
                            {thumbnailPreview ? (
                                <>
                                    <img
                                        src={thumbnailPreview}
                                        alt="Miniature"
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeThumbnail}
                                        className="
                      absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600
                      rounded-full transition-colors
                    "
                                        title="Supprimer la miniature"
                                    >
                                        <X className="w-3 h-3 text-white" />
                                    </button>
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Image className="w-8 h-8 text-white/60" />
                                </div>
                            )}
                        </div>

                        {/* Contrôles de miniature */}
                        <div className="flex-1 space-y-3">
                            <button
                                type="button"
                                onClick={() => thumbnailInputRef.current?.click()}
                                className="frutiger-btn frutiger-btn-glass px-4 py-2"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                {thumbnailPreview ? 'Changer' : 'Ajouter'} une miniature
                            </button>

                            <input
                                ref={thumbnailInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleThumbnailChange}
                                className="hidden"
                            />

                            <p className="text-xs text-white/60">
                                Formats acceptés: JPG, PNG, WebP. Taille max: {IMAGE_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB
                            </p>

                            {validationErrors.thumbnail && (
                                <p className="text-sm text-red-400">{validationErrors.thumbnail}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Titre */}
                <div className="space-y-2">
                    <label htmlFor="title" className="block text-sm font-medium text-white/90">
                        Titre de la playlist *
                    </label>
                    <input
                        id="title"
                        name="title"
                        type="text"
                        required
                        value={formData.title}
                        onChange={handleInputChange}
                        className={`
              w-full frutiger-input py-3 px-4
              ${validationErrors.title ? 'border-red-500/50 focus:border-red-500' : ''}
            `}
                        placeholder="Donnez un titre à votre playlist"
                        maxLength={100}
                    />
                    <div className="flex justify-between items-center">
                        {validationErrors.title && (
                            <p className="text-sm text-red-400">{validationErrors.title}</p>
                        )}
                        <p className="text-xs text-white/60 ml-auto">
                            {formData.title.length}/100
                        </p>
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <label htmlFor="description" className="block text-sm font-medium text-white/90">
                        Description
                    </label>
                    <textarea
                        id="description"
                        name="description"
                        rows={4}
                        value={formData.description}
                        onChange={handleInputChange}
                        className={`
              w-full frutiger-input py-3 px-4 resize-none
              ${validationErrors.description ? 'border-red-500/50 focus:border-red-500' : ''}
            `}
                        placeholder="Décrivez votre playlist (optionnel)"
                        maxLength={1000}
                    />
                    <div className="flex justify-between items-center">
                        {validationErrors.description && (
                            <p className="text-sm text-red-400">{validationErrors.description}</p>
                        )}
                        <p className="text-xs text-white/60 ml-auto">
                            {formData.description.length}/1000
                        </p>
                    </div>
                </div>

                {/* Tags */}
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-white/90">
                        Tags
                    </label>

                    {/* Input pour ajouter des tags */}
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagInputKeyDown}
                            className="flex-1 frutiger-input py-2 px-3 text-sm"
                            placeholder="Ajoutez des tags (appuyez sur Entrée)"
                            maxLength={20}
                        />
                        <button
                            type="button"
                            onClick={addTag}
                            disabled={!tagInput.trim() || formData.tags.length >= 10}
                            className="
                frutiger-btn frutiger-btn-glass px-4 py-2 text-sm
                disabled:opacity-50 disabled:cursor-not-allowed
              "
                        >
                            Ajouter
                        </button>
                    </div>

                    {/* Liste des tags */}
                    {formData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {formData.tags.map(tag => (
                                <span
                                    key={tag}
                                    className="
                    inline-flex items-center space-x-1 px-3 py-1 bg-blue-500/20
                    text-blue-300 rounded-full text-sm border border-blue-500/30
                  "
                                >
                  <span>#{tag}</span>
                  <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-blue-100 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-between items-center">
                        {validationErrors.tags && (
                            <p className="text-sm text-red-400">{validationErrors.tags}</p>
                        )}
                        <p className="text-xs text-white/60 ml-auto">
                            {formData.tags.length}/10 tags
                        </p>
                    </div>
                </div>

                {/* Options avancées */}
                {showAdvanced && (
                    <div className="space-y-4 p-4 bg-white/5 rounded-lg glass-panel">
                        <h3 className="text-lg font-medium text-white">Options de confidentialité</h3>

                        <div className="space-y-3">
                            {/* Playlist privée */}
                            <label className="flex items-start space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="isPrivate"
                                    checked={formData.isPrivate}
                                    onChange={handleInputChange}
                                    className="w-4 h-4 mt-1 text-blue-600 bg-transparent border-white/30 rounded focus:ring-blue-500 focus:ring-2"
                                />
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <Lock className="w-4 h-4 text-white/70" />
                                        <span className="text-white/90 font-medium">Playlist privée</span>
                                    </div>
                                    <p className="text-sm text-white/60 mt-1">
                                        Seuls vous et les collaborateurs pouvez voir cette playlist
                                    </p>
                                </div>
                            </label>

                            {/* Collaborateurs */}
                            <label className="flex items-start space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="allowCollaborators"
                                    checked={formData.allowCollaborators}
                                    onChange={handleInputChange}
                                    className="w-4 h-4 mt-1 text-blue-600 bg-transparent border-white/30 rounded focus:ring-blue-500 focus:ring-2"
                                />
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <Users className="w-4 h-4 text-white/70" />
                                        <span className="text-white/90 font-medium">Autoriser les collaborateurs</span>
                                    </div>
                                    <p className="text-sm text-white/60 mt-1">
                                        Permettre à d'autres utilisateurs d'ajouter des vidéos
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>
                )}

                {/* Indicateur de changements non sauvegardés */}
                {hasUnsavedChanges && (
                    <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg glass-panel">
                        <div className="flex items-center space-x-2 text-yellow-400">
                            <Info className="w-4 h-4" />
                            <p className="text-sm">Vous avez des modifications non sauvegardées</p>
                        </div>
                    </div>
                )}

                {/* Boutons d'action */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-6 border-t border-white/20">
                    {/* Actions principales */}
                    <div className="flex space-x-3">
                        <button
                            type="submit"
                            disabled={isSubmitting || !hasUnsavedChanges}
                            className={`
                frutiger-btn frutiger-btn-primary px-6 py-3
                disabled:opacity-50 disabled:cursor-not-allowed
                ${hasUnsavedChanges ? 'frutiger-btn-aurora' : ''}
              `}
                        >
                            {isSubmitting ? (
                                <div className="flex items-center space-x-2">
                                    <LoadingSpinner size="small" />
                                    <span>{isEditing ? 'Mise à jour...' : 'Création...'}</span>
                                </div>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    {isEditing ? 'Sauvegarder' : 'Créer la playlist'}
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isSubmitting}
                            className="frutiger-btn frutiger-btn-glass px-6 py-3"
                        >
                            Annuler
                        </button>
                    </div>

                    {/* Actions secondaires */}
                    {isEditing && (
                        <button
                            type="button"
                            onClick={openDelete}
                            disabled={isSubmitting}
                            className="
                flex items-center space-x-2 px-4 py-2 text-red-400 hover:text-red-300
                hover:bg-red-500/10 rounded-lg transition-colors
              "
                        >
                            <Trash2 className="w-4 h-4" />
                            <span>Supprimer</span>
                        </button>
                    )}
                </div>
            </form>

            {/* Modal de suppression */}
            <Modal
                isOpen={isDeleteOpen}
                onClose={closeDelete}
                title="Supprimer la playlist"
                size="sm"
            >
                <div className="space-y-6">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-8 h-8 text-red-600" />
                        </div>

                        <h3 className="text-lg font-semibold text-white mb-2">
                            Êtes-vous sûr ?
                        </h3>

                        <p className="text-white/70 mb-4">
                            Cette action supprimera définitivement la playlist
                            <strong className="text-white"> "{playlist?.title}"</strong>.
                            Cette action est irréversible.
                        </p>
                    </div>

                    <div className="flex justify-center space-x-3">
                        <button
                            onClick={closeDelete}
                            className="frutiger-btn frutiger-btn-glass px-6 py-2"
                        >
                            Annuler
                        </button>

                        <button
                            onClick={handleDelete}
                            className="
                px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg
                transition-colors
              "
                        >
                            Supprimer définitivement
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default PlaylistForm;