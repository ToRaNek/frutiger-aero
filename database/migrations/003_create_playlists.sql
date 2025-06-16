-- database/migrations/003_create_playlists.sql
-- Migration pour la création des tables de playlists et gestion des collections

-- Table principale des playlists
CREATE TABLE playlists (
                           id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                           user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                           title VARCHAR(255) NOT NULL,
                           description TEXT,
                           thumbnail_url VARCHAR(500),
                           visibility playlist_visibility DEFAULT 'public',
                           video_count INTEGER DEFAULT 0,
                           total_duration INTEGER DEFAULT 0, -- durée totale en secondes
                           is_auto_generated BOOLEAN DEFAULT FALSE, -- pour les playlists auto comme "Regardées plus tard"
                           playlist_type VARCHAR(50) DEFAULT 'user', -- 'user', 'favorites', 'watch_later', 'history'
                           metadata JSONB DEFAULT '{}',
                           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                           updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison playlist-vidéo avec ordre
CREATE TABLE playlist_videos (
                                 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                                 playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
                                 video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
                                 position INTEGER NOT NULL,
                                 added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                 added_by uuid REFERENCES users(id) ON DELETE SET NULL, -- qui a ajouté cette vidéo
                                 UNIQUE(playlist_id, video_id),
                                 UNIQUE(playlist_id, position)
);

-- Table des playlists favorites (raccourci pour accès rapide)
CREATE TABLE user_favorites (
                                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                                user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                UNIQUE(user_id, video_id)
);

-- Table "À regarder plus tard"
CREATE TABLE watch_later (
                             id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                             user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                             video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
                             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                             UNIQUE(user_id, video_id)
);

-- Table de l'historique de visionnage (différent de video_views pour performances)
CREATE TABLE watch_history (
                               id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                               user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                               video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
                               watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                               watch_duration INTEGER DEFAULT 0, -- durée regardée en secondes
                               completion_percentage DECIMAL(5,2) DEFAULT 0,
                               device_info JSONB DEFAULT '{}',
    -- Unique constraint sur user_id + video_id pour éviter les doublons, met à jour la dernière vue
                               UNIQUE(user_id, video_id)
);

-- Table des collaborateurs de playlist (pour les playlists partagées)
CREATE TABLE playlist_collaborators (
                                        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                                        playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
                                        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                        permission_level VARCHAR(20) DEFAULT 'view', -- 'view', 'edit', 'admin'
                                        invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
                                        invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                        accepted_at TIMESTAMP,
                                        UNIQUE(playlist_id, user_id)
);

-- Table des abonnements aux playlists
CREATE TABLE playlist_subscriptions (
                                        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                                        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                        playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
                                        subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                        notification_enabled BOOLEAN DEFAULT TRUE,
                                        UNIQUE(user_id, playlist_id)
);

-- Index pour les performances sur la table playlists
CREATE INDEX idx_playlists_user_id ON playlists(user_id);
CREATE INDEX idx_playlists_visibility ON playlists(visibility);
CREATE INDEX idx_playlists_playlist_type ON playlists(playlist_type);
CREATE INDEX idx_playlists_created_at ON playlists(created_at);
CREATE INDEX idx_playlists_updated_at ON playlists(updated_at);
CREATE INDEX idx_playlists_is_auto_generated ON playlists(is_auto_generated);

-- Index de recherche textuelle sur le titre et description des playlists
CREATE INDEX idx_playlists_title_search ON playlists USING gin (to_tsvector('english', title));
CREATE INDEX idx_playlists_description_search ON playlists USING gin (to_tsvector('english', description));

-- Index pour la table playlist_videos
CREATE INDEX idx_playlist_videos_playlist_id ON playlist_videos(playlist_id);
CREATE INDEX idx_playlist_videos_video_id ON playlist_videos(video_id);
CREATE INDEX idx_playlist_videos_position ON playlist_videos(position);
CREATE INDEX idx_playlist_videos_added_at ON playlist_videos(added_at);
CREATE INDEX idx_playlist_videos_added_by ON playlist_videos(added_by);

-- Index pour la table user_favorites
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_video_id ON user_favorites(video_id);
CREATE INDEX idx_user_favorites_created_at ON user_favorites(created_at);

-- Index pour la table watch_later
CREATE INDEX idx_watch_later_user_id ON watch_later(user_id);
CREATE INDEX idx_watch_later_video_id ON watch_later(video_id);
CREATE INDEX idx_watch_later_created_at ON watch_later(created_at);

-- Index pour la table watch_history
CREATE INDEX idx_watch_history_user_id ON watch_history(user_id);
CREATE INDEX idx_watch_history_video_id ON watch_history(video_id);
CREATE INDEX idx_watch_history_watched_at ON watch_history(watched_at);
CREATE INDEX idx_watch_history_completion ON watch_history(completion_percentage);

-- Index pour la table playlist_collaborators
CREATE INDEX idx_playlist_collaborators_playlist_id ON playlist_collaborators(playlist_id);
CREATE INDEX idx_playlist_collaborators_user_id ON playlist_collaborators(user_id);
CREATE INDEX idx_playlist_collaborators_permission ON playlist_collaborators(permission_level);

-- Index pour la table playlist_subscriptions
CREATE INDEX idx_playlist_subscriptions_user_id ON playlist_subscriptions(user_id);
CREATE INDEX idx_playlist_subscriptions_playlist_id ON playlist_subscriptions(playlist_id);

-- Trigger pour la mise à jour automatique du champ updated_at
CREATE TRIGGER update_playlists_updated_at
    BEFORE UPDATE ON playlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour les compteurs de playlist
CREATE OR REPLACE FUNCTION update_playlist_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
UPDATE playlists
SET video_count = video_count + 1,
    total_duration = total_duration + COALESCE((SELECT duration FROM videos WHERE id = NEW.video_id), 0),
    updated_at = CURRENT_TIMESTAMP
WHERE id = NEW.playlist_id;
RETURN NEW;
ELSIF TG_OP = 'DELETE' THEN
UPDATE playlists
SET video_count = video_count - 1,
    total_duration = total_duration - COALESCE((SELECT duration FROM videos WHERE id = OLD.video_id), 0),
    updated_at = CURRENT_TIMESTAMP
WHERE id = OLD.playlist_id;
RETURN OLD;
END IF;
RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER playlist_counts_trigger
    AFTER INSERT OR DELETE ON playlist_videos
FOR EACH ROW EXECUTE FUNCTION update_playlist_counts();

-- Fonction pour réorganiser automatiquement les positions lors de suppressions
CREATE OR REPLACE FUNCTION reorder_playlist_positions()
RETURNS TRIGGER AS $$
BEGIN
    -- Réorganiser les positions pour combler les trous après suppression
    IF TG_OP = 'DELETE' THEN
UPDATE playlist_videos
SET position = position - 1
WHERE playlist_id = OLD.playlist_id
  AND position > OLD.position;
RETURN OLD;
END IF;
RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER reorder_positions_trigger
    AFTER DELETE ON playlist_videos
    FOR EACH ROW EXECUTE FUNCTION reorder_playlist_positions();

-- Fonction pour créer automatiquement les playlists système pour un nouvel utilisateur
CREATE OR REPLACE FUNCTION create_default_playlists()
RETURNS TRIGGER AS $$
BEGIN
    -- Créer les playlists par défaut pour le nouvel utilisateur
INSERT INTO playlists (user_id, title, description, visibility, is_auto_generated, playlist_type)
VALUES
    (NEW.id, 'Favoris', 'Mes vidéos favorites', 'private', TRUE, 'favorites'),
    (NEW.id, 'À regarder plus tard', 'Vidéos sauvegardées pour plus tard', 'private', TRUE, 'watch_later'),
    (NEW.id, 'Historique', 'Historique de visionnage', 'private', TRUE, 'history');

RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_default_playlists_trigger
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_default_playlists();

-- Fonction pour synchroniser les favoris avec la playlist favorites
CREATE OR REPLACE FUNCTION sync_favorites_playlist()
RETURNS TRIGGER AS $$
DECLARE
favorites_playlist_id uuid;
BEGIN
    -- Récupérer l'ID de la playlist favorites de l'utilisateur
SELECT id INTO favorites_playlist_id
FROM playlists
WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
  AND playlist_type = 'favorites';

IF TG_OP = 'INSERT' THEN
        -- Ajouter à la playlist favorites
        INSERT INTO playlist_videos (playlist_id, video_id, position, added_by)
        VALUES (
            favorites_playlist_id,
            NEW.video_id,
            COALESCE((SELECT MAX(position) FROM playlist_videos WHERE playlist_id = favorites_playlist_id), 0) + 1,
            NEW.user_id
        );
RETURN NEW;
ELSIF TG_OP = 'DELETE' THEN
        -- Supprimer de la playlist favorites
DELETE FROM playlist_videos
WHERE playlist_id = favorites_playlist_id
  AND video_id = OLD.video_id;
RETURN OLD;
END IF;
RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER sync_favorites_trigger
    AFTER INSERT OR DELETE ON user_favorites
FOR EACH ROW EXECUTE FUNCTION sync_favorites_playlist();

-- Fonction pour synchroniser "À regarder plus tard" avec la playlist correspondante
CREATE OR REPLACE FUNCTION sync_watch_later_playlist()
RETURNS TRIGGER AS $$
DECLARE
watch_later_playlist_id uuid;
BEGIN
    -- Récupérer l'ID de la playlist watch_later de l'utilisateur
SELECT id INTO watch_later_playlist_id
FROM playlists
WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
  AND playlist_type = 'watch_later';

IF TG_OP = 'INSERT' THEN
        -- Ajouter à la playlist watch_later
        INSERT INTO playlist_videos (playlist_id, video_id, position, added_by)
        VALUES (
            watch_later_playlist_id,
            NEW.video_id,
            COALESCE((SELECT MAX(position) FROM playlist_videos WHERE playlist_id = watch_later_playlist_id), 0) + 1,
            NEW.user_id
        );
RETURN NEW;
ELSIF TG_OP = 'DELETE' THEN
        -- Supprimer de la playlist watch_later
DELETE FROM playlist_videos
WHERE playlist_id = watch_later_playlist_id
  AND video_id = OLD.video_id;
RETURN OLD;
END IF;
RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER sync_watch_later_trigger
    AFTER INSERT OR DELETE ON watch_later
FOR EACH ROW EXECUTE FUNCTION sync_watch_later_playlist();

-- Vue pour obtenir les playlists avec leurs statistiques
CREATE VIEW playlist_stats AS
SELECT
    p.*,
    COUNT(pv.video_id) as actual_video_count,
    SUM(v.duration) as actual_total_duration,
    COUNT(ps.user_id) as subscriber_count,
    AVG(v.view_count) as avg_video_views,
    MAX(pv.added_at) as last_video_added
FROM playlists p
         LEFT JOIN playlist_videos pv ON p.id = pv.playlist_id
         LEFT JOIN videos v ON pv.video_id = v.id AND v.status = 'ready'
         LEFT JOIN playlist_subscriptions ps ON p.id = ps.playlist_id
GROUP BY p.id;

-- Vue pour obtenir les playlists populaires
CREATE VIEW popular_playlists AS
SELECT
    p.*,
    COUNT(ps.user_id) as subscriber_count,
    COUNT(pv.video_id) as video_count,
    SUM(v.view_count) as total_views
FROM playlists p
         LEFT JOIN playlist_subscriptions ps ON p.id = ps.playlist_id
         LEFT JOIN playlist_videos pv ON p.id = pv.playlist_id
         LEFT JOIN videos v ON pv.video_id = v.id
WHERE p.visibility = 'public'
GROUP BY p.id
HAVING COUNT(ps.user_id) > 0
ORDER BY subscriber_count DESC, total_views DESC;

COMMENT ON TABLE playlists IS 'Table principale des playlists avec métadonnées et paramètres';
COMMENT ON TABLE playlist_videos IS 'Association ordonnée entre playlists et vidéos';
COMMENT ON TABLE user_favorites IS 'Raccourci pour les vidéos favorites des utilisateurs';
COMMENT ON TABLE watch_later IS 'Raccourci pour les vidéos à regarder plus tard';
COMMENT ON TABLE watch_history IS 'Historique de visionnage optimisé pour les performances';
COMMENT ON TABLE playlist_collaborators IS 'Collaborateurs et permissions sur les playlists partagées';
COMMENT ON TABLE playlist_subscriptions IS 'Abonnements aux playlists publiques';