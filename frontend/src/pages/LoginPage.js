// frontend/src/pages/LoginPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
    ArrowRight,
    CheckCircle,
    Sparkles,
    Shield,
    Globe,
    Users,
    Play,
    Heart
} from 'lucide-react';

// Components
import LoginForm from '../components/auth/LoginForm';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Utils
import { isValidJWT } from '../utils/helpers';

/**
 * Page de connexion avec design Frutiger Aero authentique
 * Inspirée des interfaces des années 2000-2013
 */
const LoginPage = () => {
    // États locaux
    const [currentSlide, setCurrentSlide] = useState(0);
    const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    // Hooks
    const navigate = useNavigate();
    const location = useLocation();

    // Vérification si déjà connecté selon la doc backend
    useEffect(() => {
        const checkExistingAuth = () => {
            const accessToken = localStorage.getItem('frutiger_access_token');
            const userData = localStorage.getItem('frutiger_user');

            if (accessToken && isValidJWT(accessToken) && userData) {
                try {
                    JSON.parse(userData); // Vérifier que les données sont valides
                    const redirectTo = location.state?.from?.pathname || '/';
                    navigate(redirectTo, { replace: true });
                    return;
                } catch (error) {
                    console.error('Erreur parsing user data:', error);
                    // Nettoyer les données corrompues
                    localStorage.removeItem('frutiger_access_token');
                    localStorage.removeItem('frutiger_refresh_token');
                    localStorage.removeItem('frutiger_user');
                }
            }
            setIsLoading(false);
        };

        checkExistingAuth();
    }, [navigate, location]);

    // Carrousel de fonctionnalités avec style Frutiger Aero authentique
    const features = [
        {
            title: "Streaming Cristallin",
            description: "Découvrez une qualité vidéo exceptionnelle avec notre technologie de streaming adaptive qui s'adapte automatiquement à votre connexion",
            icon: "🌊",
            gradient: "linear-gradient(135deg, #87CEEB 0%, #4682B4 50%, #1E90FF 100%)",
            particles: ["💫", "⭐", "✨"]
        },
        {
            title: "Univers Connecté",
            description: "Rejoignez une communauté mondiale de créateurs passionnés et découvrez des contenus uniques du monde entier",
            icon: "🌍",
            gradient: "linear-gradient(135deg, #98FB98 0%, #32CD32 50%, #228B22 100%)",
            particles: ["🌟", "💎", "🔮"]
        },
        {
            title: "Playlists Intelligentes",
            description: "Organisez votre univers multimédia avec des playlists automatiques qui évoluent selon vos goûts et préférences",
            icon: "🎵",
            gradient: "linear-gradient(135deg, #DDA0DD 0%, #9370DB 50%, #8A2BE2 100%)",
            particles: ["🎶", "💝", "🌺"]
        },
        {
            title: "Nostalgie Digitale",
            description: "Revivez l'âge d'or du design numérique avec notre interface Frutiger Aero authentique et ses effets visuels immersifs",
            icon: "✨",
            gradient: "linear-gradient(135deg, #E0FFFF 0%, #AFEEEE 50%, #40E0D0 100%)",
            particles: ["🦋", "🌈", "💫"]
        }
    ];

    // Auto-rotation du carrousel avec délai plus long pour apprécier les détails
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % features.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [features.length]);

    // Animation d'accueil
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowWelcomeAnimation(false);
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    // Success callback pour le formulaire
    const handleLoginSuccess = (userData) => {
        const redirectTo = location.state?.from?.pathname || '/';
        navigate(redirectTo, { replace: true });
    };

    // Animation variants Frutiger
    const pageVariants = {
        hidden: {
            opacity: 0,
            scale: 0.98
        },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                duration: 0.8,
                ease: "easeOut",
                staggerChildren: 0.15
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                ease: "easeOut"
            }
        }
    };

    const slideVariants = {
        enter: (direction) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0,
            scale: 0.95
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1
        },
        exit: (direction) => ({
            zIndex: 0,
            x: direction < 0 ? 300 : -300,
            opacity: 0,
            scale: 0.95
        })
    };

    // Si en cours de chargement initial
    if (isLoading) {
        return (
            <div className="auth-loading flex items-center justify-center min-h-screen frutiger-aurora-bg">
                <div className="frutiger-glass-info p-8 rounded-2xl text-center">
                    <LoadingSpinner size="large" className="frutiger-spinner-aero mb-4" />
                    <p className="text-white frutiger-loading-text">
                        Vérification de l'authentification...
                    </p>
                </div>
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
                className="login-page min-h-screen relative overflow-hidden"
                variants={pageVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Animation d'accueil avec style Frutiger */}
                {showWelcomeAnimation && (
                    <motion.div
                        className="welcome-animation fixed inset-0 z-50 frutiger-aurora-bg flex items-center justify-center"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="welcome-content frutiger-glass-info p-12 rounded-3xl text-center max-w-md">
                            <Sparkles size={80} className="welcome-icon mx-auto mb-6 text-blue-400 frutiger-icon-pulse" />
                            <h1 className="welcome-title frutiger-title text-3xl mb-4">
                                Bienvenue sur Frutiger
                            </h1>
                            <div className="welcome-loader">
                                <div className="frutiger-spinner-aero mx-auto"></div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Arrière-plan Aurora avec particules flottantes */}
                <div className="auth-background fixed inset-0">
                    <div className="aurora-layer aurora-layer-1"></div>
                    <div className="aurora-layer aurora-layer-2"></div>
                    <div className="aurora-layer aurora-layer-3"></div>
                    <FloatingParticles />
                </div>

                <div className="auth-container relative z-10 min-h-screen flex">
                    {/* Panneau de gauche - Fonctionnalités avec style Frutiger authentique */}
                    <motion.div
                        className="features-panel hidden lg:flex flex-col w-1/2 p-8"
                        variants={itemVariants}
                    >
                        <div className="frutiger-glass-info h-full rounded-3xl p-8 flex flex-col">
                            {/* Header avec logo Frutiger */}
                            <div className="features-header mb-8">
                                <div className="logo-section flex items-center gap-4">
                                    <div className="logo-icon w-16 h-16 frutiger-aurora-bg rounded-2xl flex items-center justify-center">
                                        <Sparkles size={32} className="text-white" />
                                    </div>
                                    <div className="logo-text">
                                        <h2 className="frutiger-title text-2xl text-white">Frutiger Streaming</h2>
                                        <p className="text-white/80">L'esthétique des années 2000, réinventée</p>
                                    </div>
                                </div>
                            </div>

                            {/* Carrousel de fonctionnalités avec design authentique */}
                            <div className="features-carousel flex-1 flex flex-col justify-center">
                                <div className="carousel-container relative h-80 mb-8">
                                    {features.map((feature, index) => (
                                        <motion.div
                                            key={index}
                                            className={`feature-slide absolute inset-0 flex flex-col justify-center text-center ${
                                                index === currentSlide ? 'z-10' : 'z-0'
                                            }`}
                                            variants={slideVariants}
                                            initial="enter"
                                            animate={index === currentSlide ? "center" : "exit"}
                                            custom={index - currentSlide}
                                            transition={{
                                                x: { type: "spring", stiffness: 300, damping: 30 },
                                                opacity: { duration: 0.4 },
                                                scale: { duration: 0.4 }
                                            }}
                                        >
                                            <div
                                                className="feature-icon w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center text-4xl relative overflow-hidden"
                                                style={{ background: feature.gradient }}
                                            >
                                                <span className="relative z-10">{feature.icon}</span>
                                                <div className="absolute inset-0 bg-white/20"></div>
                                                {/* Particules flottantes dans l'icône */}
                                                {feature.particles.map((particle, pIndex) => (
                                                    <span
                                                        key={pIndex}
                                                        className="absolute text-sm animate-bounce"
                                                        style={{
                                                            left: `${20 + pIndex * 25}%`,
                                                            top: `${15 + pIndex * 20}%`,
                                                            animationDelay: `${pIndex * 0.5}s`
                                                        }}
                                                    >
                                                        {particle}
                                                    </span>
                                                ))}
                                            </div>
                                            <h3 className="frutiger-title text-xl text-white mb-4">{feature.title}</h3>
                                            <p className="text-white/90 leading-relaxed px-4">{feature.description}</p>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Indicateurs du carrousel avec style glassmorphism */}
                                <div className="carousel-indicators flex justify-center gap-3">
                                    {features.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setCurrentSlide(index)}
                                            className={`indicator w-3 h-3 rounded-full transition-all duration-300 ${
                                                index === currentSlide
                                                    ? 'bg-white scale-125 shadow-lg'
                                                    : 'bg-white/40 hover:bg-white/60'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Statistiques avec style Frutiger */}
                            <div className="platform-stats grid grid-cols-3 gap-4 mt-8">
                                <div className="stat-item frutiger-glass-success p-4 rounded-xl text-center">
                                    <div className="stat-icon mb-2">
                                        <Users size={24} className="mx-auto text-blue-400" />
                                    </div>
                                    <span className="stat-number block text-lg font-bold text-white">10K+</span>
                                    <span className="stat-label text-xs text-white/80">Créateurs</span>
                                </div>
                                <div className="stat-item frutiger-glass-success p-4 rounded-xl text-center">
                                    <div className="stat-icon mb-2">
                                        <Play size={24} className="mx-auto text-green-400" />
                                    </div>
                                    <span className="stat-number block text-lg font-bold text-white">125K</span>
                                    <span className="stat-label text-xs text-white/80">Vidéos</span>
                                </div>
                                <div className="stat-item frutiger-glass-success p-4 rounded-xl text-center">
                                    <div className="stat-icon mb-2">
                                        <Heart size={24} className="mx-auto text-pink-400" />
                                    </div>
                                    <span className="stat-number block text-lg font-bold text-white">2.5M</span>
                                    <span className="stat-label text-xs text-white/80">Heures</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Panneau de droite - Formulaire de connexion */}
                    <motion.div
                        className="login-panel flex-1 lg:w-1/2 flex items-center justify-center p-8"
                        variants={itemVariants}
                    >
                        <div className="w-full max-w-md">
                            <div className="frutiger-glass-info p-8 rounded-3xl">
                                <div className="login-header text-center mb-8">
                                    <h1 className="frutiger-title text-3xl text-white mb-2">Connexion</h1>
                                    <p className="text-white/80">Bon retour ! Connectez-vous à votre compte.</p>
                                </div>

                                {/* Message de redirection avec style Frutiger */}
                                {location.state?.from && (
                                    <motion.div
                                        className="redirect-notice frutiger-glass-info p-4 rounded-xl mb-6 flex items-center gap-2"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <CheckCircle size={16} className="text-yellow-400" />
                                        <span className="text-white/90 text-sm">Veuillez vous connecter pour accéder à cette page</span>
                                    </motion.div>
                                )}

                                {/* Formulaire de connexion */}
                                <LoginForm
                                    onSuccess={handleLoginSuccess}
                                    showRegisterLink={true}
                                    embedded={true}
                                />

                                {/* Options de connexion alternatives avec style Frutiger */}
                                <div className="auth-alternatives mt-8">
                                    <div className="divider flex items-center my-6">
                                        <div className="flex-1 h-px bg-white/20"></div>
                                        <span className="px-4 text-white/60 text-sm">ou</span>
                                        <div className="flex-1 h-px bg-white/20"></div>
                                    </div>

                                    <div className="social-login space-y-3">
                                        <button className="frutiger-btn frutiger-glass-info w-full py-3 flex items-center justify-center gap-3">
                                            <Globe size={20} className="text-blue-400" />
                                            <span className="text-white">Continuer avec Google</span>
                                        </button>
                                        <button className="frutiger-btn frutiger-glass-info w-full py-3 flex items-center justify-center gap-3">
                                            <Globe size={20} className="text-gray-400" />
                                            <span className="text-white">Continuer avec GitHub</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Liens utiles avec style Frutiger */}
                                <div className="auth-links flex items-center justify-center gap-3 mt-6 text-sm">
                                    <Link to="/forgot-password" className="frutiger-link-primary">
                                        Mot de passe oublié ?
                                    </Link>
                                    <div className="text-white/40">•</div>
                                    <Link to="/register" className="frutiger-link-primary flex items-center gap-1">
                                        Créer un compte
                                        <ArrowRight size={14} />
                                    </Link>
                                </div>

                                {/* Informations de sécurité avec glassmorphism */}
                                <div className="security-info grid grid-cols-2 gap-2 mt-6">
                                    <div className="security-badge frutiger-glass-success p-2 rounded-lg flex items-center gap-2">
                                        <CheckCircle size={14} className="text-green-400" />
                                        <span className="text-white text-xs">SSL sécurisé</span>
                                    </div>
                                    <div className="security-badge frutiger-glass-success p-2 rounded-lg flex items-center gap-2">
                                        <Shield size={14} className="text-blue-400" />
                                        <span className="text-white text-xs">RGPD conforme</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Footer avec style Frutiger */}
                <motion.footer
                    className="auth-footer absolute bottom-0 left-0 right-0 z-10 p-6"
                    variants={itemVariants}
                >
                    <div className="footer-content frutiger-glass-info p-4 rounded-xl text-center">
                        <div className="footer-links flex justify-center gap-6 text-sm mb-2">
                            <Link to="/terms" className="frutiger-link-primary">Conditions d'utilisation</Link>
                            <Link to="/privacy" className="frutiger-link-primary">Politique de confidentialité</Link>
                            <Link to="/help" className="frutiger-link-primary">Centre d'aide</Link>
                        </div>
                        <div className="footer-copyright text-white/60 text-xs">
                            <p>&copy; 2025 Frutiger Streaming. Tous droits réservés.</p>
                        </div>
                    </div>
                </motion.footer>
            </motion.div>
        </>
    );
};

/**
 * Particules flottantes pour l'ambiance Frutiger Aero authentique
 */
const FloatingParticles = () => {
    const particles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        size: Math.random() * 8 + 3,
        x: Math.random() * 100,
        y: Math.random() * 100,
        duration: Math.random() * 25 + 15,
        delay: Math.random() * 10,
        emoji: ['💫', '⭐', '✨', '🌟', '💎', '🔮', '🦋', '🌈'][Math.floor(Math.random() * 8)]
    }));

    return (
        <div className="floating-particles fixed inset-0 pointer-events-none">
            {particles.map(particle => (
                <motion.div
                    key={particle.id}
                    className="particle absolute text-white/20"
                    style={{
                        fontSize: particle.size,
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                    }}
                    animate={{
                        y: [0, -120, 0],
                        opacity: [0, 0.8, 0],
                        scale: [0.5, 1.2, 0.5],
                        rotate: [0, 180, 360]
                    }}
                    transition={{
                        duration: particle.duration,
                        delay: particle.delay,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                >
                    {particle.emoji}
                </motion.div>
            ))}
        </div>
    );
};

export default LoginPage;