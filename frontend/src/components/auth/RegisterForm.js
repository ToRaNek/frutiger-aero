// frontend/src/components/auth/RegisterForm.js

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Eye, EyeOff, Mail, Lock, User, UserCheck,
    AlertCircle, CheckCircle, Info
} from 'lucide-react';
import { useAuthForm } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';
import {
    ROUTES,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    DEBOUNCE_DELAYS
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
 *
 * Props:
 * - onSuccess: function - Callback de succès d'inscription
 * - redirectTo: string - URL de redirection après inscription
 * - showLoginLink: boolean - Afficher le lien de connexion
 * - embedded: boolean - Mode intégré (sans layout complet)
 */

const RegisterForm = ({
                          onSuccess,
                          redirectTo,
                          showLoginLink = true,
                          embedded = false
                      }) => {
    const navigate = useNavigate();

    // État du formulaire
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

    // Hook d'authentification
    const { submit, isLoading, error, clearError } = useAuthForm('register');

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

    // Validation du formulaire
    const validateForm = () => {
        const errors = {};

        // Validation nom d'utilisateur
        if (!formData.username.trim()) {
            errors.username = 'Nom d\'utilisateur requis';
        } else if (!isValidUsername(formData.username)) {
            errors.username = 'Nom d\'utilisateur invalide (3-20 caractères, lettres, chiffres et underscore uniquement)';
        }

        // Validation email
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

        // Validation mot de passe
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

    // Vérification de la force du mot de passe
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
            clearError();
        }
    };

    // Soumission du formulaire
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            const result = await submit(formData);

            if (result.success) {
                setRegistrationSuccess(true);
                onSuccess?.(result.data);

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
                // Gestion des erreurs spécifiques
                if (result.error?.code === 'USERNAME_EXISTS') {
                    setValidationErrors({
                        username: 'Ce nom d\'utilisateur est déjà utilisé'
                    });
                } else if (result.error?.code === 'EMAIL_EXISTS') {
                    setValidationErrors({
                        email: 'Cette adresse email est déjà utilisée'
                    });
                } else {
                    setValidationErrors({
                        general: formatErrorMessage(result.error)
                    });
                }
            }
        } catch (err) {
            setValidationErrors({
                general: formatErrorMessage(err)
            });
        }
    };

    // Affichage du succès
    if (registrationSuccess) {
        return (
            <div className="w-full max-w-md mx-auto text-center">
                <div className="mb-8">
                    <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full glass-crystal">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-white frutiger-title mb-2">
                        Inscription réussie !
                    </h2>
                    <p className="text-white/80">
                        Un email de vérification a été envoyé à <strong>{formData.email}</strong>
                    </p>
                </div>

                <div className="p-6 bg-green-500/20 border border-green-500/30 rounded-lg glass-panel">
                    <p className="text-green-400 text-sm mb-4">
                        Vérifiez votre boîte mail et cliquez sur le lien pour activer votre compte.
                    </p>
                    <button
                        onClick={() => navigate(ROUTES.LOGIN)}
                        className="frutiger-btn frutiger-btn-primary w-full py-3"
                    >
                        Aller à la connexion
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full ${embedded ? '' : 'max-w-lg mx-auto'}`}>
            {/* Header */}
            {!embedded && (
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-white frutiger-title mb-2">
                        Inscription
                    </h1>
                    <p className="text-white/80">
                        Créez votre compte Frutiger gratuitement
                    </p>
                </div>
            )}

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Erreur générale */}
                {(error || validationErrors.general) && (
                    <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg glass-panel">
                        <div className="flex items-start space-x-2 text-red-400">
                            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                            <p className="text-sm">
                                {validationErrors.general || formatErrorMessage(error)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Nom d'utilisateur */}
                <div className="space-y-2">
                    <label htmlFor="username" className="block text-sm font-medium text-white/90">
                        Nom d'utilisateur *
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <User className="w-5 h-5 text-white/50" />
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
                frutiger-input w-full pl-10 pr-4 py-3
                ${validationErrors.username ? 'border-red-500/50 focus:border-red-500' : ''}
              `}
                            placeholder="votre_username"
                        />
                    </div>
                    {validationErrors.username && (
                        <p className="text-sm text-red-400">{validationErrors.username}</p>
                    )}
                    <p className="text-xs text-white/60">
                        3-20 caractères, lettres, chiffres et underscore uniquement
                    </p>
                </div>

                {/* Email */}
                <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm font-medium text-white/90">
                        Adresse email *
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Mail className="w-5 h-5 text-white/50" />
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
                frutiger-input w-full pl-10 pr-4 py-3
                ${validationErrors.email ? 'border-red-500/50 focus:border-red-500' : ''}
              `}
                            placeholder="votre@email.com"
                        />
                    </div>
                    {validationErrors.email && (
                        <p className="text-sm text-red-400">{validationErrors.email}</p>
                    )}
                </div>

                {/* Prénom et Nom */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label htmlFor="firstName" className="block text-sm font-medium text-white/90">
                            Prénom *
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <UserCheck className="w-5 h-5 text-white/50" />
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
                  frutiger-input w-full pl-10 pr-4 py-3
                  ${validationErrors.firstName ? 'border-red-500/50 focus:border-red-500' : ''}
                `}
                                placeholder="Votre prénom"
                            />
                        </div>
                        {validationErrors.firstName && (
                            <p className="text-sm text-red-400">{validationErrors.firstName}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="lastName" className="block text-sm font-medium text-white/90">
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
                frutiger-input w-full pl-4 pr-4 py-3
                ${validationErrors.lastName ? 'border-red-500/50 focus:border-red-500' : ''}
              `}
                            placeholder="Votre nom"
                        />
                        {validationErrors.lastName && (
                            <p className="text-sm text-red-400">{validationErrors.lastName}</p>
                        )}
                    </div>
                </div>

                {/* Mot de passe */}
                <div className="space-y-2">
                    <label htmlFor="password" className="block text-sm font-medium text-white/90">
                        Mot de passe *
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Lock className="w-5 h-5 text-white/50" />
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
                frutiger-input w-full pl-10 pr-12 py-3
                ${validationErrors.password ? 'border-red-500/50 focus:border-red-500' : ''}
              `}
                            placeholder="Choisissez un mot de passe sécurisé"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/50 hover:text-white"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    {/* Indicateur de force du mot de passe */}
                    {passwordStrength && (
                        <div className="space-y-2">
                            <div className="flex space-x-1">
                                {[1, 2, 3, 4, 5].map((level) => (
                                    <div
                                        key={level}
                                        className={`
                      h-2 flex-1 rounded
                      ${level <= passwordStrength.score
                                            ? passwordStrength.level === 'weak' ? 'bg-red-500'
                                                : passwordStrength.level === 'medium' ? 'bg-yellow-500'
                                                    : 'bg-green-500'
                                            : 'bg-white/20'
                                        }
                    `}
                                    />
                                ))}
                            </div>
                            <p className={`
                text-xs
                ${passwordStrength.level === 'weak' ? 'text-red-400'
                                : passwordStrength.level === 'medium' ? 'text-yellow-400'
                                    : 'text-green-400'
                            }
              `}>
                                Force : {passwordStrength.level === 'weak' ? 'Faible'
                                : passwordStrength.level === 'medium' ? 'Moyen'
                                    : 'Fort'}
                                {passwordStrength.feedback.length > 0 && (
                                    <span className="text-white/60">
                    {' '}- Manque : {passwordStrength.feedback.join(', ')}
                  </span>
                                )}
                            </p>
                        </div>
                    )}

                    {validationErrors.password && (
                        <p className="text-sm text-red-400">{validationErrors.password}</p>
                    )}
                </div>

                {/* Confirmation mot de passe */}
                <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/90">
                        Confirmer le mot de passe *
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Lock className="w-5 h-5 text-white/50" />
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
                frutiger-input w-full pl-10 pr-12 py-3
                ${validationErrors.confirmPassword ? 'border-red-500/50 focus:border-red-500' : ''}
              `}
                            placeholder="Confirmez votre mot de passe"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/50 hover:text-white"
                        >
                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    {validationErrors.confirmPassword && (
                        <p className="text-sm text-red-400">{validationErrors.confirmPassword}</p>
                    )}
                </div>

                {/* Conditions d'utilisation */}
                <div className="space-y-2">
                    <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                            type="checkbox"
                            name="acceptTerms"
                            checked={formData.acceptTerms}
                            onChange={handleInputChange}
                            className={`
                w-4 h-4 mt-1 text-blue-600 bg-transparent border-white/30 rounded 
                focus:ring-blue-500 focus:ring-2
                ${validationErrors.acceptTerms ? 'border-red-500' : ''}
              `}
                        />
                        <span className="text-sm text-white/80">
              J'accepte les{' '}
                            <Link to="/terms" className="text-blue-400 hover:text-blue-300 underline">
                conditions d'utilisation
              </Link>{' '}
                            et la{' '}
                            <Link to="/privacy" className="text-blue-400 hover:text-blue-300 underline">
                politique de confidentialité
              </Link>
            </span>
                    </label>
                    {validationErrors.acceptTerms && (
                        <p className="text-sm text-red-400">{validationErrors.acceptTerms}</p>
                    )}
                </div>

                {/* Bouton de soumission */}
                <button
                    type="submit"
                    disabled={!isFormValid || isLoading}
                    className={`
            w-full frutiger-btn frutiger-btn-primary py-3 text-base font-medium
            transition-all duration-300
            ${!isFormValid || isLoading ? 'opacity-50 cursor-not-allowed' : 'frutiger-btn-aurora'}
          `}
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center space-x-2">
                            <LoadingSpinner size="small" />
                            <span>Création du compte...</span>
                        </div>
                    ) : (
                        'Créer mon compte'
                    )}
                </button>

                {/* Lien de connexion */}
                {showLoginLink && (
                    <div className="text-center">
                        <p className="text-white/80">
                            Déjà un compte ?{' '}
                            <Link
                                to={ROUTES.LOGIN}
                                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                            >
                                Se connecter
                            </Link>
                        </p>
                    </div>
                )}
            </form>

            {/* Informations de sécurité */}
            <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg glass-panel">
                <div className="flex items-start space-x-2">
                    <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-white/70">
                        <p className="font-medium text-white/90 mb-1">Protection des données</p>
                        <p>
                            Vos informations personnelles sont chiffrées et protégées selon
                            les standards les plus stricts de sécurité.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterForm;