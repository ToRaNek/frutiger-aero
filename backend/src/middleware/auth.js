// backend/src/middleware/auth.js
const jwt = require('../config/jwt');
const db = require('../config/database');
const logger = require('../utils/logger');

// Middleware pour authentifier les utilisateurs
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = jwt.extractTokenFromHeader(authHeader);

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Token d\'authentification requis',
                code: 'MISSING_TOKEN'
            });
        }

        // Vérifier le token
        const decoded = jwt.verifyAccessToken(token);

        // Récupérer les informations utilisateur depuis la base de données
        const userQuery = `
      SELECT id, username, email, first_name, last_name, avatar_url, role, status, email_verified, created_at
      FROM users 
      WHERE id = $1 AND status = 'active'
    `;

        const userResult = await db.query(userQuery, [decoded.userId]);

        if (userResult.rows.length === 0) {
            logger.security('Tentative d\'accès avec un token valide mais utilisateur introuvable ou inactif', {
                userId: decoded.userId,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            return res.status(401).json({
                success: false,
                error: 'Utilisateur non trouvé ou inactif',
                code: 'USER_NOT_FOUND'
            });
        }

        const user = userResult.rows[0];

        // Vérifier si l'utilisateur est banni
        if (user.status === 'banned') {
            logger.security('Tentative d\'accès d\'un utilisateur banni', {
                userId: user.id,
                username: user.username,
                ip: req.ip
            });

            return res.status(403).json({
                success: false,
                error: 'Compte suspendu',
                code: 'ACCOUNT_BANNED'
            });
        }

        // Ajouter les informations utilisateur à la requête
        req.user = user;
        req.token = token;
        req.tokenData = decoded;

        logger.debug('Utilisateur authentifié avec succès', {
            userId: user.id,
            username: user.username,
            role: user.role
        });

        next();
    } catch (error) {
        logger.security('Échec de l\'authentification', {
            error: error.message,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            authHeader: req.headers.authorization ? 'présent' : 'absent'
        });

        let errorMessage = 'Token invalide';
        let errorCode = 'INVALID_TOKEN';

        if (error.message.includes('expiré')) {
            errorMessage = 'Token expiré';
            errorCode = 'TOKEN_EXPIRED';
        } else if (error.message.includes('invalide')) {
            errorMessage = 'Token invalide';
            errorCode = 'INVALID_TOKEN';
        }

        return res.status(401).json({
            success: false,
            error: errorMessage,
            code: errorCode
        });
    }
};

// Middleware pour vérifier les rôles
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentification requise',
                code: 'AUTHENTICATION_REQUIRED'
            });
        }

        if (!roles.includes(req.user.role)) {
            logger.security('Tentative d\'accès non autorisé', {
                userId: req.user.id,
                username: req.user.username,
                requiredRoles: roles,
                userRole: req.user.role,
                ip: req.ip,
                path: req.path
            });

            return res.status(403).json({
                success: false,
                error: 'Permissions insuffisantes',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        next();
    };
};

// Middleware pour vérifier si l'utilisateur est propriétaire de la ressource
const requireOwnership = (resourceIdParam = 'id', resourceTable = 'videos', resourceUserField = 'user_id') => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentification requise',
                    code: 'AUTHENTICATION_REQUIRED'
                });
            }

            const resourceId = req.params[resourceIdParam];

            if (!resourceId) {
                return res.status(400).json({
                    success: false,
                    error: 'ID de ressource manquant',
                    code: 'MISSING_RESOURCE_ID'
                });
            }

            // Vérifier la propriété de la ressource
            const ownershipQuery = `
        SELECT ${resourceUserField} as owner_id
        FROM ${resourceTable}
        WHERE id = $1
      `;

            const result = await db.query(ownershipQuery, [resourceId]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Ressource non trouvée',
                    code: 'RESOURCE_NOT_FOUND'
                });
            }

            const ownerId = result.rows[0].owner_id;

            // Vérifier si l'utilisateur est propriétaire ou admin
            if (ownerId !== req.user.id && req.user.role !== 'admin') {
                logger.security('Tentative d\'accès à une ressource non autorisée', {
                    userId: req.user.id,
                    username: req.user.username,
                    resourceId: resourceId,
                    resourceTable: resourceTable,
                    ownerId: ownerId,
                    ip: req.ip,
                    path: req.path
                });

                return res.status(403).json({
                    success: false,
                    error: 'Accès non autorisé à cette ressource',
                    code: 'ACCESS_DENIED'
                });
            }

            req.resourceOwnerId = ownerId;
            next();
        } catch (error) {
            logger.error('Erreur lors de la vérification de propriété:', error);
            return res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                code: 'INTERNAL_ERROR'
            });
        }
    };
};

// Middleware pour vérifier si l'email est vérifié
const requireEmailVerification = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentification requise',
            code: 'AUTHENTICATION_REQUIRED'
        });
    }

    if (!req.user.email_verified) {
        return res.status(403).json({
            success: false,
            error: 'Vérification de l\'email requise',
            code: 'EMAIL_NOT_VERIFIED'
        });
    }

    next();
};

// Middleware optionnel pour l'authentification (n'échoue pas si pas de token)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = jwt.extractTokenFromHeader(authHeader);

        if (!token) {
            return next();
        }

        const decoded = jwt.verifyAccessToken(token);
        const userQuery = `
      SELECT id, username, email, first_name, last_name, avatar_url, role, status, email_verified, created_at
      FROM users 
      WHERE id = $1 AND status = 'active'
    `;

        const userResult = await db.query(userQuery, [decoded.userId]);

        if (userResult.rows.length > 0) {
            req.user = userResult.rows[0];
            req.token = token;
            req.tokenData = decoded;
        }

        next();
    } catch (error) {
        // En cas d'erreur, on continue sans authentification
        logger.debug('Authentification optionnelle échouée, continuation sans auth', {
            error: error.message
        });
        next();
    }
};

// Middleware pour enregistrer l'activité utilisateur
const logUserActivity = async (req, res, next) => {
    if (req.user) {
        try {
            // Mettre à jour la dernière activité
            await db.query(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
                [req.user.id]
            );

            // Enregistrer l'événement d'activité
            await db.query(`
        INSERT INTO analytics_events (user_id, event_type, event_data, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5)
      `, [
                req.user.id,
                'user_activity',
                {
                    method: req.method,
                    path: req.path,
                    timestamp: new Date().toISOString()
                },
                req.ip,
                req.get('User-Agent')
            ]);
        } catch (error) {
            logger.error('Erreur lors de l\'enregistrement de l\'activité utilisateur:', error);
            // Ne pas bloquer la requête pour une erreur d'analytics
        }
    }

    next();
};

// Middleware pour vérifier les sessions actives
const checkActiveSession = async (req, res, next) => {
    try {
        if (!req.user || !req.tokenData) {
            return next();
        }

        // Vérifier si la session existe et est active
        const sessionQuery = `
      SELECT id, is_active, expires_at, last_used_at
      FROM user_sessions
      WHERE user_id = $1 AND refresh_token = $2 AND is_active = true
    `;

        // Note: Ici on devrait avoir le refresh token, mais pour simplifier on vérifie juste l'utilisateur
        const sessionResult = await db.query(
            'SELECT COUNT(*) as active_sessions FROM user_sessions WHERE user_id = $1 AND is_active = true AND expires_at > NOW()',
            [req.user.id]
        );

        const activeSessions = parseInt(sessionResult.rows[0].active_sessions);

        if (activeSessions === 0) {
            logger.security('Tentative d\'accès avec un token valide mais aucune session active', {
                userId: req.user.id,
                username: req.user.username,
                ip: req.ip
            });

            return res.status(401).json({
                success: false,
                error: 'Session expirée, veuillez vous reconnecter',
                code: 'SESSION_EXPIRED'
            });
        }

        next();
    } catch (error) {
        logger.error('Erreur lors de la vérification de session:', error);
        next(); // Continuer en cas d'erreur pour ne pas bloquer l'accès
    }
};

module.exports = {
    authenticateToken,
    requireRole,
    requireOwnership,
    requireEmailVerification,
    optionalAuth,
    logUserActivity,
    checkActiveSession
};