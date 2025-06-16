-- database/migrations/002_create_videos.sql
-- Migration pour la création des tables de vidéos et contenu multimédia

-- Création des types ENUM pour les vidéos
CREATE TYPE video_status AS ENUM ('processing', 'ready', 'failed', 'deleted');
CREATE TYPE video_quality AS ENUM ('360p', '480p', '720p', '1080p', '1440p', '2160p');
CREATE TYPE playlist_visibility AS ENUM ('public', 'private', 'unlisted');

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

-- Table principale des vidéos
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

-- Table des formats/qualités de vidéo pour le streaming HLS
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

-- Table de liaison vidéo-catégorie
CREATE TABLE video_categories (
                                  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                                  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
                                  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
                                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                  UNIQUE(video_id, category_id)
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

-- Index pour les performances sur la table videos
CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_visibility ON videos(visibility);
CREATE INDEX idx_videos_created_at ON videos(created_at);
CREATE INDEX idx_videos_published_at ON videos(published_at);
CREATE INDEX idx_videos_view_count ON videos(view_count);
CREATE INDEX idx_videos_like_count ON videos(like_count);
CREATE INDEX idx_videos_duration ON videos(duration);

-- Index de recherche textuelle sur le titre et description
CREATE INDEX idx_videos_title_search ON videos USING gin (to_tsvector('english', title));
CREATE INDEX idx_videos_description_search ON videos USING gin (to_tsvector('english', description));
CREATE INDEX idx_videos_tags ON videos USING gin (tags);

-- Index pour la table video_formats
CREATE INDEX idx_video_formats_video_id ON video_formats(video_id);
CREATE INDEX idx_video_formats_quality ON video_formats(quality);

-- Index pour la table categories
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_name ON categories(name);

-- Index pour la table video_categories
CREATE INDEX idx_video_categories_video_id ON video_categories(video_id);
CREATE INDEX idx_video_categories_category_id ON video_categories(category_id);

-- Index pour la table video_reactions
CREATE INDEX idx_video_reactions_user_id ON video_reactions(user_id);
CREATE INDEX idx_video_reactions_video_id ON video_reactions(video_id);
CREATE INDEX idx_video_reactions_type ON video_reactions(reaction_type);

-- Index pour la table comments
CREATE INDEX idx_comments_video_id ON comments(video_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);
CREATE INDEX idx_comments_is_deleted ON comments(is_deleted);

-- Index pour la table video_views
CREATE INDEX idx_video_views_user_id ON video_views(user_id);
CREATE INDEX idx_video_views_video_id ON video_views(video_id);
CREATE INDEX idx_video_views_watched_at ON video_views(watched_at);
CREATE INDEX idx_video_views_session_id ON video_views(session_id);
CREATE INDEX idx_video_views_completion ON video_views(completion_percentage);

-- Trigger pour la mise à jour automatique du champ updated_at
CREATE TRIGGER update_videos_updated_at
    BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour les compteurs de réactions sur les vidéos
CREATE OR REPLACE FUNCTION update_video_reaction_counts()
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
    FOR EACH ROW EXECUTE FUNCTION update_video_reaction_counts();

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

-- Trigger pour mettre à jour le compteur de vidéos dans les catégories
CREATE OR REPLACE FUNCTION update_category_video_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
UPDATE categories SET video_count = video_count + 1 WHERE id = NEW.category_id;
RETURN NEW;
ELSIF TG_OP = 'DELETE' THEN
UPDATE categories SET video_count = video_count - 1 WHERE id = OLD.category_id;
RETURN OLD;
END IF;
RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER category_video_count_trigger
    AFTER INSERT OR DELETE ON video_categories
FOR EACH ROW EXECUTE FUNCTION update_category_video_count();

-- Fonction pour calculer les vidéos tendances
CREATE OR REPLACE FUNCTION get_trending_videos(days_back INTEGER DEFAULT 7, limit_count INTEGER DEFAULT 50)
RETURNS TABLE(
    video_id uuid,
    title VARCHAR(255),
    view_count INTEGER,
    like_count INTEGER,
    comment_count INTEGER,
    trending_score NUMERIC
) AS $$
BEGIN
RETURN QUERY
SELECT
    v.id,
    v.title,
    v.view_count,
    v.like_count,
    v.comment_count,
    -- Calcul du score de tendance basé sur les vues récentes, likes et commentaires
    (
        COALESCE(recent_views.view_count, 0) * 1.0 +
        v.like_count * 0.5 +
        v.comment_count * 0.3
        ) / EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v.published_at)) * 86400 as trending_score
FROM videos v
         LEFT JOIN (
    SELECT
        video_id,
        COUNT(*) as view_count
    FROM video_views
    WHERE watched_at >= CURRENT_TIMESTAMP - INTERVAL '%s days' % days_back
    GROUP BY video_id
) recent_views ON v.id = recent_views.video_id
WHERE v.status = 'ready'
  AND v.visibility = 'public'
  AND v.published_at IS NOT NULL
  AND v.published_at >= CURRENT_TIMESTAMP - INTERVAL '%s days' % (days_back * 2)
ORDER BY trending_score DESC
    LIMIT limit_count;
END;
$$ language 'plpgsql';

COMMENT ON TABLE videos IS 'Table principale des vidéos avec métadonnées complètes';
COMMENT ON TABLE video_formats IS 'Formats et qualités générés pour le streaming HLS';
COMMENT ON TABLE categories IS 'Catégories de classification des vidéos';
COMMENT ON TABLE video_reactions IS 'Likes et dislikes des utilisateurs sur les vidéos';
COMMENT ON TABLE comments IS 'Système de commentaires avec réponses hiérarchiques';
COMMENT ON TABLE video_views IS 'Historique de visionnage et analytics des vues';