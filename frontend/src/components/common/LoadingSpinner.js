// frontend/src/components/common/LoadingSpinner.js
import React from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

function LoadingSpinner({
                            size = 'medium',
                            text = '',
                            variant = 'default',
                            className = '',
                            showText = true,
                            inline = false
                        }) {
    // Définir les tailles
    const sizes = {
        small: {
            spinner: 24,
            text: '14px'
        },
        medium: {
            spinner: 40,
            text: '16px'
        },
        large: {
            spinner: 64,
            text: '18px'
        },
        xlarge: {
            spinner: 96,
            text: '20px'
        }
    };

    const currentSize = sizes[size] || sizes.medium;

    // Variantes d'animation pour le spinner principal
    const spinnerVariants = {
        animate: {
            rotate: 360,
            transition: {
                duration: 1.5,
                repeat: Infinity,
                ease: "linear"
            }
        }
    };

    // Variantes pour les éléments internes
    const elementVariants = {
        animate: {
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7],
            transition: {
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut"
            }
        }
    };

    // Variantes pour l'effet aurora
    const auroraVariants = {
        animate: {
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.6, 0.3],
            transition: {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
            }
        }
    };

    // Classes CSS dynamiques
    const containerClasses = [
        'loading-spinner-container',
        `spinner-${size}`,
        `spinner-${variant}`,
        inline && 'spinner-inline',
        className
    ].filter(Boolean).join(' ');

    // Messages de chargement par défaut selon le contexte
    const getDefaultText = () => {
        if (text) return text;

        switch (size) {
            case 'small':
                return 'Chargement...';
            case 'large':
            case 'xlarge':
                return 'Chargement en cours...';
            default:
                return 'Veuillez patienter...';
        }
    };

    // Composant de spinner Frutiger Aero
    const FrutigerSpinner = () => (
        <motion.div
            className="frutiger-spinner"
            style={{ width: currentSize.spinner, height: currentSize.spinner }}
            variants={spinnerVariants}
            animate="animate"
        >
            {/* Cercle externe avec effet aurora */}
            <motion.div
                className="spinner-aurora"
                variants={auroraVariants}
                animate="animate"
            />

            {/* Cercle glassmorphism */}
            <motion.div
                className="spinner-glass"
                variants={elementVariants}
                animate="animate"
                style={{ animationDelay: '0.2s' }}
            />

            {/* Cercles internes */}
            <motion.div
                className="spinner-inner-circle spinner-circle-1"
                variants={elementVariants}
                animate="animate"
                style={{ animationDelay: '0.4s' }}
            />

            <motion.div
                className="spinner-inner-circle spinner-circle-2"
                variants={elementVariants}
                animate="animate"
                style={{ animationDelay: '0.6s' }}
            />

            {/* Centre brillant */}
            <motion.div
                className="spinner-center"
                variants={elementVariants}
                animate="animate"
                style={{ animationDelay: '0.8s' }}
            />

            {/* Particules flottantes */}
            <div className="spinner-particles">
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="spinner-particle"
                        style={{
                            '--particle-delay': `${i * 0.1}s`,
                            '--particle-angle': `${i * 60}deg`
                        }}
                        animate={{
                            scale: [0, 1, 0],
                            opacity: [0, 1, 0],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.1,
                            ease: "easeInOut"
                        }}
                    />
                ))}
            </div>
        </motion.div>
    );

    // Composant de spinner simple pour les cas où on veut moins d'effets
    const SimpleSpinner = () => (
        <motion.div
            className="simple-spinner"
            style={{ width: currentSize.spinner, height: currentSize.spinner }}
            animate={{ rotate: 360 }}
            transition={{
                duration: 1,
                repeat: Infinity,
                ease: "linear"
            }}
        >
            <div className="spinner-ring"></div>
        </motion.div>
    );

    // Composant de points de chargement
    const DotsSpinner = () => (
        <div className="dots-spinner">
            {[...Array(3)].map((_, i) => (
                <motion.div
                    key={i}
                    className="spinner-dot"
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.3, 1, 0.3]
                    }}
                    transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: "easeInOut"
                    }}
                />
            ))}
        </div>
    );

    // Sélectionner le type de spinner selon la variante
    const renderSpinner = () => {
        switch (variant) {
            case 'simple':
                return <SimpleSpinner />;
            case 'dots':
                return <DotsSpinner />;
            case 'frutiger':
            case 'default':
            default:
                return <FrutigerSpinner />;
        }
    };

    return (
        <div className={containerClasses} role="status" aria-live="polite">
            {/* Spinner principal */}
            <div className="spinner-element">
                {renderSpinner()}
            </div>

            {/* Texte de chargement */}
            {showText && (
                <motion.div
                    className="spinner-text"
                    style={{ fontSize: currentSize.text }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                >
                    {getDefaultText()}
                </motion.div>
            )}

            {/* Support pour screen readers */}
            <span className="sr-only">
        {text || 'Chargement en cours, veuillez patienter'}
      </span>
        </div>
    );
}

// Définir les PropTypes
LoadingSpinner.propTypes = {
    size: PropTypes.oneOf(['small', 'medium', 'large', 'xlarge']),
    text: PropTypes.string,
    variant: PropTypes.oneOf(['default', 'frutiger', 'simple', 'dots']),
    className: PropTypes.string,
    showText: PropTypes.bool,
    inline: PropTypes.bool
};

// Composant de loading pleine page
export function FullPageLoader({ text = 'Chargement de Frutiger Streaming...' }) {
    return (
        <div className="full-page-loader">
            <div className="loader-background">
                <div className="aurora-background">
                    <div className="aurora-layer aurora-layer-1"></div>
                    <div className="aurora-layer aurora-layer-2"></div>
                    <div className="aurora-layer aurora-layer-3"></div>
                </div>
            </div>

            <div className="loader-content">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    <LoadingSpinner
                        size="xlarge"
                        text={text}
                        variant="frutiger"
                    />
                </motion.div>

                {/* Logo optionnel */}
                <motion.div
                    className="loader-logo"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                >
                    <div className="logo-icon">
                        <div className="logo-glass"></div>
                        <div className="logo-text">F</div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

// Composant de loading inline pour les boutons
export function ButtonLoader({ size = 'small', className = '' }) {
    return (
        <LoadingSpinner
            size={size}
            variant="simple"
            showText={false}
            inline={true}
            className={`button-loader ${className}`}
        />
    );
}

// Composant de loading pour les cartes
export function CardLoader({ count = 1, className = '' }) {
    return (
        <div className={`card-loader-container ${className}`}>
            {[...Array(count)].map((_, i) => (
                <motion.div
                    key={i}
                    className="card-skeleton"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                >
                    <div className="skeleton-thumbnail"></div>
                    <div className="skeleton-content">
                        <div className="skeleton-title"></div>
                        <div className="skeleton-subtitle"></div>
                        <div className="skeleton-meta"></div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

export default LoadingSpinner;