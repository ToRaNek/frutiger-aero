-- database/migrations/001_create_users.sql
-- Migration pour la création des utilisateurs et tables d'authentification

-- Création des types ENUM pour les utilisateurs
CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'banned', 'pending');

-- Table des utilisateurs principale
CREATE TABLE users (
                       id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                       username VARCHAR(50) UNIQUE NOT NULL,
                       email VARCHAR(255) UNIQUE NOT NULL,
                       password_hash VARCHAR(255) NOT NULL,
                       first_name VARCHAR(100),
                       last_name VARCHAR(100),
                       avatar_url VARCHAR(500),
                       bio TEXT,
                       role user_role DEFAULT 'user',
                       status user_status DEFAULT 'active',
                       email_verified BOOLEAN DEFAULT FALSE,
                       email_verification_token VARCHAR(255),
                       password_reset_token VARCHAR(255),
                       password_reset_expires TIMESTAMP,
                       last_login TIMESTAMP,
                       login_attempts INTEGER DEFAULT 0,
                       locked_until TIMESTAMP,
                       preferences JSONB DEFAULT '{}',
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des sessions utilisateur pour la gestion des refresh tokens
CREATE TABLE user_sessions (
                               id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                               user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                               refresh_token VARCHAR(500) NOT NULL,
                               ip_address INET,
                               user_agent TEXT,
                               is_active BOOLEAN DEFAULT TRUE,
                               expires_at TIMESTAMP NOT NULL,
                               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                               last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des abonnements/follows entre utilisateurs
CREATE TABLE user_follows (
                              id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                              follower_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                              following_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                              UNIQUE(follower_id, following_id),
                              CHECK(follower_id != following_id)
    );

-- Table des notifications
CREATE TABLE notifications (
                               id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                               user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                               type VARCHAR(50) NOT NULL,
                               title VARCHAR(255) NOT NULL,
                               message TEXT,
                               data JSONB DEFAULT '{}',
                               is_read BOOLEAN DEFAULT FALSE,
                               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des événements analytics
CREATE TABLE analytics_events (
                                  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                                  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
                                  session_id VARCHAR(255),
                                  event_type VARCHAR(50) NOT NULL,
                                  event_data JSONB DEFAULT '{}',
                                  ip_address INET,
                                  user_agent TEXT,
                                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les performances sur la table users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_email_verified ON users(email_verified);

-- Index pour la table user_sessions
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);

-- Index pour la table user_follows
CREATE INDEX idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following_id ON user_follows(following_id);
CREATE INDEX idx_user_follows_created_at ON user_follows(created_at);

-- Index pour la table notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Index pour la table analytics_events
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);

-- Trigger pour la mise à jour automatique du champ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour nettoyer automatiquement les sessions expirées
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS TRIGGER AS $$
BEGIN
DELETE FROM user_sessions
WHERE expires_at < CURRENT_TIMESTAMP
  AND is_active = FALSE;
RETURN NULL;
END;
$$ language 'plpgsql';

-- Déclencher le nettoyage toutes les heures (sera géré par le backend)
-- CREATE TRIGGER cleanup_sessions_trigger
--     AFTER INSERT ON user_sessions
--     FOR EACH STATEMENT EXECUTE FUNCTION cleanup_expired_sessions();

COMMENT ON TABLE users IS 'Table principale des utilisateurs avec authentification complète';
COMMENT ON TABLE user_sessions IS 'Sessions actives et refresh tokens pour JWT';
COMMENT ON TABLE user_follows IS 'Système de follows/abonnements entre utilisateurs';
COMMENT ON TABLE notifications IS 'Notifications utilisateur en temps réel';
COMMENT ON TABLE analytics_events IS 'Événements analytics pour le tracking utilisateur';