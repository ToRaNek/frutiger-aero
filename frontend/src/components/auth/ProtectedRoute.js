// frontend/src/components/auth/ProtectedRoute.js

import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';
import { ROUTES, USER_ROLES, PERMISSIONS, API_ENDPOINTS } from '../../utils/constants';
import { isValidJWT } from '../../utils/helpers';

/**
 * Composant ProtectedRoute pour sécuriser les routes
 * Corrigé selon la documentation backend fournie (JWT, User roles, permissions)
 */

const ProtectedRoute = ({
                            children,
                            requireAuth = true,
                            requiredRole = null,
                            requiredPermission = null,
                            requireEmailVerification = false,
                            redirectTo = null,
                            fallback = null,
                            loadingComponent = null
                        }) => {
    const location = useLocation();

    // États selon la documentation backend
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);

    // Vérification de l'authentification selon la doc backend
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const accessToken = localStorage.getItem('frutiger_access_token');
                const refreshToken = localStorage.getItem('frutiger_refresh_token');
                const userData = localStorage.getItem('frutiger_user');

                if (!accessToken) {
                    setIsAuthenticated(false);
                    setIsInitialized(true);
                    return;
                }

                // Vérification basique du JWT selon isValidJWT des helpers
                if (!isValidJWT(accessToken)) {
                    // Token expiré, essayer de le rafraîchir selon la doc refreshToken
                    if (refreshToken) {
                        const refreshed = await refreshAccessToken(refreshToken);
                        if (!refreshed) {
                            logout();
                            setIsAuthenticated(false);
                            setIsInitialized(true);
                            return;
                        }
                    } else {
                        logout();
                        setIsAuthenticated(false);
                        setIsInitialized(true);
                        return;
                    }
                }

                // Vérifier avec le serveur selon API_ENDPOINTS.AUTH.ME
                const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${API_ENDPOINTS.AUTH.ME}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('frutiger_access_token')}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const currentUser = await response.json();
                    setUser(currentUser);
                    setIsAuthenticated(true);

                    // Mettre à jour les données utilisateur
                    localStorage.setItem('frutiger_user', JSON.stringify(currentUser));
                } else {
                    // Token invalide côté serveur
                    logout();
                    setIsAuthenticated(false);
                }
            } catch (error) {
                console.error('Erreur vérification auth:', error);
                setError('Erreur de vérification de l\'authentification');
                setIsAuthenticated(false);
            } finally {
                setIsInitialized(true);
            }
        };

        checkAuth();
    }, []);

    // Rafraîchissement du token selon la doc backend
    const refreshAccessToken = async (refreshToken) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${API_ENDPOINTS.AUTH.REFRESH}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('frutiger_access_token', data.accessToken);
                if (data.refreshToken) {
                    localStorage.setItem('frutiger_refresh_token', data.refreshToken);
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erreur refresh token:', error);
            return false;
        }
    };

    // Déconnexion selon la doc backend
    const logout = () => {
        localStorage.removeItem('frutiger_access_token');
        localStorage.removeItem('frutiger_refresh_token');
        localStorage.removeItem('frutiger_user');
    };

    // Vérification des rôles selon USER_ROLES de la doc
    const hasRole = (role) => {
        if (!user || !user.role) return false;

        // Admin a tous les droits
        if (user.role === USER_ROLES.ADMIN) return true;

        // Vérification du rôle spécifique
        return user.role === role;
    };

    // Vérification des permissions selon PERMISSIONS de la doc
    const hasPermission = (permission) => {
        if (!user) return false;

        // Admin a toutes les permissions
        if (user.role === USER_ROLES.ADMIN) return true;

        // Vérification des permissions utilisateur
        return user.permissions && user.permissions.includes(permission);
    };

    // Vérification email selon requireEmailVerification
    const isEmailVerified = () => {
        return user && user.emailVerified;
    };

    // Pendant l'initialisation, affiche le loader
    if (!isInitialized) {
        return loadingComponent || (
            <div className="flex items-center justify-center min-h-screen frutiger-aurora-bg">
                <div className="frutiger-glass-info p-8 rounded-2xl text-center">
                    <LoadingSpinner
                        size="large"
                        className="frutiger-spinner-aero mb-4"
                    />
                    <p className="text-white frutiger-loading-text">
                        Vérification des permissions...
                    </p>
                </div>
            </div>
        );
    }

    // Si l'authentification n'est pas requise, affiche le contenu
    if (!requireAuth) {
        return children;
    }

    // Si non connecté et authentification requise
    if (!isAuthenticated) {
        // Fallback personnalisé
        if (fallback) {
            return fallback;
        }

        // Redirection vers login avec retour à la page courante
        const redirectUrl = redirectTo || ROUTES.LOGIN;
        return (
            <Navigate
                to={redirectUrl}
                state={{ from: location.pathname + location.search }}
                replace
            />
        );
    }

    // Vérification de l'email si requis
    if (requireEmailVerification && !isEmailVerified()) {
        return (
            <EmailVerificationRequired
                user={user}
                currentPath={location.pathname}
            />
        );
    }

    // Vérification des rôles selon la doc backend
    if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        const hasRequiredRole = roles.some(role => hasRole(role));

        if (!hasRequiredRole) {
            return (
                <AccessDenied
                    reason="role"
                    required={roles}
                    current={user?.role}
                    fallback={fallback}
                    redirectTo={redirectTo}
                />
            );
        }
    }

    // Vérification des permissions selon la doc backend
    if (requiredPermission) {
        const permissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
        const hasRequiredPermission = permissions.some(permission => hasPermission(permission));

        if (!hasRequiredPermission) {
            return (
                <AccessDenied
                    reason="permission"
                    required={permissions}
                    current={user?.permissions || []}
                    fallback={fallback}
                    redirectTo={redirectTo}
                />
            );
        }
    }

    // Tout est OK, affiche le contenu protégé
    return children;
};

/**
 * Composant pour les utilisateurs non vérifiés avec style Frutiger Aero
 */
const EmailVerificationRequired = ({ user, currentPath }) => {
    const [isResending, setIsResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);

    const handleResendEmail = async () => {
        setIsResending(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${API_ENDPOINTS.AUTH.RESEND_VERIFICATION}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: user.email })
            });

            if (response.ok) {
                setResendSuccess(true);
            }
        } catch (error) {
            console.error('Erreur renvoi email:', error);
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen frutiger-aurora-bg">
            <div className="w-full max-w-md p-8 frutiger-glass-info rounded-2xl text-center">
                {/* Icône avec animation Frutiger */}
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 frutiger-glass-success rounded-full">
                    <svg className="w-8 h-8 text-yellow-600 frutiger-icon-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </div>

                <h2 className="mb-4 text-2xl font-bold text-white frutiger-title">
                    Vérification requise
                </h2>

                <p className="mb-6 text-white/90 leading-relaxed">
                    Vous devez vérifier votre adresse email pour accéder à cette page.
                    Un email de vérification a été envoyé à{' '}
                    <strong className="frutiger-highlight">{user?.email}</strong>.
                </p>

                {resendSuccess && (
                    <div className="mb-4 p-3 frutiger-glass-success rounded-lg">
                        <p className="text-emerald-800 text-sm">
                            Email de vérification renvoyé avec succès !
                        </p>
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        onClick={handleResendEmail}
                        disabled={isResending}
                        className="w-full frutiger-btn frutiger-btn-primary-aero py-3"
                    >
                        {isResending ? (
                            <div className="flex items-center justify-center gap-2">
                                <LoadingSpinner size="small" className="frutiger-spinner-aero" />
                                <span>Envoi...</span>
                            </div>
                        ) : (
                            'Renvoyer l\'email'
                        )}
                    </button>

                    <button
                        onClick={() => window.location.href = ROUTES.LOGIN}
                        className="w-full frutiger-btn frutiger-glass-info py-3"
                    >
                        Retour à la connexion
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * Composant pour les accès refusés avec style Frutiger Aero
 */
const AccessDenied = ({
                          reason,
                          required = [],
                          current = null,
                          fallback = null,
                          redirectTo = null
                      }) => {
    const location = useLocation();

    // Si un fallback est fourni, l'utilise
    if (fallback) {
        return fallback;
    }

    // Si une redirection est spécifiée
    if (redirectTo) {
        return <Navigate to={redirectTo} state={{ from: location.pathname }} replace />;
    }

    // Messages selon le type de refus avec style Frutiger
    const getErrorMessage = () => {
        switch (reason) {
            case 'role':
                return {
                    title: 'Rôle insuffisant',
                    message: `Cette page nécessite un des rôles suivants : ${required.join(', ')}. Votre rôle actuel : ${current || 'aucun'}.`,
                    icon: (
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    )
                };
            case 'permission':
                return {
                    title: 'Permission insuffisante',
                    message: `Cette page nécessite une des permissions suivantes : ${required.join(', ')}.`,
                    icon: (
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )
                };
            default:
                return {
                    title: 'Accès refusé',
                    message: 'Vous n\'avez pas les permissions nécessaires pour accéder à cette page.',
                    icon: (
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                        </svg>
                    )
                };
        }
    };

    const errorInfo = getErrorMessage();

    return (
        <div className="flex items-center justify-center min-h-screen frutiger-aurora-bg">
            <div className="w-full max-w-lg p-8 frutiger-glass-error rounded-2xl text-center">
                {/* Icône d'erreur avec animation */}
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full frutiger-glass-error">
                    <div className="frutiger-icon-pulse">
                        {errorInfo.icon}
                    </div>
                </div>

                <h2 className="mb-4 text-2xl font-bold text-white frutiger-title">
                    {errorInfo.title}
                </h2>

                <p className="mb-8 text-white/90 leading-relaxed">
                    {errorInfo.message}
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => window.history.back()}
                        className="w-full frutiger-btn frutiger-btn-primary-aero py-3"
                    >
                        Retour
                    </button>

                    <button
                        onClick={() => window.location.href = ROUTES.HOME}
                        className="w-full frutiger-btn frutiger-glass-info py-3"
                    >
                        Accueil
                    </button>
                </div>

                {/* Informations de debug en développement */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-6 p-4 frutiger-glass-info rounded-lg text-left">
                        <h4 className="text-sm font-semibold text-white/80 mb-2">Debug Info:</h4>
                        <pre className="text-xs text-white/60 overflow-auto">
                            {JSON.stringify({ reason, required, current }, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * Composants de convenance pour des rôles spécifiques selon la doc backend
 */

// Protection pour admins uniquement
export const AdminRoute = ({ children, ...props }) => (
    <ProtectedRoute
        requiredRole={USER_ROLES.ADMIN}
        {...props}
    >
        {children}
    </ProtectedRoute>
);

// Protection pour modérateurs et admins
export const ModeratorRoute = ({ children, ...props }) => (
    <ProtectedRoute
        requiredRole={[USER_ROLES.MODERATOR, USER_ROLES.ADMIN]}
        {...props}
    >
        {children}
    </ProtectedRoute>
);

// Protection pour utilisateurs connectés avec email vérifié
export const VerifiedUserRoute = ({ children, ...props }) => (
    <ProtectedRoute
        requireEmailVerification={true}
        {...props}
    >
        {children}
    </ProtectedRoute>
);

// Protection pour upload de vidéos selon la doc backend
export const UploadRoute = ({ children, ...props }) => (
    <ProtectedRoute
        requiredPermission={PERMISSIONS.UPLOAD_VIDEO}
        requireEmailVerification={true}
        {...props}
    >
        {children}
    </ProtectedRoute>
);

// Protection pour création de playlists selon la doc backend
export const PlaylistCreationRoute = ({ children, ...props }) => (
    <ProtectedRoute
        requiredPermission={PERMISSIONS.CREATE_PLAYLIST}
        {...props}
    >
        {children}
    </ProtectedRoute>
);

// Route publique (ne nécessite pas d'authentification)
export const PublicRoute = ({ children, ...props }) => (
    <ProtectedRoute
        requireAuth={false}
        {...props}
    >
        {children}
    </ProtectedRoute>
);

/**
 * Hook pour vérifier les permissions dans les composants selon la doc backend
 */
export const useAuthGuard = () => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const userData = localStorage.getItem('frutiger_user');
        const accessToken = localStorage.getItem('frutiger_access_token');

        if (userData && accessToken && isValidJWT(accessToken)) {
            try {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                setIsAuthenticated(true);
            } catch (error) {
                console.error('Erreur parsing user:', error);
            }
        }
    }, []);

    const hasRole = (role) => {
        if (!user || !user.role) return false;
        if (user.role === USER_ROLES.ADMIN) return true;
        return user.role === role;
    };

    const hasPermission = (permission) => {
        if (!user) return false;
        if (user.role === USER_ROLES.ADMIN) return true;
        return user.permissions && user.permissions.includes(permission);
    };

    const isEmailVerified = () => {
        return user && user.emailVerified;
    };

    return {
        isAuthenticated,
        user,
        isAdmin: hasRole(USER_ROLES.ADMIN),
        isModerator: hasRole(USER_ROLES.MODERATOR) || hasRole(USER_ROLES.ADMIN),
        canUpload: hasPermission(PERMISSIONS.UPLOAD_VIDEO),
        canCreatePlaylist: hasPermission(PERMISSIONS.CREATE_PLAYLIST),
        canComment: hasPermission(PERMISSIONS.COMMENT),
        canModerate: hasPermission(PERMISSIONS.MODERATE),
        isEmailVerified: isEmailVerified(),
        hasRole,
        hasPermission
    };
};

export default ProtectedRoute;