// frontend/src/components/auth/LoginForm.js

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthForm, useEmailVerification } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';
import {
    ROUTES,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    DEBOUNCE_DELAYS
} from '../../utils/constants';
import { isValidEmail, debounce } from '../../utils/helpers';
import { formatErrorMessage } from '../../utils/formatters';

/**
 * Formulaire de connexion avec design Frutiger Aero
 *
 * Props:
 * - onSuccess: function - Callback de succès de connexion
 * - redirectTo: string - URL de redirection après connexion
 * - showRegisterLink: boolean - Afficher le lien d'inscription
 * - embedded: boolean - Mode intégré (sans layout complet)
 */

const LoginForm = ({
                       onSuccess,
                       redirectTo,
                       showRegisterLink = true,
                       embedded = false
                   }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // État du formulaire
    const [formData, setFormData] = useState({
        login: '', // email ou username
        password: '',
        rememberMe: false
    });

    const [validationErrors, setValidationErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);

    // Hooks d'authentification
    const { submit, isLoading, error, clearError } = useAuthForm('login');
    const {
        verifyEmail,
        resendVerificationEmail,
        canResend,
        resendCountdown,
        emailSent,
        isVerifying
    } = useEmailVerification();

    // URL de redirection après connexion
    const from = location.state?.from || redirectTo || ROUTES.HOME;

    // Vérification email à renvoyer depuis l'URL
    const urlParams = new URLSearchParams(location.search);
    const shouldResendEmail = urlParams.get('resend') === 'true';
    const emailToResend = urlParams.get('email');

    // Effet pour validation en temps réel
    useEffect(() => {
        const debouncedValidation = debounce(() => {
            validateForm();
        }, DEBOUNCE_DELAYS.INPUT);

        debouncedValidation();

        return () => debouncedValidation.cancel?.();
    }, [formData]);

    // Effet pour le renvoi d'email depuis l'URL
    useEffect(() => {
        if (shouldResendEmail && emailToResend && isValidEmail(emailToResend)) {
            resendVerificationEmail(emailToResend);
        }
    }, [shouldResendEmail, emailToResend, resendVerificationEmail]);

    // Validation du formulaire
    const validateForm = () => {
        const errors = {};

        // Validation du login (email ou username)
        if (!formData.login.trim()) {
            errors.login = 'Email ou nom d\'utilisateur requis';
        } else if (formData.login.includes('@') && !isValidEmail(formData.login)) {
            errors.login = 'Format d\'email invalide';
        } else if (formData.login.length < 3) {
            errors.login = 'Minimum 3 caractères requis';
        }

        // Validation du mot de passe
        if (!formData.password) {
            errors.password = 'Mot de passe requis';
        } else if (formData.password.length < 6) {
            errors.password = 'Minimum 6 caractères requis';
        }

        setValidationErrors(errors);
        setIsFormValid(Object.keys(errors).length === 0);

        return Object.keys(errors).length === 0;
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
                // Succès de la connexion
                onSuccess?.(result.data);

                // Redirection
                if (!embedded) {
                    navigate(from, { replace: true });
                }
            } else {
                // Gestion des erreurs spécifiques
                if (result.error?.code === 'EMAIL_NOT_VERIFIED') {
                    // Email non vérifié - proposer de renvoyer
                    setValidationErrors({
                        general: 'Email non vérifié. Vérifiez vos emails ou renvoyez un nouveau lien.'
                    });
                } else if (result.error?.code === 'ACCOUNT_LOCKED') {
                    setValidationErrors({
                        general: 'Compte temporairement verrouillé pour sécurité. Réessayez plus tard.'
                    });
                } else if (result.error?.code === 'INVALID_CREDENTIALS') {
                    setValidationErrors({
                        general: 'Email/nom d\'utilisateur ou mot de passe incorrect.'
                    });
                }
            }
        } catch (err) {
            setValidationErrors({
                general: formatErrorMessage(err)
            });
        }
    };

    // Renvoi d'email de vérification
    const handleResendVerification = async () => {
        if (!isValidEmail(formData.login)) {
            setValidationErrors({
                login: 'Veuillez entrer un email valide pour renvoyer la vérification'
            });
            return;
        }

        try {
            await resendVerificationEmail(formData.login);
        } catch (err) {
            setValidationErrors({
                general: formatErrorMessage(err)
            });
        }
    };

    return (
        <div className={`w-full ${embedded ? '' : 'max-w-md mx-auto'}`}>
            {/* Header */}
            {!embedded && (
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-white frutiger-title mb-2">
                        Connexion
                    </h1>
                    <p className="text-white/80">
                        Connectez-vous à votre compte Frutiger
                    </p>
                </div>
            )}

            {/* Message d'email envoyé */}
            {emailSent && (
                <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg glass-panel">
                    <div className="flex items-center space-x-2 text-green-400">
                        <CheckCircle size={20} />
                        <p className="text-sm">
                            Email de vérification envoyé ! Vérifiez votre boîte mail.
                        </p>
                    </div>
                </div>
            )}

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Erreur générale */}
                {(error || validationErrors.general) && (
                    <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg glass-panel">
                        <div className="flex items-start space-x-2 text-red-400">
                            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm">
                                    {validationErrors.general || formatErrorMessage(error)}
                                </p>

                                {/* Bouton de renvoi d'email si nécessaire */}
                                {(error?.code === 'EMAIL_NOT_VERIFIED' || validationErrors.general?.includes('non vérifié')) && (
                                    <button
                                        type="button"
                                        onClick={handleResendVerification}
                                        disabled={!canResend || isVerifying}
                                        className="mt-2 text-xs text-red-300 hover:text-red-100 underline disabled:opacity-50"
                                    >
                                        {isVerifying ? 'Envoi...' :
                                            !canResend ? `Renvoyer dans ${resendCountdown}s` :
                                                'Renvoyer l\'email de vérification'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Champ Email/Username */}
                <div className="space-y-2">
                    <label htmlFor="login" className="block text-sm font-medium text-white/90">
                        Email ou nom d'utilisateur
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            {formData.login.includes('@') ? (
                                <Mail className="w-5 h-5 text-white/50" />
                            ) : (
                                <User className="w-5 h-5 text-white/50" />
                            )}
                        </div>
                        <input
                            id="login"
                            name="login"
                            type="text"
                            autoComplete="username"
                            required
                            value={formData.login}
                            onChange={handleInputChange}
                            className={`
                frutiger-input w-full pl-10 pr-4 py-3
                ${validationErrors.login ? 'border-red-500/50 focus:border-red-500' : ''}
              `}
                            placeholder="votre@email.com ou username"
                        />
                    </div>
                    {validationErrors.login && (
                        <p className="text-sm text-red-400">{validationErrors.login}</p>
                    )}
                </div>

                {/* Champ Mot de passe */}
                <div className="space-y-2">
                    <label htmlFor="password" className="block text-sm font-medium text-white/90">
                        Mot de passe
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Lock className="w-5 h-5 text-white/50" />
                        </div>
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            required
                            value={formData.password}
                            onChange={handleInputChange}
                            className={`
                frutiger-input w-full pl-10 pr-12 py-3
                ${validationErrors.password ? 'border-red-500/50 focus:border-red-500' : ''}
              `}
                            placeholder="Votre mot de passe"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/50 hover:text-white"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    {validationErrors.password && (
                        <p className="text-sm text-red-400">{validationErrors.password}</p>
                    )}
                </div>

                {/* Options */}
                <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            name="rememberMe"
                            checked={formData.rememberMe}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-blue-600 bg-transparent border-white/30 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <span className="text-sm text-white/80">Se souvenir de moi</span>
                    </label>

                    <Link
                        to="/forgot-password"
                        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        Mot de passe oublié ?
                    </Link>
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
                            <span>Connexion...</span>
                        </div>
                    ) : (
                        'Se connecter'
                    )}
                </button>

                {/* Lien d'inscription */}
                {showRegisterLink && (
                    <div className="text-center">
                        <p className="text-white/80">
                            Pas encore de compte ?{' '}
                            <Link
                                to={ROUTES.REGISTER}
                                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                            >
                                Créer un compte
                            </Link>
                        </p>
                    </div>
                )}
            </form>

            {/* Divider pour connexions sociales (futur) */}
            <div className="mt-8">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/20"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
            <span className="px-2 text-white/60 bg-transparent">
              Connexion sécurisée avec Frutiger
            </span>
                    </div>
                </div>
            </div>

            {/* Informations de sécurité */}
            <div className="mt-6 p-4 bg-white/5 rounded-lg glass-panel">
                <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0">
                        <Lock className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-sm text-white/70">
                        <p className="font-medium text-white/90 mb-1">Connexion sécurisée</p>
                        <p>
                            Vos données sont protégées par un chiffrement de niveau bancaire
                            et une authentification à deux facteurs.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;