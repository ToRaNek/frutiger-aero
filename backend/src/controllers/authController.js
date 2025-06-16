// backend/src/controllers/authController.js
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const jwt = require('../config/jwt');
const db = require('../config/database');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');

// Inscription d'un nouvel utilisateur
const register = asyncHandler(async (req, res) => {
    const { username, email, password, firstName, lastName } = req.body;

    logger.auth('Tentative d\'inscription', { username, email });

    // Vérifier si l'utilisateur existe déjà
    const existingUserQuery = `
    SELECT id, email, username FROM users 
    WHERE email = $1 OR username = $2
  `;
    const existingUser = await db.query(existingUserQuery, [email, username]);

    if (existingUser.rows.length > 0) {
        const conflictField = existingUser.rows[0].email === email ? 'email' : 'username';
        logger.auth('Tentative d\'inscription avec données déjà utilisées', {
            email,
            username,
            conflictField
        });

        return res.status(409).json({
            success: false,
            error: `${conflictField === 'email' ? 'Email' : 'Nom d\'utilisateur'} déjà utilisé`,
            code: 'USER_ALREADY_EXISTS',
            field: conflictField
        });
    }

    // Hasher le mot de passe
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Créer l'utilisateur
    const userId = uuidv4();
    const emailVerificationToken = jwt.generateEmailVerificationToken({
        userId,
        email
    });

    const createUserQuery = `
    INSERT INTO users (
      id, username, email, password_hash, first_name, last_name,
      email_verification_token, role, status, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'user', 'active', CURRENT_TIMESTAMP)
    RETURNING id, username, email, first_name, last_name, role, status, created_at
  `;

    const newUser = await db.query(createUserQuery, [
        userId,
        username,
        email,
        passwordHash,
        firstName || null,
        lastName || null,
        emailVerificationToken
    ]);

    const user = newUser.rows[0];

    // Générer les tokens JWT
    const tokenPair = await jwt.generateTokenPair({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role
    });

    // Enregistrer le refresh token en base de données
    await db.query(`
    INSERT INTO user_sessions (
      id, user_id, refresh_token, ip_address, user_agent, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6)
  `, [
        uuidv4(),
        user.id,
        tokenPair.refreshToken,
        req.ip,
        req.get('User-Agent'),
        tokenPair.refreshTokenExpiresAt
    ]);

    // Log de l'inscription réussie
    logger.auth('Inscription réussie', {
        userId: user.id,
        username: user.username,
        email: user.email,
        ip: req.ip
    });

    // Enregistrer l'événement analytics
    await db.query(`
    INSERT INTO analytics_events (user_id, event_type, event_data, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5)
  `, [
        user.id,
        'user_registered',
        { registrationMethod: 'email' },
        req.ip,
        req.get('User-Agent')
    ]);

    res.status(201).json({
        success: true,
        message: 'Inscription réussie',
        data: {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                status: user.status,
                emailVerified: false,
                createdAt: user.created_at
            },
            tokens: {
                accessToken: tokenPair.accessToken,
                refreshToken: tokenPair.refreshToken,
                expiresIn: tokenPair.accessTokenExpiresIn
            }
        }
    });
});

// Connexion d'un utilisateur
const login = asyncHandler(async (req, res) => {
    const { login, password } = req.body; // login peut être email ou username

    logger.auth('Tentative de connexion', { login });

    // Rechercher l'utilisateur par email ou username
    const userQuery = `
    SELECT id, username, email, password_hash, first_name, last_name, 
           avatar_url, role, status, email_verified, login_attempts, 
           locked_until, last_login, created_at
    FROM users 
    WHERE (email = $1 OR username = $1) AND status IN ('active', 'inactive')
  `;

    const userResult = await db.query(userQuery, [login]);

    if (userResult.rows.length === 0) {
        logger.security('Tentative de connexion avec identifiants inexistants', {
            login,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        return res.status(401).json({
            success: false,
            error: 'Identifiants invalides',
            code: 'INVALID_CREDENTIALS'
        });
    }

    const user = userResult.rows[0];

    // Vérifier si le compte est banni
    if (user.status === 'banned') {
        logger.security('Tentative de connexion d\'un compte banni', {
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

    // Vérifier si le compte est verrouillé
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const unlockTime = new Date(user.locked_until);
        logger.security('Tentative de connexion sur un compte verrouillé', {
            userId: user.id,
            username: user.username,
            unlocksAt: unlockTime,
            ip: req.ip
        });

        return res.status(423).json({
            success: false,
            error: 'Compte temporairement verrouillé suite à trop de tentatives de connexion',
            code: 'ACCOUNT_LOCKED',
            unlocksAt: unlockTime
        });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
        // Incrémenter les tentatives de connexion échouées
        const newAttempts = (user.login_attempts || 0) + 1;
        const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;

        let updateQuery = 'UPDATE users SET login_attempts = $1';
        let queryParams = [newAttempts, user.id];

        // Verrouiller le compte après trop de tentatives
        if (newAttempts >= maxAttempts) {
            const lockDuration = parseInt(process.env.ACCOUNT_LOCK_DURATION) || 30; // 30 minutes
            const lockUntil = new Date(Date.now() + lockDuration * 60 * 1000);
            updateQuery += ', locked_until = $3';
            queryParams = [newAttempts, user.id, lockUntil];

            logger.security('Compte verrouillé suite à trop de tentatives de connexion', {
                userId: user.id,
                username: user.username,
                attempts: newAttempts,
                lockUntil: lockUntil,
                ip: req.ip
            });
        }

        updateQuery += ' WHERE id = $2';
        await db.query(updateQuery, queryParams);

        logger.security('Tentative de connexion avec mot de passe invalide', {
            userId: user.id,
            username: user.username,
            attempts: newAttempts,
            ip: req.ip
        });

        return res.status(401).json({
            success: false,
            error: 'Identifiants invalides',
            code: 'INVALID_CREDENTIALS',
            remainingAttempts: Math.max(0, maxAttempts - newAttempts)
        });
    }

    // Connexion réussie - réinitialiser les tentatives
    await db.query(`
    UPDATE users 
    SET login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP 
    WHERE id = $1
  `, [user.id]);

    // Générer les tokens JWT
    const tokenPair = await jwt.generateTokenPair({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role
    });

    // Enregistrer le refresh token en base de données
    await db.query(`
    INSERT INTO user_sessions (
      id, user_id, refresh_token, ip_address, user_agent, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6)
  `, [
        uuidv4(),
        user.id,
        tokenPair.refreshToken,
        req.ip,
        req.get('User-Agent'),
        tokenPair.refreshTokenExpiresAt
    ]);

    // Log de la connexion réussie
    logger.auth('Connexion réussie', {
        userId: user.id,
        username: user.username,
        email: user.email,
        ip: req.ip
    });

    // Enregistrer l'événement analytics
    await db.query(`
    INSERT INTO analytics_events (user_id, event_type, event_data, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5)
  `, [
        user.id,
        'user_login',
        { loginMethod: 'email' },
        req.ip,
        req.get('User-Agent')
    ]);

    res.json({
        success: true,
        message: 'Connexion réussie',
        data: {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                avatarUrl: user.avatar_url,
                role: user.role,
                status: user.status,
                emailVerified: user.email_verified,
                lastLogin: user.last_login,
                createdAt: user.created_at
            },
            tokens: {
                accessToken: tokenPair.accessToken,
                refreshToken: tokenPair.refreshToken,
                expiresIn: tokenPair.accessTokenExpiresIn
            }
        }
    });
});

// Renouvellement du token d'accès
const refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({
            success: false,
            error: 'Refresh token requis',
            code: 'MISSING_REFRESH_TOKEN'
        });
    }

    try {
        // Vérifier le refresh token
        const decoded = jwt.verifyRefreshToken(refreshToken);

        // Vérifier si le token existe en base de données et est actif
        const sessionQuery = `
      SELECT s.id, s.user_id, s.is_active, s.expires_at,
             u.username, u.email, u.role, u.status
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.refresh_token = $1 AND s.is_active = true AND u.status = 'active'
    `;

        const sessionResult = await db.query(sessionQuery, [refreshToken]);

        if (sessionResult.rows.length === 0) {
            logger.security('Tentative d\'utilisation d\'un refresh token invalide', {
                tokenId: decoded.jti,
                userId: decoded.userId,
                ip: req.ip
            });

            return res.status(401).json({
                success: false,
                error: 'Refresh token invalide ou expiré',
                code: 'INVALID_REFRESH_TOKEN'
            });
        }

        const session = sessionResult.rows[0];

        // Générer un nouveau token d'accès
        const newAccessToken = jwt.generateAccessToken({
            userId: session.user_id,
            username: session.username,
            email: session.email,
            role: session.role
        });

        // Mettre à jour la dernière utilisation de la session
        await db.query(
            'UPDATE user_sessions SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
            [session.id]
        );

        logger.auth('Token d\'accès renouvelé', {
            userId: session.user_id,
            username: session.username,
            sessionId: session.id
        });

        res.json({
            success: true,
            message: 'Token renouvelé avec succès',
            data: {
                accessToken: newAccessToken,
                expiresIn: jwt.parseExpiry(jwt.jwtConfig.accessTokenExpiry)
            }
        });

    } catch (error) {
        logger.security('Erreur lors du renouvellement du token', {
            error: error.message,
            ip: req.ip
        });

        return res.status(401).json({
            success: false,
            error: 'Refresh token invalide',
            code: 'INVALID_REFRESH_TOKEN'
        });
    }
});

// Déconnexion d'un utilisateur
const logout = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const userId = req.user?.id;

    if (refreshToken) {
        // Désactiver la session spécifique
        await db.query(
            'UPDATE user_sessions SET is_active = false WHERE refresh_token = $1',
            [refreshToken]
        );
    } else if (userId) {
        // Désactiver toutes les sessions de l'utilisateur
        await db.query(
            'UPDATE user_sessions SET is_active = false WHERE user_id = $1',
            [userId]
        );
    }

    logger.auth('Déconnexion réussie', {
        userId: userId,
        username: req.user?.username,
        ip: req.ip,
        allSessions: !refreshToken
    });

    // Enregistrer l'événement analytics
    if (userId) {
        await db.query(`
      INSERT INTO analytics_events (user_id, event_type, event_data, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
    `, [
            userId,
            'user_logout',
            { logoutType: refreshToken ? 'single_session' : 'all_sessions' },
            req.ip,
            req.get('User-Agent')
        ]);
    }

    res.json({
        success: true,
        message: 'Déconnexion réussie'
    });
});

// Vérification de l'email
const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.params;

    try {
        const decoded = jwt.verifyEmailVerificationToken(token);

        // Vérifier si l'utilisateur existe et n'est pas déjà vérifié
        const userQuery = `
      SELECT id, email, email_verified, email_verification_token
      FROM users
      WHERE id = $1
    `;

        const userResult = await db.query(userQuery, [decoded.userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Utilisateur non trouvé',
                code: 'USER_NOT_FOUND'
            });
        }

        const user = userResult.rows[0];

        if (user.email_verified) {
            return res.status(400).json({
                success: false,
                error: 'Email déjà vérifié',
                code: 'EMAIL_ALREADY_VERIFIED'
            });
        }

        // Marquer l'email comme vérifié
        await db.query(`
      UPDATE users 
      SET email_verified = true, email_verification_token = NULL
      WHERE id = $1
    `, [decoded.userId]);

        logger.auth('Email vérifié avec succès', {
            userId: decoded.userId,
            email: decoded.email
        });

        res.json({
            success: true,
            message: 'Email vérifié avec succès'
        });

    } catch (error) {
        logger.security('Tentative de vérification avec token invalide', {
            token: token.substring(0, 20) + '...',
            error: error.message,
            ip: req.ip
        });

        return res.status(400).json({
            success: false,
            error: 'Token de vérification invalide ou expiré',
            code: 'INVALID_VERIFICATION_TOKEN'
        });
    }
});

// Renvoyer l'email de vérification
const resendVerificationEmail = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const userQuery = `
    SELECT id, email, email_verified
    FROM users
    WHERE email = $1 AND status = 'active'
  `;

    const userResult = await db.query(userQuery, [email]);

    if (userResult.rows.length === 0) {
        // Ne pas révéler si l'email existe ou non
        return res.json({
            success: true,
            message: 'Si cet email existe, un nouveau lien de vérification a été envoyé'
        });
    }

    const user = userResult.rows[0];

    if (user.email_verified) {
        return res.status(400).json({
            success: false,
            error: 'Email déjà vérifié',
            code: 'EMAIL_ALREADY_VERIFIED'
        });
    }

    // Générer un nouveau token de vérification
    const verificationToken = jwt.generateEmailVerificationToken({
        userId: user.id,
        email: user.email
    });

    await db.query(
        'UPDATE users SET email_verification_token = $1 WHERE id = $2',
        [verificationToken, user.id]
    );

    logger.auth('Nouveau token de vérification généré', {
        userId: user.id,
        email: user.email
    });

    // TODO: Envoyer l'email de vérification

    res.json({
        success: true,
        message: 'Un nouveau lien de vérification a été envoyé à votre email'
    });
});

// Obtenir les informations de l'utilisateur connecté
const me = asyncHandler(async (req, res) => {
    const user = req.user;

    // Récupérer des statistiques supplémentaires
    const statsQuery = `
    SELECT 
      (SELECT COUNT(*) FROM videos WHERE user_id = $1) as video_count,
      (SELECT COUNT(*) FROM playlists WHERE user_id = $1) as playlist_count,
      (SELECT COUNT(*) FROM user_follows WHERE follower_id = $1) as following_count,
      (SELECT COUNT(*) FROM user_follows WHERE following_id = $1) as followers_count
  `;

    const statsResult = await db.query(statsQuery, [user.id]);
    const stats = statsResult.rows[0];

    res.json({
        success: true,
        data: {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                avatarUrl: user.avatar_url,
                bio: user.bio,
                role: user.role,
                status: user.status,
                emailVerified: user.email_verified,
                lastLogin: user.last_login,
                createdAt: user.created_at,
                stats: {
                    videoCount: parseInt(stats.video_count),
                    playlistCount: parseInt(stats.playlist_count),
                    followingCount: parseInt(stats.following_count),
                    followersCount: parseInt(stats.followers_count)
                }
            }
        }
    });
});

module.exports = {
    register,
    login,
    refreshToken,
    logout,
    verifyEmail,
    resendVerificationEmail,
    me
};