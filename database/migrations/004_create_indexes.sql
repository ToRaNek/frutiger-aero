-- database/migrations/004_create_indexes.sql
-- Migration pour la création d'index supplémentaires et optimisations de performance

-- =============================================================================
-- INDEX COMPOSITES POUR LES REQUÊTES COMPLEXES
-- =============================================================================

-- Index composites pour la recherche de vidéos
CREATE INDEX idx_videos_user_status_visibility ON videos(user_id, status, visibility);
CREATE INDEX idx_videos_status_published_views ON videos(status, published_at DESC, view_count DESC);
CREATE INDEX idx_videos_visibility_created ON videos(visibility, created_at DESC);
CREATE INDEX idx_videos_trending ON videos(status, visibility, published_at, view_count DESC, like_count DESC);

-- Index composites pour les playlists
CREATE INDEX idx_playlists_user_visibility_type ON playlists(user_id, visibility, playlist_type);
CREATE INDEX idx_playlists_visibility_updated ON playlists(visibility, updated_at DESC);
CREATE INDEX idx_playlists_type_video_count ON playlists(playlist_type, video_count DESC);

-- Index composites pour les vues de vidéos
CREATE INDEX idx_video_views_video_watched ON video_views(video_id, watched_at DESC);
CREATE INDEX idx_video_views_user_watched ON video_views(user_id, watched_at DESC);
CREATE INDEX idx_video_views_completion_duration ON video_views(completion_percentage, watched_duration);

-- Index composites pour l'historique
CREATE INDEX idx_watch_history_user_watched ON watch_history(user_id, watched_at DESC);
CREATE INDEX idx_watch_history_completion_recent ON watch_history(completion_percentage, watched_at DESC);

-- Index composites pour les réactions
CREATE INDEX idx_video_reactions_video_type ON video_reactions(video_id, reaction_type);
CREATE INDEX idx_video_reactions_user_created ON video_reactions(user_id, created_at DESC);

-- Index composites pour les commentaires
CREATE INDEX idx_comments_video_parent_created ON comments(video_id, parent_id, created_at DESC);
CREATE INDEX idx_comments_user_created ON comments(user_id, created_at DESC);
CREATE INDEX idx_comments_video_not_deleted ON comments(video_id, is_deleted, created_at DESC);

-- =============================================================================
-- INDEX PARTIELS POUR OPTIMISER LES REQUÊTES FRÉQUENTES
-- =============================================================================

-- Index partiels pour les vidéos actives uniquement
CREATE INDEX idx_videos_active_published ON videos(published_at DESC, view_count DESC)
    WHERE status = 'ready' AND visibility = 'public';

CREATE INDEX idx_videos_active_user ON videos(user_id, created_at DESC)
    WHERE status = 'ready';

CREATE INDEX idx_videos_processing ON videos(created_at DESC)
    WHERE status = 'processing';

CREATE INDEX idx_videos_failed ON videos(created_at DESC, error_message)
    WHERE status = 'failed';

-- Index partiels pour les playlists publiques
CREATE INDEX idx_playlists_public_popular ON playlists(video_count DESC, updated_at DESC)
    WHERE visibility = 'public' AND is_auto_generated = FALSE;

CREATE INDEX idx_playlists_user_custom ON playlists(user_id, updated_at DESC)
    WHERE is_auto_generated = FALSE;

-- Index partiels pour les commentaires actifs
CREATE INDEX idx_comments_active_video ON comments(video_id, created_at DESC)
    WHERE is_deleted = FALSE;

CREATE INDEX idx_comments_active_parent ON comments(parent_id, created_at DESC)
    WHERE is_deleted = FALSE AND parent_id IS NOT NULL;

-- Index partiels pour les sessions actives
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, last_used_at DESC)
    WHERE is_active = TRUE AND expires_at > CURRENT_TIMESTAMP;

-- Index partiels pour les notifications non lues
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at DESC)
    WHERE is_read = FALSE;

-- =============================================================================
-- INDEX FONCTIONNELS POUR LA RECHERCHE AVANCÉE
-- =============================================================================

-- Index pour la recherche de vidéos par titre et description combinés
CREATE INDEX idx_videos_full_text_search ON videos
    USING gin (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '')));

-- Index pour la recherche de playlists par titre et description combinés
CREATE INDEX idx_playlists_full_text_search ON playlists
    USING gin (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '')));

-- Index pour la recherche d'utilisateurs par nom complet
CREATE INDEX idx_users_full_name_search ON users
    USING gin (to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || username));

-- Index pour la recherche par tags avec pondération
CREATE INDEX idx_videos_tags_gin ON videos USING gin (tags);

-- =============================================================================
-- INDEX POUR LES STATISTIQUES ET ANALYTICS
-- =============================================================================

-- Index pour calculer les tendances par période
CREATE INDEX idx_video_views_trending_stats ON video_views(video_id, watched_at, completion_percentage)
    WHERE watched_at >= CURRENT_DATE - INTERVAL '30 days';

-- Index pour les statistiques utilisateur
CREATE INDEX idx_analytics_events_user_stats ON analytics_events(user_id, event_type, created_at)
    WHERE created_at >= CURRENT_DATE - INTERVAL '90 days';

-- Index pour les métriques de performance
CREATE INDEX idx_video_views_performance ON video_views(video_id, watched_duration, completion_percentage, watched_at)
    WHERE completion_percentage > 0;

-- =============================================================================
-- INDEX POUR L'OPTIMISATION DES JOINTURES
-- =============================================================================

-- Index covering pour éviter les lookups supplémentaires
CREATE INDEX idx_users_public_info ON users(id, username, first_name, last_name, avatar_url, status)
    WHERE status = 'active';

CREATE INDEX idx_videos_listing_info ON videos(id, title, thumbnail_url, duration, view_count, like_count, created_at, user_id)
    WHERE status = 'ready' AND visibility = 'public';

CREATE INDEX idx_playlists_listing_info ON playlists(id, title, thumbnail_url, video_count, total_duration, visibility, user_id)
    WHERE visibility IN ('public', 'unlisted');

-- =============================================================================
-- INDEX POUR LA PAGINATION EFFICACE
-- =============================================================================

-- Index pour la pagination cursor-based des vidéos
CREATE INDEX idx_videos_cursor_pagination ON videos(created_at DESC, id)
    WHERE status = 'ready' AND visibility = 'public';

-- Index pour la pagination des playlists
CREATE INDEX idx_playlists_cursor_pagination ON playlists(updated_at DESC, id)
    WHERE visibility = 'public';

-- Index pour la pagination des commentaires
CREATE INDEX idx_comments_cursor_pagination ON comments(created_at DESC, id)
    WHERE is_deleted = FALSE;

-- =============================================================================
-- INDEX POUR LES RECOMMANDATIONS
-- =============================================================================

-- Index pour les recommandations basées sur l'historique
CREATE INDEX idx_recommendations_user_categories ON video_views(user_id)
    INCLUDE (video_id, watched_duration, completion_percentage)
WHERE completion_percentage > 50;

-- Index pour les vidéos similaires
CREATE INDEX idx_similar_videos ON videos(user_id)
    INCLUDE (id, title, tags, view_count)
WHERE status = 'ready' AND visibility = 'public';

-- =============================================================================
-- INDEX POUR L'ADMINISTRATION ET LE MONITORING
-- =============================================================================

-- Index pour le monitoring des uploads
CREATE INDEX idx_videos_upload_monitoring ON videos(created_at, status, processing_progress, error_message)
    WHERE status IN ('processing', 'failed');

-- Index pour le monitoring des sessions
CREATE INDEX idx_sessions_monitoring ON user_sessions(created_at, expires_at, is_active, user_id);

-- Index pour le monitoring des erreurs
CREATE INDEX idx_analytics_errors ON analytics_events(event_type, created_at, event_data)
    WHERE event_type LIKE '%error%';

-- =============================================================================
-- STATISTIQUES PERSONNALISÉES POUR L'OPTIMISEUR
-- =============================================================================

-- Créer des statistiques étendues pour améliorer les plans de requête
CREATE STATISTICS stats_videos_user_status ON user_id, status, visibility FROM videos;
CREATE STATISTICS stats_videos_trending ON view_count, like_count, published_at FROM videos;
CREATE STATISTICS stats_video_views_completion ON video_id, completion_percentage, watched_duration FROM video_views;
CREATE STATISTICS stats_playlists_popularity ON visibility, video_count, updated_at FROM playlists;

-- =============================================================================
-- VUES MATÉRIALISÉES POUR LES REQUÊTES LOURDES
-- =============================================================================

-- Vue matérialisée pour les statistiques quotidiennes des vidéos
CREATE MATERIALIZED VIEW daily_video_stats AS
SELECT
    DATE(created_at) as date,
    COUNT(*) as videos_uploaded,
    COUNT(*) FILTER (WHERE status = 'ready') as videos_processed,
    COUNT(*) FILTER (WHERE status = 'failed') as videos_failed,
    AVG(file_size) as avg_file_size,
    AVG(duration) as avg_duration
FROM videos
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

CREATE UNIQUE INDEX idx_daily_video_stats_date ON daily_video_stats(date);

-- Vue matérialisée pour les utilisateurs actifs
CREATE MATERIALIZED VIEW active_users_stats AS
SELECT
    DATE(watched_at) as date,
    COUNT(DISTINCT user_id) as daily_active_users,
    COUNT(*) as total_views,
    AVG(watched_duration) as avg_watch_duration,
    AVG(completion_percentage) as avg_completion
FROM video_views
WHERE watched_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(watched_at)
ORDER BY date DESC;

CREATE UNIQUE INDEX idx_active_users_stats_date ON active_users_stats(date);

-- =============================================================================
-- PROCÉDURES DE MAINTENANCE DES INDEX
-- =============================================================================

-- Fonction pour recalculer les statistiques
CREATE OR REPLACE FUNCTION refresh_statistics()
RETURNS void AS $$
BEGIN
    -- Rafraîchir les vues matérialisées
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_video_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY active_users_stats;

    -- Mettre à jour les statistiques étendues
    ANALYZE videos;
    ANALYZE video_views;
    ANALYZE playlists;
    ANALYZE user_sessions;

    -- Log de la maintenance
INSERT INTO analytics_events (event_type, event_data)
VALUES ('system_maintenance', '{"action": "refresh_statistics", "timestamp": "' || NOW() || '"}');
END;
$$ LANGUAGE plpgsql;

-- Fonction pour nettoyer les index inutilisés
CREATE OR REPLACE FUNCTION cleanup_unused_indexes()
RETURNS void AS $$
BEGIN
    -- Cette fonction peut être étendue pour identifier et supprimer les index inutilisés
    -- basée sur pg_stat_user_indexes

    -- Pour l'instant, on log juste l'opération
INSERT INTO analytics_events (event_type, event_data)
VALUES ('system_maintenance', '{"action": "cleanup_indexes", "timestamp": "' || NOW() || '"}');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTAIRES POUR LA DOCUMENTATION
-- =============================================================================

COMMENT ON INDEX idx_videos_trending IS 'Index optimisé pour les requêtes de vidéos tendances';
COMMENT ON INDEX idx_videos_full_text_search IS 'Index de recherche textuelle complète pour les vidéos';
COMMENT ON INDEX idx_playlists_full_text_search IS 'Index de recherche textuelle complète pour les playlists';
COMMENT ON MATERIALIZED VIEW daily_video_stats IS 'Statistiques quotidiennes des uploads et traitements vidéo';
COMMENT ON MATERIALIZED VIEW active_users_stats IS 'Statistiques quotidiennes d''activité des utilisateurs';