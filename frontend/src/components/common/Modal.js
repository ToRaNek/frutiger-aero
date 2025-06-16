// frontend/src/components/common/Modal.js

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { ANIMATION_DURATION, MODAL_TYPES } from '../../utils/constants';

/**
 * Modal glassmorphism réutilisable avec animations Frutiger Aero
 *
 * Props:
 * - isOpen: boolean - État d'ouverture du modal
 * - onClose: function - Callback de fermeture
 * - title: string - Titre du modal
 * - children: React.Node - Contenu du modal
 * - size: string - Taille du modal (sm, md, lg, xl, full)
 * - type: string - Type de modal (confirm, info, warning, error, custom)
 * - showCloseButton: boolean - Afficher le bouton de fermeture
 * - closeOnOverlayClick: boolean - Fermer sur clic overlay
 * - closeOnEscape: boolean - Fermer avec Échap
 * - className: string - Classes CSS supplémentaires
 * - overlayClassName: string - Classes pour l'overlay
 * - preventScroll: boolean - Empêcher le scroll du body
 * - autoFocus: boolean - Focus automatique sur le modal
 * - onOpen: function - Callback d'ouverture
 * - onClosed: function - Callback de fermeture complète
 */

const Modal = ({
                   isOpen = false,
                   onClose,
                   title,
                   children,
                   size = 'md',
                   type = MODAL_TYPES.CUSTOM,
                   showCloseButton = true,
                   closeOnOverlayClick = true,
                   closeOnEscape = true,
                   className = '',
                   overlayClassName = '',
                   preventScroll = true,
                   autoFocus = true,
                   onOpen,
                   onClosed
               }) => {
    const modalRef = useRef(null);
    const overlayRef = useRef(null);
    const previousFocusRef = useRef(null);
    const isClosingRef = useRef(false);

    // Sauvegarde du focus précédent
    useEffect(() => {
        if (isOpen) {
            previousFocusRef.current = document.activeElement;
            onOpen?.();
        }
    }, [isOpen, onOpen]);

    // Gestion du focus et du scroll
    useEffect(() => {
        if (isOpen) {
            // Focus automatique sur le modal
            if (autoFocus && modalRef.current) {
                modalRef.current.focus();
            }

            // Empêche le scroll du body
            if (preventScroll) {
                document.body.style.overflow = 'hidden';
            }

            // Gestionnaire Échap
            const handleEscape = (e) => {
                if (e.key === 'Escape' && closeOnEscape && !isClosingRef.current) {
                    handleClose();
                }
            };

            document.addEventListener('keydown', handleEscape);

            return () => {
                document.removeEventListener('keydown', handleEscape);

                // Restaure le scroll et le focus
                if (preventScroll) {
                    document.body.style.overflow = '';
                }

                if (previousFocusRef.current) {
                    previousFocusRef.current.focus();
                }
            };
        }
    }, [isOpen, closeOnEscape, preventScroll, autoFocus]);

    // Fermeture avec animation
    const handleClose = () => {
        if (isClosingRef.current) return;

        isClosingRef.current = true;

        // Animation de fermeture
        if (overlayRef.current && modalRef.current) {
            overlayRef.current.style.animation = `fadeOut ${ANIMATION_DURATION.NORMAL}ms ease-out`;
            modalRef.current.style.animation = `modalSlideOut ${ANIMATION_DURATION.NORMAL}ms ease-out`;
        }

        // Délai pour l'animation puis fermeture
        setTimeout(() => {
            isClosingRef.current = false;
            onClose?.();
            onClosed?.();
        }, ANIMATION_DURATION.NORMAL);
    };

    // Gestion du clic sur l'overlay
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && closeOnOverlayClick) {
            handleClose();
        }
    };

    // Gestion du focus trap
    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            const focusableElements = modalRef.current?.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );

            if (focusableElements?.length) {
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        }
    };

    // Classes CSS pour les tailles
    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-full mx-4'
    };

    // Classes CSS pour les types
    const typeClasses = {
        [MODAL_TYPES.CONFIRM]: 'frutiger-modal-confirm',
        [MODAL_TYPES.INFO]: 'frutiger-modal-info',
        [MODAL_TYPES.WARNING]: 'frutiger-modal-warning',
        [MODAL_TYPES.ERROR]: 'frutiger-modal-error',
        [MODAL_TYPES.CUSTOM]: 'frutiger-modal'
    };

    // Icônes pour les types
    const getTypeIcon = () => {
        switch (type) {
            case MODAL_TYPES.INFO:
                return (
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full glass-blue">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                );
            case MODAL_TYPES.WARNING:
                return (
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full glass-bubble">
                        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                );
            case MODAL_TYPES.ERROR:
                return (
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full glass-shine">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                );
            case MODAL_TYPES.CONFIRM:
                return (
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full glass-crystal">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                );
            default:
                return null;
        }
    };

    if (!isOpen) return null;

    const modalContent = (
        <div
            ref={overlayRef}
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm ${overlayClassName}`}
            onClick={handleOverlayClick}
            style={{ animation: `fadeIn ${ANIMATION_DURATION.NORMAL}ms ease-out` }}
        >
            <div
                ref={modalRef}
                className={`
          relative w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden
          ${typeClasses[type]} glass-panel glass-strong
          rounded-2xl shadow-2xl backdrop-blur-md
          transform transition-all duration-300
          ${className}
        `}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? "modal-title" : undefined}
                style={{ animation: `modalSlideIn ${ANIMATION_DURATION.NORMAL}ms ease-out` }}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                        <div className="flex-1">
                            {getTypeIcon()}
                            {title && (
                                <h2 id="modal-title" className="text-xl font-semibold text-white frutiger-title">
                                    {title}
                                </h2>
                            )}
                        </div>

                        {showCloseButton && (
                            <button
                                onClick={handleClose}
                                className="
                  flex items-center justify-center w-8 h-8 ml-4
                  text-white/70 hover:text-white hover:bg-white/10
                  rounded-full transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-white/20
                "
                                aria-label="Fermer le modal"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                )}

                {/* Contenu */}
                <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
                    <div className="p-6">
                        {children}
                    </div>
                </div>

                {/* Effet de brillance Frutiger Aero */}
                <div className="absolute inset-0 pointer-events-none glass-shine opacity-20" />

                {/* Aurora subtile */}
                <div className="absolute inset-0 pointer-events-none frutiger-aurora-subtle opacity-10" />
            </div>
        </div>
    );

    // Render dans un portail
    return createPortal(modalContent, document.body);
};

/**
 * Hook pour gérer l'état d'un modal
 */
export const useModal = (initialState = false) => {
    const [isOpen, setIsOpen] = React.useState(initialState);

    const openModal = React.useCallback(() => {
        setIsOpen(true);
    }, []);

    const closeModal = React.useCallback(() => {
        setIsOpen(false);
    }, []);

    const toggleModal = React.useCallback(() => {
        setIsOpen(prev => !prev);
    }, []);

    return {
        isOpen,
        openModal,
        closeModal,
        toggleModal,
        setIsOpen
    };
};

/**
 * Composant ConfirmModal pour les confirmations
 */
export const ConfirmModal = ({
                                 isOpen,
                                 onClose,
                                 onConfirm,
                                 title = "Confirmer l'action",
                                 message = "Êtes-vous sûr de vouloir continuer ?",
                                 confirmText = "Confirmer",
                                 cancelText = "Annuler",
                                 variant = "primary",
                                 isLoading = false,
                                 ...props
                             }) => {
    const handleConfirm = () => {
        onConfirm?.();
        if (!isLoading) {
            onClose?.();
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            type={MODAL_TYPES.CONFIRM}
            size="sm"
            {...props}
        >
            <div className="text-center">
                <p className="mb-6 text-white/90">{message}</p>

                <div className="flex justify-center space-x-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="frutiger-btn frutiger-btn-glass px-6 py-2"
                    >
                        {cancelText}
                    </button>

                    <button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={`
              frutiger-btn px-6 py-2
              ${variant === 'danger'
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'frutiger-btn-primary'
                        }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
                    >
                        {isLoading ? (
                            <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Chargement...</span>
                            </div>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

/**
 * Composant InfoModal pour les informations
 */
export const InfoModal = ({
                              isOpen,
                              onClose,
                              title = "Information",
                              message,
                              buttonText = "OK",
                              ...props
                          }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            type={MODAL_TYPES.INFO}
            size="sm"
            {...props}
        >
            <div className="text-center">
                <p className="mb-6 text-white/90">{message}</p>

                <button
                    onClick={onClose}
                    className="frutiger-btn frutiger-btn-primary px-6 py-2"
                >
                    {buttonText}
                </button>
            </div>
        </Modal>
    );
};

// Styles CSS pour les animations (à ajouter dans le CSS global)
const modalStyles = `
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes modalSlideOut {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.9) translateY(-10px);
  }
}

.frutiger-modal {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.05) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.frutiger-modal-confirm {
  background: linear-gradient(
    135deg,
    rgba(34, 197, 94, 0.1) 0%,
    rgba(34, 197, 94, 0.05) 100%
  );
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.frutiger-modal-info {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.1) 0%,
    rgba(59, 130, 246, 0.05) 100%
  );
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.frutiger-modal-warning {
  background: linear-gradient(
    135deg,
    rgba(245, 158, 11, 0.1) 0%,
    rgba(245, 158, 11, 0.05) 100%
  );
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.frutiger-modal-error {
  background: linear-gradient(
    135deg,
    rgba(239, 68, 68, 0.1) 0%,
    rgba(239, 68, 68, 0.05) 100%
  );
  border: 1px solid rgba(239, 68, 68, 0.3);
}
`;

// Injection des styles
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = modalStyles;
    document.head.appendChild(styleSheet);
}

export default Modal;