// backend/src/config/jwt.js
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Configuration JWT
const jwtConfig = {
    accessTokenSecret: process.env.JWT_SECRET || 'frutiger_aero_streaming_secret_key_2024_very_secure',
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'frutiger_aero_refresh_secret_key_2024_ultra_secure',
    accessTokenExpiry: process.env.JWT_EXPIRE || '1h',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRE || '7d',
    issuer: 'frutiger-streaming',
    audience: 'frutiger-streaming-users',
    algorithm: 'HS256'
};

// Validation des secrets JWT
const validateJwtSecrets = () => {
    if (!jwtConfig.accessTokenSecret || jwtConfig.accessTokenSecret.length < 32) {
        logger.error('JWT_SECRET doit contenir au moins 32 caractères');
        process.exit(1);
    }

    if (!jwtConfig.refreshTokenSecret || jwtConfig.refreshTokenSecret.length < 32) {
        logger.error('JWT_REFRESH_SECRET doit contenir au moins 32 caractères');
        process.exit(1);
    }

    if (jwtConfig.accessTokenSecret === jwtConfig.refreshTokenSecret) {
        logger.error('JWT_SECRET et JWT_REFRESH_SECRET doivent être différents');
        process.exit(1);
    }
};

// Générer un access token
const generateAccessToken = (payload, options = {}) => {
    try {
        const tokenPayload = {
            ...payload,
            type: 'access',
            iat: Math.floor(Date.now() / 1000)
        };

        const signOptions = {
            expiresIn: options.expiresIn || jwtConfig.accessTokenExpiry,
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience,
            algorithm: jwtConfig.algorithm,
            ...options
        };

        const token = jwt.sign(tokenPayload, jwtConfig.accessTokenSecret, signOptions);

        logger.debug('Access token généré:', {
            userId: payload.userId,
            expiresIn: signOptions.expiresIn
        });

        return token;
    } catch (error) {
        logger.error('Erreur lors de la génération de l\'access token:', error);
        throw new Error('Erreur de génération du token');
    }
};

// Générer un refresh token
const generateRefreshToken = (payload, options = {}) => {
    try {
        const tokenPayload = {
            userId: payload.userId,
            type: 'refresh',
            iat: Math.floor(Date.now() / 1000),
            jti: require('uuid').v4() // Token ID unique pour invalidation
        };

        const signOptions = {
            expiresIn: options.expiresIn || jwtConfig.refreshTokenExpiry,
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience,
            algorithm: jwtConfig.algorithm,
            ...options
        };

        const token = jwt.sign(tokenPayload, jwtConfig.refreshTokenSecret, signOptions);

        logger.debug('Refresh token généré:', {
            userId: payload.userId,
            tokenId: tokenPayload.jti,
            expiresIn: signOptions.expiresIn
        });

        return {
            token,
            tokenId: tokenPayload.jti,
            expiresAt: new Date(Date.now() + parseExpiry(signOptions.expiresIn))
        };
    } catch (error) {
        logger.error('Erreur lors de la génération du refresh token:', error);
        throw new Error('Erreur de génération du token');
    }
};

// Vérifier un access token
const verifyAccessToken = (token, options = {}) => {
    try {
        const verifyOptions = {
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience,
            algorithms: [jwtConfig.algorithm],
            ...options
        };

        const decoded = jwt.verify(token, jwtConfig.accessTokenSecret, verifyOptions);

        // Vérifier le type de token
        if (decoded.type !== 'access') {
            throw new Error('Type de token invalide');
        }

        logger.debug('Access token vérifié:', {
            userId: decoded.userId,
            exp: new Date(decoded.exp * 1000)
        });

        return decoded;
    } catch (error) {
        logger.debug('Échec de vérification de l\'access token:', {
            error: error.message,
            name: error.name
        });

        // Distinguer les différents types d'erreurs
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token expiré');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Token invalide');
        } else if (error.name === 'NotBeforeError') {
            throw new Error('Token pas encore valide');
        } else {
            throw new Error('Erreur de vérification du token');
        }
    }
};

// Vérifier un refresh token
const verifyRefreshToken = (token, options = {}) => {
    try {
        const verifyOptions = {
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience,
            algorithms: [jwtConfig.algorithm],
            ...options
        };

        const decoded = jwt.verify(token, jwtConfig.refreshTokenSecret, verifyOptions);

        // Vérifier le type de token
        if (decoded.type !== 'refresh') {
            throw new Error('Type de token invalide');
        }

        logger.debug('Refresh token vérifié:', {
            userId: decoded.userId,
            tokenId: decoded.jti,
            exp: new Date(decoded.exp * 1000)
        });

        return decoded;
    } catch (error) {
        logger.debug('Échec de vérification du refresh token:', {
            error: error.message,
            name: error.name
        });

        if (error.name === 'TokenExpiredError') {
            throw new Error('Refresh token expiré');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Refresh token invalide');
        } else {
            throw new Error('Erreur de vérification du refresh token');
        }
    }
};

// Décoder un token sans vérification (pour debugging)
const decodeToken = (token) => {
    try {
        return jwt.decode(token, { complete: true });
    } catch (error) {
        logger.error('Erreur lors du décodage du token:', error);
        return null;
    }
};

// Générer une paire de tokens (access + refresh)
const generateTokenPair = async (payload, options = {}) => {
    try {
        const accessToken = generateAccessToken(payload, options.access);
        const refreshTokenData = generateRefreshToken(payload, options.refresh);

        return {
            accessToken,
            refreshToken: refreshTokenData.token,
            refreshTokenId: refreshTokenData.tokenId,
            refreshTokenExpiresAt: refreshTokenData.expiresAt,
            accessTokenExpiresIn: parseExpiry(options.access?.expiresIn || jwtConfig.accessTokenExpiry),
            refreshTokenExpiresIn: parseExpiry(options.refresh?.expiresIn || jwtConfig.refreshTokenExpiry)
        };
    } catch (error) {
        logger.error('Erreur lors de la génération de la paire de tokens:', error);
        throw error;
    }
};

// Parser la durée d'expiration en millisecondes
const parseExpiry = (expiry) => {
    if (typeof expiry === 'number') {
        return expiry * 1000; // Assume seconds
    }

    const units = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000
    };

    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
        throw new Error('Format d\'expiration invalide');
    }

    const [, value, unit] = match;
    return parseInt(value) * units[unit];
};

// Extraire le token du header Authorization
const extractTokenFromHeader = (authHeader) => {
    if (!authHeader) {
        return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }

    return parts[1];
};

// Générer un token de réinitialisation de mot de passe
const generatePasswordResetToken = (payload) => {
    try {
        const tokenPayload = {
            userId: payload.userId,
            email: payload.email,
            type: 'password-reset',
            iat: Math.floor(Date.now() / 1000)
        };

        const signOptions = {
            expiresIn: '1h', // 1 heure pour reset password
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience,
            algorithm: jwtConfig.algorithm
        };

        return jwt.sign(tokenPayload, jwtConfig.accessTokenSecret, signOptions);
    } catch (error) {
        logger.error('Erreur lors de la génération du token de reset:', error);
        throw new Error('Erreur de génération du token de reset');
    }
};

// Vérifier un token de réinitialisation de mot de passe
const verifyPasswordResetToken = (token) => {
    try {
        const decoded = jwt.verify(token, jwtConfig.accessTokenSecret, {
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience,
            algorithms: [jwtConfig.algorithm]
        });

        if (decoded.type !== 'password-reset') {
            throw new Error('Type de token invalide');
        }

        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token de réinitialisation expiré');
        } else {
            throw new Error('Token de réinitialisation invalide');
        }
    }
};

// Générer un token de vérification d'email
const generateEmailVerificationToken = (payload) => {
    try {
        const tokenPayload = {
            userId: payload.userId,
            email: payload.email,
            type: 'email-verification',
            iat: Math.floor(Date.now() / 1000)
        };

        const signOptions = {
            expiresIn: '24h', // 24 heures pour vérification email
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience,
            algorithm: jwtConfig.algorithm
        };

        return jwt.sign(tokenPayload, jwtConfig.accessTokenSecret, signOptions);
    } catch (error) {
        logger.error('Erreur lors de la génération du token de vérification email:', error);
        throw new Error('Erreur de génération du token');
    }
};

// Vérifier un token de vérification d'email
const verifyEmailVerificationToken = (token) => {
    try {
        const decoded = jwt.verify(token, jwtConfig.accessTokenSecret, {
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience,
            algorithms: [jwtConfig.algorithm]
        });

        if (decoded.type !== 'email-verification') {
            throw new Error('Type de token invalide');
        }

        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token de vérification expiré');
        } else {
            throw new Error('Token de vérification invalide');
        }
    }
};

// Obtenir les informations sur un token sans le vérifier
const getTokenInfo = (token) => {
    try {
        const decoded = jwt.decode(token);
        if (!decoded) {
            return null;
        }

        return {
            userId: decoded.userId,
            type: decoded.type,
            issuedAt: new Date(decoded.iat * 1000),
            expiresAt: new Date(decoded.exp * 1000),
            issuer: decoded.iss,
            audience: decoded.aud,
            isExpired: Date.now() > decoded.exp * 1000
        };
    } catch (error) {
        logger.error('Erreur lors de l\'obtention des infos du token:', error);
        return null;
    }
};

// Initialiser la validation des secrets
validateJwtSecrets();

module.exports = {
    jwtConfig,
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    decodeToken,
    generateTokenPair,
    extractTokenFromHeader,
    generatePasswordResetToken,
    verifyPasswordResetToken,
    generateEmailVerificationToken,
    verifyEmailVerificationToken,
    getTokenInfo,
    parseExpiry
};