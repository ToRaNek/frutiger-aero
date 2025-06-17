// frontend/src/App.js
import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';

// Layout Components
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import Sidebar from './components/common/Sidebar';
import LoadingSpinner from './components/common/LoadingSpinner';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import VideoPage from './pages/VideoPage';
import PlaylistPage from './pages/PlaylistPage';
import UploadPage from './pages/UploadPage';
import SearchPage from './pages/SearchPage';

// Route Protection
import ProtectedRoute from './components/auth/ProtectedRoute';

// Hooks corrigés selon la documentation backend
import { useAuth } from './hooks/useAuth';

// Styles
import './styles/components/header.css';
import './styles/components/cards.css';
import './styles/components/forms.css';
import './styles/components/video-player.css';

function App() {
    const location = useLocation();
    // Utilisation du hook useAuth corrigé selon authStore.js
    const { user, isLoading: authLoading, isInitialized, actions } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Initialisation de l'application selon la doc backend
    useEffect(() => {
        const initApp = async () => {
            try {
                // Initialisation selon authStore.js
                if (!isInitialized) {
                    await actions.initialize();
                }
            } catch (error) {
                console.error('Error during app initialization:', error);
            }
        };

        initApp();
    }, [isInitialized, actions]);

    // Gestion de la fermeture de la sidebar sur changement de route
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    // Gestion de la fermeture de la sidebar sur clic extérieur
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sidebarOpen && !event.target.closest('.sidebar') && !event.target.closest('.sidebar-toggle')) {
                setSidebarOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [sidebarOpen]);

    // Gestion du scroll smooth entre les routes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [location.pathname]);

    // Classes CSS dynamiques pour le layout
    const getLayoutClasses = () => {
        const baseClasses = 'app-container frutiger-theme';
        const authPages = ['/login', '/register'];
        const isAuthPage = authPages.includes(location.pathname);

        return [
            baseClasses,
            isAuthPage && 'auth-layout',
            sidebarOpen && 'sidebar-open',
            user && 'authenticated',
        ].filter(Boolean).join(' ');
    };

    // Définition des routes qui ne nécessitent pas le header/footer
    const isAuthPage = ['/login', '/register'].includes(location.pathname);

    // Affichage du loader pendant l'initialisation selon authStore.js
    if (!isInitialized || authLoading) {
        return (
            <div className="app-initializing">
                <LoadingSpinner size="large" text="Initialisation de Frutiger Streaming..." />
            </div>
        );
    }

    return (
        <div className={getLayoutClasses()}>
            {/* Meta tags dynamiques */}
            <Helmet>
                <title>Frutiger Streaming - Plateforme de streaming avec esthétique Frutiger Aero</title>
                <meta
                    name="description"
                    content="Découvrez Frutiger Streaming, la plateforme de streaming vidéo inspirée de l'esthétique Frutiger Aero des années 2000. Uploadez, regardez et partagez vos vidéos dans un environnement nostalgique et moderne."
                />
                <meta name="keywords" content="streaming, vidéo, frutiger aero, 2000s, aesthetic, nostalgie, upload, playlist" />
                <meta name="author" content="Frutiger Streaming Team" />
                <meta property="og:type" content="website" />
                <meta property="og:title" content="Frutiger Streaming" />
                <meta property="og:description" content="Plateforme de streaming avec esthétique Frutiger Aero" />
                <meta property="og:image" content="/og-image.jpg" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="theme-color" content="#0078c8" />
            </Helmet>

            {/* Background Aurora Effect authentique Frutiger Aero */}
            <div className="aurora-background" aria-hidden="true">
                <div className="aurora-layer aurora-layer-1"></div>
                <div className="aurora-layer aurora-layer-2"></div>
                <div className="aurora-layer aurora-layer-3"></div>
            </div>

            {/* Sidebar - Visible seulement si connecté et pas sur page auth */}
            {user && !isAuthPage && (
                <Sidebar
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    user={user}
                />
            )}

            {/* Layout principal */}
            <div className="main-layout">
                {/* Header - Masqué sur les pages d'auth */}
                {!isAuthPage && (
                    <Header
                        user={user}
                        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                        sidebarOpen={sidebarOpen}
                    />
                )}

                {/* Contenu principal avec animations de transition */}
                <main className="main-content" role="main">
                    <AnimatePresence mode="wait" initial={false}>
                        <Routes location={location} key={location.pathname}>
                            {/* Routes publiques */}
                            <Route
                                path="/"
                                element={<HomePage />}
                            />

                            <Route
                                path="/login"
                                element={<LoginPage />}
                            />

                            <Route
                                path="/register"
                                element={<RegisterPage />}
                            />

                            <Route
                                path="/search"
                                element={<SearchPage />}
                            />

                            <Route
                                path="/video/:id"
                                element={<VideoPage />}
                            />

                            <Route
                                path="/playlist/:id"
                                element={<PlaylistPage />}
                            />

                            <Route
                                path="/user/:username"
                                element={<ProfilePage />}
                            />

                            {/* Routes protégées selon ProtectedRoute.js corrigé */}
                            <Route
                                path="/upload"
                                element={
                                    <ProtectedRoute>
                                        <UploadPage />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/profile"
                                element={
                                    <ProtectedRoute>
                                        <ProfilePage />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Route 404 */}
                            <Route
                                path="*"
                                element={
                                    <div className="page-container">
                                        <div className="error-page">
                                            <div className="glass-panel error-content">
                                                <h1 className="error-title">404</h1>
                                                <h2 className="error-subtitle">Page non trouvée</h2>
                                                <p className="error-description">
                                                    La page que vous recherchez n'existe pas ou a été déplacée.
                                                </p>
                                                <div className="error-actions">
                                                    <button
                                                        onClick={() => window.history.back()}
                                                        className="btn-secondary"
                                                    >
                                                        Retour
                                                    </button>
                                                    <a href="/" className="btn-primary">
                                                        Accueil
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                }
                            />
                        </Routes>
                    </AnimatePresence>
                </main>

                {/* Footer - Masqué sur les pages d'auth */}
                {!isAuthPage && <Footer />}
            </div>

            {/* Overlay pour la sidebar mobile */}
            {sidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Skip Links pour l'accessibilité */}
            <div className="skip-links">
                <a href="#main-content" className="skip-link">
                    Aller au contenu principal
                </a>
                <a href="#navigation" className="skip-link">
                    Aller à la navigation
                </a>
            </div>

            {/* Indicateurs de développement */}
            {process.env.NODE_ENV === 'development' && (
                <div className="dev-indicators">
                    <div className="dev-indicator auth-status">
                        {user ? `👤 ${user.username}` : '🔓 Non connecté'}
                    </div>
                    <div className="dev-indicator route-info">
                        📍 {location.pathname}
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;