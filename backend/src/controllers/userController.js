// backend/src/controllers/userController.js
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');

// Obtenir le profil d'un utilisateur public
const getUserProfile = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const userQuery = `
    SELECT 
      u.id, u.username, u.first_name, u.last_name, u.avatar_url, 
      u.bio, u.created_at, u.status,
      (SELECT COUNT(*) FROM videos WHERE user_id = u.id AND status = 'ready') as video_count,
      (SELECT COUNT(*) FROM playlists WHERE user_id = u.id AND visibility = 'public') as playlist_count,
      (SELECT COUNT(*) FROM user_follows WHERE following_id = u.id) as followers_count,
      (SELECT COUNT(*) FROM user_follows WHERE follower_id = u.id) as following_count,
      (SELECT SUM(view_count) FROM videos WHERE user_id = u.id AND status = 'ready') as total_views
    FROM users u
    WHERE u.id = $1 AND u.status = 'active'
  `;

    const result = await db.query(userQuery, [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({
            success: false,
            error: 'Utilisateur non trouvé',
            code: 'USER_NOT_FOUND'
        });
    }

    const user = result.rows[0];
    const currentUserId = req.user?.id;

    // Vérifier si l'utilisateur connecté suit cet utilisateur
    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
        const followResult = await db.query(
            'SELECT 1 FROM user_follows WHERE follower_id = $1 AND following_id = $2',
            [currentUserId, user.id]
        );
        isFollowing = followResult.rows.length > 0;
    }

    logger.info('Profil utilisateur récupéré', {
        userId: user.id,
        username: user.username,
        viewedBy: currentUserId
    });

    res.json({
        success: true,
        data: {
            user: {
                ...user,
                total_views: parseInt(user.total_views || 0),
                video_count: parseInt(user.video_count),
                playlist_count: parseInt(user.playlist_count),
                followers_count: parseInt(user.followers_count),
                following_count: parseInt(user.following_count),
                isFollowing: currentUserId === user.id ? null : isFollowing
            }
        }
    });
});

// Mettre à jour le profil de l'utilisateur connecté
const updateProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { firstName, lastName, bio } = req.body;

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (firstName !== undefined) {
        updateFields.push(`first_name = $${paramIndex}`);
        updateValues.push(firstName);
        paramIndex++;
    }

    if (lastName !== undefined) {
        updateFields.push(`last_name = $${paramIndex}`);
        updateValues.push(lastName);
        paramIndex++;
    }

    if (bio !== undefined) {
        updateFields.push(`bio = $${paramIndex}`);
        updateValues.push(bio);
        paramIndex++;
    }

    if (updateFields.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Aucun champ à mettre à jour',
            code: 'NO_UPDATE_FIELDS'
        });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(userId);

    const updateQuery = `
    UPDATE users 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, username, email, first_name, last_name, bio, avatar_url, updated_at
  `;

    const result = await db.query(updateQuery, updateValues);

    logger.auth('Profil utilisateur mis à jour', {
        userId,
        updatedFields: Object.keys(req.body)
    });

    res.json({
        success: true,
        message: 'Profil mis à jour avec succès',
        data: {
            user: result.rows[0]
        }
    });
});

// Changer le mot de passe
const changePassword = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Vérifier le mot de passe actuel
    const userResult = await db.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
    );

    const user = userResult.rows[0];
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isValidPassword) {
        return res.status(400).json({
            success: false,
            error: 'Mot de passe actuel incorrect',
            code: 'INVALID_CURRENT_PASSWORD'
        });
    }

    // Hasher le nouveau mot de passe
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Mettre à jour le mot de passe
    await db.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newPasswordHash, userId]
    );

    // Révoquer toutes les sessions actives (sauf la courante)
    await db.query(
        'UPDATE user_sessions SET is_active = false WHERE user_id = $1',
        [userId]
    );

    logger.security('Mot de passe changé', {
        userId,
        username: req.user.username,
        ip: req.ip
    });

    res.json({
        success: true,
        message: 'Mot de passe modifié avec succès'
    });
});

// Suivre/ne plus suivre un utilisateur
const followUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const followerId = req.user.id;

    if (followerId === id) {
        return res.status(400).json({
            success: false,
            error: 'Vous ne pouvez pas vous suivre vous-même',
            code: 'CANNOT_FOLLOW_SELF'
        });
    }

    // Vérifier que l'utilisateur à suivre existe
    const targetUserResult = await db.query(
        'SELECT id, username FROM users WHERE id = $1 AND status = \'active\'',
        [id]
    );

    if (targetUserResult.rows.length === 0) {
        return res.status(404).json({
            success: false,
            error: 'Utilisateur non trouvé',
            code: 'USER_NOT_FOUND'
        });
    }

    const targetUser = targetUserResult.rows[0];

    // Vérifier si déjà suivi
    const existingFollow = await db.query(
        'SELECT id FROM user_follows WHERE follower_id = $1 AND following_id = $2',
        [followerId, id]
    );

    if (existingFollow.rows.length > 0) {
        // Unfollow
        await db.query(
            'DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2',
            [followerId, id]
        );

        logger.info('Utilisateur unfollowed', {
            followerId,
            followingId: id,
            followingUsername: targetUser.username
        });

        res.json({
            success: true,
            message: `Vous ne suivez plus ${targetUser.username}`,
            data: { following: false }
        });
    } else {
        // Follow
        await db.query(
            'INSERT INTO user_follows (id, follower_id, following_id) VALUES ($1, $2, $3)',
            [uuidv4(), followerId, id]
        );

        logger.info('Utilisateur followed', {
            followerId,
            followingId: id,
            followingUsername: targetUser.username
        });

        res.json({
            success: true,
            message: `Vous suivez maintenant ${targetUser.username}`,
            data: { following: true }
        });
    }
});

// Obtenir les abonnements d'un utilisateur
const getUserFollowing = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const followingQuery = `
    SELECT 
      u.id, u.username, u.first_name, u.last_name, u.avatar_url,
      (SELECT COUNT(*) FROM videos WHERE user_id = u.id AND status = 'ready') as video_count,
      uf.created_at as followed_at
    FROM user_follows uf
    JOIN users u ON uf.following_id = u.id
    WHERE uf.follower_id = $1 AND u.status = 'active'
    ORDER BY uf.created_at DESC
    LIMIT $2 OFFSET $3
  `;

    const countQuery = `
    SELECT COUNT(*) as total
    FROM user_follows uf
    JOIN users u ON uf.following_id = u.id
    WHERE uf.follower_id = $1 AND u.status = 'active'
  `;

    const [followingResult, countResult] = await Promise.all([
        db.query(followingQuery, [id, limit, offset]),
        db.query(countQuery, [id])
    ]);

    const following = followingResult.rows;
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
        success: true,
        data: {
            following,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        }
    });
});

// Obtenir les abonnés d'un utilisateur
const getUserFollowers = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const followersQuery = `
    SELECT 
      u.id, u.username, u.first_name, u.last_name, u.avatar_url,
      (SELECT COUNT(*) FROM videos WHERE user_id = u.id AND status = 'ready') as video_count,
      uf.created_at as followed_at
    FROM user_follows uf
    JOIN users u ON uf.follower_id = u.id
    WHERE uf.following_id = $1 AND u.status = 'active'
    ORDER BY uf.created_at DESC
    LIMIT $2 OFFSET $3
  `;

    const countQuery = `
    SELECT COUNT(*) as total
    FROM user_follows uf
    JOIN users u ON uf.follower_id = u.id
    WHERE uf.following_id = $1 AND u.status = 'active'
  `;

    const [followersResult, countResult] = await Promise.all([
        db.query(followersQuery, [id, limit, offset]),
        db.query(countQuery, [id])
    ]);

    const followers = followersResult.rows;
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
        success: true,
        data: {
            followers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        }
    });
});

// Obtenir les notifications de l'utilisateur
const getUserNotifications = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 20, unread = false } = req.query;
    const offset = (page - 1) * limit;

    let whereCondition = 'user_id = $1';
    const params = [userId];

    if (unread === 'true') {
        whereCondition += ' AND is_read = false';
    }

    const notificationsQuery = `
    SELECT id, type, title, message, data, is_read, created_at
    FROM notifications
    WHERE ${whereCondition}
    ORDER BY created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

    const countQuery = `
    SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_read = false) as unread_count
    FROM notifications
    WHERE user_id = $1
  `;

    const [notificationsResult, countResult] = await Promise.all([
        db.query(notificationsQuery, [...params, limit, offset]),
        db.query(countQuery, [userId])
    ]);

    const notifications = notificationsResult.rows;
    const { total, unread_count } = countResult.rows[0];
    const totalPages = Math.ceil(total / limit);

    res.json({
        success: true,
        data: {
            notifications,
            counts: {
                total: parseInt(total),
                unread: parseInt(unread_count)
            },
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(total),
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        }
    });
});

// Marquer les notifications comme lues
const markNotificationsRead = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { notificationIds } = req.body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
        return res.status(400).json({
            success: false,
            error: 'IDs de notifications requis',
            code: 'MISSING_NOTIFICATION_IDS'
        });
    }

    const result = await db.query(
        'UPDATE notifications SET is_read = true WHERE user_id = $1 AND id = ANY($2) AND is_read = false',
        [userId, notificationIds]
    );

    res.json({
        success: true,
        message: `${result.rowCount} notification(s) marquée(s) comme lue(s)`
    });
});

// Supprimer le compte utilisateur
const deleteAccount = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { password } = req.body;

    // Vérifier le mot de passe
    const userResult = await db.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
    );

    const user = userResult.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
        return res.status(400).json({
            success: false,
            error: 'Mot de passe incorrect',
            code: 'INVALID_PASSWORD'
        });
    }

    // Supprimer toutes les données utilisateur (cascade)
    await db.query('DELETE FROM users WHERE id = $1', [userId]);

    logger.security('Compte utilisateur supprimé', {
        userId,
        username: req.user.username,
        ip: req.ip
    });

    res.json({
        success: true,
        message: 'Compte supprimé avec succès'
    });
});

module.exports = {
    getUserProfile,
    updateProfile,
    changePassword,
    followUser,
    getUserFollowing,
    getUserFollowers,
    getUserNotifications,
    markNotificationsRead,
    deleteAccount
};