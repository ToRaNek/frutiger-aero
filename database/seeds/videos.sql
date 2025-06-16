-- database/seeds/videos.sql
-- Données de test pour les vidéos, catégories et contenu multimédia

-- Insertion de catégories supplémentaires
INSERT INTO categories (id, name, slug, description, color, icon) VALUES
                                                                      ('550e8400-e29b-41d4-a716-446655440101', 'Frutiger Aero', 'frutiger-aero', 'Tout sur l''esthétique Frutiger Aero et la nostalgie des années 2000', '#64c8dc', 'water-drop'),
                                                                      ('550e8400-e29b-41d4-a716-446655440102', 'Design UI/UX', 'design-ui-ux', 'Tutoriels et inspirations de design d''interface', '#0078c8', 'palette'),
                                                                      ('550e8400-e29b-41d4-a716-446655440103', 'Tech Review', 'tech-review', 'Tests et critiques de produits technologiques', '#003c78', 'smartphone'),
                                                                      ('550e8400-e29b-41d4-a716-446655440104', 'Retro Gaming', 'retro-gaming', 'Jeux vidéo rétro et nostalgie gaming', '#b1ffd8', 'gamepad'),
                                                                      ('550e8400-e29b-41d4-a716-446655440105', 'Aesthetic Vlogs', 'aesthetic-vlogs', 'Vlogs esthétiques et lifestyle créatif', '#0064b4', 'camera');

-- Insertion des vidéos de test
INSERT INTO videos (id, title, description, user_id, original_filename, file_path, file_size, mime_type, duration, width, height, frame_rate, bitrate, thumbnail_url, status, visibility, view_count, like_count, dislike_count, tags, published_at) VALUES

-- Vidéos d'Alex (créateur tech)
('550e8400-e29b-41d4-a716-446655440201',
 'Introduction au Frutiger Aero : L''esthétique qui définit les années 2000',
 'Découvrez l''histoire et les caractéristiques de l''esthétique Frutiger Aero qui a marqué le design des années 2000-2010. Des interfaces glossy aux éléments naturels, explorons ensemble cette tendance nostalgique qui revient en force !',
 '550e8400-e29b-41d4-a716-446655440003',
 'frutiger_intro_alex.mp4',
 '/videos/originals/alex_1732024_intro_frutiger.mp4',
 15728640,
 'video/mp4',
 892,
 1920,
 1080,
 29.97,
 5000,
 '/videos/thumbnails/550e8400-e29b-41d4-a716-446655440201_thumb.jpg',
 'ready',
 'public',
 15420,
 1247,
 23,
 '{"frutiger aero", "design", "2000s", "esthétique", "nostalgie", "UI design"}',
 NOW() - INTERVAL '5 days'),

('550e8400-e29b-41d4-a716-446655440202',
 'Top 10 des interfaces Frutiger Aero les plus iconiques',
 'Plongez dans une sélection des interfaces les plus marquantes de l''ère Frutiger Aero : Windows Vista, iTunes, sites web emblématiques et applications mobiles. Une rétrospective visuelle immersive !',
 '550e8400-e29b-41d4-a716-446655440003',
 'top10_interfaces_alex.mp4',
 '/videos/originals/alex_1732024_top10_interfaces.mp4',
 28467200,
 'video/mp4',
 1456,
 1920,
 1080,
 30.00,
 6000,
 '/videos/thumbnails/550e8400-e29b-41d4-a716-446655440202_thumb.jpg',
 'ready',
 'public',
 9873,
 892,
 15,
 '{"top 10", "interfaces", "frutiger aero", "windows vista", "itunes", "web design"}',
 NOW() - INTERVAL '3 days'),

-- Vidéos de Marie (vloggeuse voyage)
('550e8400-e29b-41d4-a716-446655440203',
 'Voyage en Islande : Aurores boréales et paysages magiques',
 'Suivez-moi dans mon aventure en Islande ! Entre aurores boréales, geysers et cascades spectaculaires, découvrez ce pays aux paysages à couper le souffle. Une esthétique naturelle qui rappelle les wallpapers Frutiger Aero 🌊✨',
 '550e8400-e29b-41d4-a716-446655440004',
 'islande_marie_travel.mp4',
 '/videos/originals/marie_1732024_islande_voyage.mp4',
 52428800,
 'video/mp4',
 2134,
 1920,
 1080,
 25.00,
 8000,
 '/videos/thumbnails/550e8400-e29b-41d4-a716-446655440203_thumb.jpg',
 'ready',
 'public',
 23567,
 2103,
 8,
 '{"voyage", "islande", "aurores boréales", "nature", "vlog", "paysages"}',
 NOW() - INTERVAL '7 days'),

('550e8400-e29b-41d4-a716-446655440204',
 'Room Tour : Ma chambre aesthetic années 2000',
 'Découvrez ma chambre décorée dans l''esprit aesthetic des années 2000 ! Couleurs pastel, éléments glossy, déco translucide... Un vrai retour vers le futur !',
 '550e8400-e29b-41d4-a716-446655440004',
 'room_tour_marie.mp4',
 '/videos/originals/marie_1732024_room_tour.mp4',
 19922944,
 'video/mp4',
 967,
 1920,
 1080,
 30.00,
 4500,
 '/videos/thumbnails/550e8400-e29b-41d4-a716-446655440204_thumb.jpg',
 'ready',
 'public',
 12456,
 1567,
 12,
 '{"room tour", "décoration", "aesthetic", "2000s", "pastel", "lifestyle"}',
 NOW() - INTERVAL '2 days'),

-- Vidéos de Jules (musicien)
('550e8400-e29b-41d4-a716-446655440205',
 'Mix Elektronique : Frutiger Vibes Vol.1',
 'Un mix électronique de 30 minutes inspiré par l''esthétique Frutiger Aero. Sons cristallins, basses profondes et mélodies éthérées pour une ambiance 2000s parfaite. À écouter avec des écouteurs ! 🎧',
 '550e8400-e29b-41d4-a716-446655440005',
 'frutiger_mix_vol1.mp4',
 '/videos/originals/jules_1732024_mix_vol1.mp4',
 67108864,
 'video/mp4',
 1834,
 1280,
 720,
 30.00,
 3500,
 '/videos/thumbnails/550e8400-e29b-41d4-a716-446655440205_thumb.jpg',
 'ready',
 'public',
 8934,
 1234,
 3,
 '{"électronique", "mix", "frutiger", "ambient", "2000s", "musique"}',
 NOW() - INTERVAL '4 days'),

-- Vidéos de Lisa (designer)
('550e8400-e29b-41d4-a716-446655440206',
 'Tutoriel Figma : Créer une interface Frutiger Aero',
 'Apprenez à créer une interface dans l''esprit Frutiger Aero avec Figma ! Glassmorphism, dégradés, transparences... Tous les secrets pour un design 2000s authentique. Fichier Figma inclus !',
 '550e8400-e29b-41d4-a716-446655440006',
 'figma_tutorial_lisa.mp4',
 '/videos/originals/lisa_1732024_figma_tutorial.mp4',
 41943040,
 'video/mp4',
 2567,
 1920,
 1080,
 60.00,
 7000,
 '/videos/thumbnails/550e8400-e29b-41d4-a716-446655440206_thumb.jpg',
 'ready',
 'public',
 18765,
 2456,
 7,
 '{"figma", "tutoriel", "ui design", "frutiger aero", "glassmorphism", "design"}',
 NOW() - INTERVAL '6 days'),

('550e8400-e29b-41d4-a716-446655440207',
 'CSS Only : Boutons glossy et effets Frutiger Aero',
 'Découvrez comment recréer les effets visuels iconiques du Frutiger Aero en CSS pur ! Gradients, box-shadows, transforms... Code source disponible sur GitHub.',
 '550e8400-e29b-41d4-a716-446655440006',
 'css_effects_lisa.mp4',
 '/videos/originals/lisa_1732024_css_effects.mp4',
 23068672,
 'video/mp4',
 1234,
 1920,
 1080,
 30.00,
 5500,
 '/videos/thumbnails/550e8400-e29b-41d4-a716-446655440207_thumb.jpg',
 'ready',
 'public',
 14532,
 1876,
 11,
 '{"css", "web development", "effets visuels", "code", "frontend", "tutoriel"}',
 NOW() - INTERVAL '1 day'),

-- Vidéos de Tom (sport)
('550e8400-e29b-41d4-a716-446655440208',
 'Workout Morning Routine : Énergie Frutiger',
 'Commencez votre journée avec cette routine matinale de 20 minutes ! Exercices dynamiques sur fond d''esthétique aquatique apaisante. Parfait pour se motiver le matin ! 💪',
 '550e8400-e29b-41d4-a716-446655440007',
 'morning_workout_tom.mp4',
 '/videos/originals/tom_1732024_morning_workout.mp4',
 35651584,
 'video/mp4',
 1203,
 1920,
 1080,
 30.00,
 4800,
 '/videos/thumbnails/550e8400-e29b-41d4-a716-446655440208_thumb.jpg',
 'ready',
 'public',
 7891,
 945,
 5,
 '{"sport", "fitness", "routine", "matin", "workout", "motivation"}',
 NOW() - INTERVAL '3 days'),

-- Vidéo en cours de traitement
('550e8400-e29b-41d4-a716-446655440209',
 'Making-of : Comment j''ai créé mon setup Frutiger Aero',
 'Découvrez les coulisses de la création de mon setup de streaming inspiré Frutiger Aero. RGB, éclairage ambiant, et déco transparente !',
 '550e8400-e29b-41d4-a716-446655440003',
 'setup_making_of.mp4',
 '/videos/originals/alex_1732024_setup_making.mp4',
 98566144,
 'video/mp4',
 NULL,
 NULL,
 NULL,
 NULL,
 NULL,
 NULL,
 'processing',
 'public',
 0,
 0,
 0,
 '{"setup", "gaming", "rgb", "frutiger aero", "making-of", "streaming"}',
 NULL);

-- Insertion des formats vidéo (HLS)
INSERT INTO video_formats (video_id, quality, file_path, file_size, bitrate, width, height, playlist_url) VALUES

-- Formats pour la vidéo d'Alex (intro Frutiger)
('550e8400-e29b-41d4-a716-446655440201', '360p', '/videos/hls/550e8400-e29b-41d4-a716-446655440201/360p.mp4', 3145728, 800, 640, 360, '/videos/hls/550e8400-e29b-41d4-a716-446655440201/360p.m3u8'),
('550e8400-e29b-41d4-a716-446655440201', '720p', '/videos/hls/550e8400-e29b-41d4-a716-446655440201/720p.mp4', 7864320, 2500, 1280, 720, '/videos/hls/550e8400-e29b-41d4-a716-446655440201/720p.m3u8'),
('550e8400-e29b-41d4-a716-446655440201', '1080p', '/videos/hls/550e8400-e29b-41d4-a716-446655440201/1080p.mp4', 15728640, 5000, 1920, 1080, '/videos/hls/550e8400-e29b-41d4-a716-446655440201/1080p.m3u8'),

-- Formats pour la vidéo de Marie (Islande)
('550e8400-e29b-41d4-a716-446655440203', '360p', '/videos/hls/550e8400-e29b-41d4-a716-446655440203/360p.mp4', 8388608, 800, 640, 360, '/videos/hls/550e8400-e29b-41d4-a716-446655440203/360p.m3u8'),
('550e8400-e29b-41d4-a716-446655440203', '720p', '/videos/hls/550e8400-e29b-41d4-a716-446655440203/720p.mp4', 20971520, 2500, 1280, 720, '/videos/hls/550e8400-e29b-41d4-a716-446655440203/720p.m3u8'),
('550e8400-e29b-41d4-a716-446655440203', '1080p', '/videos/hls/550e8400-e29b-41d4-a716-446655440203/1080p.mp4', 52428800, 8000, 1920, 1080, '/videos/hls/550e8400-e29b-41d4-a716-446655440203/1080p.m3u8'),

-- Formats pour le tutoriel Figma de Lisa
('550e8400-e29b-41d4-a716-446655440206', '720p', '/videos/hls/550e8400-e29b-41d4-a716-446655440206/720p.mp4', 16777216, 2500, 1280, 720, '/videos/hls/550e8400-e29b-41d4-a716-446655440206/720p.m3u8'),
('550e8400-e29b-41d4-a716-446655440206', '1080p', '/videos/hls/550e8400-e29b-41d4-a716-446655440206/1080p.mp4', 41943040, 7000, 1920, 1080, '/videos/hls/550e8400-e29b-41d4-a716-446655440206/1080p.m3u8');

-- Associer les vidéos aux catégories
INSERT INTO video_categories (video_id, category_id) VALUES
                                                         ('550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440101'), -- Intro Frutiger -> Frutiger Aero
                                                         ('550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440102'), -- Intro Frutiger -> Design UI/UX
                                                         ('550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440101'), -- Top 10 interfaces -> Frutiger Aero
                                                         ('550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440103'), -- Top 10 interfaces -> Tech Review
                                                         ('550e8400-e29b-41d4-a716-446655440203', (SELECT id FROM categories WHERE slug = 'voyage')), -- Islande -> Voyage
                                                         ('550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440105'), -- Islande -> Aesthetic Vlogs
                                                         ('550e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440105'), -- Room tour -> Aesthetic Vlogs
                                                         ('550e8400-e29b-41d4-a716-446655440205', (SELECT id FROM categories WHERE slug = 'musique')), -- Mix -> Musique
                                                         ('550e8400-e29b-41d4-a716-446655440205', '550e8400-e29b-41d4-a716-446655440101'), -- Mix -> Frutiger Aero
                                                         ('550e8400-e29b-41d4-a716-446655440206', '550e8400-e29b-41d4-a716-446655440102'), -- Tutoriel Figma -> Design UI/UX
                                                         ('550e8400-e29b-41d4-a716-446655440206', '550e8400-e29b-41d4-a716-446655440101'), -- Tutoriel Figma -> Frutiger Aero
                                                         ('550e8400-e29b-41d4-a716-446655440207', '550e8400-e29b-41d4-a716-446655440102'), -- CSS effects -> Design UI/UX
                                                         ('550e8400-e29b-41d4-a716-446655440208', (SELECT id FROM categories WHERE slug = 'sport')); -- Workout -> Sport

-- Insertion des réactions (likes/dislikes)
INSERT INTO video_reactions (user_id, video_id, reaction_type) VALUES
-- Likes sur la vidéo intro Frutiger d'Alex
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440201', 'like'),
('550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440201', 'like'),
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440201', 'like'),
('550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440201', 'like'),
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440201', 'like'),

-- Likes sur la vidéo Islande de Marie
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440203', 'like'),
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440203', 'like'),
('550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440203', 'like'),
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440203', 'like'),

-- Likes sur le tutoriel Figma de Lisa
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440206', 'like'),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440206', 'like'),
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440206', 'like'),

-- Quelques dislikes pour le réalisme
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440202', 'dislike'),
('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440204', 'dislike');

-- Insertion des commentaires
INSERT INTO comments (id, user_id, video_id, parent_id, content, like_count) VALUES
                                                                                 ('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440201', NULL, 'Excellente introduction ! J''avais complètement oublié à quel point cette esthétique était partout dans les années 2000. Merci pour cette dose de nostalgie ! 💙', 45),
                                                                                 ('550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440301', 'Merci Emma ! C''était exactement l''objectif, raviver cette nostalgie. Content que ça t''ait plu ! 😊', 12),
                                                                                 ('550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440201', NULL, 'Incroyable comme cette esthétique me rappelle mes premières découvertes d''internet ! Windows Vista, iTunes... que de souvenirs', 23),
                                                                                 ('550e8400-e29b-41d4-a716-446655440304', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440203', NULL, 'Ces aurores boréales sont à couper le souffle ! 😍 Ça me donne envie de programmer un voyage en Islande. Merci pour ce partage Marie !', 67),
                                                                                 ('550e8400-e29b-41d4-a716-446655440305', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440304', 'Sophie tu ne le regretteras pas ! L''Islande est magique, surtout en hiver pour les aurores 🌌', 18),
                                                                                 ('550e8400-e29b-41d4-a716-446655440306', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440206', NULL, 'Lisa, ton tutoriel Figma est une pépite ! J''ai enfin réussi à reproduire cet effet de glassmorphism parfait. Merci ! 🙏', 34),
                                                                                 ('550e8400-e29b-41d4-a716-446655440307', '550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440205', NULL, 'Ce mix est parfait pour coder ! L''ambiance Frutiger Aero est parfaitement capturée. Jules, tu as du talent ! 🎧', 28),
                                                                                 ('550e8400-e29b-41d4-a716-446655440308', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440205', '550e8400-e29b-41d4-a716-446655440307', 'Merci Emma ! Content que ça accompagne bien tes sessions de code. J''ai d''autres volumes en préparation ! 🎵', 8);

-- Insertion des vues de vidéos
INSERT INTO video_views (user_id, video_id, session_id, ip_address, watched_duration, completion_percentage, last_position) VALUES
-- Vues pour l'intro Frutiger d'Alex
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440201', 'session_emma_1', '192.168.1.103'::inet, 892, 100.0, 892),
('550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440201', 'session_maxime_1', '192.168.1.104'::inet, 745, 83.5, 745),
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440201', 'session_sophie_1', '192.168.1.105'::inet, 892, 100.0, 892),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440201', 'session_marie_2', '192.168.1.102'::inet, 623, 69.8, 623),

-- Vues pour la vidéo Islande de Marie
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440203', 'session_emma_2', '192.168.1.103'::inet, 2134, 100.0, 2134),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440203', 'session_alex_2', '192.168.1.100'::inet, 1567, 73.4, 1567),
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440203', 'session_sophie_2', '192.168.1.105'::inet, 1890, 88.6, 1890),

-- Vues pour le tutoriel Figma de Lisa
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440206', 'session_alex_3', '192.168.1.100'::inet, 2567, 100.0, 2567),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440206', 'session_marie_3', '192.168.1.102'::inet, 1234, 48.1, 1234),
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440206', 'session_emma_3', '192.168.1.103'::inet, 2345, 91.4, 2345);

-- Insertion des favoris utilisateur
INSERT INTO user_favorites (user_id, video_id) VALUES
                                                   ('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440201'), -- Emma aime l'intro Frutiger
                                                   ('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440203'), -- Emma aime la vidéo Islande
                                                   ('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440206'), -- Emma aime le tutoriel Figma
                                                   ('550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440201'), -- Maxime aime l'intro Frutiger
                                                   ('550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440205'), -- Maxime aime le mix de Jules
                                                   ('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440206'), -- Sophie aime le tutoriel Figma
                                                   ('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440203'); -- Sophie aime la vidéo Islande

-- Insertion "À regarder plus tard"
INSERT INTO watch_later (user_id, video_id) VALUES
                                                ('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440202'), -- Emma va regarder le top 10
                                                ('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440208'), -- Emma va regarder le workout
                                                ('550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440206'), -- Maxime va regarder le tutoriel Figma
                                                ('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440205'); -- Sophie va regarder le mix

-- Mettre à jour les compteurs des catégories
UPDATE categories SET video_count = (
    SELECT COUNT(*) FROM video_categories vc
                             JOIN videos v ON vc.video_id = v.id
    WHERE vc.category_id = categories.id AND v.status = 'ready'
);

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Données vidéos de test insérées avec succès !';
    RAISE NOTICE 'Vidéos créées : %', (SELECT COUNT(*) FROM videos);
    RAISE NOTICE 'Vidéos publiées : %', (SELECT COUNT(*) FROM videos WHERE status = 'ready');
    RAISE NOTICE 'Formats HLS générés : %', (SELECT COUNT(*) FROM video_formats);
    RAISE NOTICE 'Commentaires créés : %', (SELECT COUNT(*) FROM comments);
    RAISE NOTICE 'Vues enregistrées : %', (SELECT COUNT(*) FROM video_views);
    RAISE NOTICE 'Réactions (likes/dislikes) : %', (SELECT COUNT(*) FROM video_reactions);
    RAISE NOTICE 'Favoris ajoutés : %', (SELECT COUNT(*) FROM user_favorites);
    RAISE NOTICE 'Vidéos "À regarder plus tard" : %', (SELECT COUNT(*) FROM watch_later);
    RAISE NOTICE '';
    RAISE NOTICE 'Catégories avec contenu :';
    RAISE NOTICE '- Frutiger Aero : % vidéos', (SELECT video_count FROM categories WHERE slug = 'frutiger-aero');
    RAISE NOTICE '- Design UI/UX : % vidéos', (SELECT video_count FROM categories WHERE slug = 'design-ui-ux');
    RAISE NOTICE '- Voyage : % vidéos', (SELECT video_count FROM categories WHERE slug = 'voyage');
END $$;