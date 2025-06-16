# Structure du Projet - Frutiger Streaming Platform

```
frutiger-streaming/
├── README.md
├── docker-compose.yml                # PostgreSQL uniquement
├── .env.example
├── .gitignore
│
├── backend/                          # API Node.js/Express
│   ├── package.json
│   ├── .env
│   ├── src/
│   │   ├── app.js                   # Point d'entrée Express
│   │   ├── server.js                # Serveur HTTP
│   │   ├── config/
│   │   │   ├── database.js          # Configuration PostgreSQL
│   │   │   ├── jwt.js               # Configuration JWT
│   │   │   └── multer.js            # Configuration upload
│   │   ├── controllers/
│   │   │   ├── authController.js    # Authentification
│   │   │   ├── userController.js    # Gestion utilisateurs
│   │   │   ├── videoController.js   # Gestion vidéos
│   │   │   └── playlistController.js # Gestion playlists
│   │   ├── middleware/
│   │   │   ├── auth.js              # Middleware auth JWT
│   │   │   ├── upload.js            # Middleware upload
│   │   │   ├── validation.js        # Validation des données
│   │   │   └── cors.js              # Configuration CORS
│   │   ├── models/
│   │   │   ├── User.js              # Modèle utilisateur
│   │   │   ├── Video.js             # Modèle vidéo
│   │   │   ├── Playlist.js          # Modèle playlist
│   │   │   └── index.js             # Export des modèles
│   │   ├── routes/
│   │   │   ├── auth.js              # Routes auth
│   │   │   ├── users.js             # Routes utilisateurs
│   │   │   ├── videos.js            # Routes vidéos
│   │   │   └── playlists.js         # Routes playlists
│   │   ├── services/
│   │   │   ├── videoService.js      # Service vidéo (HLS)
│   │   │   ├── uploadService.js     # Service upload
│   │   │   └── ffmpegService.js     # Service FFmpeg
│   │   └── utils/
│   │       ├── helpers.js           # Fonctions utilitaires
│   │       ├── logger.js            # Système de logs
│   │       └── constants.js         # Constantes
│   ├── uploads/                     # Upload temporaire
│   ├── videos/                      # Vidéos encodées
│   │   ├── originals/               # Vidéos originales
│   │   ├── hls/                     # Segments HLS
│   │   └── thumbnails/              # Miniatures
│   └── logs/                        # Fichiers de logs
│
├── frontend/                        # Interface React Frutiger Aero
│   ├── package.json
│   ├── .env
│   ├── public/
│   │   ├── index.html
│   │   ├── favicon.ico
│   │   └── assets/
│   │       ├── images/              # Images Frutiger Aero
│   │       ├── icons/               # Icônes
│   │       └── fonts/               # Polices
│   ├── src/
│   │   ├── index.js                 # Point d'entrée React
│   │   ├── App.js                   # Composant principal
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Header.js        # Header Frutiger Aero
│   │   │   │   ├── Footer.js        # Footer
│   │   │   │   ├── Sidebar.js       # Sidebar navigation
│   │   │   │   ├── LoadingSpinner.js # Loader animé
│   │   │   │   └── Modal.js         # Modal glassmorphism
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.js     # Formulaire connexion
│   │   │   │   ├── RegisterForm.js  # Formulaire inscription
│   │   │   │   └── ProtectedRoute.js # Route protégée
│   │   │   ├── video/
│   │   │   │   ├── VideoPlayer.js   # Lecteur vidéo HLS
│   │   │   │   ├── VideoCard.js     # Carte vidéo
│   │   │   │   ├── VideoGrid.js     # Grille de vidéos
│   │   │   │   ├── VideoUpload.js   # Upload vidéo
│   │   │   │   └── VideoControls.js # Contrôles personnalisés
│   │   │   ├── playlist/
│   │   │   │   ├── PlaylistCard.js  # Carte playlist
│   │   │   │   ├── PlaylistGrid.js  # Grille playlists
│   │   │   │   └── PlaylistForm.js  # Formulaire playlist
│   │   │   └── search/
│   │   │       ├── SearchBar.js     # Barre recherche
│   │   │       └── SearchResults.js # Résultats recherche
│   │   ├── pages/
│   │   │   ├── HomePage.js          # Page d'accueil
│   │   │   ├── LoginPage.js         # Page connexion
│   │   │   ├── RegisterPage.js      # Page inscription
│   │   │   ├── ProfilePage.js       # Page profil
│   │   │   ├── VideoPage.js         # Page vidéo
│   │   │   ├── PlaylistPage.js      # Page playlist
│   │   │   ├── UploadPage.js        # Page upload
│   │   │   └── SearchPage.js        # Page recherche
│   │   ├── hooks/
│   │   │   ├── useAuth.js           # Hook authentification
│   │   │   ├── useVideo.js          # Hook vidéo
│   │   │   ├── usePlaylist.js       # Hook playlist
│   │   │   └── useSearch.js         # Hook recherche
│   │   ├── services/
│   │   │   ├── api.js               # Client API
│   │   │   ├── authService.js       # Service auth
│   │   │   ├── videoService.js      # Service vidéo
│   │   │   └── playlistService.js   # Service playlist
│   │   ├── store/
│   │   │   ├── authStore.js         # Store Zustand auth
│   │   │   ├── videoStore.js        # Store vidéo
│   │   │   └── playlistStore.js     # Store playlist
│   │   ├── styles/
│   │   │   ├── index.css            # Styles globaux
│   │   │   ├── frutiger-aero.css    # Thème Frutiger Aero
│   │   │   ├── components/
│   │   │   │   ├── header.css       # Styles header
│   │   │   │   ├── video-player.css # Styles lecteur
│   │   │   │   ├── cards.css        # Styles cartes
│   │   │   │   └── forms.css        # Styles formulaires
│   │   │   └── animations/
│   │   │       ├── aurora.css       # Animations aurora
│   │   │       ├── glass.css        # Effets glassmorphism
│   │   │       └── transitions.css  # Transitions
│   │   └── utils/
│   │       ├── constants.js         # Constantes frontend
│   │       ├── helpers.js           # Fonctions utilitaires
│   │       └── formatters.js        # Formatage données
│
├── database/
│   ├── init.sql                     # Script initialisation
│   ├── migrations/
│   │   ├── 001_create_users.sql     # Migration utilisateurs
│   │   ├── 002_create_videos.sql    # Migration vidéos
│   │   ├── 003_create_playlists.sql # Migration playlists
│   │   └── 004_create_indexes.sql   # Migration indexes
│   └── seeds/
│       ├── users.sql                # Données test utilisateurs
│       └── videos.sql               # Données test vidéos
│
└── scripts/
    ├── setup.sh                     # Script installation
    ├── start-dev.sh                 # Script démarrage dev
    └── build.sh                     # Script build production
```

## Technologies utilisées

### Backend
- **Node.js 20+** avec Express.js 4.18+
- **PostgreSQL 16** (via Docker)
- **JWT** pour l'authentification
- **Multer** pour l'upload de fichiers
- **FFmpeg** pour l'encodage vidéo
- **HLS** pour le streaming adaptatif

### Frontend
- **React 18** avec hooks modernes
- **Zustand** pour la gestion d'état
- **Axios** pour les appels API
- **HLS.js** pour le lecteur vidéo
- **CSS moderne** avec Frutiger Aero

### Base de données
- **PostgreSQL** avec relations optimisées
- **Migrations** SQL pour le versioning
- **Indexes** pour les performances

## Commandes d'installation

```bash
# Cloner le projet
git clone <repository-url>
cd frutiger-streaming

# Démarrer PostgreSQL
docker-compose up -d

# Installer les dépendances backend
cd backend
npm install

# Installer les dépendances frontend
cd ../frontend
npm install

# Initialiser la base de données
cd ../database
psql -h localhost -U frutiger_user -d frutiger_streaming -f init.sql

# Démarrer le développement
npm run dev:backend  # Terminal 1
npm run dev:frontend # Terminal 2
```

## Fonctionnalités incluses

✅ **Authentification complète** (JWT + refresh tokens)  
✅ **Upload de vidéos** avec validation  
✅ **Streaming HLS** adaptatif  
✅ **Gestion des playlists** avec drag & drop  
✅ **Recherche en temps réel** avec debounce  
✅ **Interface Frutiger Aero** complète  
✅ **Responsive design** mobile-first  
✅ **Système de favoris** et likes  
✅ **Profils utilisateurs** personnalisés  
✅ **Sécurité renforcée** (CORS, validation, etc.)  

## Prochaines étapes

1. Créer les fichiers de configuration
2. Développer le backend API
3. Créer l'interface Frutiger Aero
4. Intégrer le streaming vidéo
5. Tester et optimiser