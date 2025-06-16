// frontend/src/services/authService.js
import { ApiHelpers, TokenStorage, MemoryCache, ENDPOINTS } from './api';

/**
 * Service d'authentification utilisant les endpoints du backend
 * Respecte exactement les noms de méthodes du backend authController
 */
class AuthService {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
    }

    /**
     * Inscription d'un nouvel utilisateur
     * Endpoint: POST /auth/register
     */
    async register(userData) {
        const { username, email, password, firstName, lastName } = userData;

        // Validation côté client
        const validationErrors = this._validateRegistrationData(userData);
        if (validationErrors.length > 0) {
            return {
                data: null,
                error: {
                    message: 'Données invalides',
                    errors: validationErrors,
                    type: 'VALIDATION_ERROR'
                }
            };
        }

        const { data, error } = await ApiHelpers.post(ENDPOINTS.AUTH.REGISTER, {
            username,
            email,
            password,
            firstName,
            lastName
        });

        if (data && !error) {
            // Stocker les tokens après inscription réussie
            if (data.accessToken && data.refreshToken) {
                TokenStorage.setTokens(data.accessToken, data.refreshToken);
                this.currentUser = data.user;
                MemoryCache.set('currentUser', data.user);
            }
        }

        return { data, error };
    }

    /**
     * Connexion utilisateur
     * Endpoint: POST /auth/login
     */
    async login(credentials) {
        const { login, password, rememberMe = false } = credentials;

        // Validation côté client
        if (!login || !password) {
            return {
                data: null,
                error: {
                    message: 'Email/nom d\'utilisateur et mot de passe requis',
                    type: 'VALIDATION_ERROR'
                }
            };
        }

        const { data, error } = await ApiHelpers.post(ENDPOINTS.AUTH.LOGIN, {
            login, // Peut être email ou username selon le backend
            password,
            rememberMe
        });

        if (data && !error) {
            // Stocker les tokens après connexion réussie
            TokenStorage.setTokens(data.accessToken, data.refreshToken);
            this.currentUser = data.user;
            MemoryCache.set('currentUser', data.user);

            // Logs d'activité pour sécurité
            this._logUserActivity('LOGIN_SUCCESS', {
                userId: data.user.id,
                timestamp: new Date().toISOString()
            });
        }

        return { data, error };
    }

    /**
     * Renouvellement du token d'accès
     * Endpoint: POST /auth/refresh
     */
    async refreshToken() {
        const refreshToken = TokenStorage.getRefreshToken();

        if (!refreshToken) {
            return {
                data: null,
                error: {
                    message: 'Aucun token de rafraîchissement disponible',
                    type: 'AUTH_ERROR'
                }
            };
        }

        const { data, error } = await ApiHelpers.post(ENDPOINTS.AUTH.REFRESH, {
            refreshToken
        });

        if (data && !error) {
            // Mettre à jour les tokens
            TokenStorage.setTokens(data.accessToken, data.refreshToken);
            if (data.user) {
                this.currentUser = data.user;
                MemoryCache.set('currentUser', data.user);
            }
        } else {
            // Échec du refresh : nettoyer les tokens
            this.logout();
        }

        return { data, error };
    }

    /**
     * Déconnexion utilisateur
     * Endpoint: POST /auth/logout
     */
    async logout() {
        const refreshToken = TokenStorage.getRefreshToken();

        // Appeler le backend pour invalider les tokens
        if (refreshToken) {
            await ApiHelpers.post(ENDPOINTS.AUTH.LOGOUT, { refreshToken });
        }

        // Nettoyer le stockage local
        TokenStorage.clearTokens();
        MemoryCache.clear();
        this.currentUser = null;

        return { data: { message: 'Déconnexion réussie' }, error: null };
    }

    /**
     * Vérification d'email
     * Endpoint: POST /auth/verify-email
     */
    async verifyEmail(token) {
        if (!token) {
            return {
                data: null,
                error: {
                    message: 'Token de vérification requis',
                    type: 'VALIDATION_ERROR'
                }
            };
        }

        const { data, error } = await ApiHelpers.post(ENDPOINTS.AUTH.VERIFY_EMAIL, {
            token
        });

        if (data && !error && this.currentUser) {
            // Mettre à jour le statut de vérification
            this.currentUser.isEmailVerified = true;
            MemoryCache.set('currentUser', this.currentUser);
        }

        return { data, error };
    }

    /**
     * Renvoyer l'email de vérification
     * Endpoint: POST /auth/resend-verification
     */
    async resendVerificationEmail(email) {
        if (!email) {
            return {
                data: null,
                error: {
                    message: 'Adresse email requise',
                    type: 'VALIDATION_ERROR'
                }
            };
        }

        return await ApiHelpers.post(ENDPOINTS.AUTH.RESEND_VERIFICATION, {
            email
        });
    }

    /**
     * Récupérer les informations de l'utilisateur connecté
     * Endpoint: GET /auth/me
     */
    async me() {
        // Vérifier le cache d'abord
        const cachedUser = MemoryCache.get('currentUser');
        if (cachedUser && this._isTokenValid()) {
            this.currentUser = cachedUser;
            return { data: { user: cachedUser }, error: null };
        }

        const { data, error } = await ApiHelpers.get(ENDPOINTS.AUTH.ME);

        if (data && !error) {
            this.currentUser = data.user;
            MemoryCache.set('currentUser', data.user);
        }

        return { data, error };
    }

    /**
     * Demande de réinitialisation de mot de passe
     * Endpoint: POST /auth/forgot-password
     */
    async forgotPassword(email) {
        if (!email || !this._isValidEmail(email)) {
            return {
                data: null,
                error: {
                    message: 'Adresse email valide requise',
                    type: 'VALIDATION_ERROR'
                }
            };
        }

        return await ApiHelpers.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, {
            email
        });
    }

    /**
     * Réinitialisation du mot de passe
     * Endpoint: POST /auth/reset-password
     */
    async resetPassword(token, newPassword) {
        if (!token || !newPassword) {
            return {
                data: null,
                error: {
                    message: 'Token et nouveau mot de passe requis',
                    type: 'VALIDATION_ERROR'
                }
            };
        }

        const passwordValidation = this._validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            return {
                data: null,
                error: {
                    message: 'Mot de passe invalide',
                    errors: passwordValidation.errors,
                    type: 'VALIDATION_ERROR'
                }
            };
        }

        return await ApiHelpers.post(ENDPOINTS.AUTH.RESET_PASSWORD, {
            token,
            newPassword
        });
    }

    /**
     * Vérifier si l'utilisateur est connecté
     */
    isAuthenticated() {
        return !!TokenStorage.getAccessToken() && !!this.currentUser;
    }

    /**
     * Récupérer l'utilisateur actuel
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Vérifier si l'utilisateur a un rôle spécifique
     */
    hasRole(role) {
        return this.currentUser?.role === role;
    }

    /**
     * Vérifier si l'utilisateur est administrateur
     */
    isAdmin() {
        return this.hasRole('admin');
    }

    /**
     * Vérifier si l'utilisateur est modérateur
     */
    isModerator() {
        return this.hasRole('moderator') || this.isAdmin();
    }

    /**
     * Vérifier si l'email est vérifié
     */
    isEmailVerified() {
        return this.currentUser?.isEmailVerified || false;
    }

    /**
     * Initialiser le service (récupérer l'utilisateur si token présent)
     */
    async initialize() {
        if (this.isInitialized) return;

        if (TokenStorage.getAccessToken()) {
            try {
                await this.me();
            } catch (error) {
                // En cas d'erreur, nettoyer les tokens invalides
                this.logout();
            }
        }

        this.isInitialized = true;
    }

    // Méthodes privées de validation et utilitaires

    /**
     * Valider les données d'inscription
     */
    _validateRegistrationData(data) {
        const errors = [];

        if (!data.username || data.username.length < 3) {
            errors.push('Le nom d\'utilisateur doit faire au moins 3 caractères');
        }

        if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
            errors.push('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores');
        }

        if (!this._isValidEmail(data.email)) {
            errors.push('Adresse email invalide');
        }

        const passwordValidation = this._validatePassword(data.password);
        if (!passwordValidation.isValid) {
            errors.push(...passwordValidation.errors);
        }

        if (!data.firstName || data.firstName.length < 2) {
            errors.push('Le prénom doit faire au moins 2 caractères');
        }

        if (!data.lastName || data.lastName.length < 2) {
            errors.push('Le nom doit faire au moins 2 caractères');
        }

        return errors;
    }

    /**
     * Valider un mot de passe
     */
    _validatePassword(password) {
        const errors = [];
        let isValid = true;

        if (!password || password.length < 8) {
            errors.push('Le mot de passe doit faire au moins 8 caractères');
            isValid = false;
        }

        if (!/(?=.*[a-z])/.test(password)) {
            errors.push('Le mot de passe doit contenir au moins une minuscule');
            isValid = false;
        }

        if (!/(?=.*[A-Z])/.test(password)) {
            errors.push('Le mot de passe doit contenir au moins une majuscule');
            isValid = false;
        }

        if (!/(?=.*\d)/.test(password)) {
            errors.push('Le mot de passe doit contenir au moins un chiffre');
            isValid = false;
        }

        if (!/(?=.*[@$!%*?&])/.test(password)) {
            errors.push('Le mot de passe doit contenir au moins un caractère spécial');
            isValid = false;
        }

        return { isValid, errors };
    }

    /**
     * Valider une adresse email
     */
    _isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Vérifier si le token actuel est valide (non expiré)
     */
    _isTokenValid() {
        const token = TokenStorage.getAccessToken();
        if (!token) return false;

        try {
            // Décoder le token JWT pour vérifier l'expiration
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Date.now() / 1000;
            return payload.exp > currentTime;
        } catch (error) {
            return false;
        }
    }

    /**
     * Logger l'activité utilisateur pour sécurité
     */
    _logUserActivity(action, details = {}) {
        const logData = {
            action,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            ...details
        };

        // Stocker dans localStorage pour debug (optionnel)
        if (process.env.NODE_ENV === 'development') {
            console.log('Auth Activity:', logData);
        }

        // En production, vous pourriez envoyer ces logs au backend
        // ApiHelpers.post('/auth/log-activity', logData);
    }

    /**
     * Nettoyer les données sensibles avant déconnexion
     */
    _clearSensitiveData() {
        // Nettoyer les formulaires qui pourraient contenir des mots de passe
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        passwordInputs.forEach(input => {
            input.value = '';
        });

        // Nettoyer le cache spécifique à l'utilisateur
        MemoryCache.delete('currentUser');
        MemoryCache.delete('userPreferences');
        MemoryCache.delete('userPlaylists');
    }

    /**
     * Obtenir les permissions de l'utilisateur
     */
    getUserPermissions() {
        if (!this.currentUser) return [];

        const basePermissions = ['view_content', 'create_playlist'];

        if (this.currentUser.isEmailVerified) {
            basePermissions.push('upload_video', 'comment', 'like');
        }

        if (this.isModerator()) {
            basePermissions.push('moderate_comments', 'manage_reports');
        }

        if (this.isAdmin()) {
            basePermissions.push('manage_users', 'manage_content', 'view_analytics');
        }

        return basePermissions;
    }

    /**
     * Vérifier une permission spécifique
     */
    hasPermission(permission) {
        return this.getUserPermissions().includes(permission);
    }
}

// Instance singleton du service d'authentification
const authService = new AuthService();

// Export des types d'erreurs pour utilisation dans les composants
export const AUTH_ERROR_TYPES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTH_ERROR: 'AUTH_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    PERMISSION_ERROR: 'PERMISSION_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    SERVER_ERROR: 'SERVER_ERROR'
};

// Export des constantes utiles
export const USER_ROLES = {
    USER: 'user',
    MODERATOR: 'moderator',
    ADMIN: 'admin'
};

export const PERMISSIONS = {
    VIEW_CONTENT: 'view_content',
    CREATE_PLAYLIST: 'create_playlist',
    UPLOAD_VIDEO: 'upload_video',
    COMMENT: 'comment',
    LIKE: 'like',
    MODERATE_COMMENTS: 'moderate_comments',
    MANAGE_REPORTS: 'manage_reports',
    MANAGE_USERS: 'manage_users',
    MANAGE_CONTENT: 'manage_content',
    VIEW_ANALYTICS: 'view_analytics'
};

export { authService };
export default authService;