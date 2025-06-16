// frontend/src/hooks/useAuth.js
import { useEffect, useCallback, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    useAuth as useAuthStore,
    useAuthState,
    useAuthActions,
    usePermissions,
    useCurrentUser
} from '../store/authStore';

/**
 * Hook principal d'authentification avec toutes les fonctionnalités
 * Combine le store Zustand avec la logique de navigation et les effets de bord
 */
export const useAuth = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Récupérer l'état et les actions du store
    const authStore = useAuthStore();
    const permissions = usePermissions();
    const currentUser = useCurrentUser();

    // Initialisation automatique
    useEffect(() => {
        if (!authStore.isInitialized) {
            authStore.initialize();
        }
    }, [authStore.isInitialized, authStore.initialize]);

    // Redirection après connexion réussie
    useEffect(() => {
        if (authStore.isAuthenticated && location.state?.from && location.pathname === '/login') {
            const redirectTo = location.state.from.pathname || '/';
            navigate(redirectTo, { replace: true });
        }
    }, [authStore.isAuthenticated, location, navigate]);

    // Actions avec gestion d'erreur et navigation
    const enhancedActions = useMemo(() => ({
        /**
         * Connexion avec redirection automatique
         */
        login: async (credentials, redirectTo = '/') => {
            const result = await authStore.login(credentials);

            if (result.success) {
                // Redirection vers la page demandée ou l'accueil
                const targetPath = location.state?.from?.pathname || redirectTo;
                navigate(targetPath, { replace: true });
            }

            return result;
        },

        /**
         * Inscription avec redirection automatique
         */
        register: async (userData, redirectTo = '/') => {
            const result = await authStore.register(userData);

            if (result.success) {
                // Si l'email n'est pas vérifié, rediriger vers la page de vérification
                if (!result.data.user.isEmailVerified) {
                    navigate('/verify-email', {
                        state: { email: result.data.user.email },
                        replace: true
                    });
                } else {
                    navigate(redirectTo, { replace: true });
                }
            }

            return result;
        },

        /**
         * Déconnexion avec redirection
         */
        logout: async (redirectTo = '/') => {
            const result = await authStore.logout();

            if (result.success) {
                navigate(redirectTo, { replace: true });
            }

            return result;
        },

        /**
         * Vérification d'email avec redirection
         */
        verifyEmail: async (token, redirectTo = '/') => {
            const result = await authStore.verifyEmail(token);

            if (result.success) {
                navigate(redirectTo, {
                    state: { message: 'Email vérifié avec succès !' },
                    replace: true
                });
            }

            return result;
        },

        // Autres actions sans modification
        refreshToken: authStore.refreshToken,
        resendVerificationEmail: authStore.resendVerificationEmail,
        refreshUserData: authStore.refreshUserData,
        forgotPassword: authStore.forgotPassword,
        resetPassword: authStore.resetPassword,
        clearError: authStore.clearError,
        updateUser: authStore.updateUser
    }), [authStore, navigate, location]);

    // Helpers de vérification
    const checks = useMemo(() => ({
        /**
         * Vérifier si l'utilisateur peut accéder à une route protégée
         */
        canAccessRoute: (requiredPermission = null, requiredRole = null) => {
            if (!authStore.isAuthenticated) return false;

            if (requiredPermission && !permissions.hasPermission(requiredPermission)) {
                return false;
            }

            if (requiredRole && !permissions.hasRole(requiredRole)) {
                return false;
            }

            return true;
        },

        /**
         * Vérifier si l'utilisateur peut effectuer une action sur une ressource
         */
        canPerformAction: (action, resource = null) => {
            if (!authStore.isAuthenticated) return false;

            switch (action) {
                case 'upload_video':
                    return permissions.canUploadVideo;

                case 'create_playlist':
                    return permissions.canCreatePlaylist;

                case 'comment':
                    return permissions.canComment;

                case 'moderate':
                    return permissions.canModerate;

                case 'edit_resource':
                    // Vérifier si l'utilisateur est propriétaire de la ressource
                    return resource?.userId === currentUser?.id || permissions.canModerate;

                case 'delete_resource':
                    return resource?.userId === currentUser?.id || permissions.canModerate;

                default:
                    return false;
            }
        },

        /**
         * Vérifier si l'utilisateur est propriétaire d'une ressource
         */
        isOwner: (resource) => {
            return resource?.userId === currentUser?.id;
        }
    }), [authStore.isAuthenticated, permissions, currentUser]);

    return {
        // État
        ...authStore,
        currentUser,
        permissions,

        // Actions améliorées
        ...enhancedActions,

        // Helpers
        ...checks
    };
};

/**
 * Hook pour protéger des routes avec redirection automatique
 */
export const useProtectedRoute = (requiredPermission = null, requiredRole = null) => {
    const { isAuthenticated, isInitialized, canAccessRoute } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!isInitialized) return; // Attendre l'initialisation

        if (!isAuthenticated) {
            // Rediriger vers la page de connexion avec l'URL actuelle
            navigate('/login', {
                state: { from: location },
                replace: true
            });
            return;
        }

        if (!canAccessRoute(requiredPermission, requiredRole)) {
            // Rediriger vers la page d'erreur d'autorisation
            navigate('/unauthorized', { replace: true });
        }
    }, [isAuthenticated, isInitialized, canAccessRoute, navigate, location, requiredPermission, requiredRole]);

    return {
        isAuthenticated,
        isInitialized,
        canAccess: canAccessRoute(requiredPermission, requiredRole)
    };
};

/**
 * Hook pour la gestion des formulaires d'authentification
 */
export const useAuthForm = (formType = 'login') => {
    const { login, register, forgotPassword, resetPassword, error, isLoggingIn, isRegistering, clearError } = useAuth();

    // Nettoyer les erreurs quand on change de formulaire
    useEffect(() => {
        clearError();
    }, [formType, clearError]);

    const submitHandler = useCallback(async (formData) => {
        clearError();

        switch (formType) {
            case 'login':
                return await login(formData);

            case 'register':
                return await register(formData);

            case 'forgot-password':
                return await forgotPassword(formData.email);

            case 'reset-password':
                return await resetPassword(formData.token, formData.password);

            default:
                return { success: false, error: { message: 'Type de formulaire invalide' } };
        }
    }, [formType, login, register, forgotPassword, resetPassword, clearError]);

    const isLoading = useMemo(() => {
        switch (formType) {
            case 'login':
                return isLoggingIn;
            case 'register':
                return isRegistering;
            default:
                return false;
        }
    }, [formType, isLoggingIn, isRegistering]);

    return {
        submit: submitHandler,
        isLoading,
        error,
        clearError
    };
};

/**
 * Hook pour la vérification d'email
 */
export const useEmailVerification = () => {
    const {
        verifyEmail,
        resendVerificationEmail,
        pendingEmailVerification,
        isVerifyingEmail,
        error,
        clearError
    } = useAuth();

    // Timer pour le délai de renvoi
    const [canResend, setCanResend] = useState(true);
    const [resendCountdown, setResendCountdown] = useState(0);

    const resendWithCooldown = useCallback(async (email = null) => {
        if (!canResend) return { success: false, error: { message: 'Veuillez patienter avant de renvoyer' } };

        const result = await resendVerificationEmail(email);

        if (result.success) {
            // Démarrer le countdown de 60 secondes
            setCanResend(false);
            setResendCountdown(60);

            const interval = setInterval(() => {
                setResendCountdown(prev => {
                    if (prev <= 1) {
                        setCanResend(true);
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return result;
    }, [canResend, resendVerificationEmail]);

    return {
        verifyEmail,
        resendVerificationEmail: resendWithCooldown,
        pendingEmailVerification,
        isVerifyingEmail,
        error,
        clearError,
        canResend,
        resendCountdown
    };
};

/**
 * Hook pour la réinitialisation de mot de passe
 */
export const usePasswordReset = () => {
    const { forgotPassword, resetPassword, error, isLoading, clearError } = useAuth();
    const [emailSent, setEmailSent] = useState(false);
    const [resetEmail, setResetEmail] = useState('');

    const sendResetEmail = useCallback(async (email) => {
        const result = await forgotPassword(email);

        if (result.success) {
            setEmailSent(true);
            setResetEmail(email);
        }

        return result;
    }, [forgotPassword]);

    const resetWithToken = useCallback(async (token, newPassword) => {
        const result = await resetPassword(token, newPassword);

        if (result.success) {
            setEmailSent(false);
            setResetEmail('');
        }

        return result;
    }, [resetPassword]);

    return {
        sendResetEmail,
        resetPassword: resetWithToken,
        emailSent,
        resetEmail,
        error,
        isLoading,
        clearError
    };
};

/**
 * Hook pour surveiller les changements d'authentification
 */
export const useAuthListener = (callbacks = {}) => {
    const { isAuthenticated, user } = useAuthState();
    const { onLogin, onLogout, onUserChange } = callbacks;

    // Détecter les changements de connexion
    useEffect(() => {
        if (isAuthenticated && onLogin) {
            onLogin(user);
        } else if (!isAuthenticated && onLogout) {
            onLogout();
        }
    }, [isAuthenticated, user, onLogin, onLogout]);

    // Détecter les changements d'utilisateur
    useEffect(() => {
        if (user && onUserChange) {
            onUserChange(user);
        }
    }, [user, onUserChange]);
};

// Hooks simplifiés pour les cas d'usage courants
export const useIsAuthenticated = () => useAuthState().isAuthenticated;
export const useCurrentAuthUser = () => useCurrentUser();
export const useAuthPermissions = () => usePermissions();
export const useAuthHelpers = () => useActions();

export default useAuth;