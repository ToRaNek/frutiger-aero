// frontend/src/components/common/Footer.js
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

function Footer() {
    const currentYear = new Date().getFullYear();

    const footerVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                ease: "easeOut",
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.4 }
        }
    };

    return (
        <motion.footer
            className="footer"
            variants={footerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
        >
            <div className="footer-aurora">
                <div className="aurora-layer footer-aurora-1"></div>
                <div className="aurora-layer footer-aurora-2"></div>
            </div>

            <div className="footer-container">
                <div className="footer-content">
                    {/* Section principale */}
                    <motion.div className="footer-main" variants={itemVariants}>
                        <div className="footer-brand">
                            <Link to="/" className="footer-logo">
                                <div className="logo-icon">
                                    <div className="logo-glass"></div>
                                    <div className="logo-text">F</div>
                                </div>
                                <span className="logo-name">
                  Frutiger <span className="logo-accent">Streaming</span>
                </span>
                            </Link>
                            <p className="footer-description">
                                La plateforme de streaming vidéo inspirée de l'esthétique Frutiger Aero.
                                Découvrez, uploadez et partagez vos vidéos dans un environnement nostalgique et moderne.
                            </p>
                            <div className="footer-social">
                                <a
                                    href="https://twitter.com/frutigerstreaming"
                                    className="social-link"
                                    aria-label="Suivez-nous sur Twitter"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </a>
                                <a
                                    href="https://discord.gg/frutigerstreaming"
                                    className="social-link"
                                    aria-label="Rejoignez notre Discord"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M19 14C19 14 20 13 20 11C20 9 19 8 19 8C17 6 15 6 15 6L14.5 6.5C16.5 7 17.5 8 17.5 8C16 7 14.5 6.5 13 6.5C11.5 6.5 10 7 8.5 8C8.5 8 9.5 7 11.5 6.5L11 6C11 6 9 6 7 8C7 8 6 9 6 11C6 13 7 14 7 14C8.5 15.5 10.5 15.5 10.5 15.5L11 15C10 14.5 9 13.5 9 13.5C10 14 11 14.5 12 14.5C13 14.5 14 14 15 13.5C15 13.5 14 14.5 13 15L13.5 15.5C13.5 15.5 15.5 15.5 17 14Z"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </a>
                                <a
                                    href="https://github.com/frutigerstreaming"
                                    className="social-link"
                                    aria-label="Voir notre code sur GitHub"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </a>
                                <a
                                    href="https://youtube.com/@frutigerstreaming"
                                    className="social-link"
                                    aria-label="Abonnez-vous à notre chaîne YouTube"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33z"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <polygon
                                            points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </motion.div>

                    {/* Liens de navigation */}
                    <div className="footer-links">
                        <motion.div className="footer-column" variants={itemVariants}>
                            <h3 className="footer-title">Découvrir</h3>
                            <ul className="footer-list">
                                <li><Link to="/trending" className="footer-link">Tendances</Link></li>
                                <li><Link to="/categories" className="footer-link">Catégories</Link></li>
                                <li><Link to="/playlists" className="footer-link">Playlists</Link></li>
                                <li><Link to="/creators" className="footer-link">Créateurs</Link></li>
                                <li><Link to="/frutiger-aero" className="footer-link">Frutiger Aero</Link></li>
                            </ul>
                        </motion.div>

                        <motion.div className="footer-column" variants={itemVariants}>
                            <h3 className="footer-title">Créateurs</h3>
                            <ul className="footer-list">
                                <li><Link to="/upload" className="footer-link">Uploader</Link></li>
                                <li><Link to="/creator-tools" className="footer-link">Outils créateur</Link></li>
                                <li><Link to="/analytics" className="footer-link">Analytics</Link></li>
                                <li><Link to="/monetization" className="footer-link">Monétisation</Link></li>
                                <li><Link to="/creator-guide" className="footer-link">Guide créateur</Link></li>
                            </ul>
                        </motion.div>

                        <motion.div className="footer-column" variants={itemVariants}>
                            <h3 className="footer-title">Communauté</h3>
                            <ul className="footer-list">
                                <li><Link to="/blog" className="footer-link">Blog</Link></li>
                                <li><Link to="/forum" className="footer-link">Forum</Link></li>
                                <li><Link to="/events" className="footer-link">Événements</Link></li>
                                <li><Link to="/discord" className="footer-link">Discord</Link></li>
                                <li><Link to="/newsletter" className="footer-link">Newsletter</Link></li>
                            </ul>
                        </motion.div>

                        <motion.div className="footer-column" variants={itemVariants}>
                            <h3 className="footer-title">Support</h3>
                            <ul className="footer-list">
                                <li><Link to="/help" className="footer-link">Centre d'aide</Link></li>
                                <li><Link to="/contact" className="footer-link">Contact</Link></li>
                                <li><Link to="/report" className="footer-link">Signaler</Link></li>
                                <li><Link to="/feedback" className="footer-link">Feedback</Link></li>
                                <li><Link to="/status" className="footer-link">Statut</Link></li>
                            </ul>
                        </motion.div>
                    </div>

                    {/* Newsletter */}
                    <motion.div className="footer-newsletter" variants={itemVariants}>
                        <h3 className="footer-title">Restez informé</h3>
                        <p className="newsletter-description">
                            Recevez les dernières nouvelles, les nouvelles fonctionnalités et les créateurs à découvrir.
                        </p>
                        <form className="newsletter-form">
                            <div className="newsletter-input-group">
                                <input
                                    type="email"
                                    placeholder="Votre adresse email"
                                    className="newsletter-input"
                                    aria-label="Adresse email pour la newsletter"
                                />
                                <motion.button
                                    type="submit"
                                    className="newsletter-button"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    S'abonner
                                </motion.button>
                            </div>
                            <p className="newsletter-terms">
                                En vous abonnant, vous acceptez notre{' '}
                                <Link to="/privacy" className="footer-link">politique de confidentialité</Link>.
                            </p>
                        </form>
                    </motion.div>
                </div>

                {/* Barre de séparation */}
                <motion.div
                    className="footer-divider"
                    variants={itemVariants}
                ></motion.div>

                {/* Pied de page légal */}
                <motion.div className="footer-bottom" variants={itemVariants}>
                    <div className="footer-legal">
                        <div className="legal-links">
                            <Link to="/privacy" className="legal-link">Politique de confidentialité</Link>
                            <Link to="/terms" className="legal-link">Conditions d'utilisation</Link>
                            <Link to="/cookies" className="legal-link">Politique des cookies</Link>
                            <Link to="/dmca" className="legal-link">DMCA</Link>
                            <Link to="/accessibility" className="legal-link">Accessibilité</Link>
                        </div>
                        <div className="copyright">
                            <p>
                                © {currentYear} Frutiger Streaming. Tous droits réservés.
                                <span className="footer-heart">Fait avec 💙 pour la nostalgie des années 2000</span>
                            </p>
                        </div>
                    </div>

                    {/* Sélecteur de langue */}
                    <div className="footer-language">
                        <select className="language-selector" aria-label="Choisir la langue">
                            <option value="fr">🇫🇷 Français</option>
                            <option value="en">🇺🇸 English</option>
                            <option value="es">🇪🇸 Español</option>
                            <option value="de">🇩🇪 Deutsch</option>
                            <option value="it">🇮🇹 Italiano</option>
                            <option value="ja">🇯🇵 日本語</option>
                        </select>
                    </div>
                </motion.div>

                {/* Informations techniques pour les développeurs */}
                {process.env.NODE_ENV === 'development' && (
                    <motion.div className="footer-dev-info" variants={itemVariants}>
                        <details className="dev-details">
                            <summary>Informations de développement</summary>
                            <div className="dev-info-content">
                                <p>Version: {process.env.REACT_APP_VERSION || '1.0.0'}</p>
                                <p>Build: {process.env.REACT_APP_BUILD_NUMBER || 'dev'}</p>
                                <p>Environment: {process.env.NODE_ENV}</p>
                                <p>API URL: {process.env.REACT_APP_API_URL || 'http://localhost:5000'}</p>
                            </div>
                        </details>
                    </motion.div>
                )}
            </div>
        </motion.footer>
    );
}

export default Footer;