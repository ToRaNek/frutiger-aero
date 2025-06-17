// frontend/src/store/authStore.js
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import authService, { AUTH_ERROR_TYPES, USER_ROLES } from '../services/authService';

/**
 * Store Zustand pour la gestion de l'authentification
 * Utilise le pattern recommandé avec actions séparées
 */
const useAuthStore = create(
    devtools(
        persist(
            (set, get) => ({
                // État initial
                user: null,
                isAuthenticated: false,
                isLoading: false,
                isInitialized: false,
                error: null,

                // États spécifiques aux opérations
                isRegistering: false,
                isLoggingIn: false,
                isRefreshing: false,
                isVerifyingEmail: false,

                // Données temporaires pour les processus multi-étapes
                pendingEmailVerification: null,
                lastLoginAttempt: null,

                // Actions d'authentification
                actions: {
                    /**
                     * Initialiser le store (vérifier si l'utilisateur est connecté)
                     */
                    async initialize() {
                        set({ isLoading: true });

                        try {
                            await authService.initialize();
                            const user = authService.getCurrentUser();

                            set({
                                user,
                                isAuthenticated: authService.isAuthenticated(),
                                isInitialized: true,
                                isLoading: false,
                                error: null
                            });
                        } catch (error) {
                            set({
                                user: null,
                                isAuthenticated: false,
                                isInitialized: true,
                                isLoading: false,
                                error: {
                                    message: 'Erreur lors de l\'initialisation',
                                    type: AUTH_ERROR_TYPES.SERVER_ERROR
                                }
                            });
                        }
                    },

                    /**
                     * Inscription d'un nouvel utilisateur
                     */
                    async register(userData) {
                        set({ isRegistering: true, error: null });

                        try {
                            const { data, error } = await authService.register(userData);

                            if (error) {
                                set({
                                    isRegistering: false,
                                    error,
                                    pendingEmailVerification: error.type !== AUTH_ERROR_TYPES.VALIDATION_ERROR ? userData.email : null
                                });
                                return { success: false, error };
                            }

                            // Inscription réussie
                            set({
                                user: data.user,
                                isAuthenticated: true,
                                isRegistering: false,
                                error: null,
                                pendingEmailVerification: data.user.isEmailVerified ? null : data.user.email
                            });

                            return { success: true, data };
                        } catch (error) {
                            const errorData = {
                                message: 'Erreur inattendue lors de l\'inscription',
                                type: AUTH_ERROR_TYPES.SERVER_ERROR
                            };

                            set({
                                isRegistering: false,
                                error: errorData
                            });

                            return { success: false, error: errorData };
                        }
                    },

                    /**
                     * Connexion utilisateur
                     */
                    async login(credentials) {
                        set({ isLoggingIn: true, error: null, lastLoginAttempt: Date.now() });

                        try {
                            const { data, error } = await authService.login(credentials);

                            if (error) {
                                set({
                                    isLoggingIn: false,
                                    error,
                                    // Incrémenter les tentatives échouées pour le rate limiting
                                    lastLoginAttempt: Date.now()
                                });
                                return { success: false, error };
                            }

                            // Connexion réussie
                            set({
                                user: data.user,
                                isAuthenticated: true,
                                isLoggingIn: false,
                                error: null,
                                pendingEmailVerification: data.user.isEmailVerified ? null : data.user.email,
                                lastLoginAttempt: null
                            });

                            return { success: true, data };
                        } catch (error) {
                            const errorData = {
                                message: 'Erreur inattendue lors de la connexion',
                                type: AUTH_ERROR_TYPES.SERVER_ERROR
                            };

                            set({
                                isLoggingIn: false,
                                error: errorData,
                                lastLoginAttempt: Date.now()
                            });

                            return { success: false, error: errorData };
                        }
                    },

                    /**
                     * Renouvellement automatique du token
                     */
                    async refreshToken() {
                        const { isRefreshing } = get();
                        if (isRefreshing) return; // Éviter les appels multiples simultanés

                        set({ isRefreshing: true });

                        try {
                            const { data, error } = await authService.refreshToken();

                            if (error) {
                                // Échec du refresh : déconnecter l'utilisateur
                                get().actions.logout();
                                set({ isRefreshing: false });
                                return { success: false, error };
                            }

                            // Refresh réussi : mettre à jour l'utilisateur
                            if (data.user) {
                                set({
                                    user: data.user,
                                    isAuthenticated: true,
                                    isRefreshing: false,
                                    error: null
                                });
                            } else {
                                set({ isRefreshing: false });
                            }

                            return { success: true, data };
                        } catch (error) {
                            get().actions.logout();
                            set({ isRefreshing: false });
                            return { success: false, error };
                        }
                    },

                    /**
                     * Déconnexion utilisateur
                     */
                    async logout() {
                        set({ isLoading: true });

                        try {
                            await authService.logout();
                        } catch (error) {
                            // Même en cas d'erreur, on déconnecte côté client
                            console.warn('Erreur lors de la déconnexion serveur:', error);
                        }

                        // Nettoyer l'état local
                        set({
                            user: null,
                            isAuthenticated: false,
                            isLoading: false,
                            error: null,
                            pendingEmailVerification: null,
                            lastLoginAttempt: null
                        });

                        return { success: true };
                    },

                    /**
                     * Vérification d'email
                     */
                    async verifyEmail(token) {
                        set({ isVerifyingEmail: true, error: null });

                        try {
                            const { data, error } = await authService.verifyEmail(token);

                            if (error) {
                                set({
                                    isVerifyingEmail: false,
                                    error
                                });
                                return { success: false, error };
                            }

                            // Mettre à jour l'utilisateur avec le statut vérifié
                            const currentUser = get().user;
                            if (currentUser) {
                                set({
                                    user: { ...currentUser, isEmailVerified: true },
                                    pendingEmailVerification: null,
                                    isVerifyingEmail: false,
                                    error: null
                                });
                            }

                            return { success: true, data };
                        } catch (error) {
                            const errorData = {
                                message: 'Erreur lors de la vérification de l\'email',
                                type: AUTH_ERROR_TYPES.SERVER_ERROR
                            };

                            set({
                                isVerifyingEmail: false,
                                error: errorData
                            });

                            return { success: false, error: errorData };
                        }
                    },

                    /**
                     * Renvoyer l'email de vérification
                     */
                    async resendVerificationEmail(email = null) {
                        const targetEmail = email || get().pendingEmailVerification || get().user?.email;

                        if (!targetEmail) {
                            const error = {
                                message: 'Aucune adresse email à vérifier',
                                type: AUTH_ERROR_TYPES.VALIDATION_ERROR
                            };
                            set({ error });
                            return { success: false, error };
                        }

                        set({ isLoading: true, error: null });

                        try {
                            const { data, error } = await authService.resendVerificationEmail(targetEmail);

                            set({ isLoading: false });

                            if (error) {
                                set({ error });
                                return { success: false, error };
                            }

                            return { success: true, data };
                        } catch (error) {
                            const errorData = {
                                message: 'Erreur lors de l\'envoi de l\'email',
                                type: AUTH_ERROR_TYPES.SERVER_ERROR
                            };

                            set({
                                isLoading: false,
                                error: errorData
                            });

                            return { success: false, error: errorData };
                        }
                    },

                    /**
                     * Récupérer les informations utilisateur actuelles
                     */
                    async refreshUserData() {
                        if (!get().isAuthenticated) return;

                        set({ isLoading: true });

                        try {
                            const { data, error } = await authService.me();

                            if (error) {
                                set({ isLoading: false, error });
                                return { success: false, error };
                            }

                            set({
                                user: data.user,
                                isLoading: false,
                                error: null
                            });

                            return { success: true, data };
                        } catch (error) {
                            set({ isLoading: false });
                            return { success: false, error };
                        }
                    },

                    /**
                     * Demande de réinitialisation de mot de passe
                     */
                    async forgotPassword(email) {
                        set({ isLoading: true, error: null });

                        try {
                            const { data, error } = await authService.forgotPassword(email);

                            set({ isLoading: false });

                            if (error) {
                                set({ error });
                                return { success: false, error };
                            }

                            return { success: true, data };
                        } catch (error) {
                            const errorData = {
                                message: 'Erreur lors de la demande de réinitialisation',
                                type: AUTH_ERROR_TYPES.SERVER_ERROR
                            };

                            set({
                                isLoading: false,
                                error: errorData
                            });

                            return { success: false, error: errorData };
                        }
                    },

                    /**
                     * Réinitialisation du mot de passe
                     */
                    async resetPassword(token, newPassword) {
                        set({ isLoading: true, error: null });

                        try {
                            const { data, error } = await authService.resetPassword(token, newPassword);

                            set({ isLoading: false });

                            if (error) {
                                set({ error });
                                return { success: false, error };
                            }

                            return { success: true, data };
                        } catch (error) {
                            const errorData = {
                                message: 'Erreur lors de la réinitialisation',
                                type: AUTH_ERROR_TYPES.SERVER_ERROR
                            };

                            set({
                                isLoading: false,
                                error: errorData
                            });

                            return { success: false, error: errorData };
                        }
                    },

                    /**
                     * Nettoyer les erreurs
                     */
                    clearError() {
                        set({ error: null });
                    },

                    /**
                     * Mettre à jour les données utilisateur localement
                     */
                    updateUser(userData) {
                        const currentUser = get().user;
                        if (currentUser) {
                            set({
                                user: { ...currentUser, ...userData }
                            });
                        }
                    },

                    /**
                     * Vérifier si l'utilisateur a une permission
                     */
                    hasPermission(permission) {
                        return authService.hasPermission(permission);
                    },

                    /**
                     * Vérifier si l'utilisateur a un rôle
                     */
                    hasRole(role) {
                        return authService.hasRole(role);
                    }
                },

                // Getters (sélecteurs)
                getters: {
                    isAdmin: () => get().user?.role === USER_ROLES.ADMIN,
                    isModerator: () => [USER_ROLES.MODERATOR, USER_ROLES.ADMIN].includes(get().user?.role),
                    isEmailVerified: () => get().user?.isEmailVerified || false,
                    canUploadVideo: () => get().getters.isEmailVerified(),
                    canCreatePlaylist: () => get().isAuthenticated,
                    canComment: () => get().getters.isEmailVerified(),
                    canModerate: () => get().getters.isModerator(),
                    getUserInitials: () => {
                        const user = get().user;
                        if (!user) return '';
                        return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
                    },
                    getFullName: () => {
                        const user = get().user;
                        if (!user) return '';
                        return `${user.firstName || ''} ${user.lastName || ''}`.trim();
                    }
                }
            }),
            {
                name: 'frutiger-auth-storage',
                // Persister seulement les données essentielles
                partialize: (state) => ({
                    user: state.user,
                    isAuthenticated: state.isAuthenticated,
                    pendingEmailVerification: state.pendingEmailVerification
                }),
                // Version pour migration future
                version: 1,
                migrate: (persistedState, version) => {
                    // Migration logic si nécessaire
                    if (version === 0) {
                        // Migrer depuis la version 0
                        return {
                            ...persistedState,
                            // Nouvelles propriétés...
                        };
                    }
                    return persistedState;
                }
            }
        ),
        {
            name: 'auth-store',
            // Activer devtools seulement en développement
            enabled: process.env.NODE_ENV === 'development'
        }
    )
);

// Hooks spécialisés pour l'authentification
export const useAuth = () => {
    const {
        user,
        isAuthenticated,
        isLoading,
        isInitialized,
        error,
        isRegistering,
        isLoggingIn,
        isRefreshing,
        isVerifyingEmail,
        pendingEmailVerification,
        actions,
        getters
    } = useAuthStore();

    return {
        // État
        user,
        isAuthenticated,
        isLoading,
        isInitialized,
        error,
        isRegistering,
        isLoggingIn,
        isRefreshing,
        isVerifyingEmail,
        pendingEmailVerification,

        // Actions
        ...actions,

        // Getters - CORRECTION: Ajout des getters dans le retour
        getters
    };
};

// Hook pour l'état d'authentification uniquement
export const useAuthState = () => {
    return useAuthStore((state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isLoading: state.isLoading,
        isInitialized: state.isInitialized
    }));
};

// Hook pour les actions d'authentification uniquement
export const useAuthActions = () => {
    return useAuthStore((state) => state.actions);
};

// Hook pour vérifier les permissions
export const usePermissions = () => {
    const { hasPermission, hasRole, getters } = useAuth();

    return {
        hasPermission,
        hasRole,
        isAdmin: getters.isAdmin(),
        isModerator: getters.isModerator(),
        isEmailVerified: getters.isEmailVerified(),
        canUploadVideo: getters.canUploadVideo(),
        canCreatePlaylist: getters.canCreatePlaylist(),
        canComment: getters.canComment(),
        canModerate: getters.canModerate()
    };
};

// Hook pour l'utilisateur connecté
export const useCurrentUser = () => {
    const { user, getters } = useAuth();

    if (!user) return null;

    return {
        ...user,
        initials: getters.getUserInitials(),
        fullName: getters.getFullName(),
        displayName: user.username || getters.getFullName() || user.email
    };
};

export default useAuthStore;

// Types d'erreurs pour TypeScript (si migration future)
export const AuthErrorTypes = AUTH_ERROR_TYPES;
export const UserRoles = USER_ROLES;