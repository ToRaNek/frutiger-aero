-- database/seeds/users.sql
-- Données de test pour les utilisateurs et l'authentification

-- Insertion des utilisateurs de test
-- Mot de passe pour tous les utilisateurs de test : "password123"
-- Hash bcrypt généré avec 12 rounds : $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBNj7qgGd.0xOu

INSERT INTO users (id, username, email, password_hash, first_name, last_name, avatar_url, bio, role, status, email_verified) VALUES
-- Administrateurs
('550e8400-e29b-41d4-a716-446655440001', 'admin', 'admin@frutiger-streaming.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBNj7qgGd.0xOu', 'Administrator', 'System', '/avatars/admin.png', 'Administrateur principal de la plateforme Frutiger Streaming', 'admin', 'active', true),

('550e8400-e29b-41d4-a716-446655440002', 'moderator', 'moderator@frutiger-streaming.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBNj7qgGd.0xOu', 'Sarah', 'Moderator', '/avatars/moderator.png', 'Modératrice de contenu experte en communauté', 'moderator', 'active', true),

-- Créateurs de contenu
('550e8400-e29b-41d4-a716-446655440003', 'alex_creator', 'alex@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBNj7qgGd.0xOu', 'Alexandre', 'Dubois', '/avatars/alex.png', 'Créateur de contenu tech et gaming. Passionné de nouvelles technologies et d''esthétique Frutiger Aero 💙', 'user', 'active', true),

('550e8400-e29b-41d4-a716-446655440004', 'marie_vlog', 'marie@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBNj7qgGd.0xOu', 'Marie', 'Laurent', '/avatars/marie.png', 'Vloggeuse voyage et lifestyle. J''adore partager mes aventures et découvertes ! ✈️🌊', 'user', 'active', true),

('550e8400-e29b-41d4-a716-446655440005', 'jules_music', 'jules@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBNj7qgGd.0xOu', 'Jules', 'Martin', '/avatars/jules.png', 'Musicien et producteur. Créateur de mixes électroniques inspirés de l''ère 2000s 🎵', 'user', 'active', true),

('550e8400-e29b-41d4-a716-446655440006', 'lisa_tutorial', 'lisa@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBNj7qgGd.0xOu', 'Lisa', 'Chen', '/avatars/lisa.png', 'Designer UI/UX spécialisée en interfaces Frutiger Aero. Tutoriels design et créativité 🎨', 'user', 'active', true),

('550e8400-e29b-41d4-a716-446655440007', 'tom_sport', 'tom@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBNj7qgGd.0xOu', 'Thomas', 'Rousseau', '/avatars/tom.png', 'Coach sportif et athlète. Contenu fitness et bien-être pour tous niveaux 💪', 'user', 'active', true),

-- Utilisateurs réguliers
('550e8400-e29b-41d4-a716-446655440008', 'emma_viewer', 'emma@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBNj7qgGd.0xOu', 'Emma', 'Wilson', '/avatars/emma.png', 'Amatrice de contenu créatif et de nostalgie des années 2000', 'user', 'active', true),

('550e8400-e29b-41d4-a716-446655440009', 'maxime_gamer', 'maxime@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBNj7qgGd.0xOu', 'Maxime', 'Durand', '/avatars/maxime.png', 'Gamer passionné, fan de speedruns et d''esthétique rétro-futuriste', 'user', 'active', true),

('550e8400-e29b-41d4-a716-446655440010', 'sophie_art', 'sophie@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBNj7qgGd.0xOu', 'Sophie', 'Moreau', '/avatars/sophie.png', 'Artiste numérique inspirée par l''esthétique Frutiger et les interfaces glossy', 'user', 'active', true),

-- Utilisateurs inactifs pour les tests
('550e8400-e29b-41d4-a716-446655440011', 'inactive_user', 'inactive@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBNj7qgGd.0xOu', 'Utilisateur', 'Inactif', '/avatars/default.png', 'Compte de test inactif', 'user', 'inactive', false),

('550e8400-e29b-41d4-a716-446655440012', 'pending_user', 'pending@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBNj7qgGd.0xOu', 'Utilisateur', 'En Attente', '/avatars/default.png', 'Compte en attente de vérification email', 'user', 'pending', false);

-- Insertion des relations de follow entre utilisateurs
INSERT INTO user_follows (follower_id, following_id) VALUES
-- Les viewers suivent les créateurs
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440003'), -- Emma suit Alex
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440004'), -- Emma suit Marie
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440006'), -- Emma suit Lisa
('550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440003'), -- Maxime suit Alex
('550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440005'), -- Maxime suit Jules
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440006'), -- Sophie suit Lisa
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440004'), -- Sophie suit Marie

-- Les créateurs se suivent entre eux
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004'), -- Alex suit Marie
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440005'), -- Alex suit Jules
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440006'), -- Marie suit Lisa
('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440003'), -- Jules suit Alex
('550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440007'), -- Lisa suit Tom
('550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440005'); -- Tom suit Jules

-- Insertion de quelques notifications de test
INSERT INTO notifications (user_id, type, title, message, data) VALUES
                                                                    ('550e8400-e29b-41d4-a716-446655440008', 'new_follower', 'Nouveau abonnée !', 'Sophie a commencé à vous suivre', '{"follower_id": "550e8400-e29b-41d4-a716-446655440010", "follower_username": "sophie_art"}'),
                                                                    ('550e8400-e29b-41d4-a716-446655440003', 'video_uploaded', 'Vidéo traitée avec succès', 'Votre vidéo "Introduction au Frutiger Aero" a été traitée et est maintenant disponible', '{"video_id": "video_1", "video_title": "Introduction au Frutiger Aero"}'),
                                                                    ('550e8400-e29b-41d4-a716-446655440004', 'video_liked', 'Votre vidéo a été likée !', 'Votre vidéo "Voyage en Islande" a reçu 10 nouveaux likes', '{"video_id": "video_2", "like_count": 10}'),
                                                                    ('550e8400-e29b-41d4-a716-446655440006', 'comment_reply', 'Réponse à votre commentaire', 'Alex a répondu à votre commentaire sur sa vidéo', '{"video_id": "video_1", "commenter": "alex_creator"}');

-- Insertion de sessions utilisateur de test (refresh tokens)
INSERT INTO user_sessions (user_id, refresh_token, ip_address, user_agent, expires_at) VALUES
                                                                                           ('550e8400-e29b-41d4-a716-446655440003', 'refresh_token_alex_desktop', '192.168.1.100'::inet, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() + INTERVAL '7 days'),
                                                                                           ('550e8400-e29b-41d4-a716-446655440003', 'refresh_token_alex_mobile', '192.168.1.101'::inet, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', NOW() + INTERVAL '7 days'),
                                                                                           ('550e8400-e29b-41d4-a716-446655440004', 'refresh_token_marie_laptop', '192.168.1.102'::inet, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() + INTERVAL '7 days'),
                                                                                           ('550e8400-e29b-41d4-a716-446655440008', 'refresh_token_emma_tablet', '192.168.1.103'::inet, 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15', NOW() + INTERVAL '7 days');

-- Insertion d'événements analytics de test
INSERT INTO analytics_events (user_id, session_id, event_type, event_data, ip_address, user_agent) VALUES
-- Événements de connexion
('550e8400-e29b-41d4-a716-446655440003', 'session_alex_1', 'user_login', '{"login_method": "email", "success": true}', '192.168.1.100'::inet, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
('550e8400-e29b-41d4-a716-446655440004', 'session_marie_1', 'user_login', '{"login_method": "email", "success": true}', '192.168.1.102'::inet, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
('550e8400-e29b-41d4-a716-446655440008', 'session_emma_1', 'user_login', '{"login_method": "email", "success": true}', '192.168.1.103'::inet, 'Mozilla/5.0 (iPad; CPU OS 17_0)'),

-- Événements de vidéo
('550e8400-e29b-41d4-a716-446655440003', 'session_alex_1', 'video_upload_start', '{"filename": "frutiger_intro.mp4", "size": 15728640}', '192.168.1.100'::inet, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
('550e8400-e29b-41d4-a716-446655440004', 'session_marie_1', 'video_upload_start', '{"filename": "iceland_travel.mp4", "size": 52428800}', '192.168.1.102'::inet, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),

-- Événements de navigation
('550e8400-e29b-41d4-a716-446655440008', 'session_emma_1', 'page_view', '{"page": "/", "referrer": "direct"}', '192.168.1.103'::inet, 'Mozilla/5.0 (iPad; CPU OS 17_0)'),
('550e8400-e29b-41d4-a716-446655440009', 'session_maxime_1', 'page_view', '{"page": "/videos", "referrer": "/"}', '192.168.1.104'::inet, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),

-- Événements de recherche
('550e8400-e29b-41d4-a716-446655440008', 'session_emma_1', 'search_query', '{"query": "frutiger aero", "results_count": 12}', '192.168.1.103'::inet, 'Mozilla/5.0 (iPad; CPU OS 17_0)'),
('550e8400-e29b-41d4-a716-446655440010', 'session_sophie_1', 'search_query', '{"query": "design tutorial", "results_count": 8}', '192.168.1.105'::inet, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');

-- Mise à jour des dates de dernière connexion
UPDATE users SET last_login = NOW() - INTERVAL '1 hour' WHERE username = 'alex_creator';
UPDATE users SET last_login = NOW() - INTERVAL '2 hours' WHERE username = 'marie_vlog';
UPDATE users SET last_login = NOW() - INTERVAL '30 minutes' WHERE username = 'emma_viewer';
UPDATE users SET last_login = NOW() - INTERVAL '45 minutes' WHERE username = 'lisa_tutorial';
UPDATE users SET last_login = NOW() - INTERVAL '3 hours' WHERE username = 'maxime_gamer';

-- Insertion de préférences utilisateur personnalisées
UPDATE users SET preferences = '{
    "theme": "frutiger_aero",
    "autoplay": true,
    "notifications": {
        "email": true,
        "push": true,
        "new_uploads": true,
        "comments": true
    },
    "privacy": {
        "show_history": true,
        "show_playlists": true
    },
    "video_quality": "auto",
    "language": "fr"
}'::jsonb WHERE username = 'alex_creator';

UPDATE users SET preferences = '{
    "theme": "frutiger_dark",
    "autoplay": false,
    "notifications": {
        "email": true,
        "push": false,
        "new_uploads": true,
        "comments": false
    },
    "privacy": {
        "show_history": false,
        "show_playlists": true
    },
    "video_quality": "720p",
    "language": "fr"
}'::jsonb WHERE username = 'marie_vlog';

UPDATE users SET preferences = '{
    "theme": "frutiger_light",
    "autoplay": true,
    "notifications": {
        "email": false,
        "push": true,
        "new_uploads": true,
        "comments": true
    },
    "privacy": {
        "show_history": true,
        "show_playlists": true
    },
    "video_quality": "1080p",
    "language": "fr"
}'::jsonb WHERE username = 'lisa_tutorial';

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Données utilisateurs de test insérées avec succès !';
    RAISE NOTICE 'Utilisateurs créés : %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE 'Relations de follow créées : %', (SELECT COUNT(*) FROM user_follows);
    RAISE NOTICE 'Sessions actives : %', (SELECT COUNT(*) FROM user_sessions WHERE expires_at > NOW());
    RAISE NOTICE 'Événements analytics : %', (SELECT COUNT(*) FROM analytics_events);
    RAISE NOTICE '';
    RAISE NOTICE 'Comptes de test disponibles :';
    RAISE NOTICE '- admin / admin@frutiger-streaming.com (admin)';
    RAISE NOTICE '- alex_creator / alex@example.com (créateur)';
    RAISE NOTICE '- marie_vlog / marie@example.com (créateur)';
    RAISE NOTICE '- emma_viewer / emma@example.com (utilisateur)';
    RAISE NOTICE 'Mot de passe pour tous : password123';
END $$;