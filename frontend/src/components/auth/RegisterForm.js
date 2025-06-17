// frontend/src/components/auth/RegisterForm.js

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Eye, EyeOff, Mail, Lock, User, UserCheck,
    AlertCircle, CheckCircle, Info
} from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import {
    ROUTES,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    DEBOUNCE_DELAYS,
    API_ENDPOINTS
} from '../../utils/constants';
import {
    isValidEmail,
    isValidUsername,
    isValidPassword,
    debounce
} from '../../utils/helpers';
import { formatErrorMessage } from '../../utils/formatters';

/**
 * Formulaire d'inscription avec design Frutiger Aero
 * Corrigé selon la documentation backend User.create()
 */

const RegisterForm = ({
                          onSuccess,
                          redirectTo,
                          showLoginLink = true,
                          embedded = false,
                          userType = 'user'
                      }) => {
    const navigate = useNavigate();

    // État du formulaire selon User.create(userData) de la doc backend
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        password: '',
        confirmPassword: '',
        acceptTerms: false
    });

    const [validationErrors, setValidationErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(null);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Effet pour validation en temps réel
    useEffect(() => {
        const debouncedValidation = debounce(() => {
            validateForm();
            if (formData.password) {
                checkPasswordStrength();
            }
        }, DEBOUNCE_DELAYS.INPUT);

        debouncedValidation();

        return () => debouncedValidation.cancel?.();
    }, [formData]);

    // Validation du formulaire selon les règles backend
    const validateForm = () => {
        const errors = {};

        // Validation nom d'utilisateur selon isValidUsername
        if (!formData.username.trim()) {
            errors.username = 'Nom d\'utilisateur requis';
        } else if (!isValidUsername(formData.username)) {
            errors.username = 'Nom d\'utilisateur invalide (3-20 caractères, lettres, chiffres et underscore uniquement)';
        }

        // Validation email selon isValidEmail
        if (!formData.email.trim()) {
            errors.email = 'Email requis';
        } else if (!isValidEmail(formData.email)) {
            errors.email = 'Format d\'email invalide';
        }

        // Validation prénom
        if (!formData.firstName.trim()) {
            errors.firstName = 'Prénom requis';
        } else if (formData.firstName.length < 2) {
            errors.firstName = 'Minimum 2 caractères requis';
        }

        // Validation nom
        if (!formData.lastName.trim()) {
            errors.lastName = 'Nom requis';
        } else if (formData.lastName.length < 2) {
            errors.lastName = 'Minimum 2 caractères requis';
        }

        // Validation mot de passe selon isValidPassword
        if (!formData.password) {
            errors.password = 'Mot de passe requis';
        } else if (!isValidPassword(formData.password)) {
            errors.password = 'Mot de passe faible (min. 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre)';
        }

        // Validation confirmation mot de passe
        if (!formData.confirmPassword) {
            errors.confirmPassword = 'Confirmation du mot de passe requise';
        } else if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = 'Les mots de passe ne correspondent pas';
        }

        // Validation acceptation des conditions
        if (!formData.acceptTerms) {
            errors.acceptTerms = 'Vous devez accepter les conditions d\'utilisation';
        }

        setValidationErrors(errors);
        setIsFormValid(Object.keys(errors).length === 0);

        return Object.keys(errors).length === 0;
    };

    // Vérification de la force du mot de passe selon isValidPassword
    const checkPasswordStrength = () => {
        const password = formData.password;
        if (!password) {
            setPasswordStrength(null);
            return;
        }

        let score = 0;
        let feedback = [];

        // Longueur
        if (password.length >= 8) score += 1;
        else feedback.push('Au moins 8 caractères');

        // Majuscule
        if (/[A-Z]/.test(password)) score += 1;
        else feedback.push('Une majuscule');

        // Minuscule
        if (/[a-z]/.test(password)) score += 1;
        else feedback.push('Une minuscule');

        // Chiffre
        if (/\d/.test(password)) score += 1;
        else feedback.push('Un chiffre');

        // Caractère spécial
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
        else feedback.push('Un caractère spécial');

        // Longueur étendue
        if (password.length >= 12) score += 1;

        const strength = {
            score,
            level: score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong',
            feedback
        };

        setPasswordStrength(strength);
    };

    // Gestion des changements de champs
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Nettoie l'erreur du champ modifié
        if (validationErrors[name]) {
            setValidationErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }

        // Nettoie l'erreur globale
        if (error) {
            setError(null);
        }
    };

    // Soumission du formulaire selon User.create(userData) de la doc backend
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Préparation des données selon User.create de la doc
            const userData = {
                username: formData.username.trim(),
                email: formData.email.trim().toLowerCase(),
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                password: formData.password,
                role: userType || 'user' // Défaut user selon la doc
            };

            // Appel API selon la documentation backend
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${API_ENDPOINTS.AUTH.REGISTER}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            const data = await response.json();

            if (response.ok) {
                setRegistrationSuccess(true);
                onSuccess?.(data.user);

                // Redirection après délai pour afficher le message
                setTimeout(() => {
                    if (!embedded) {
                        navigate(redirectTo || ROUTES.LOGIN, {
                            state: {
                                message: 'Inscription réussie ! Vérifiez votre email.',
                                email: formData.email
                            }
                        });
                    }
                }, 2000);
            } else {
                // Gestion des erreurs selon la doc backend
                if (data.code === 'USERNAME_EXISTS') {
                    setValidationErrors({
                        username: 'Ce nom d\'utilisateur est déjà utilisé'
                    });
                } else if (data.code === 'EMAIL_EXISTS') {
                    setValidationErrors({
                        email: 'Cette adresse email est déjà utilisée'
                    });
                } else {
                    setError(data.message || 'Erreur lors de l\'inscription');
                }
            }
        } catch (err) {
            setError('Erreur de connexion au serveur');
        } finally {
            setIsLoading(false);
        }
    };

    // Affichage du succès avec style Frutiger Aero
    if (registrationSuccess) {
        return (
            <div className="w-full max-w-md mx-auto text-center frutiger-success-container">
                <div className="mb-8 frutiger-success-animation">
                    <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 frutiger-success-icon">
                        <CheckCircle className="w-8 h-8 text-emerald-600 frutiger-icon-bounce" />
                        <div className="frutiger-success-glow"></div>
                    </div>
                    <h2 className="text-2xl font-bold text-white frutiger-title mb-2 frutiger-glow-text">
                        Inscription réussie !
                    </h2>
                    <p className="text-white/80 frutiger-subtitle">
                        Un email de vérification a été envoyé à <strong className="frutiger-highlight">{formData.email}</strong>
                    </p>
                </div>

                <div className="p-6 frutiger-glass-success frutiger-success-panel">
                    <p className="text-emerald-800 text-sm mb-4 frutiger-success-text">
                        Vérifiez votre boîte mail et cliquez sur le lien pour activer votre compte.
                    </p>
                    <button
                        onClick={() => navigate(ROUTES.LOGIN)}
                        className="frutiger-btn frutiger-btn-primary-aero w-full py-3 frutiger-btn-glow"
                    >
                        <span className="frutiger-btn-text">Aller à la connexion</span>
                        <div className="frutiger-btn-shine"></div>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full ${embedded ? '' : 'max-w-lg mx-auto'}`}>
            {/* Header avec style Frutiger */}
            {!embedded && (
                <div className="mb-8 text-center frutiger-header">
                    <h1 className="text-3xl font-bold text-white frutiger-title mb-2 frutiger-glow-text">
                        Inscription
                    </h1>
                    <p className="text-white/80 frutiger-subtitle">
                        Créez votre compte Frutiger gratuitement
                    </p>
                    <div className="frutiger-header-glow"></div>
                </div>
            )}

            {/* Formulaire avec glassmorphism Frutiger Aero */}
            <form onSubmit={handleSubmit} className="space-y-6 frutiger-form">
                {/* Erreur générale */}
                {(error || validationErrors.general) && (
                    <div className="p-4 frutiger-notification-error frutiger-glass-error">
                        <div className="flex items-start space-x-2 text-red-800">
                            <AlertCircle size={20} className="flex-shrink-0 mt-0.5 frutiger-icon-pulse" />
                            <p className="text-sm frutiger-error-text">
                                {validationErrors.general || formatErrorMessage(error)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Nom d'utilisateur avec effet Frutiger */}
                <div className="space-y-2 frutiger-field-group">
                    <label htmlFor="username" className="block text-sm font-medium text-white/90 frutiger-label">
                        Nom d'utilisateur *
                    </label>
                    <div className="relative frutiger-input-container">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <User className="w-5 h-5 text-white/50 frutiger-icon-subtle" />
                        </div>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            autoComplete="username"
                            required
                            value={formData.username}
                            onChange={handleInputChange}
                            className={`
                                frutiger-input frutiger-glass-input w-full pl-10 pr-4 py-3
                                ${validationErrors.username ? 'frutiger-input-error' : 'frutiger-input-normal'}
                            `}
                            placeholder="votre_username"
                        />
                        <div className="frutiger-input-glow"></div>
                    </div>
                    {validationErrors.username && (
                        <p className="text-sm text-red-300 frutiger-error-text frutiger-slide-down">{validationErrors.username}</p>
                    )}
                    <p className="text-xs text-white/60 frutiger-help-text">
                        3-20 caractères, lettres, chiffres et underscore uniquement
                    </p>
                </div>

                {/* Email avec effet Frutiger */}
                <div className="space-y-2 frutiger-field-group">
                    <label htmlFor="email" className="block text-sm font-medium text-white/90 frutiger-label">
                        Adresse email *
                    </label>
                    <div className="relative frutiger-input-container">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Mail className="w-5 h-5 text-white/50 frutiger-icon-subtle" />
                        </div>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={formData.email}
                            onChange={handleInputChange}
                            className={`
                                frutiger-input frutiger-glass-input w-full pl-10 pr-4 py-3
                                ${validationErrors.email ? 'frutiger-input-error' : 'frutiger-input-normal'}
                            `}
                            placeholder="votre@email.com"
                        />
                        <div className="frutiger-input-glow"></div>
                    </div>
                    {validationErrors.email && (
                        <p className="text-sm text-red-300 frutiger-error-text frutiger-slide-down">{validationErrors.email}</p>
                    )}
                </div>

                {/* Prénom et Nom avec layout responsive */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 frutiger-name-fields">
                    <div className="space-y-2 frutiger-field-group">
                        <label htmlFor="firstName" className="block text-sm font-medium text-white/90 frutiger-label">
                            Prénom *
                        </label>
                        <div className="relative frutiger-input-container">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <UserCheck className="w-5 h-5 text-white/50 frutiger-icon-subtle" />
                            </div>
                            <input
                                id="firstName"
                                name="firstName"
                                type="text"
                                autoComplete="given-name"
                                required
                                value={formData.firstName}
                                onChange={handleInputChange}
                                className={`
                                    frutiger-input frutiger-glass-input w-full pl-10 pr-4 py-3
                                    ${validationErrors.firstName ? 'frutiger-input-error' : 'frutiger-input-normal'}
                                `}
                                placeholder="Votre prénom"
                            />
                            <div className="frutiger-input-glow"></div>
                        </div>
                        {validationErrors.firstName && (
                            <p className="text-sm text-red-300 frutiger-error-text frutiger-slide-down">{validationErrors.firstName}</p>
                        )}
                    </div>

                    <div className="space-y-2 frutiger-field-group">
                        <label htmlFor="lastName" className="block text-sm font-medium text-white/90 frutiger-label">
                            Nom *
                        </label>
                        <input
                            id="lastName"
                            name="lastName"
                            type="text"
                            autoComplete="family-name"
                            required
                            value={formData.lastName}
                            onChange={handleInputChange}
                            className={`
                                frutiger-input frutiger-glass-input w-full pl-4 pr-4 py-3
                                ${validationErrors.lastName ? 'frutiger-input-error' : 'frutiger-input-normal'}
                            `}
                            placeholder="Votre nom"
                        />
                        {validationErrors.lastName && (
                            <p className="text-sm text-red-300 frutiger-error-text frutiger-slide-down">{validationErrors.lastName}</p>
                        )}
                    </div>
                </div>

                {/* Mot de passe avec indicateur de force Frutiger */}
                <div className="space-y-2 frutiger-field-group">
                    <label htmlFor="password" className="block text-sm font-medium text-white/90 frutiger-label">
                        Mot de passe *
                    </label>
                    <div className="relative frutiger-input-container">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Lock className="w-5 h-5 text-white/50 frutiger-icon-subtle" />
                        </div>
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            required
                            value={formData.password}
                            onChange={handleInputChange}
                            className={`
                                frutiger-input frutiger-glass-input w-full pl-10 pr-12 py-3
                                ${validationErrors.password ? 'frutiger-input-error' : 'frutiger-input-normal'}
                            `}
                            placeholder="Choisissez un mot de passe sécurisé"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/50 hover:text-white frutiger-button-ghost frutiger-transition"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                        <div className="frutiger-input-glow"></div>
                    </div>

                    {/* Indicateur de force du mot de passe Frutiger Aero */}
                    {passwordStrength && (
                        <div className="space-y-2 frutiger-password-strength">
                            <div className="flex space-x-1 frutiger-strength-bars">
                                {[1, 2, 3, 4, 5].map((level) => (
                                    <div
                                        key={level}
                                        className={`
                                            h-2 flex-1 rounded frutiger-strength-bar
                                            ${level <= passwordStrength.score
                                            ? passwordStrength.level === 'weak' ? 'frutiger-strength-weak'
                                                : passwordStrength.level === 'medium' ? 'frutiger-strength-medium'
                                                    : 'frutiger-strength-strong'
                                            : 'frutiger-strength-empty'
                                        }
                                        `}
                                    />
                                ))}
                            </div>
                            <p className={`
                                text-xs frutiger-strength-text
                                ${passwordStrength.level === 'weak' ? 'text-red-400'
                                : passwordStrength.level === 'medium' ? 'text-yellow-400'
                                    : 'text-emerald-400'
                            }
                            `}>
                                Force : {passwordStrength.level === 'weak' ? 'Faible'
                                : passwordStrength.level === 'medium' ? 'Moyen'
                                    : 'Fort'}
                                {passwordStrength.feedback.length > 0 && (
                                    <span className="text-white/60 frutiger-strength-feedback">
                                        {' '}- Manque : {passwordStrength.feedback.join(', ')}
                                    </span>
                                )}
                            </p>
                        </div>
                    )}

                    {validationErrors.password && (
                        <p className="text-sm text-red-300 frutiger-error-text frutiger-slide-down">{validationErrors.password}</p>
                    )}
                </div>

                {/* Confirmation mot de passe */}
                <div className="space-y-2 frutiger-field-group">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/90 frutiger-label">
                        Confirmer le mot de passe *
                    </label>
                    <div className="relative frutiger-input-container">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Lock className="w-5 h-5 text-white/50 frutiger-icon-subtle" />
                        </div>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            required
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            className={`
                                frutiger-input frutiger-glass-input w-full pl-10 pr-12 py-3
                                ${validationErrors.confirmPassword ? 'frutiger-input-error' : 'frutiger-input-normal'}
                            `}
                            placeholder="Confirmez votre mot de passe"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/50 hover:text-white frutiger-button-ghost frutiger-transition"
                        >
                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                        <div className="frutiger-input-glow"></div>
                    </div>
                    {validationErrors.confirmPassword && (
                        <p className="text-sm text-red-300 frutiger-error-text frutiger-slide-down">{validationErrors.confirmPassword}</p>
                    )}
                </div>

                {/* Conditions d'utilisation avec style Frutiger */}
                <div className="space-y-2 frutiger-terms-container">
                    <label className="flex items-start space-x-3 cursor-pointer frutiger-checkbox-container">
                        <input
                            type="checkbox"
                            name="acceptTerms"
                            checked={formData.acceptTerms}
                            onChange={handleInputChange}
                            className={`
                                frutiger-checkbox mt-1
                                ${validationErrors.acceptTerms ? 'frutiger-checkbox-error' : ''}
                            `}
                        />
                        <span className="text-sm text-white/80 frutiger-terms-text">
                            J'accepte les{' '}
                            <Link to="/terms" className="frutiger-link-primary frutiger-link-glow">
                                conditions d'utilisation
                            </Link>{' '}
                            et la{' '}
                            <Link to="/privacy" className="frutiger-link-primary frutiger-link-glow">
                                politique de confidentialité
                            </Link>
                        </span>
                    </label>
                    {validationErrors.acceptTerms && (
                        <p className="text-sm text-red-300 frutiger-error-text frutiger-slide-down">{validationErrors.acceptTerms}</p>
                    )}
                </div>

                {/* Bouton de soumission avec effet Frutiger Aero */}
                <button
                    type="submit"
                    disabled={!isFormValid || isLoading}
                    className={`
                        w-full frutiger-btn frutiger-btn-primary-aero py-3 text-base font-medium
                        frutiger-transition-bounce frutiger-btn-glow
                        ${!isFormValid || isLoading ? 'frutiger-btn-disabled' : 'frutiger-btn-enabled'}
                    `}
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center space-x-2">
                            <LoadingSpinner size="small" className="frutiger-spinner-aero" />
                            <span className="frutiger-loading-text">Création du compte...</span>
                        </div>
                    ) : (
                        <span className="frutiger-btn-text">Créer mon compte</span>
                    )}
                    <div className="frutiger-btn-shine"></div>
                </button>

                {/* Lien de connexion */}
                {showLoginLink && (
                    <div className="text-center frutiger-form-footer">
                        <p className="text-white/80 frutiger-footer-text">
                            Déjà un compte ?{' '}
                            <Link
                                to={ROUTES.LOGIN}
                                className="frutiger-link-secondary frutiger-link-pulse font-medium frutiger-transition"
                            >
                                Se connecter
                            </Link>
                        </p>
                    </div>
                )}
            </form>

            {/* Informations de sécurité avec glassmorphism */}
            <div className="mt-8 p-4 frutiger-glass-info frutiger-info-panel">
                <div className="flex items-start space-x-2">
                    <Info className="w-5 h-5 text-blue-400 frutiger-icon-security flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-white/70 frutiger-info-content">
                        <p className="font-medium text-white/90 mb-1 frutiger-info-title">Protection des données</p>
                        <p className="frutiger-info-description">
                            Vos informations personnelles sont chiffrées et protégées selon
                            les standards les plus stricts de sécurité.
                        </p>
                    </div>
                </div>
                <div className="frutiger-info-glow"></div>
            </div>
        </div>
    );
};

export default RegisterForm;