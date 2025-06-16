// backend/src/config/database.js
const { Pool } = require('pg');
const logger = require('../utils/logger');

// Configuration de la base de données
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'frutiger_streaming',
    user: process.env.DB_USER || 'frutiger_user',
    password: process.env.DB_PASSWORD || 'frutiger_password_2024',

    // Configuration du pool de connexions
    max: parseInt(process.env.DB_POOL_MAX) || 20, // Nombre maximum de connexions
    min: parseInt(process.env.DB_POOL_MIN) || 5,  // Nombre minimum de connexions
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000, // 30 secondes
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000, // 5 secondes

    // Configuration SSL pour la production
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false,

    // Configuration des requêtes
    query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000, // 30 secondes
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000, // 30 secondes

    // Configuration du client
    application_name: 'frutiger_streaming_api',

    // Logging des requêtes lentes (développement uniquement)
    log: process.env.NODE_ENV === 'development' ? (msg) => {
        if (msg.includes('slow query')) {
            logger.warn('Requête lente PostgreSQL:', msg);
        }
    } : undefined
};

// Création du pool de connexions
const pool = new Pool(dbConfig);

// Gestion des événements du pool
pool.on('connect', (client) => {
    logger.debug(`Nouvelle connexion PostgreSQL établie: ${client?.processID || 'ID inconnu'}`);
});

pool.on('acquire', (client) => {
    logger.debug(`Connexion PostgreSQL acquise: ${client?.processID || 'ID inconnu'}`);
});

pool.on('release', (client) => {
    // Vérification de sécurité pour éviter l'erreur
    const processId = client?.processID || 'ID inconnu';
    logger.debug(`Connexion PostgreSQL libérée: ${processId}`);
});

pool.on('remove', (client) => {
    logger.debug(`Connexion PostgreSQL supprimée: ${client?.processID || 'ID inconnu'}`);
});

pool.on('error', (err, client) => {
    logger.error('Erreur PostgreSQL inattendue:', {
        error: err.message,
        stack: err.stack,
        processID: client?.processID || 'ID inconnu'
    });
});

// Fonction pour tester la connexion
const testConnection = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time, version() as version');
        const { current_time, version } = result.rows[0];

        client.release();

        logger.info('Test de connexion PostgreSQL réussi:', {
            time: current_time,
            version: version.split(' ')[0] + ' ' + version.split(' ')[1]
        });

        return true;
    } catch (error) {
        logger.error('Échec du test de connexion PostgreSQL:', {
            error: error.message,
            code: error.code,
            detail: error.detail
        });
        throw error;
    }
};

// Fonction pour obtenir les statistiques du pool
const getPoolStats = () => {
    return {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
    };
};

// Fonction pour exécuter une requête avec logging
const query = async (text, params = []) => {
    const start = Date.now();
    const client = await pool.connect();

    try {
        logger.debug('Exécution de la requête PostgreSQL:', {
            sql: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            params: params.length > 0 ? `${params.length} paramètres` : 'aucun paramètre'
        });

        const result = await client.query(text, params);
        const duration = Date.now() - start;

        // Log des requêtes lentes
        if (duration > 1000) {
            logger.warn('Requête PostgreSQL lente détectée:', {
                sql: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
                duration: `${duration}ms`,
                rowCount: result.rowCount
            });
        } else {
            logger.debug('Requête PostgreSQL terminée:', {
                duration: `${duration}ms`,
                rowCount: result.rowCount
            });
        }

        return result;
    } catch (error) {
        const duration = Date.now() - start;
        logger.error('Erreur lors de l\'exécution de la requête PostgreSQL:', {
            sql: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
            duration: `${duration}ms`,
            error: error.message,
            code: error.code,
            detail: error.detail
        });
        throw error;
    } finally {
        client.release();
    }
};

// Fonction pour exécuter une transaction
const transaction = async (callback) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        logger.debug('Transaction PostgreSQL commencée');

        const result = await callback(client);

        await client.query('COMMIT');
        logger.debug('Transaction PostgreSQL validée');

        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Transaction PostgreSQL annulée:', {
            error: error.message,
            code: error.code
        });
        throw error;
    } finally {
        client.release();
    }
};

// Fonction pour paginer les résultats
const paginate = async (baseQuery, params = [], options = {}) => {
    const {
        page = 1,
        limit = 10,
        orderBy = 'created_at',
        orderDirection = 'DESC'
    } = options;

    const offset = (page - 1) * limit;

    // Requête pour compter le total
    const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as count_query`;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Requête pour récupérer les données paginées
    const dataQuery = `
    ${baseQuery}
    ORDER BY ${orderBy} ${orderDirection}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
    const dataResult = await query(dataQuery, [...params, limit, offset]);

    const totalPages = Math.ceil(total / limit);

    return {
        data: dataResult.rows,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        }
    };
};

// Fonction pour rechercher avec texte intégral
const fullTextSearch = async (table, searchField, searchTerm, options = {}) => {
    const {
        page = 1,
        limit = 10,
        additionalConditions = '',
        additionalParams = []
    } = options;

    const offset = (page - 1) * limit;

    // Nettoyer et préparer le terme de recherche
    const cleanSearchTerm = searchTerm.replace(/[^\w\s]/g, '').trim();
    const tsQuery = cleanSearchTerm.split(' ').filter(word => word.length > 0).join(' & ');

    const searchQuery = `
    SELECT *, ts_rank(to_tsvector('french', ${searchField}), to_tsquery('french', $1)) as rank
    FROM ${table}
    WHERE to_tsvector('french', ${searchField}) @@ to_tsquery('french', $1)
    ${additionalConditions}
    ORDER BY rank DESC, created_at DESC
    LIMIT $${additionalParams.length + 2} OFFSET $${additionalParams.length + 3}
  `;

    const result = await query(searchQuery, [tsQuery, ...additionalParams, limit, offset]);

    return result.rows;
};

// Fonction pour nettoyer les anciennes sessions
const cleanupOldSessions = async () => {
    try {
        const result = await query(`
      DELETE FROM user_sessions 
      WHERE expires_at < NOW() OR last_used_at < NOW() - INTERVAL '30 days'
    `);

        if (result.rowCount > 0) {
            logger.info(`Nettoyage des sessions: ${result.rowCount} sessions supprimées`);
        }
    } catch (error) {
        logger.error('Erreur lors du nettoyage des sessions:', error);
    }
};

// Fonction pour nettoyer les anciennes données analytiques
const cleanupOldAnalytics = async () => {
    try {
        const result = await query(`
      DELETE FROM analytics_events 
      WHERE created_at < NOW() - INTERVAL '90 days'
    `);

        if (result.rowCount > 0) {
            logger.info(`Nettoyage des analytics: ${result.rowCount} événements supprimés`);
        }
    } catch (error) {
        logger.error('Erreur lors du nettoyage des analytics:', error);
    }
};

// Planifier le nettoyage automatique
const scheduleCleanup = () => {
    // Nettoyage des sessions toutes les heures
    setInterval(cleanupOldSessions, 60 * 60 * 1000);

    // Nettoyage des analytics tous les jours
    setInterval(cleanupOldAnalytics, 24 * 60 * 60 * 1000);

    logger.info('Tâches de nettoyage automatique planifiées');
};

// Fonction pour fermer proprement les connexions
const closeConnection = async () => {
    try {
        await pool.end();
        logger.info('Pool de connexions PostgreSQL fermé');
    } catch (error) {
        logger.error('Erreur lors de la fermeture du pool PostgreSQL:', error);
        throw error;
    }
};

// Démarrer le nettoyage automatique
if (process.env.NODE_ENV === 'production') {
    scheduleCleanup();
}

// Export des fonctions
module.exports = {
    pool,
    query,
    transaction,
    paginate,
    fullTextSearch,
    testConnection,
    getPoolStats,
    closeConnection,
    cleanupOldSessions,
    cleanupOldAnalytics
};