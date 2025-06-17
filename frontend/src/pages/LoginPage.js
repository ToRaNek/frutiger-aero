// frontend/src/pages/LoginPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    User,
    LogIn,
    ArrowRight,
    AlertCircle,
    CheckCircle,
    RefreshCw,
    Sparkles
} from 'lucide-react';

// Components
import LoginForm from '../components/auth/LoginForm';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Hooks
import { useAuth } from '../hooks/useAuth';

// Utils
import { formatRelativeTime } from '../utils/formatters';

/**
 * Page de connexion avec design Frutiger Aero
 */
const LoginPage = () => {
    // États locaux
    const [currentSlide, setCurrentSlide] = useState(0);
    const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(true);

    // Hooks
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isLoading } = useAuth();

    // Redirection si déjà connecté
    useEffect(() => {
        if (user && !isLoading) {
            const redirectTo = location.state?.from?.pathname || '/';
            navigate(redirectTo, { replace: true });
        }
    }, [user, isLoading, navigate, location]);

    // Carrousel de fonctionnalités
    const features = [
        {
            title: "Streaming Haute Qualité",
            description: "Profitez de vos vidéos en qualité HD avec adaptation automatique de la bande passante",
            icon: "🎬",
            gradient: "linear-gradient(135deg, #0078c8 0%, #64c8dc 100%)"
        },
        {
            title: "Playlists Intelligentes",
            description: "Créez et organisez vos contenus avec des playlists automatiques basées sur vos goûts",
            icon: "🎵",
            gradient: "linear-gradient(135deg, #64c8dc 0%, #b1ffd8 100%)"
        },
        {
            title: "Communauté Active",
            description: "Rejoignez une communauté de créateurs passionnés et découvrez du contenu unique",
            icon: "👥",
            gradient: "linear-gradient(135deg, #3f6fff 0%, #8d54ff 100%)"
        },
        {
            title: "Expérience Nostalgique",
            description: "Revivez l'époque dorée du design avec notre esthétique Frutiger Aero authentique",
            icon: "✨",
            gradient: "linear-gradient(135deg, #b1ffd8 0%, #0078c8 100%)"
        }
    ];

    // Auto-rotation du carrousel
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % features.length);
        }, 4000);

        return () => clearInterval(interval);
    }, [features.length]);

    // Animation d'accueil
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowWelcomeAnimation(false);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    // Success callback pour le formulaire
    const handleLoginSuccess = (userData) => {
        const redirectTo = location.state?.from?.pathname || '/';
        navigate(redirectTo, { replace: true });
    };

    // Animation variants
    const pageVariants = {
        hidden: {
            opacity: 0,
            scale: 0.95
        },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                duration: 0.6,
                ease: "easeOut",
                staggerChildren: 0.1
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

    const slideVariants = {
        enter: (direction) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0
        })
    };

    // Si en cours de chargement initial
    if (isLoading) {
        return (
            <div className="auth-loading">
                <LoadingSpinner size="large" text="Vérification de l'authentification..." />
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>Connexion - Frutiger Streaming</title>
                <meta name="description" content="Connectez-vous à votre compte Frutiger Streaming pour accéder à vos vidéos, playlists et fonctionnalités personnalisées." />
                <meta name="robots" content="noindex" />
            </Helmet>

            <motion.div
                className="login-page"
                variants={pageVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Animation d'accueil */}
                {showWelcomeAnimation && (
                    <motion.div
                        className="welcome-animation"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="welcome-content frutiger-aurora-bg">
                            <Sparkles size={64} className="welcome-icon" />
                            <h1 className="welcome-title frutiger-gradient-text">
                                Bienvenue sur Frutiger Streaming
                            </h1>
                            <div className="welcome-loader">
                                <div className="frutiger-loading-aurora"></div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Arrière-plan Aurora */}
                <div className="auth-background">
                    <div className="aurora-layer aurora-layer-1"></div>
                    <div className="aurora-layer aurora-layer-2"></div>
                    <div className="aurora-layer aurora-layer-3"></div>
                </div>

                <div className="auth-container">
                    {/* Panneau de gauche - Fonctionnalités */}
                    <motion.div
                        className="features-panel glass-panel"
                        variants={itemVariants}
                    >
                        <div className="features-header">
                            <div className="logo-section">
                                <div className="logo-icon frutiger-gradient-bg">
                                    <Sparkles size={32} />
                                </div>
                                <div className="logo-text">
                                    <h2 className="frutiger-gradient-text">Frutiger Streaming</h2>
                                    <p>L'esthétique des années 2000, réinventée</p>
                                </div>
                            </div>
                        </div>

                        {/* Carrousel de fonctionnalités */}
                        <div className="features-carousel">
                            <div className="carousel-container">
                                {features.map((feature, index) => (
                                    <motion.div
                                        key={index}
                                        className={`feature-slide ${index === currentSlide ? 'active' : ''}`}
                                        variants={slideVariants}
                                        initial="enter"
                                        animate={index === currentSlide ? "center" : "exit"}
                                        custom={index - currentSlide}
                                        transition={{
                                            x: { type: "spring", stiffness: 300, damping: 30 },
                                            opacity: { duration: 0.2 }
                                        }}
                                    >
                                        <div
                                            className="feature-icon"
                                            style={{ background: feature.gradient }}
                                        >
                                            <span>{feature.icon}</span>
                                        </div>
                                        <h3>{feature.title}</h3>
                                        <p>{feature.description}</p>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Indicateurs du carrousel */}
                            <div className="carousel-indicators">
                                {features.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentSlide(index)}
                                        className={`indicator ${index === currentSlide ? 'active' : ''}`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Statistiques */}
                        <div className="platform-stats">
                            <div className="stat-item">
                                <span className="stat-number">10K+</span>
                                <span className="stat-label">Créateurs</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">125K</span>
                                <span className="stat-label">Vidéos</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">2.5M</span>
                                <span className="stat-label">Heures visionnées</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Panneau de droite - Formulaire de connexion */}
                    <motion.div
                        className="login-panel glass-panel"
                        variants={itemVariants}
                    >
                        <div className="login-header">
                            <h1>Connexion</h1>
                            <p>Bon retour ! Connectez-vous à votre compte.</p>
                        </div>

                        {/* Message de redirection */}
                        {location.state?.from && (
                            <motion.div
                                className="redirect-notice glass-notification"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <AlertCircle size={16} />
                                <span>Veuillez vous connecter pour accéder à cette page</span>
                            </motion.div>
                        )}

                        {/* Formulaire de connexion */}
                        <LoginForm
                            onSuccess={handleLoginSuccess}
                            showRegisterLink={true}
                            embedded={true}
                        />

                        {/* Options de connexion alternatives */}
                        <div className="auth-alternatives">
                            <div className="divider">
                                <span>ou</span>
                            </div>

                            <div className="social-login">
                                <button className="frutiger-btn frutiger-btn-glass social-btn">
                                    <img src="/icons/google.svg" alt="Google" />
                                    Continuer avec Google
                                </button>
                                <button className="frutiger-btn frutiger-btn-glass social-btn">
                                    <img src="/icons/github.svg" alt="GitHub" />
                                    Continuer avec GitHub
                                </button>
                            </div>
                        </div>

                        {/* Liens utiles */}
                        <div className="auth-links">
                            <Link to="/forgot-password" className="auth-link">
                                Mot de passe oublié ?
                            </Link>
                            <div className="auth-divider">•</div>
                            <Link to="/register" className="auth-link auth-link-primary">
                                Créer un compte
                                <ArrowRight size={14} />
                            </Link>
                        </div>

                        {/* Informations de sécurité */}
                        <div className="security-info">
                            <div className="security-badge">
                                <CheckCircle size={16} />
                                <span>Connexion sécurisée SSL</span>
                            </div>
                            <div className="security-badge">
                                <CheckCircle size={16} />
                                <span>Données protégées RGPD</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Footer */}
                <motion.footer
                    className="auth-footer"
                    variants={itemVariants}
                >
                    <div className="footer-content">
                        <div className="footer-links">
                            <Link to="/terms">Conditions d'utilisation</Link>
                            <Link to="/privacy">Politique de confidentialité</Link>
                            <Link to="/help">Centre d'aide</Link>
                        </div>
                        <div className="footer-copyright">
                            <p>&copy; 2025 Frutiger Streaming. Tous droits réservés.</p>
                            <p>Dernière mise à jour: {formatRelativeTime(new Date())}</p>
                        </div>
                    </div>
                </motion.footer>

                {/* Particules flottantes pour l'effet Frutiger */}
                <FloatingParticles />
            </motion.div>
        </>
    );
};

/**
 * Particules flottantes pour l'ambiance Frutiger Aero
 */
const FloatingParticles = () => {
    const particles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        size: Math.random() * 4 + 2,
        x: Math.random() * 100,
        y: Math.random() * 100,
        duration: Math.random() * 20 + 10,
        delay: Math.random() * 5
    }));

    return (
        <div className="floating-particles">
            {particles.map(particle => (
                <motion.div
                    key={particle.id}
                    className="particle"
                    style={{
                        width: particle.size,
                        height: particle.size,
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                    }}
                    animate={{
                        y: [0, -100, 0],
                        opacity: [0, 1, 0],
                        scale: [0.5, 1, 0.5]
                    }}
                    transition={{
                        duration: particle.duration,
                        delay: particle.delay,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            ))}
        </div>
    );
};

export default LoginPage;