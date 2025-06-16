-- database/init.sql
-- Script d'initialisation de la base de données Frutiger Streaming

-- Création des extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Création des types ENUM
CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'banned', 'pending');
CREATE TYPE video_status AS ENUM ('processing', 'ready', 'failed', 'deleted');
CREATE TYPE video_quality AS ENUM ('360p', '480p', '720p', '1080p', '1440p', '2160p');
CREATE TYPE playlist_visibility AS ENUM ('public', 'private', 'unlisted');

-- Table des utilisateurs
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

-- Table des vidéos
CREATE TABLE videos (
                        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                        title VARCHAR(255) NOT NULL,
                        description TEXT,
                        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        original_filename VARCHAR(255) NOT NULL,
                        file_path VARCHAR(500) NOT NULL,
                        file_size BIGINT NOT NULL,
                        mime_type VARCHAR(100) NOT NULL,
                        duration INTEGER, -- durée en secondes
                        width INTEGER,
                        height INTEGER,
                        frame_rate DECIMAL(5,3),
                        bitrate INTEGER,
                        thumbnail_url VARCHAR(500),
                        status video_status DEFAULT 'processing',
                        visibility playlist_visibility DEFAULT 'public',
                        view_count INTEGER DEFAULT 0,
                        like_count INTEGER DEFAULT 0,
                        dislike_count INTEGER DEFAULT 0,
                        comment_count INTEGER DEFAULT 0,
                        tags TEXT[],
                        metadata JSONB DEFAULT '{}',
                        processing_progress INTEGER DEFAULT 0,
                        error_message TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        published_at TIMESTAMP
);

-- Table des formats/qualités de vidéo
CREATE TABLE video_formats (
                               id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                               video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
                               quality video_quality NOT NULL,
                               file_path VARCHAR(500) NOT NULL,
                               file_size BIGINT NOT NULL,
                               bitrate INTEGER NOT NULL,
                               width INTEGER NOT NULL,
                               height INTEGER NOT NULL,
                               playlist_url VARCHAR(500), -- URL du fichier m3u8 pour HLS
                               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                               UNIQUE(video_id, quality)
);

-- Table des playlists
CREATE TABLE playlists (
                           id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                           user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                           title VARCHAR(255) NOT NULL,
                           description TEXT,
                           thumbnail_url VARCHAR(500),
                           visibility playlist_visibility DEFAULT 'public',
                           video_count INTEGER DEFAULT 0,
                           total_duration INTEGER DEFAULT 0, -- durée totale en secondes
                           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                           updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison playlist-vidéo
CREATE TABLE playlist_videos (
                                 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                                 playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
                                 video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
                                 position INTEGER NOT NULL,
                                 added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                 UNIQUE(playlist_id, video_id),
                                 UNIQUE(playlist_id, position)
);

-- Table des likes/dislikes
CREATE TABLE video_reactions (
                                 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                                 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                 video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
                                 reaction_type VARCHAR(10) NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
                                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                 UNIQUE(user_id, video_id)
);

-- Table des commentaires
CREATE TABLE comments (
                          id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                          user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                          video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
                          parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
                          content TEXT NOT NULL,
                          like_count INTEGER DEFAULT 0,
                          dislike_count INTEGER DEFAULT 0,
                          reply_count INTEGER DEFAULT 0,
                          is_edited BOOLEAN DEFAULT FALSE,
                          is_deleted BOOLEAN DEFAULT FALSE,
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des vues/historique de visionnage
CREATE TABLE video_views (
                             id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                             user_id uuid REFERENCES users(id) ON DELETE SET NULL,
                             video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
                             session_id VARCHAR(255), -- pour les utilisateurs non connectés
                             ip_address INET,
                             user_agent TEXT,
                             watched_duration INTEGER DEFAULT 0, -- durée regardée en secondes
                             completion_percentage DECIMAL(5,2) DEFAULT 0,
                             watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                             last_position INTEGER DEFAULT 0 -- position d'arrêt pour la reprise
);

-- Table des abonnements/follows
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

-- Table des sessions utilisateur
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

-- Table des catégories de vidéos
CREATE TABLE categories (
                            id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                            name VARCHAR(100) UNIQUE NOT NULL,
                            slug VARCHAR(100) UNIQUE NOT NULL,
                            description TEXT,
                            color VARCHAR(7), -- couleur hexadécimale
                            icon VARCHAR(50),
                            video_count INTEGER DEFAULT 0,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison vidéo-catégorie
CREATE TABLE video_categories (
                                  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                                  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
                                  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
                                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                  UNIQUE(video_id, category_id)
);

-- Table des analytics
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

-- Index pour les performances
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_visibility ON videos(visibility);
CREATE INDEX idx_videos_created_at ON videos(created_at);
CREATE INDEX idx_videos_published_at ON videos(published_at);
CREATE INDEX idx_videos_view_count ON videos(view_count);
CREATE INDEX idx_videos_title_search ON videos USING gin (to_tsvector('english', title));
CREATE INDEX idx_videos_tags ON videos USING gin (tags);

CREATE INDEX idx_video_formats_video_id ON video_formats(video_id);
CREATE INDEX idx_video_formats_quality ON video_formats(quality);

CREATE INDEX idx_playlists_user_id ON playlists(user_id);
CREATE INDEX idx_playlists_visibility ON playlists(visibility);
CREATE INDEX idx_playlists_created_at ON playlists(created_at);

CREATE INDEX idx_playlist_videos_playlist_id ON playlist_videos(playlist_id);
CREATE INDEX idx_playlist_videos_video_id ON playlist_videos(video_id);
CREATE INDEX idx_playlist_videos_position ON playlist_videos(position);

CREATE INDEX idx_video_reactions_user_id ON video_reactions(user_id);
CREATE INDEX idx_video_reactions_video_id ON video_reactions(video_id);

CREATE INDEX idx_comments_video_id ON comments(video_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);

CREATE INDEX idx_video_views_user_id ON video_views(user_id);
CREATE INDEX idx_video_views_video_id ON video_views(video_id);
CREATE INDEX idx_video_views_watched_at ON video_views(watched_at);
CREATE INDEX idx_video_views_session_id ON video_views(session_id);

CREATE INDEX idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following_id ON user_follows(following_id);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX idx_video_categories_video_id ON video_categories(video_id);
CREATE INDEX idx_video_categories_category_id ON video_categories(category_id);

CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON playlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers pour les compteurs
CREATE OR REPLACE FUNCTION update_video_counts()
    RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Incrémenter les compteurs
        IF NEW.reaction_type = 'like' THEN
UPDATE videos SET like_count = like_count + 1 WHERE id = NEW.video_id;
ELSIF NEW.reaction_type = 'dislike' THEN
UPDATE videos SET dislike_count = dislike_count + 1 WHERE id = NEW.video_id;
END IF;
RETURN NEW;
ELSIF TG_OP = 'UPDATE' THEN
        -- Gérer le changement de réaction
        IF OLD.reaction_type = 'like' AND NEW.reaction_type = 'dislike' THEN
UPDATE videos SET like_count = like_count - 1, dislike_count = dislike_count + 1 WHERE id = NEW.video_id;
ELSIF OLD.reaction_type = 'dislike' AND NEW.reaction_type = 'like' THEN
UPDATE videos SET like_count = like_count + 1, dislike_count = dislike_count - 1 WHERE id = NEW.video_id;
END IF;
RETURN NEW;
ELSIF TG_OP = 'DELETE' THEN
        -- Décrémenter les compteurs
        IF OLD.reaction_type = 'like' THEN
UPDATE videos SET like_count = like_count - 1 WHERE id = OLD.video_id;
ELSIF OLD.reaction_type = 'dislike' THEN
UPDATE videos SET dislike_count = dislike_count - 1 WHERE id = OLD.video_id;
END IF;
RETURN OLD;
END IF;
RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER video_reactions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON video_reactions
    FOR EACH ROW EXECUTE FUNCTION update_video_counts();

-- Trigger pour les compteurs de commentaires
CREATE OR REPLACE FUNCTION update_comment_counts()
    RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
UPDATE videos SET comment_count = comment_count + 1 WHERE id = NEW.video_id;
IF NEW.parent_id IS NOT NULL THEN
UPDATE comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_id;
END IF;
RETURN NEW;
ELSIF TG_OP = 'DELETE' THEN
UPDATE videos SET comment_count = comment_count - 1 WHERE id = OLD.video_id;
IF OLD.parent_id IS NOT NULL THEN
UPDATE comments SET reply_count = reply_count - 1 WHERE id = OLD.parent_id;
END IF;
RETURN OLD;
END IF;
RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER comment_counts_trigger
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_comment_counts();

-- Trigger pour les compteurs de playlist
CREATE OR REPLACE FUNCTION update_playlist_counts()
    RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
UPDATE playlists
SET video_count = video_count + 1,
    total_duration = total_duration + COALESCE((SELECT duration FROM videos WHERE id = NEW.video_id), 0)
WHERE id = NEW.playlist_id;
RETURN NEW;
ELSIF TG_OP = 'DELETE' THEN
UPDATE playlists
SET video_count = video_count - 1,
    total_duration = total_duration - COALESCE((SELECT duration FROM videos WHERE id = OLD.video_id), 0)
WHERE id = OLD.playlist_id;
RETURN OLD;
END IF;
RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER playlist_counts_trigger
    AFTER INSERT OR DELETE ON playlist_videos
    FOR EACH ROW EXECUTE FUNCTION update_playlist_counts();

-- Insertion des catégories par défaut
INSERT INTO categories (name, slug, description, color, icon) VALUES
                                                                  ('Action', 'action', 'Vidéos d''action et d''aventure', '#FF6B35', 'flash'),
                                                                  ('Comédie', 'comedie', 'Vidéos humoristiques et divertissantes', '#FFD23F', 'happy'),
                                                                  ('Documentaire', 'documentaire', 'Documentaires éducatifs', '#06FFA5', 'book'),
                                                                  ('Gaming', 'gaming', 'Contenu lié aux jeux vidéo', '#4ECDC4', 'game-controller'),
                                                                  ('Musique', 'musique', 'Clips musicaux et performances', '#FF6B9D', 'musical-note'),
                                                                  ('Science', 'science', 'Contenu scientifique et technologique', '#45B7D1', 'flask'),
                                                                  ('Sport', 'sport', 'Vidéos sportives', '#96CEB4', 'football'),
                                                                  ('Voyage', 'voyage', 'Vlogs de voyage et découverte', '#FECA57', 'airplane'),
                                                                  ('Cuisine', 'cuisine', 'Recettes et tutoriels cuisine', '#FF9FF3', 'restaurant'),
                                                                  ('Éducation', 'education', 'Contenu éducatif et pédagogique', '#54A0FF', 'school');

-- Création de l'utilisateur admin par défaut
INSERT INTO users (username, email, password_hash, first_name, last_name, role, status, email_verified) VALUES
    ('admin', 'admin@frutiger-streaming.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBNj7qgGd.0xOu', 'Administrator', 'System', 'admin', 'active', true);

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Base de données Frutiger Streaming initialisée avec succès !';
    RAISE NOTICE 'Utilisateur admin créé : admin@frutiger-streaming.com / password: admin123';
    RAISE NOTICE 'Catégories par défaut créées : %', (SELECT COUNT(*) FROM categories);
END $$;