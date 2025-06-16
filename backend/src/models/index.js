// backend/src/models/index.js
const User = require('./User');
const Video = require('./Video');
const Playlist = require('./Playlist');

// Export tous les modèles pour faciliter les imports
module.exports = {
    User,
    Video,
    Playlist
};