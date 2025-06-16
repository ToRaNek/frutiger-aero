// backend/src/server.js
require('dotenv').config();

const { server } = require('./app');
const logger = require('./utils/logger');
const db = require('./config/database');

// Configuration du port
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Fonction de démarrage du serveur
const startServer = async () => {
    try {
        // Test de la connexion à la base de données
        logger.info('🔄 Test de la connexion à la base de données...');
        await db.testConnection();
        logger.info('✅ Connexion à PostgreSQL établie avec succès');

        // Vérification de la configuration FFmpeg
        const ffmpeg = require('fluent-ffmpeg');
        try {
            await new Promise((resolve, reject) => {
                ffmpeg.getAvailableFormats((err, formats) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(formats);
                    }
                });
            });
            logger.info('✅ FFmpeg détecté et fonctionnel');
        } catch (error) {
            logger.warn('⚠️ FFmpeg non détecté ou non fonctionnel. Les fonctionnalités de traitement vidéo seront limitées.');
            logger.warn('Installez FFmpeg: https://ffmpeg.org/download.html');
        }

        // Démarrage du serveur HTTP
        server.listen(PORT, HOST, () => {
            logger.info(`🚀 Serveur Frutiger Streaming démarré avec succès !`);
            logger.info(`📡 Écoute sur http://${HOST}:${PORT}`);
            logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`📊 Process ID: ${process.pid}`);
            logger.info(`💾 Mémoire utilisée: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);

            // URLs importantes
            console.log('\n📋 URLs importantes:');
            console.log(`   API Health Check: http://localhost:${PORT}/health`);
            console.log(`   API Documentation: http://localhost:${PORT}/api`);
            console.log(`   Frontend (si démarré): http://localhost:3000`);
            console.log(`   PostgreSQL: localhost:5432`);

            // Configuration actuelle
            console.log('\n⚙️ Configuration:');
            console.log(`   Base de données: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
            console.log(`   JWT Expiration: ${process.env.JWT_EXPIRE}`);
            console.log(`   Upload Max Size: ${process.env.MAX_FILE_SIZE}`);
            console.log(`   Rate Limit: ${process.env.RATE_LIMIT_MAX_REQUESTS} req/${process.env.RATE_LIMIT_WINDOW}min`);

            console.log('\n🎨 Thème: Frutiger Aero - Nostalgie des années 2000-2010');
            console.log('✨ Streaming vidéo avec esthétique glassmorphism et aurora effects\n');
        });

        // Gestion des erreurs du serveur
        server.on('error', (error) => {
            if (error.syscall !== 'listen') {
                throw error;
            }

            const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

            switch (error.code) {
                case 'EACCES':
                    logger.error(`❌ ${bind} nécessite des privilèges élevés`);
                    process.exit(1);
                    break;
                case 'EADDRINUSE':
                    logger.error(`❌ ${bind} est déjà utilisé`);
                    logger.info('💡 Suggestions:');
                    logger.info('   - Changez le PORT dans le fichier .env');
                    logger.info('   - Arrêtez l\'autre processus utilisant ce port');
                    logger.info(`   - Utilisez: lsof -ti:${PORT} | xargs kill -9`);
                    process.exit(1);
                    break;
                default:
                    logger.error('❌ Erreur du serveur:', error);
                    throw error;
            }
        });

    } catch (error) {
        logger.error('❌ Erreur lors du démarrage du serveur:', error);

        // Messages d'aide selon le type d'erreur
        if (error.code === 'ECONNREFUSED') {
            logger.error('🔌 Impossible de se connecter à PostgreSQL');
            logger.info('💡 Vérifiez que PostgreSQL fonctionne:');
            logger.info('   docker-compose up -d');
            logger.info('   docker-compose logs postgres');
        } else if (error.code === 'ENOTFOUND') {
            logger.error('🌐 Erreur de réseau ou de DNS');
            logger.info('💡 Vérifiez votre configuration réseau et les variables d\'environnement');
        } else if (error.message.includes('authentication')) {
            logger.error('🔐 Erreur d\'authentification PostgreSQL');
            logger.info('💡 Vérifiez les credentials dans le fichier .env:');
            logger.info('   DB_USER, DB_PASSWORD, DB_NAME');
        }

        process.exit(1);
    }
};

// Gestion des signaux système pour un arrêt propre
const gracefulShutdown = (signal) => {
    logger.info(`📶 Signal ${signal} reçu, arrêt gracieux du serveur...`);

    server.close(async (err) => {
        if (err) {
            logger.error('❌ Erreur lors de la fermeture du serveur:', err);
            process.exit(1);
        }

        try {
            // Fermer la connexion à la base de données
            await db.closeConnection();
            logger.info('✅ Connexion à la base de données fermée');

            logger.info('👋 Serveur arrêté proprement');
            process.exit(0);
        } catch (error) {
            logger.error('❌ Erreur lors de la fermeture des connexions:', error);
            process.exit(1);
        }
    });

    // Force l'arrêt après 10s si le serveur ne répond pas
    setTimeout(() => {
        logger.error('⏰ Timeout: arrêt forcé du serveur');
        process.exit(1);
    }, 10000);
};

// Écoute des signaux système
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
    logger.error('💥 Exception non capturée:', error);
    logger.error('Stack trace:', error.stack);

    // Arrêt gracieux
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Promesse rejetée non gérée:', { reason, promise });

    // Arrêt gracieux
    gracefulShutdown('UNHANDLED_REJECTION');
});

// Statistiques système périodiques (en développement)
if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
        const memUsage = process.memoryUsage();
        const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

        logger.debug(`📊 Statistiques système - Mémoire: ${memUsedMB}/${memTotalMB} MB, Uptime: ${Math.round(process.uptime())}s`);
    }, 300000); // Toutes les 5 minutes
}

// Message de bienvenue
logger.info('🌊 Initialisation de Frutiger Streaming Platform...');
logger.info('🎨 Esthétique: Frutiger Aero (2004-2013)');
logger.info('⚡ Node.js + Express + PostgreSQL + HLS Streaming');

// Démarrage du serveur
startServer();