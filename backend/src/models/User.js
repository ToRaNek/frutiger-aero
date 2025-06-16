// backend/src/models/User.js
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const logger = require('../utils/logger');
const { USER_ROLES, USER_STATUS } = require('../utils/constants');

class User {
    constructor(data = {}) {
        this.id = data.id || null;
        this.username = data.username || null;
        this.email = data.email || null;
        this.passwordHash = data.password_hash || null;
        this.firstName = data.first_name || null;
        this.lastName = data.last_name || null;
        this.avatarUrl = data.avatar_url || null;
        this.bio = data.bio || null;
        this.role = data.role || USER_ROLES.USER;
        this.status = data.status || USER_STATUS.ACTIVE;
        this.emailVerified = data.email_verified || false;
        this.emailVerificationToken = data.email_verification_token || null;
        this.passwordResetToken = data.password_reset_token || null;
        this.passwordResetExpires = data.password_reset_expires || null;
        this.lastLogin = data.last_login || null;
        this.loginAttempts = data.login_attempts || 0;
        this.lockedUntil = data.locked_until || null;
        this.preferences = data.preferences || {};
        this.createdAt = data.created_at || null;
        this.updatedAt = data.updated_at || null;
    }

    // Créer un nouvel utilisateur
    static async create(userData) {
        const {
            username,
            email,
            password,
            firstName = null,
            lastName = null,
            role = USER_ROLES.USER
        } = userData;

        try {
            // Vérifier l'unicité
            const existing = await User.findByEmailOrUsername(email, username);
            if (existing) {
                throw new Error('Utilisateur déjà existant');
            }

            // Hasher le mot de passe
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            const userId = uuidv4();
            const query = `
        INSERT INTO users (
          id, username, email, password_hash, first_name, last_name, role, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

            const result = await db.query(query, [
                userId,
                username,
                email,
                passwordHash,
                firstName,
                lastName,
                role,
                USER_STATUS.ACTIVE
            ]);

            const user = new User(result.rows[0]);

            logger.auth('Utilisateur créé', {
                userId: user.id,
                username: user.username,
                email: user.email
            });

            return user;
        } catch (error) {
            logger.error('Erreur lors de la création d\'utilisateur:', error);
            throw error;
        }
    }

    // Trouver un utilisateur par ID
    static async findById(id) {
        try {
            const query = 'SELECT * FROM users WHERE id = $1';
            const result = await db.query(query, [id]);

            if (result.rows.length === 0) {
                return null;
            }

            return new User(result.rows[0]);
        } catch (error) {
            logger.error('Erreur lors de la recherche par ID:', error);
            throw error;
        }
    }

    // Trouver un utilisateur par email
    static async findByEmail(email) {
        try {
            const query = 'SELECT * FROM users WHERE email = $1';
            const result = await db.query(query, [email]);

            if (result.rows.length === 0) {
                return null;
            }

            return new User(result.rows[0]);
        } catch (error) {
            logger.error('Erreur lors de la recherche par email:', error);
            throw error;
        }
    }

    // Trouver un utilisateur par username
    static async findByUsername(username) {
        try {
            const query = 'SELECT * FROM users WHERE username = $1';
            const result = await db.query(query, [username]);

            if (result.rows.length === 0) {
                return null;
            }

            return new User(result.rows[0]);
        } catch (error) {
            logger.error('Erreur lors de la recherche par username:', error);
            throw error;
        }
    }

    // Trouver par email ou username
    static async findByEmailOrUsername(email, username) {
        try {
            const query = 'SELECT * FROM users WHERE email = $1 OR username = $2';
            const result = await db.query(query, [email, username]);

            if (result.rows.length === 0) {
                return null;
            }

            return new User(result.rows[0]);
        } catch (error) {
            logger.error('Erreur lors de la recherche par email/username:', error);
            throw error;
        }
    }

    // Authentifier un utilisateur
    static async authenticate(login, password) {
        try {
            const user = await User.findByEmailOrUsername(login, login);
            if (!user) {
                return null;
            }

            // Vérifier si le compte est verrouillé
            if (user.isLocked()) {
                throw new Error('Compte verrouillé');
            }

            // Vérifier le mot de passe
            const isValid = await bcrypt.compare(password, user.passwordHash);
            if (!isValid) {
                await user.incrementLoginAttempts();
                return null;
            }

            // Réinitialiser les tentatives et mettre à jour la dernière connexion
            await user.resetLoginAttempts();
            await user.updateLastLogin();

            return user;
        } catch (error) {
            logger.error('Erreur lors de l\'authentification:', error);
            throw error;
        }
    }

    // Obtenir tous les utilisateurs avec pagination
    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 20,
            sort = 'created_at',
            order = 'DESC',
            status = null,
            role = null,
            search = null
        } = options;

        try {
            const offset = (page - 1) * limit;
            let whereConditions = [];
            let params = [];
            let paramIndex = 1;

            if (status) {
                whereConditions.push(`status = $${paramIndex}`);
                params.push(status);
                paramIndex++;
            }

            if (role) {
                whereConditions.push(`role = $${paramIndex}`);
                params.push(role);
                paramIndex++;
            }

            if (search) {
                whereConditions.push(`(
          LOWER(username) LIKE LOWER($${paramIndex}) OR 
          LOWER(email) LIKE LOWER($${paramIndex}) OR 
          LOWER(first_name) LIKE LOWER($${paramIndex}) OR 
          LOWER(last_name) LIKE LOWER($${paramIndex})
        )`);
                params.push(`%${search}%`);
                paramIndex++;
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            const query = `
        SELECT * FROM users 
        ${whereClause}
        ORDER BY ${sort} ${order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

            const countQuery = `
        SELECT COUNT(*) as total FROM users ${whereClause}
      `;

            const [usersResult, countResult] = await Promise.all([
                db.query(query, [...params, limit, offset]),
                db.query(countQuery, params)
            ]);

            const users = usersResult.rows.map(row => new User(row));
            const total = parseInt(countResult.rows[0].total);

            return {
                users,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Erreur lors de la récupération des utilisateurs:', error);
            throw error;
        }
    }

    // Sauvegarder les modifications
    async save() {
        try {
            const query = `
        UPDATE users SET
          username = $1, email = $2, first_name = $3, last_name = $4,
          avatar_url = $5, bio = $6, role = $7, status = $8,
          email_verified = $9, preferences = $10, updated_at = CURRENT_TIMESTAMP
        WHERE id = $11
        RETURNING *
      `;

            const result = await db.query(query, [
                this.username,
                this.email,
                this.firstName,
                this.lastName,
                this.avatarUrl,
                this.bio,
                this.role,
                this.status,
                this.emailVerified,
                JSON.stringify(this.preferences),
                this.id
            ]);

            if (result.rows.length > 0) {
                Object.assign(this, result.rows[0]);
            }

            return this;
        } catch (error) {
            logger.error('Erreur lors de la sauvegarde:', error);
            throw error;
        }
    }

    // Changer le mot de passe
    async changePassword(newPassword) {
        try {
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
            const passwordHash = await bcrypt.hash(newPassword, saltRounds);

            const query = `
        UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;

            await db.query(query, [passwordHash, this.id]);
            this.passwordHash = passwordHash;

            logger.auth('Mot de passe changé', {
                userId: this.id,
                username: this.username
            });

            return this;
        } catch (error) {
            logger.error('Erreur lors du changement de mot de passe:', error);
            throw error;
        }
    }

    // Vérifier le mot de passe
    async verifyPassword(password) {
        return await bcrypt.compare(password, this.passwordHash);
    }

    // Incrémenter les tentatives de connexion
    async incrementLoginAttempts() {
        try {
            const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
            const lockDuration = parseInt(process.env.ACCOUNT_LOCK_DURATION) || 30; // minutes

            const newAttempts = this.loginAttempts + 1;
            let lockedUntil = null;

            if (newAttempts >= maxAttempts) {
                lockedUntil = new Date(Date.now() + lockDuration * 60 * 1000);
            }

            const query = `
        UPDATE users SET 
          login_attempts = $1, 
          locked_until = $2
        WHERE id = $3
      `;

            await db.query(query, [newAttempts, lockedUntil, this.id]);

            this.loginAttempts = newAttempts;
            this.lockedUntil = lockedUntil;
        } catch (error) {
            logger.error('Erreur lors de l\'incrémentation des tentatives:', error);
            throw error;
        }
    }

    // Réinitialiser les tentatives de connexion
    async resetLoginAttempts() {
        try {
            const query = `
        UPDATE users SET 
          login_attempts = 0, 
          locked_until = NULL
        WHERE id = $1
      `;

            await db.query(query, [this.id]);

            this.loginAttempts = 0;
            this.lockedUntil = null;
        } catch (error) {
            logger.error('Erreur lors de la réinitialisation des tentatives:', error);
            throw error;
        }
    }

    // Mettre à jour la dernière connexion
    async updateLastLogin() {
        try {
            const query = `
        UPDATE users SET last_login = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

            await db.query(query, [this.id]);
            this.lastLogin = new Date();
        } catch (error) {
            logger.error('Erreur lors de la mise à jour de la dernière connexion:', error);
            throw error;
        }
    }

    // Vérifier si le compte est verrouillé
    isLocked() {
        return this.lockedUntil && new Date(this.lockedUntil) > new Date();
    }

    // Vérifier si l'utilisateur est admin
    isAdmin() {
        return this.role === USER_ROLES.ADMIN;
    }

    // Vérifier si l'utilisateur est modérateur ou admin
    isModerator() {
        return this.role === USER_ROLES.MODERATOR || this.role === USER_ROLES.ADMIN;
    }

    // Obtenir le nom complet
    getFullName() {
        if (this.firstName && this.lastName) {
            return `${this.firstName} ${this.lastName}`;
        } else if (this.firstName) {
            return this.firstName;
        } else if (this.lastName) {
            return this.lastName;
        } else {
            return this.username;
        }
    }

    // Obtenir les statistiques de l'utilisateur
    async getStats() {
        try {
            const query = `
        SELECT 
          (SELECT COUNT(*) FROM videos WHERE user_id = $1 AND status = 'ready') as video_count,
          (SELECT COUNT(*) FROM playlists WHERE user_id = $1) as playlist_count,
          (SELECT COUNT(*) FROM user_follows WHERE following_id = $1) as followers_count,
          (SELECT COUNT(*) FROM user_follows WHERE follower_id = $1) as following_count,
          (SELECT SUM(view_count) FROM videos WHERE user_id = $1 AND status = 'ready') as total_views,
          (SELECT SUM(like_count) FROM videos WHERE user_id = $1 AND status = 'ready') as total_likes
      `;

            const result = await db.query(query, [this.id]);
            const stats = result.rows[0];

            return {
                videoCount: parseInt(stats.video_count || 0),
                playlistCount: parseInt(stats.playlist_count || 0),
                followersCount: parseInt(stats.followers_count || 0),
                followingCount: parseInt(stats.following_count || 0),
                totalViews: parseInt(stats.total_views || 0),
                totalLikes: parseInt(stats.total_likes || 0)
            };
        } catch (error) {
            logger.error('Erreur lors de la récupération des statistiques:', error);
            throw error;
        }
    }

    // Supprimer l'utilisateur
    async delete() {
        try {
            const query = 'DELETE FROM users WHERE id = $1';
            await db.query(query, [this.id]);

            logger.auth('Utilisateur supprimé', {
                userId: this.id,
                username: this.username
            });

            return true;
        } catch (error) {
            logger.error('Erreur lors de la suppression:', error);
            throw error;
        }
    }

    // Sérialiser pour l'API (exclure les données sensibles)
    toJSON() {
        return {
            id: this.id,
            username: this.username,
            email: this.email,
            firstName: this.firstName,
            lastName: this.lastName,
            fullName: this.getFullName(),
            avatarUrl: this.avatarUrl,
            bio: this.bio,
            role: this.role,
            status: this.status,
            emailVerified: this.emailVerified,
            lastLogin: this.lastLogin,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    // Sérialiser pour le profil public
    toPublicJSON() {
        return {
            id: this.id,
            username: this.username,
            firstName: this.firstName,
            lastName: this.lastName,
            fullName: this.getFullName(),
            avatarUrl: this.avatarUrl,
            bio: this.bio,
            createdAt: this.createdAt
        };
    }
}

module.exports = User;