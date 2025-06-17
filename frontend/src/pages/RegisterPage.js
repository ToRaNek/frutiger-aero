// frontend/src/pages/RegisterPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
    User,
    Mail,
    Lock,
    Eye,
    EyeOff,
    UserPlus,
    ArrowRight,
    CheckCircle,
    AlertCircle,
    Shield,
    Sparkles,
    Users,
    Video,
    Heart,
    Zap,
    TrendingUp,
    DollarSign,
    Star,
    Crown,
    Gift,
    Play,
    Search,
    Download,
    Globe,
    Camera,
    Headphones
} from 'lucide-react';

// Components
import RegisterForm from '../components/auth/RegisterForm';
import LoadingSpinner from '../common/LoadingSpinner';

// Utils
import { formatRelativeTime } from '../utils/formatters';
import { isValidJWT } from '../utils/helpers';

/**
 * Page d'inscription avec onboarding Frutiger Aero authentique
 * Design inspiré des interfaces des années 2000-2013
 */
const RegisterPage = () => {
    // États locaux
    const [currentStep, setCurrentStep] = useState(0);
    const [showOnboarding, setShowOnboarding] = useState(true);
    const [userType, setUserType] = useState('viewer');
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
                    const user = JSON.parse(userData);
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

    // Étapes d'onboarding avec design Frutiger Aero authentique
    const onboardingSteps = [
        {
            title: "Plongez dans l'univers Frutiger",
            description: "Redécouvrez la magie du design numérique des années 2000 avec notre plateforme de streaming nouvelle génération",
            icon: Sparkles,
            background: "linear-gradient(135deg, #87CEEB 0%, #4682B4 50%, #1E90FF 100%)",
            features: [
                "Interface glassmorphism immersive",
                "Effets visuels nostalgiques authentiques",
                "Navigation fluide et intuitive"
            ],
            particles: ["💫", "⭐", "✨", "🌟"]
        },
        {
            title: "Rejoignez une communauté créative",
            description: "Connectez-vous avec des milliers de créateurs passionnés du monde entier et partagez vos contenus uniques",
            icon: Users,
            background: "linear-gradient(135deg, #98FB98 0%, #32CD32 50%, #228B22 100%)",
            features: [
                "Plus de 10 000 créateurs actifs",
                "Communauté bienveillante et engagée",
                "Collaborations et projets créatifs"
            ],
            particles: ["🌍", "👥", "🤝", "💝"]
        },
        {
            title: "Technologie de streaming avancée",
            description: "Bénéficiez d'une technologie de pointe pour une expérience de visionnage et de création exceptionnelle",
            icon: Video,
            background: "linear-gradient(135deg, #DDA0DD 0%, #9370DB 50%, #8A2BE2 100%)",
            features: [
                "Streaming adaptatif jusqu'en 4K HDR",
                "Compression intelligente et optimisée",
                "Support multi-appareils synchronisé"
            ],
            particles: ["🎬", "📱", "💻", "📺"]
        },
        {
            title: "Votre espace personnalisé",
            description: "Créez votre univers numérique avec des playlists intelligentes, des recommandations personnalisées et bien plus",
            icon: Heart,
            background: "linear-gradient(135deg, #E0FFFF 0%, #AFEEEE 50%, #40E0D0 100%)",
            features: [
                "IA de recommandation avancée",
                "Playlists dynamiques et evolutives",
                "Synchronisation cloud sécurisée"
            ],
            particles: ["💎", "🔮", "🦋", "🌈"]
        }
    ];

    // Types d'utilisateurs avec design authentique
    const userTypes = [
        {
            id: 'viewer',
            title: 'Spectateur Passionné',
            description: 'Je veux découvrir et savourer du contenu exceptionnel',
            icon: Eye,
            features: [
                'Streaming illimité haute qualité',
                'Playlists intelligentes personnalisées',
                'Découverte par IA de recommandation',
                'Mode hors ligne premium'
            ],
            color: '#4682B4',
            gradient: "linear-gradient(135deg, #87CEEB 0%, #4682B4 100%)",
            emoji: '👁️'
        },
        {
            id: 'creator',
            title: 'Créateur Visionnaire',
            description: 'Je veux partager ma créativité avec le monde',
            icon: Camera,
            features: [
                'Studio de création intégré',
                'Analytics détaillés et insights',
                'Monétisation et revenus',
                'Outils de promotion avancés'
            ],
            color: '#32CD32',
            gradient: "linear-gradient(135deg, #98FB98 0%, #32CD32 100%)",
            emoji: '🎨'
        },
        {
            id: 'both',
            title: 'Explorateur Total',
            description: 'Je veux tout expérimenter : créer et découvrir',
            icon: Zap,
            features: [
                'Accès complet spectateur + créateur',
                'Fonctionnalités beta exclusives',
                'Support premium prioritaire',
                'Communauté créateur VIP'
            ],
            color: '#9370DB',
            gradient: "linear-gradient(135deg, #DDA0DD 0%, #9370DB 100%)",
            emoji: '⚡'
        }
    ];

    // Navigation onboarding
    const handleNextStep = () => {
        if (currentStep < onboardingSteps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            setShowOnboarding(false);
        }
    };

    const handlePrevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSkipOnboarding = () => {
        setShowOnboarding(false);
    };

    // Success callback pour le formulaire
    const handleRegisterSuccess = (userData) => {
        const redirectTo = location.state?.from?.pathname || '/';
        navigate(redirectTo, { replace: true });
    };

    // Animation variants
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
                staggerChildren: 0.1
            }
        }
    };

    const stepVariants = {
        enter: (direction) => ({
            x: direction > 0 ? 400 : -400,
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
            x: direction < 0 ? 400 : -400,
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
                <title>Inscription - Frutiger Streaming</title>
                <meta name="description" content="Rejoignez Frutiger Streaming et découvrez une nouvelle façon de partager et regarder des vidéos avec notre esthétique nostalgique." />
                <meta name="keywords" content="inscription, streaming, frutiger aero, compte, créateur" />
            </Helmet>

            <motion.div
                className="register-page min-h-screen relative overflow-hidden"
                variants={pageVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Arrière-plan Aurora avec particules */}
                <div className="auth-background fixed inset-0">
                    <div className="aurora-layer aurora-layer-1"></div>
                    <div className="aurora-layer aurora-layer-2"></div>
                    <div className="aurora-layer aurora-layer-3"></div>
                    <FloatingParticles />
                </div>

                <AnimatePresence mode="wait">
                    {showOnboarding ? (
                        <OnboardingFlow
                            steps={onboardingSteps}
                            currentStep={currentStep}
                            userTypes={userTypes}
                            userType={userType}
                            onUserTypeChange={setUserType}
                            onNext={handleNextStep}
                            onPrev={handlePrevStep}
                            onSkip={handleSkipOnboarding}
                        />
                    ) : (
                        <RegistrationFlow
                            userType={userType}
                            onSuccess={handleRegisterSuccess}
                            userTypes={userTypes}
                        />
                    )}
                </AnimatePresence>
            </motion.div>
        </>
    );
};

/**
 * Flow d'onboarding avec présentation des fonctionnalités style Frutiger Aero
 */
const OnboardingFlow = ({
                            steps,
                            currentStep,
                            userTypes,
                            userType,
                            onUserTypeChange,
                            onNext,
                            onPrev,
                            onSkip
                        }) => {
    const currentStepData = steps[currentStep];
    const IconComponent = currentStepData.icon;
    const isLastStep = currentStep === steps.length - 1;

    return (
        <motion.div
            className="onboarding-flow relative z-10 min-h-screen flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="onboarding-container flex-1 p-6">
                {/* Header avec progression style Frutiger */}
                <div className="onboarding-header flex justify-between items-center mb-8">
                    <div className="logo-section flex items-center gap-3">
                        <div className="w-12 h-12 frutiger-aurora-bg rounded-xl flex items-center justify-center">
                            <Sparkles size={24} className="text-white" />
                        </div>
                        <h1 className="frutiger-title text-2xl text-white">Frutiger Streaming</h1>
                    </div>

                    <div className="progress-section flex items-center gap-4">
                        <div className="progress-bar w-32 h-2 frutiger-glass-info rounded-full overflow-hidden">
                            <div
                                className="progress-fill h-full frutiger-aurora-bg rounded-full transition-all duration-500"
                                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                            />
                        </div>
                        <span className="progress-text text-white/80 text-sm font-medium">
                            {currentStep + 1} / {steps.length}
                        </span>
                    </div>

                    <button
                        onClick={onSkip}
                        className="skip-btn frutiger-btn frutiger-glass-info px-4 py-2 text-sm"
                    >
                        Passer
                    </button>
                </div>

                {/* Contenu principal avec animations fluides */}
                <div className="onboarding-content max-w-6xl mx-auto">
                    <AnimatePresence mode="wait" custom={currentStep}>
                        <motion.div
                            key={currentStep}
                            custom={currentStep}
                            variants={stepVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                x: { type: "spring", stiffness: 300, damping: 30 },
                                opacity: { duration: 0.3 }
                            }}
                            className="step-content"
                        >
                            <div
                                className="step-hero frutiger-glass-info p-12 rounded-3xl mb-8 text-center relative overflow-hidden"
                                style={{ background: currentStepData.background }}
                            >
                                {/* Particules flottantes dans le hero */}
                                {currentStepData.particles && (
                                    <div className="hero-particles absolute inset-0">
                                        {currentStepData.particles.map((particle, index) => (
                                            <span
                                                key={index}
                                                className="absolute text-2xl animate-bounce"
                                                style={{
                                                    left: `${15 + index * 20}%`,
                                                    top: `${10 + index * 15}%`,
                                                    animationDelay: `${index * 0.5}s`
                                                }}
                                            >
                                                {particle}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="step-icon w-24 h-24 mx-auto mb-6 frutiger-glass-info rounded-2xl flex items-center justify-center relative z-10">
                                    <IconComponent size={48} className="text-white" />
                                </div>

                                <div className="step-info relative z-10">
                                    <h2 className="frutiger-title text-4xl text-white mb-4">{currentStepData.title}</h2>
                                    <p className="text-white/90 text-lg leading-relaxed max-w-2xl mx-auto">{currentStepData.description}</p>
                                </div>
                            </div>

                            <div className="step-features grid md:grid-cols-3 gap-4 mb-8">
                                {currentStepData.features.map((feature, index) => (
                                    <motion.div
                                        key={index}
                                        className="feature-item frutiger-glass-info p-6 rounded-xl text-center"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 + 0.4 }}
                                    >
                                        <CheckCircle size={24} className="mx-auto mb-3 text-green-400" />
                                        <span className="text-white font-medium">{feature}</span>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Sélection type d'utilisateur sur dernière étape */}
                            {isLastStep && (
                                <motion.div
                                    className="user-type-selection"
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                >
                                    <h3 className="frutiger-title text-2xl text-white text-center mb-8">
                                        Choisissez votre expérience
                                    </h3>
                                    <div className="user-type-grid grid md:grid-cols-3 gap-6">
                                        {userTypes.map(type => {
                                            const TypeIcon = type.icon;
                                            return (
                                                <button
                                                    key={type.id}
                                                    onClick={() => onUserTypeChange(type.id)}
                                                    className={`user-type-card frutiger-glass-info p-6 rounded-2xl text-center transition-all duration-300 relative overflow-hidden ${
                                                        userType === type.id ? 'ring-2 ring-white scale-105' : 'hover:scale-102'
                                                    }`}
                                                    style={{
                                                        background: userType === type.id ? type.gradient : undefined
                                                    }}
                                                >
                                                    {userType === type.id && (
                                                        <div className="absolute top-2 right-2">
                                                            <CheckCircle size={20} className="text-white" />
                                                        </div>
                                                    )}

                                                    <div className="type-emoji text-4xl mb-3">{type.emoji}</div>
                                                    <div
                                                        className="type-icon w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center"
                                                        style={{ background: type.gradient }}
                                                    >
                                                        <TypeIcon size={32} className="text-white" />
                                                    </div>
                                                    <h4 className="frutiger-title text-lg text-white mb-2">{type.title}</h4>
                                                    <p className="text-white/80 text-sm mb-4">{type.description}</p>
                                                    <ul className="text-white/70 text-xs space-y-1">
                                                        {type.features.map((feature, idx) => (
                                                            <li key={idx} className="flex items-center gap-2">
                                                                <div className="w-1 h-1 bg-white/60 rounded-full"></div>
                                                                {feature}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Navigation avec style Frutiger */}
                <div className="onboarding-navigation flex justify-between items-center mt-8">
                    <button
                        onClick={onPrev}
                        disabled={currentStep === 0}
                        className="frutiger-btn frutiger-glass-info px-6 py-3 disabled:opacity-50"
                    >
                        Précédent
                    </button>

                    <div className="step-indicators flex gap-2">
                        {steps.map((_, index) => (
                            <div
                                key={index}
                                className={`step-indicator w-3 h-3 rounded-full transition-all duration-300 ${
                                    index === currentStep
                                        ? 'bg-white scale-125'
                                        : index < currentStep
                                            ? 'bg-white/60'
                                            : 'bg-white/30'
                                }`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={onNext}
                        className="frutiger-btn frutiger-btn-primary-aero px-6 py-3 flex items-center gap-2"
                    >
                        {isLastStep ? 'Commencer' : 'Suivant'}
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

/**
 * Flow d'inscription avec formulaire style Frutiger Aero
 */
const RegistrationFlow = ({ userType, onSuccess, userTypes }) => {
    const selectedType = userTypes.find(type => type.id === userType);

    return (
        <motion.div
            className="registration-flow relative z-10 min-h-screen flex"
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
        >
            {/* Panneau de gauche - Avantages avec style authentique */}
            <motion.div
                className="benefits-panel hidden lg:flex flex-col w-1/2 p-8"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
            >
                <div className="frutiger-glass-info h-full rounded-3xl p-8 flex flex-col">
                    <div className="benefits-header mb-8">
                        <div className="logo-section flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 frutiger-aurora-bg rounded-2xl flex items-center justify-center">
                                <Sparkles size={32} className="text-white" />
                            </div>
                            <div>
                                <h2 className="frutiger-title text-2xl text-white">Rejoignez-nous</h2>
                                <p className="text-white/80">Et commencez votre aventure créative</p>
                            </div>
                        </div>
                    </div>

                    {/* Type d'utilisateur sélectionné */}
                    {selectedType && (
                        <div
                            className="selected-type frutiger-glass-success p-6 rounded-2xl mb-8 relative overflow-hidden"
                            style={{ background: selectedType.gradient }}
                        >
                            <div className="flex items-center gap-4">
                                <div className="text-4xl">{selectedType.emoji}</div>
                                <div>
                                    <h3 className="frutiger-title text-xl text-white mb-1">
                                        {selectedType.title}
                                    </h3>
                                    <p className="text-white/90 text-sm">{selectedType.description}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Liste des avantages */}
                    <div className="benefits-list flex-1">
                        <h3 className="frutiger-title text-xl text-white mb-6">Vos avantages :</h3>
                        <div className="space-y-3">
                            {selectedType?.features.map((benefit, index) => (
                                <motion.div
                                    key={index}
                                    className="benefit-item flex items-center gap-3 frutiger-glass-success p-3 rounded-xl"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 + 0.4 }}
                                >
                                    <CheckCircle size={20} className="text-green-400" />
                                    <span className="text-white">{benefit}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Témoignage avec style Frutiger */}
                    <div className="testimonial frutiger-glass-success p-6 rounded-2xl mt-8">
                        <div className="testimonial-content">
                            <p className="text-white/90 mb-4 italic">
                                "Une plateforme révolutionnaire qui m'a permis de partager ma créativité
                                avec une communauté bienveillante et passionnée !"
                            </p>
                            <div className="testimonial-author flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold">M</span>
                                </div>
                                <div>
                                    <span className="author-name text-white font-medium block">Marie Dubois</span>
                                    <span className="author-type text-white/70 text-sm">Créatrice de contenu</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Panneau de droite - Formulaire */}
            <motion.div
                className="register-panel flex-1 lg:w-1/2 flex items-center justify-center p-8"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
            >
                <div className="w-full max-w-lg">
                    <div className="frutiger-glass-info p-8 rounded-3xl">
                        <div className="register-header text-center mb-8">
                            <h1 className="frutiger-title text-3xl text-white mb-2">Créer un compte</h1>
                            <p className="text-white/80">Rejoignez la communauté Frutiger Streaming</p>
                        </div>

                        {/* Formulaire d'inscription */}
                        <RegisterForm
                            onSuccess={onSuccess}
                            showLoginLink={true}
                            embedded={true}
                            userType={userType}
                        />

                        {/* Options de connexion alternatives */}
                        <div className="auth-alternatives mt-8">
                            <div className="divider flex items-center my-6">
                                <div className="flex-1 h-px bg-white/20"></div>
                                <span className="px-4 text-white/60 text-sm">ou</span>
                                <div className="flex-1 h-px bg-white/20"></div>
                            </div>

                            <div className="social-login space-y-3">
                                <button className="frutiger-btn frutiger-glass-info w-full py-3 flex items-center justify-center gap-3">
                                    <Globe size={20} className="text-blue-400" />
                                    <span className="text-white">S'inscrire avec Google</span>
                                </button>
                                <button className="frutiger-btn frutiger-glass-info w-full py-3 flex items-center justify-center gap-3">
                                    <Globe size={20} className="text-gray-400" />
                                    <span className="text-white">S'inscrire avec GitHub</span>
                                </button>
                            </div>
                        </div>

                        {/* Liens utiles */}
                        <div className="auth-links flex items-center justify-center gap-3 mt-6 text-sm">
                            <span className="text-white/80">Déjà un compte ?</span>
                            <Link to="/login" className="frutiger-link-primary flex items-center gap-1">
                                Se connecter
                                <ArrowRight size={14} />
                            </Link>
                        </div>

                        {/* Informations légales avec glassmorphism */}
                        <div className="legal-info mt-6">
                            <div className="legal-text text-center mb-4">
                                <p className="text-white/70 text-xs">
                                    En créant un compte, vous acceptez nos{' '}
                                    <Link to="/terms" className="frutiger-link-primary">Conditions d'utilisation</Link>
                                    {' '}et notre{' '}
                                    <Link to="/privacy" className="frutiger-link-primary">Politique de confidentialité</Link>.
                                </p>
                            </div>

                            <div className="security-badges grid grid-cols-2 gap-2">
                                <div className="security-badge frutiger-glass-success p-2 rounded-lg flex items-center gap-2">
                                    <Shield size={14} className="text-green-400" />
                                    <span className="text-white text-xs">Données protégées</span>
                                </div>
                                <div className="security-badge frutiger-glass-success p-2 rounded-lg flex items-center gap-2">
                                    <CheckCircle size={14} className="text-blue-400" />
                                    <span className="text-white text-xs">Email vérifié</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

/**
 * Particules flottantes pour l'ambiance Frutiger Aero
 */
const FloatingParticles = () => {
    const particles = Array.from({ length: 35 }, (_, i) => ({
        id: i,
        size: Math.random() * 10 + 4,
        x: Math.random() * 100,
        y: Math.random() * 100,
        duration: Math.random() * 30 + 20,
        delay: Math.random() * 15,
        emoji: ['💫', '⭐', '✨', '🌟', '💎', '🔮', '🦋', '🌈', '🎨', '🎬', '🎵', '💝'][Math.floor(Math.random() * 12)]
    }));

    return (
        <div className="floating-particles fixed inset-0 pointer-events-none">
            {particles.map(particle => (
                <motion.div
                    key={particle.id}
                    className="particle absolute text-white/30"
                    style={{
                        fontSize: particle.size,
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                    }}
                    animate={{
                        y: [0, -150, 0],
                        opacity: [0, 1, 0],
                        scale: [0.3, 1.5, 0.3],
                        rotate: [0, 360, 720]
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

export default RegisterPage;