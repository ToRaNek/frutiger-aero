// frontend/src/services/authService.js

/**
 * Service d'authentification corrigé selon la documentation backend fournie
 * Respecte exactement les endpoints et méthodes du backend documenté
 */

// Configuration API selon la documentation
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Endpoints exacts selon la documentation backend
const ENDPOINTS = {
    AUTH: {
        REGISTER: '/auth/register',
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        REFRESH: '/auth/refresh-token',
        ME: '/auth/me',
        VERIFY_EMAIL: '/auth/verify-email',
        RESEND_VERIFICATION: '/auth/resend-verification',
        FORGOT_PASSWORD: '/auth/forgot-password',
        RESET_PASSWORD: '/auth/reset-password'
    }
};

// Gestion des tokens selon la doc JWT backend
class TokenStorage {
    static setTokens(accessToken, refreshToken) {
        localStorage.setItem('frutiger_access_token', accessToken);
        localStorage.setItem('frutiger_refresh_token', refreshToken);
    }

    static getAccessToken() {
        return localStorage.getItem('frutiger_access_token');
    }

    static getRefreshToken() {
        return localStorage.getItem('frutiger_refresh_token');
    }

    static clearTokens() {
        localStorage.removeItem('frutiger_access_token');
        localStorage.removeItem('frutiger_refresh_token');
        localStorage.removeItem('frutiger_user');
    }
}

// Cache mémoire pour optimiser les requêtes
class MemoryCache {
    static cache = new Map();

    static set(key, value, ttl = 300000) { // 5 minutes par défaut
        const expiry = Date.now() + ttl;
        this.cache.set(key, { value, expiry });
    }

    static get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    static delete(key) {
        this.cache.delete(key);
    }

    static clear() {
        this.cache.clear();
    }
}

// Helpers API selon la documentation backend
class ApiHelpers {
    static async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const accessToken = TokenStorage.getAccessToken();

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                return {
                    data: null,
                    error: {
                        message: data.message || 'Une erreur est survenue',
                        code: data.code || 'UNKNOWN_ERROR',
                        type: this.getErrorType(response.status),
                        status: response.status
                    }
                };
            }

            return { data, error: null };
        } catch (error) {
            return {
                data: null,
                error: {
                    message: 'Erreur de connexion au serveur',
                    type: 'NETWORK_ERROR',
                    originalError: error
                }
            };
        }
    }

    static async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    static async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    static async put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    static async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    static getErrorType(status) {
        if (status >= 400 && status < 500) return 'CLIENT_ERROR';
        if (status >= 500) return 'SERVER_ERROR';
        return 'UNKNOWN_ERROR';
    }
}

/**
 * Service d'authentification principal
 * Conforme à la documentation backend authController.js
 */
class AuthService {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
    }

    /**
     * Inscription selon register(req, res) du backend
     * Body requis: { username, email, password, firstName?, lastName? }
     */
    async register(userData) {
        const { username, email, password, firstName, lastName } = userData;

        // Validation côté client selon les règles backend
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

        // Appel exact selon la documentation backend
        const { data, error } = await ApiHelpers.post(ENDPOINTS.AUTH.REGISTER, {
            username,
            email,
            password,
            firstName,
            lastName
        });

        if (data && !error) {
            // Gestion des tokens selon generateTokenPair() de la doc
            if (data.accessToken && data.refreshToken) {
                TokenStorage.setTokens(data.accessToken, data.refreshToken);
                this.currentUser = data.user;
                MemoryCache.set('currentUser', data.user);

                // Stocker les données utilisateur
                localStorage.setItem('frutiger_user', JSON.stringify(data.user));
            }
        }

        return { data, error };
    }

    /**
     * Connexion selon login(req, res) du backend
     * Body requis: { login, password } - login peut être email ou username
     */
    async login(credentials) {
        const { login, password, rememberMe = false } = credentials;

        // Validation basique
        if (!login || !password) {
            return {
                data: null,
                error: {
                    message: 'Email/nom d\'utilisateur et mot de passe requis',
                    type: 'VALIDATION_ERROR'
                }
            };
        }

        // Appel selon User.authenticate(login, password) de la doc
        const { data, error } = await ApiHelpers.post(ENDPOINTS.AUTH.LOGIN, {
            login, // email ou username selon la doc
            password
        });

        if (data && !error) {
            // Gestion des tokens selon la doc JWT
            TokenStorage.setTokens(data.accessToken, data.refreshToken);
            this.currentUser = data.user;
            MemoryCache.set('currentUser', data.user);

            // Stocker les données utilisateur
            localStorage.setItem('frutiger_user', JSON.stringify(data.user));

            // Log d'activité pour sécurité
            this._logUserActivity('LOGIN_SUCCESS', {
                userId: data.user.id,
                timestamp: new Date().toISOString()
            });
        }

        return { data, error };
    }

    /**
     * Renouvellement du token selon refreshToken(req, res) du backend
     * Body requis: { refreshToken }
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
            // Mettre à jour les tokens selon la doc
            TokenStorage.setTokens(data.accessToken, data.refreshToken || refreshToken);
            if (data.user) {
                this.currentUser = data.user;
                MemoryCache.set('currentUser', data.user);
                localStorage.setItem('frutiger_user', JSON.stringify(data.user));
            }
        } else {
            // Échec du refresh : nettoyer les tokens
            this.logout();
        }

        return { data, error };
    }

    /**
     * Déconnexion selon logout(req, res) du backend
     * Body optionnel: { refreshToken }
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
     * Vérification d'email selon verifyEmail(req, res) du backend
     * Param requis: token dans l'URL
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

        // Utilisation du endpoint avec le token selon la doc
        const { data, error } = await ApiHelpers.post(`${ENDPOINTS.AUTH.VERIFY_EMAIL}/${token}`, {});

        if (data && !error && this.currentUser) {
            // Mettre à jour le statut de vérification
            this.currentUser.emailVerified = true;
            MemoryCache.set('currentUser', this.currentUser);
            localStorage.setItem('frutiger_user', JSON.stringify(this.currentUser));
        }

        return { data, error };
    }

    /**
     * Renvoyer l'email de vérification
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
     * Récupérer les infos utilisateur selon me(req, res) du backend
     * Auth requise: Oui
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
            this.currentUser = data.user || data;
            MemoryCache.set('currentUser', this.currentUser);
            localStorage.setItem('frutiger_user', JSON.stringify(this.currentUser));
        }

        return { data, error };
    }

    /**
     * Demande de réinitialisation de mot de passe
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
     * Vérifier le token et récupérer l'utilisateur (pour l'initialisation)
     */
    async verifyToken() {
        const accessToken = TokenStorage.getAccessToken();
        if (!accessToken || !this._isTokenValid()) {
            return null;
        }

        const { data, error } = await this.me();
        if (data && !error) {
            return data.user || data;
        }

        return null;
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
     * Vérifier si l'utilisateur a un rôle spécifique selon USER_ROLES de la doc
     */
    hasRole(role) {
        if (!this.currentUser || !this.currentUser.role) return false;

        // Admin a tous les droits selon la doc
        if (this.currentUser.role === 'admin') return true;

        return this.currentUser.role === role;
    }

    /**
     * Vérifier si l'utilisateur a une permission selon PERMISSIONS de la doc
     */
    hasPermission(permission) {
        if (!this.currentUser) return false;

        // Admin a toutes les permissions selon la doc
        if (this.currentUser.role === 'admin') return true;

        return this.currentUser.permissions && this.currentUser.permissions.includes(permission);
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
        return this.currentUser?.emailVerified || this.currentUser?.email_verified || false;
    }

    /**
     * Initialiser le service
     */
    async initialize() {
        if (this.isInitialized) return;

        const accessToken = TokenStorage.getAccessToken();
        const storedUser = localStorage.getItem('frutiger_user');

        if (accessToken && storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                if (this._isTokenValid()) {
                    this.currentUser = userData;
                    MemoryCache.set('currentUser', userData);

                    // Vérifier avec le serveur
                    await this.me();
                } else {
                    // Token expiré, essayer de le rafraîchir
                    await this.refreshToken();
                }
            } catch (error) {
                console.error('Erreur initialisation auth:', error);
                this.logout();
            }
        }

        this.isInitialized = true;
    }

    // Méthodes privées de validation

    /**
     * Valider les données d'inscription selon les règles backend
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
     * Valider un mot de passe selon les règles backend
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
            // Décoder le token JWT selon la doc JWT backend
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

        // En développement, afficher dans la console
        if (process.env.NODE_ENV === 'development') {
            console.log('Auth Activity:', logData);
        }

        // En production, envoyer au backend pour audit
        // ApiHelpers.post('/auth/log-activity', logData);
    }

    /**
     * Obtenir les permissions de l'utilisateur selon la doc backend
     */
    getUserPermissions() {
        if (!this.currentUser) return [];

        const basePermissions = ['view_content'];

        if (this.isEmailVerified()) {
            basePermissions.push('upload_video', 'create_playlist', 'comment', 'like');
        }

        if (this.isModerator()) {
            basePermissions.push('moderate_comments', 'manage_reports');
        }

        if (this.isAdmin()) {
            basePermissions.push('manage_users', 'manage_content', 'view_analytics');
        }

        return basePermissions;
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
    SERVER_ERROR: 'SERVER_ERROR',
    CLIENT_ERROR: 'CLIENT_ERROR'
};

// Export des constantes selon la documentation backend
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

// Export des utilitaires
export { TokenStorage, MemoryCache, ApiHelpers };

// Export principal du service
export { authService };
export default authService;