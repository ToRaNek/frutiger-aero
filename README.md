# 🌊 Frutiger Streaming Platform

Une plateforme de streaming vidéo moderne avec l'esthétique nostalgique **Frutiger Aero** (2004-2013), combinant les effets glossy, la transparence et les éléments naturels avec les meilleures pratiques technologiques 2024-2025.

![Frutiger Aero Preview](./docs/preview.png)

## ✨ Fonctionnalités

### 🎥 Streaming & Vidéo
- **Streaming HLS adaptatif** avec qualités multiples (360p, 720p, 1080p)
- **Upload de vidéos** avec validation et traitement automatique
- **Lecteur vidéo personnalisé** avec contrôles Frutiger Aero
- **Génération automatique de miniatures** avec FFmpeg
- **Support multi-formats** (MP4, AVI, MOV, MKV, WebM)

### 👤 Authentification & Profils
- **Système complet** d'inscription/connexion JWT
- **Profils utilisateurs** personnalisables
- **Refresh tokens** sécurisés avec rotation
- **Protection des routes** côté client et serveur

### 📚 Gestion de Contenu
- **Playlists** avec drag & drop
- **Système de favoris** et likes
- **Recherche en temps réel** avec debounce intelligent
- **Catégories** et tags de vidéos
- **Historique de visionnage**

### 🎨 Interface Frutiger Aero
- **Glassmorphism** et effets de transparence
- **Animations Aurora** dynamiques
- **Boutons glossy** avec relief 3D
- **Palette de couleurs** authentique (bleus vifs, verts, cyan)
- **Design responsive** mobile-first

### 🔒 Sécurité & Performance
- **Protection CORS** configurée
- **Rate limiting** intelligent
- **Validation des données** avec Joi
- **Logs structurés** avec Winston
- **Cache Redis** (optionnel)
- **Monitoring** et health checks

## 🛠 Stack Technique

### Backend
- **Node.js 20+** & Express.js 4.18+
- **PostgreSQL 16** (via Docker)
- **JWT** pour l'authentification
- **FFmpeg** pour l'encodage vidéo
- **Multer** pour l'upload sécurisé

### Frontend
- **React 18** avec hooks modernes
- **Zustand** pour la gestion d'état
- **HLS.js** & Video.js pour le streaming
- **Framer Motion** pour les animations
- **React Query** pour le cache API

### Base de Données
- **PostgreSQL** avec relations optimisées
- **Migrations SQL** versionnées
- **Indexes** pour les performances

## 🚀 Installation Rapide

### Prérequis
```bash
# Vérifier les versions
node --version  # >= 18.0.0
npm --version   # >= 8.0.0
docker --version # pour PostgreSQL
ffmpeg -version # pour l'encodage vidéo
```

### 1. Cloner le projet
```bash
git clone https://github.com/your-username/frutiger-streaming.git
cd frutiger-streaming
```

### 2. Configuration environnement
```bash
# Copier les fichiers d'environnement
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Éditer les variables d'environnement
nano .env
```

### 3. Démarrer PostgreSQL
```bash
# Démarrer la base de données
docker-compose up -d

# Vérifier que PostgreSQL fonctionne
docker-compose logs postgres
```

### 4. Installer les dépendances
```bash
# Backend
cd backend
npm install

# Frontend  
cd ../frontend
npm install
```

### 5. Initialiser la base de données
```bash
# Depuis la racine du projet
cd database
psql -h localhost -U frutiger_user -d frutiger_streaming -f init.sql

# Ou utiliser le script automatique
npm run db:setup
```

### 6. Démarrer l'application
```bash
# Terminal 1 - Backend API (Port 5000)
cd backend
npm run dev

# Terminal 2 - Frontend React (Port 3000)  
cd frontend
npm start
```

### 7. Accéder à l'application
- **Frontend**: http://localhost:3000
- **API Backend**: http://localhost:5000
- **Base de données**: localhost:5432

## 📝 Scripts de Développement

### Backend
```bash
npm run dev          # Démarrage développement avec nodemon
npm run start        # Démarrage production
npm run test         # Tests unitaires
npm run lint         # Vérification code
npm run db:migrate   # Exécuter migrations
npm run db:seed      # Données de test
```

### Frontend
```bash
npm start            # Serveur de développement
npm run build        # Build de production
npm run test         # Tests React
npm run lint         # ESLint
npm run format       # Prettier
npm run analyze      # Analyse du bundle
```

## 🗂 Structure du Projet

```
frutiger-streaming/
├── backend/                  # API Node.js/Express
│   ├── src/
│   │   ├── controllers/     # Logique métier
│   │   ├── models/         # Modèles PostgreSQL
│   │   ├── routes/         # Routes API
│   │   ├── middleware/     # Middlewares (auth, validation)
│   │   ├── services/       # Services (vidéo, upload)
│   │   └── config/         # Configuration
│   ├── uploads/            # Upload temporaire
│   └── videos/             # Vidéos encodées
├── frontend/                # Interface React
│   ├── src/
│   │   ├── components/     # Composants Frutiger Aero
│   │   ├── pages/          # Pages principales
│   │   ├── styles/         # CSS Frutiger Aero
│   │   ├── hooks/          # Hooks personnalisés
│   │   └── services/       # Services API
│   └── public/             # Assets statiques
├── database/                # Scripts PostgreSQL
│   ├── migrations/         # Migrations versionnées
│   └── seeds/              # Données de test
└── docker-compose.yml       # PostgreSQL uniquement
```

## 🎨 Guide Esthétique Frutiger Aero

### Palette de Couleurs
```css
--frutiger-deep-blue: #003c78     /* Bleu profond */
--frutiger-royal-blue: #0050a0    /* Bleu royal */  
--frutiger-bright-blue: #0064b4   /* Bleu vif */
--frutiger-sky-blue: #0078c8      /* Bleu ciel */
--frutiger-cyan: #64c8dc          /* Cyan */
--frutiger-mint: #b1ffd8          /* Vert menthe */
--frutiger-glass: rgba(255,255,255,0.2) /* Verre */
```

### Effets Caractéristiques
- **Glassmorphism** avec `backdrop-filter: blur(15px)`
- **Gradients aurora** animés
- **Box-shadows** multicouches pour l'effet 3D
- **Border-radius** généreuses (20px+)
- **Animations fluides** avec easing naturel

## 🔧 Configuration Avancée

### Variables d'Environnement Importantes
```bash
# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=frutiger_streaming
DB_USER=frutiger_user
DB_PASSWORD=frutiger_password_2024

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRE=1h
JWT_REFRESH_EXPIRE=7d

# Upload
MAX_FILE_SIZE=500MB
ALLOWED_VIDEO_FORMATS=mp4,avi,mov,mkv,webm

# FFmpeg
HLS_SEGMENT_DURATION=10
HLS_PLAYLIST_SIZE=6
```

### Optimisations Production
```bash
# Build optimisé
npm run build:prod

# Monitoring PM2
npm run pm2:start

# Logs de production
npm run logs:prod
```

## 🧪 Tests

### Backend
```bash
# Tests unitaires
npm run test

# Tests avec coverage
npm run test:coverage

# Tests d'intégration
npm run test:integration
```

### Frontend
```bash
# Tests composants
npm test

# Tests E2E
npm run test:e2e
```

## 📦 Déploiement

### Avec Docker
```bash
# Build des images
docker build -t frutiger-backend ./backend
docker build -t frutiger-frontend ./frontend

# Déploiement complet
docker-compose -f docker-compose.prod.yml up -d
```

### Serveur Traditionnel
```bash
# Build de production
npm run build:all

# Démarrage avec PM2
npm run pm2:start
```

## 🤝 Contribution

1. **Fork** le projet
2. **Créer** une branche (`git checkout -b feature/amazing-feature`)
3. **Commit** vos changements (`git commit -m 'Add amazing feature'`)
4. **Push** vers la branche (`git push origin feature/amazing-feature`)
5. **Ouvrir** une Pull Request

### Standards de Code
- **ESLint** pour JavaScript
- **Prettier** pour le formatage
- **Tests unitaires** requis
- **Documentation** des nouvelles fonctionnalités

## 📊 Performance

### Objectifs de Performance
- **LCP** < 2.5 secondes
- **Video Start Time** < 2 secondes
- **Buffering Ratio** < 1%
- **Bundle JS** < 500KB

### Monitoring
- **Logs structurés** avec Winston
- **Health checks** automatiques
- **Métriques** de performance vidéo

## 🐛 Résolution de Problèmes

### Problèmes Courants

**FFmpeg non trouvé**
```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows
# Télécharger depuis https://ffmpeg.org/
```

**Erreur de connexion PostgreSQL**
```bash
# Vérifier que Docker fonctionne
docker-compose ps

# Vérifier les logs
docker-compose logs postgres

# Redémarrer si nécessaire
docker-compose restart postgres
```

**Port déjà utilisé**
```bash
# Trouver le processus utilisant le port
lsof -i :5000
lsof -i :3000

# Tuer le processus
kill -9 PID
```

## 📚 Documentation

- [Architecture détaillée](./docs/architecture.md)
- [Guide d'API](./docs/api.md)
- [Composants UI](./docs/components.md)
- [Guide de déploiement](./docs/deployment.md)

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](./LICENSE) pour plus de détails.

## 👥 Équipe

- **Développement Frontend**: Interface Frutiger Aero
- **Développement Backend**: API & Services vidéo
- **DevOps**: Infrastructure & Déploiement
- **Design**: Esthétique Frutiger Aero authentique

## 🙏 Remerciements

- **Inspiration** par l'esthétique Frutiger Aero originale (2004-2013)
- **Technologies modernes** pour les performances 2024-2025
- **Communauté Open Source** pour les outils utilisés

---

**Créé avec 💙 et nostalgie pour l'ère Frutiger Aero**