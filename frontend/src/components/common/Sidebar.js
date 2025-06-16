// frontend/src/components/common/Sidebar.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Hooks
import { useAuth } from '../../hooks/useAuth';

function Sidebar({ isOpen, onClose, user }) {
    const location = useLocation();
    const { logout } = useAuth();
    const [expandedSections, setExpandedSections] = useState({
        library: true,
        subscriptions: false,
        playlists: false
    });

    // Fermer la sidebar sur changement de route
    useEffect(() => {
        if (isOpen) {
            onClose();
        }
    }, [location.pathname]);

    // Gestion de l'expansion des sections
    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Vérifier si un lien est actif
    const isActiveLink = (path) => {
        return location.pathname === path;
    };

    // Variantes d'animation pour la sidebar
    const sidebarVariants = {
        open: {
            x: 0,
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 30,
                staggerChildren: 0.05,
                delayChildren: 0.1
            }
        },
        closed: {
            x: -320,
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 30,
                staggerChildren: 0.05,
                staggerDirection: -1
            }
        }
    };

    const itemVariants = {
        open: {
            opacity: 1,
            x: 0,
            transition: { type: "spring", stiffness: 300, damping: 30 }
        },
        closed: {
            opacity: 0,
            x: -20,
            transition: { type: "spring", stiffness: 300, damping: 30 }
        }
    };

    // Navigation principale
    const mainNavItems = [
        {
            path: '/',
            label: 'Accueil',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <polyline
                        points="9,22 9,12 15,12 15,22"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )
        },
        {
            path: '/trending',
            label: 'Tendances',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <polyline
                        points="22,12 18,12 15,21 9,3 6,12 2,12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )
        },
        {
            path: '/categories',
            label: 'Catégories',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect
                        x="3"
                        y="3"
                        width="7"
                        height="7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <rect
                        x="14"
                        y="3"
                        width="7"
                        height="7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <rect
                        x="14"
                        y="14"
                        width="7"
                        height="7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <rect
                        x="3"
                        y="14"
                        width="7"
                        height="7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )
        }
    ];

    // Navigation utilisateur connecté
    const userNavItems = user ? [
        {
            path: '/upload',
            label: 'Uploader',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M12 2L12 14M12 2L7 7M12 2L17 7M5 17V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V17"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )
        },
        {
            path: '/my-videos',
            label: 'Mes vidéos',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <polygon
                        points="23 7 16 12 23 17 23 7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <rect
                        x="1"
                        y="5"
                        width="15"
                        height="14"
                        rx="2"
                        ry="2"
                        stroke="currentColor"
                        strokeWidth="2"
                    />
                </svg>
            )
        },
        {
            path: '/analytics',
            label: 'Analytics',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M18 20V10M12 20V4M6 20V14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )
        }
    ] : [];

    // Bibliothèque utilisateur
    const libraryItems = user ? [
        {
            path: '/favorites',
            label: 'Favoris',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.5783 8.50903 2.9987 7.05 2.9987C5.59096 2.9987 4.19169 3.5783 3.16 4.61C2.1283 5.6417 1.5487 7.04097 1.5487 8.5C1.5487 9.95903 2.1283 11.3583 3.16 12.39L12 21.23L20.84 12.39C21.351 11.8792 21.7563 11.2728 22.0329 10.6053C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.06211 22.0329 6.39467C21.7563 5.72723 21.351 5.1208 20.84 4.61V4.61Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )
        },
        {
            path: '/watch-later',
            label: 'À regarder plus tard',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <polyline
                        points="12,6 12,12 16,14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )
        },
        {
            path: '/history',
            label: 'Historique',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12Z"
                        stroke="currentColor"
                        strokeWidth="2"
                    />
                    <path
                        d="M12 7V12L15 15"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )
        }
    ] : [];

    // Exemple de playlists utilisateur (sera remplacé par des données réelles)
    const userPlaylists = user ? [
        { id: 1, name: 'Mes favoris Frutiger', count: 12 },
        { id: 2, name: 'Design Inspiration', count: 8 },
        { id: 3, name: 'Tuto Code', count: 15 }
    ] : [];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.aside
                    className="sidebar"
                    variants={sidebarVariants}
                    initial="closed"
                    animate="open"
                    exit="closed"
                    role="navigation"
                    aria-label="Navigation principale"
                >
                    {/* Header de la sidebar */}
                    <motion.div className="sidebar-header" variants={itemVariants}>
                        <div className="sidebar-user-info">
                            {user ? (
                                <div className="user-profile-mini">
                                    <img
                                        src={user.avatar_url || '/avatars/default.png'}
                                        alt={`Avatar de ${user.username}`}
                                        className="user-avatar-mini"
                                    />
                                    <div className="user-details">
                                        <h3 className="user-name">{user.first_name || user.username}</h3>
                                        <p className="user-email">{user.email}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="guest-welcome">
                                    <h3>Bienvenue !</h3>
                                    <p>Connectez-vous pour accéder à toutes les fonctionnalités</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Navigation principale */}
                    <div className="sidebar-content">
                        <motion.div className="sidebar-section" variants={itemVariants}>
                            <ul className="sidebar-nav">
                                {mainNavItems.map((item) => (
                                    <li key={item.path}>
                                        <Link
                                            to={item.path}
                                            className={`sidebar-link ${isActiveLink(item.path) ? 'active' : ''}`}
                                            onClick={onClose}
                                        >
                                            <span className="sidebar-icon">{item.icon}</span>
                                            <span className="sidebar-label">{item.label}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>

                        {/* Section utilisateur connecté */}
                        {user && (
                            <motion.div className="sidebar-section" variants={itemVariants}>
                                <h4 className="sidebar-section-title">Créateur</h4>
                                <ul className="sidebar-nav">
                                    {userNavItems.map((item) => (
                                        <li key={item.path}>
                                            <Link
                                                to={item.path}
                                                className={`sidebar-link ${isActiveLink(item.path) ? 'active' : ''}`}
                                                onClick={onClose}
                                            >
                                                <span className="sidebar-icon">{item.icon}</span>
                                                <span className="sidebar-label">{item.label}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        )}

                        {/* Bibliothèque */}
                        {user && (
                            <motion.div className="sidebar-section" variants={itemVariants}>
                                <button
                                    className="sidebar-section-toggle"
                                    onClick={() => toggleSection('library')}
                                    aria-expanded={expandedSections.library}
                                >
                                    <h4 className="sidebar-section-title">Bibliothèque</h4>
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        className={`section-arrow ${expandedSections.library ? 'expanded' : ''}`}
                                    >
                                        <path
                                            d="M6 9L12 15L18 9"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </button>

                                <AnimatePresence>
                                    {expandedSections.library && (
                                        <motion.ul
                                            className="sidebar-nav"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            {libraryItems.map((item) => (
                                                <li key={item.path}>
                                                    <Link
                                                        to={item.path}
                                                        className={`sidebar-link ${isActiveLink(item.path) ? 'active' : ''}`}
                                                        onClick={onClose}
                                                    >
                                                        <span className="sidebar-icon">{item.icon}</span>
                                                        <span className="sidebar-label">{item.label}</span>
                                                    </Link>
                                                </li>
                                            ))}
                                        </motion.ul>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}

                        {/* Playlists */}
                        {user && userPlaylists.length > 0 && (
                            <motion.div className="sidebar-section" variants={itemVariants}>
                                <button
                                    className="sidebar-section-toggle"
                                    onClick={() => toggleSection('playlists')}
                                    aria-expanded={expandedSections.playlists}
                                >
                                    <h4 className="sidebar-section-title">Mes playlists</h4>
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        className={`section-arrow ${expandedSections.playlists ? 'expanded' : ''}`}
                                    >
                                        <path
                                            d="M6 9L12 15L18 9"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </button>

                                <AnimatePresence>
                                    {expandedSections.playlists && (
                                        <motion.ul
                                            className="sidebar-nav sidebar-playlists"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            {userPlaylists.map((playlist) => (
                                                <li key={playlist.id}>
                                                    <Link
                                                        to={`/playlist/${playlist.id}`}
                                                        className="sidebar-link playlist-link"
                                                        onClick={onClose}
                                                    >
                            <span className="sidebar-icon">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                                                        <div className="playlist-info">
                                                            <span className="playlist-name">{playlist.name}</span>
                                                            <span className="playlist-count">{playlist.count} vidéos</span>
                                                        </div>
                                                    </Link>
                                                </li>
                                            ))}
                                            <li>
                                                <Link to="/playlists/create" className="sidebar-link create-playlist">
                          <span className="sidebar-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                              <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" />
                              <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" />
                            </svg>
                          </span>
                                                    <span className="sidebar-label">Créer une playlist</span>
                                                </Link>
                                            </li>
                                        </motion.ul>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}

                        {/* Actions */}
                        {!user && (
                            <motion.div className="sidebar-section sidebar-auth" variants={itemVariants}>
                                <div className="auth-buttons">
                                    <Link to="/login" className="btn-primary" onClick={onClose}>
                                        Se connecter
                                    </Link>
                                    <Link to="/register" className="btn-secondary" onClick={onClose}>
                                        S'inscrire
                                    </Link>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Footer de la sidebar */}
                    <motion.div className="sidebar-footer" variants={itemVariants}>
                        {user && (
                            <button
                                onClick={() => {
                                    logout();
                                    onClose();
                                }}
                                className="sidebar-logout"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path
                                        d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <polyline
                                        points="16 17 21 12 16 7"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <line
                                        x1="21"
                                        y1="12"
                                        x2="9"
                                        y2="12"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                                Se déconnecter
                            </button>
                        )}

                        <div className="sidebar-version">
                            <p>Frutiger Streaming v{process.env.REACT_APP_VERSION || '1.0.0'}</p>
                        </div>
                    </motion.div>
                </motion.aside>
            )}
        </AnimatePresence>
    );
}

export default Sidebar;