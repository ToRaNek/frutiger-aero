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
    Download
} from 'lucide-react';

// Components
import RegisterForm from '../components/auth/RegisterForm';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Hooks
import { useAuth } from '../hooks/useAuth';

// Utils
import { formatRelativeTime } from '../utils/formatters';

/**
 * Page d'inscription avec onboarding Frutiger Aero
 */
const RegisterPage = () => {
    // États locaux
    const [currentStep, setCurrentStep] = useState(0);
    const [showOnboarding, setShowOnboarding] = useState(true);
    const [userType, setUserType] = useState('viewer');

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

    // Étapes d'onboarding
    const onboardingSteps = [
        {
            title: "Bienvenue dans l'univers Frutiger",
            description: "Découvrez une plateforme de streaming qui vous ramène à l'âge d'or du design numérique",
            icon: Sparkles,
            background: "linear-gradient(135deg, #0078c8 0%, #64c8dc 100%)",
            features: [
                "Design nostalgique authentique",
                "Interface glassmorphism immersive",
                "Expérience utilisateur optimisée"
            ]
        },
        {
            title: "Une communauté créative",
            description: "Rejoignez des milliers de créateurs passionnés qui partagent leurs contenus uniques",
            icon: Users,
            background: "linear-gradient(135deg, #64c8dc 0%, #b1ffd8 100%)",
            features: [
                "Plus de 10 000 créateurs actifs",
                "Contenu diversifié et original",
                "Communauté bienveillante et engagée"
            ]
        },
        {
            title: "Streaming haute qualité",
            description: "Profitez d'une technologie de pointe pour une expérience de visionnage exceptionnelle",
            icon: Video,
            background: "linear-gradient(135deg, #3f6fff 0%, #8d54ff 100%)",
            features: [
                "Streaming adaptatif jusqu'en 4K",
                "Lecture instantanée sans interruption",
                "Support multi-appareils"
            ]
        },
        {
            title: "Votre espace personnalisé",
            description: "Créez vos playlists, suivez vos créateurs préférés et découvrez du contenu recommandé",
            icon: Heart,
            background: "linear-gradient(135deg, #b1ffd8 0%, #0078c8 100%)",
            features: [
                "Playlists intelligentes",
                "Recommandations personnalisées",
                "Favoris et historique synchronisés"
            ]
        }
    ];

    // Types d'utilisateurs
    const userTypes = [
        {
            id: 'viewer',
            title: 'Spectateur',
            description: 'Je veux découvrir et regarder du contenu',
            icon: Eye,
            features: [
                'Accès illimité aux vidéos',
                'Playlists personnalisées',
                'Recommandations intelligentes',
                'Historique de visionnage'
            ],
            color: 'var(--frutiger-bright-blue)'
        },
        {
            id: 'creator',
            title: 'Créateur',
            description: 'Je veux partager mes vidéos avec la communauté',
            icon: Video,
            features: [
                'Upload de vidéos haute qualité',
                'Analytics détaillés',
                'Monétisation des contenus',
                'Outils de promotion'
            ],
            color: 'var(--frutiger-cyan)'
        },
        {
            id: 'both',
            title: 'Les deux',
            description: 'Je veux regarder et créer du contenu',
            icon: Zap,
            features: [
                'Tous les avantages spectateur',
                'Tous les outils créateur',
                'Priorité sur les nouveautés',
                'Support premium'
            ],
            color: 'var(--frutiger-mint)'
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
        // Redirection vers l'onboarding ou la page principale
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

    const stepVariants = {
        enter: (direction) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction) => ({
            zIndex: 0,
            x: direction < 0 ? 300 : -300,
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
                <title>Inscription - Frutiger Streaming</title>
                <meta name="description" content="Rejoignez Frutiger Streaming et découvrez une nouvelle façon de partager et regarder des vidéos avec notre esthétique nostalgique." />
                <meta name="keywords" content="inscription, streaming, frutiger aero, compte, créateur" />
            </Helmet>

            <motion.div
                className="register-page"
                variants={pageVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Arrière-plan Aurora */}
                <div className="auth-background">
                    <div className="aurora-layer aurora-layer-1"></div>
                    <div className="aurora-layer aurora-layer-2"></div>
                    <div className="aurora-layer aurora-layer-3"></div>
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
                        />
                    )}
                </AnimatePresence>

                {/* Particules flottantes */}
                <FloatingParticles />
            </motion.div>
        </>
    );
};

/**
 * Flow d'onboarding avec présentation des fonctionnalités
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
            className="onboarding-flow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="onboarding-container">
                {/* Header avec progression */}
                <div className="onboarding-header">
                    <div className="logo-section">
                        <Sparkles size={32} className="logo-icon" />
                        <h1 className="frutiger-gradient-text">Frutiger Streaming</h1>
                    </div>

                    <div className="progress-section">
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                            />
                        </div>
                        <span className="progress-text">
                            {currentStep + 1} / {steps.length}
                        </span>
                    </div>

                    <button
                        onClick={onSkip}
                        className="skip-btn frutiger-btn frutiger-btn-glass"
                    >
                        Passer
                    </button>
                </div>

                {/* Contenu principal */}
                <div className="onboarding-content">
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
                                opacity: { duration: 0.2 }
                            }}
                            className="step-content"
                        >
                            <div
                                className="step-hero"
                                style={{ background: currentStepData.background }}
                            >
                                <div className="step-icon glass-panel">
                                    <IconComponent size={48} />
                                </div>

                                <div className="step-info">
                                    <h2>{currentStepData.title}</h2>
                                    <p>{currentStepData.description}</p>
                                </div>
                            </div>

                            <div className="step-features">
                                {currentStepData.features.map((feature, index) => (
                                    <motion.div
                                        key={index}
                                        className="feature-item glass-panel"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 + 0.3 }}
                                    >
                                        <CheckCircle size={20} />
                                        <span>{feature}</span>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Sélection type d'utilisateur sur dernière étape */}
                            {isLastStep && (
                                <motion.div
                                    className="user-type-selection"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <h3>Quel type d'utilisateur êtes-vous ?</h3>
                                    <div className="user-type-grid">
                                        {userTypes.map(type => {
                                            const TypeIcon = type.icon;
                                            return (
                                                <button
                                                    key={type.id}
                                                    onClick={() => onUserTypeChange(type.id)}
                                                    className={`user-type-card glass-panel ${
                                                        userType === type.id ? 'selected' : ''
                                                    }`}
                                                    style={{
                                                        borderColor: userType === type.id ? type.color : 'transparent'
                                                    }}
                                                >
                                                    <div
                                                        className="type-icon"
                                                        style={{ color: type.color }}
                                                    >
                                                        <TypeIcon size={32} />
                                                    </div>
                                                    <h4>{type.title}</h4>
                                                    <p>{type.description}</p>
                                                    <ul>
                                                        {type.features.map((feature, idx) => (
                                                            <li key={idx}>{feature}</li>
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

                {/* Navigation */}
                <div className="onboarding-navigation">
                    <button
                        onClick={onPrev}
                        disabled={currentStep === 0}
                        className="frutiger-btn frutiger-btn-glass"
                    >
                        Précédent
                    </button>

                    <div className="step-indicators">
                        {steps.map((_, index) => (
                            <button
                                key={index}
                                className={`step-indicator ${index === currentStep ? 'active' : ''}`}
                                onClick={() => {/* Permettre navigation directe */}}
                            />
                        ))}
                    </div>

                    <button
                        onClick={onNext}
                        className="frutiger-btn frutiger-btn-primary"
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
 * Flow d'inscription avec formulaire
 */
const RegistrationFlow = ({ userType, onSuccess }) => {
    const [showBenefits, setShowBenefits] = useState(true);

    // Avantages selon le type d'utilisateur
    const getUserBenefits = () => {
        switch (userType) {
            case 'creator':
                return [
                    { icon: Video, text: "Upload illimité de vidéos" },
                    { icon: TrendingUp, text: "Analytics avancés" },
                    { icon: Users, text: "Gestion de communauté" },
                    { icon: DollarSign, text: "Monétisation intégrée" }
                ];
            case 'both':
                return [
                    { icon: Zap, text: "Accès complet créateur + spectateur" },
                    { icon: Star, text: "Fonctionnalités premium" },
                    { icon: Crown, text: "Support prioritaire" },
                    { icon: Gift, text: "Avantages exclusifs" }
                ];
            default:
                return [
                    { icon: Play, text: "Streaming illimité" },
                    { icon: Heart, text: "Playlists personnalisées" },
                    { icon: Search, text: "Découverte intelligente" },
                    { icon: Download, text: "Visionnage hors ligne" }
                ];
        }
    };

    return (
        <motion.div
            className="registration-flow"
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="auth-container">
                {/* Panneau de gauche - Avantages */}
                <motion.div
                    className="benefits-panel glass-panel"
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="benefits-header">
                        <div className="logo-section">
                            <Sparkles size={32} className="logo-icon" />
                            <div>
                                <h2 className="frutiger-gradient-text">Rejoignez-nous</h2>
                                <p>Et commencez votre aventure</p>
                            </div>
                        </div>
                    </div>

                    {/* Type d'utilisateur sélectionné */}
                    <div className="selected-type glass-card">
                        <h3>Profil : {userType === 'viewer' ? 'Spectateur' : userType === 'creator' ? 'Créateur' : 'Spectateur & Créateur'}</h3>
                        <button
                            onClick={() => setShowBenefits(!showBenefits)}
                            className="change-type-btn"
                        >
                            Changer
                        </button>
                    </div>

                    {/* Liste des avantages */}
                    <div className="benefits-list">
                        <h3>Vos avantages :</h3>
                        {getUserBenefits().map((benefit, index) => {
                            const IconComponent = benefit.icon;
                            return (
                                <motion.div
                                    key={index}
                                    className="benefit-item"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 + 0.4 }}
                                >
                                    <IconComponent size={20} />
                                    <span>{benefit.text}</span>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Témoignages */}
                    <div className="testimonial glass-card">
                        <div className="testimonial-content">
                            <p>"Une plateforme incroyable qui m'a permis de faire découvrir mes créations à des milliers de personnes !"</p>
                            <div className="testimonial-author">
                                <img src="/avatars/creator1.jpg" alt="Créateur" />
                                <div>
                                    <span className="author-name">Marie Dubois</span>
                                    <span className="author-type">Créatrice de contenu</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Statistiques */}
                    <div className="platform-stats">
                        <div className="stat-item">
                            <span className="stat-number">2.5M</span>
                            <span className="stat-label">Heures regardées</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">125K</span>
                            <span className="stat-label">Vidéos</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">98%</span>
                            <span className="stat-label">Satisfaction</span>
                        </div>
                    </div>
                </motion.div>

                {/* Panneau de droite - Formulaire */}
                <motion.div
                    className="register-panel glass-panel"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="register-header">
                        <h1>Créer un compte</h1>
                        <p>Rejoignez la communauté Frutiger Streaming</p>
                    </div>

                    {/* Formulaire d'inscription */}
                    <RegisterForm
                        onSuccess={onSuccess}
                        showLoginLink={true}
                        embedded={true}
                        userType={userType}
                    />

                    {/* Options de connexion alternatives */}
                    <div className="auth-alternatives">
                        <div className="divider">
                            <span>ou</span>
                        </div>

                        <div className="social-login">
                            <button className="frutiger-btn frutiger-btn-glass social-btn">
                                <img src="/icons/google.svg" alt="Google" />
                                S'inscrire avec Google
                            </button>
                            <button className="frutiger-btn frutiger-btn-glass social-btn">
                                <img src="/icons/github.svg" alt="GitHub" />
                                S'inscrire avec GitHub
                            </button>
                        </div>
                    </div>

                    {/* Liens utiles */}
                    <div className="auth-links">
                        <span>Déjà un compte ?</span>
                        <Link to="/login" className="auth-link auth-link-primary">
                            Se connecter
                            <ArrowRight size={14} />
                        </Link>
                    </div>

                    {/* Informations légales */}
                    <div className="legal-info">
                        <div className="legal-text">
                            <p>
                                En créant un compte, vous acceptez nos{' '}
                                <Link to="/terms">Conditions d'utilisation</Link>
                                {' '}et notre{' '}
                                <Link to="/privacy">Politique de confidentialité</Link>.
                            </p>
                        </div>

                        <div className="security-badges">
                            <div className="security-badge">
                                <Shield size={16} />
                                <span>Données protégées</span>
                            </div>
                            <div className="security-badge">
                                <CheckCircle size={16} />
                                <span>Email vérifié requis</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

/**
 * Particules flottantes pour l'ambiance Frutiger Aero
 */
const FloatingParticles = () => {
    const particles = Array.from({ length: 25 }, (_, i) => ({
        id: i,
        size: Math.random() * 6 + 3,
        x: Math.random() * 100,
        y: Math.random() * 100,
        duration: Math.random() * 25 + 15,
        delay: Math.random() * 10
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
                        y: [0, -120, 0],
                        opacity: [0, 0.8, 0],
                        scale: [0.3, 1.2, 0.3],
                        rotate: [0, 180, 360]
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

export default RegisterPage;