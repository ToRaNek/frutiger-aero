// frontend/src/components/auth/ProtectedRoute.js

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useProtectedRoute } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';
import { ROUTES, USER_ROLES, PERMISSIONS } from '../../utils/constants';

/**
 * Composant ProtectedRoute pour sécuriser les routes
 *
 * Props:
 * - children: React.Node - Composant à rendre si autorisé
 * - requireAuth: boolean - Nécessite une authentification (défaut: true)
 * - requiredRole: string|array - Rôle(s) requis
 * - requiredPermission: string|array - Permission(s) requise(s)
 * - requireEmailVerification: boolean - Nécessite email vérifié
 * - redirectTo: string - URL de redirection si non autorisé
 * - fallback: React.Node - Composant de fallback au lieu de redirection
 * - loadingComponent: React.Node - Composant de loading personnalisé
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

    // Utilise le hook personnalisé pour la logique de protection
    const {
        isAuthenticated,
        isInitialized,
        canAccess,
        user,
        hasRole,
        hasPermission,
        isEmailVerified
    } = useProtectedRoute(requiredPermission, requiredRole);

    // Pendant l'initialisation, affiche le loader
    if (!isInitialized) {
        return loadingComponent || (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner
                    size="large"
                    text="Vérification des permissions..."
                    variant="frutiger"
                />
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

    // Vérification des rôles
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

    // Vérification des permissions
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

    // Vérification générale d'accès
    if (!canAccess) {
        return (
            <AccessDenied
                reason="access"
                fallback={fallback}
                redirectTo={redirectTo}
            />
        );
    }

    // Tout est OK, affiche le contenu protégé
    return children;
};

/**
 * Composant pour les utilisateurs non vérifiés
 */
const EmailVerificationRequired = ({ user, currentPath }) => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-teal-500">
            <div className="w-full max-w-md p-8 glass-panel glass-strong rounded-2xl shadow-2xl backdrop-blur-md">
                <div className="text-center">
                    {/* Icône */}
                    <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 bg-yellow-100 rounded-full glass-bubble">
                        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>

                    <h2 className="mb-4 text-2xl font-bold text-white frutiger-title">
                        Vérification requise
                    </h2>

                    <p className="mb-6 text-white/90">
                        Vous devez vérifier votre adresse email pour accéder à cette page.
                        Un email de vérification a été envoyé à <strong>{user?.email}</strong>.
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={() => {
                                // Logique de renvoi d'email via hook ou service
                                window.location.href = `${ROUTES.LOGIN}?resend=true&email=${encodeURIComponent(user?.email)}`;
                            }}
                            className="w-full frutiger-btn frutiger-btn-primary py-3"
                        >
                            Renvoyer l'email
                        </button>

                        <button
                            onClick={() => {
                                window.location.href = ROUTES.LOGIN;
                            }}
                            className="w-full frutiger-btn frutiger-btn-glass py-3"
                        >
                            Retour à la connexion
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Composant pour les accès refusés
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

    // Messages selon le type de refus
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
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-500 via-pink-500 to-purple-500">
            <div className="w-full max-w-lg p-8 glass-panel glass-strong rounded-2xl shadow-2xl backdrop-blur-md">
                <div className="text-center">
                    {/* Icône d'erreur */}
                    <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full glass-shine">
                        {errorInfo.icon}
                    </div>

                    <h2 className="mb-4 text-2xl font-bold text-white frutiger-title">
                        {errorInfo.title}
                    </h2>

                    <p className="mb-8 text-white/90">
                        {errorInfo.message}
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={() => window.history.back()}
                            className="w-full frutiger-btn frutiger-btn-primary py-3"
                        >
                            Retour
                        </button>

                        <button
                            onClick={() => window.location.href = ROUTES.HOME}
                            className="w-full frutiger-btn frutiger-btn-glass py-3"
                        >
                            Accueil
                        </button>
                    </div>

                    {/* Informations de debug en développement */}
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-6 p-4 bg-black/20 rounded-lg text-left">
                            <h4 className="text-sm font-semibold text-white/80 mb-2">Debug Info:</h4>
                            <pre className="text-xs text-white/60 overflow-auto">
                {JSON.stringify({ reason, required, current }, null, 2)}
              </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Composants de convenance pour des rôles spécifiques
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

// Protection pour upload de vidéos
export const UploadRoute = ({ children, ...props }) => (
    <ProtectedRoute
        requiredPermission={PERMISSIONS.UPLOAD_VIDEO}
        requireEmailVerification={true}
        {...props}
    >
        {children}
    </ProtectedRoute>
);

// Protection pour création de playlists
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
 * Hook pour vérifier les permissions dans les composants
 */
export const useAuthGuard = () => {
    const { isAuthenticated, user, hasRole, hasPermission, isEmailVerified } = useProtectedRoute();

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