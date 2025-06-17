// frontend/src/components/auth/LoginForm.js

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import {
    ROUTES,
    DEBOUNCE_DELAYS,
    API_ENDPOINTS
} from '../../utils/constants';
import { isValidEmail, debounce } from '../../utils/helpers';
import { formatErrorMessage } from '../../utils/formatters';

/**
 * Formulaire de connexion avec design Frutiger Aero
 * Corrigé selon la documentation backend fournie
 */

const LoginForm = ({
                       onSuccess,
                       redirectTo,
                       showRegisterLink = true,
                       embedded = false
                   }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // État du formulaire selon User.authenticate(login, password)
    const [formData, setFormData] = useState({
        login: '', // email ou username selon la doc backend
        password: '',
        rememberMe: false
    });

    const [validationErrors, setValidationErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // États pour la vérification email selon la doc
    const [canResendEmail, setCanResendEmail] = useState(true);
    const [resendCountdown, setResendCountdown] = useState(0);
    const [emailSent, setEmailSent] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

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
    }, [shouldResendEmail, emailToResend]);

    // Validation du formulaire selon les règles backend
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
            setError(null);
        }
    };

    // Soumission du formulaire selon User.authenticate de la doc backend
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Appel API selon la documentation backend
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${API_ENDPOINTS.AUTH.LOGIN}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    login: formData.login,
                    password: formData.password
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Succès - selon generateTokenPair de la doc
                const { accessToken, refreshToken, user } = data;

                // Stockage des tokens selon la doc JWT
                localStorage.setItem('frutiger_access_token', accessToken);
                localStorage.setItem('frutiger_refresh_token', refreshToken);
                localStorage.setItem('frutiger_user', JSON.stringify(user));

                // Callback de succès
                onSuccess?.(user);

                // Redirection
                if (!embedded) {
                    navigate(from, { replace: true });
                }
            } else {
                // Gestion des erreurs selon la doc backend
                if (data.code === 'EMAIL_NOT_VERIFIED') {
                    setValidationErrors({
                        general: 'Email non vérifié. Vérifiez vos emails ou renvoyez un nouveau lien.'
                    });
                } else if (data.code === 'ACCOUNT_LOCKED') {
                    setValidationErrors({
                        general: 'Compte temporairement verrouillé pour sécurité. Réessayez plus tard.'
                    });
                } else if (data.code === 'INVALID_CREDENTIALS') {
                    setValidationErrors({
                        general: 'Email/nom d\'utilisateur ou mot de passe incorrect.'
                    });
                } else {
                    setError(data.message || 'Erreur de connexion');
                }
            }
        } catch (err) {
            setError('Erreur de connexion au serveur');
        } finally {
            setIsLoading(false);
        }
    };

    // Renvoi d'email de vérification selon la doc backend
    const resendVerificationEmail = async (email) => {
        if (!isValidEmail(email || formData.login)) {
            setValidationErrors({
                login: 'Veuillez entrer un email valide pour renvoyer la vérification'
            });
            return;
        }

        setIsVerifying(true);
        setCanResendEmail(false);

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${API_ENDPOINTS.AUTH.RESEND_VERIFICATION}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email || formData.login
                }),
            });

            if (response.ok) {
                setEmailSent(true);

                // Countdown de 60 secondes avant de pouvoir renvoyer
                let countdown = 60;
                setResendCountdown(countdown);

                const timer = setInterval(() => {
                    countdown--;
                    setResendCountdown(countdown);

                    if (countdown <= 0) {
                        clearInterval(timer);
                        setCanResendEmail(true);
                    }
                }, 1000);
            } else {
                const data = await response.json();
                setValidationErrors({
                    general: data.message || 'Erreur lors du renvoi de l\'email'
                });
            }
        } catch (err) {
            setValidationErrors({
                general: 'Erreur de connexion au serveur'
            });
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className={`w-full ${embedded ? '' : 'max-w-md mx-auto'}`}>
            {/* Header */}
            {!embedded && (
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-white frutiger-title mb-2 frutiger-glow-text">
                        Connexion
                    </h1>
                    <p className="text-white/80 frutiger-subtitle">
                        Connectez-vous à votre compte Frutiger
                    </p>
                </div>
            )}

            {/* Message d'email envoyé */}
            {emailSent && (
                <div className="mb-6 p-4 frutiger-notification-success frutiger-glass-success">
                    <div className="flex items-center space-x-2 text-emerald-800">
                        <CheckCircle size={20} className="frutiger-icon-glow" />
                        <p className="text-sm frutiger-text-shadow">
                            Email de vérification envoyé ! Vérifiez votre boîte mail.
                        </p>
                    </div>
                </div>
            )}

            {/* Formulaire avec glassmorphism Frutiger Aero */}
            <form onSubmit={handleSubmit} className="space-y-6 frutiger-form">
                {/* Erreur générale */}
                {(error || validationErrors.general) && (
                    <div className="p-4 frutiger-notification-error frutiger-glass-error">
                        <div className="flex items-start space-x-2 text-red-800">
                            <AlertCircle size={20} className="flex-shrink-0 mt-0.5 frutiger-icon-pulse" />
                            <div className="flex-1">
                                <p className="text-sm frutiger-text-shadow">
                                    {validationErrors.general || formatErrorMessage(error)}
                                </p>

                                {/* Bouton de renvoi d'email si nécessaire */}
                                {(error?.code === 'EMAIL_NOT_VERIFIED' || validationErrors.general?.includes('non vérifié')) && (
                                    <button
                                        type="button"
                                        onClick={() => resendVerificationEmail()}
                                        disabled={!canResendEmail || isVerifying}
                                        className="mt-2 text-xs frutiger-link-error hover:frutiger-link-error-hover underline disabled:opacity-50 frutiger-transition"
                                    >
                                        {isVerifying ? 'Envoi...' :
                                            !canResendEmail ? `Renvoyer dans ${resendCountdown}s` :
                                                'Renvoyer l\'email de vérification'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Champ Email/Username avec effet Frutiger */}
                <div className="space-y-2 frutiger-field-group">
                    <label htmlFor="login" className="block text-sm font-medium text-white/90 frutiger-label">
                        Email ou nom d'utilisateur
                    </label>
                    <div className="relative frutiger-input-container">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            {formData.login.includes('@') ? (
                                <Mail className="w-5 h-5 text-white/50 frutiger-icon-subtle" />
                            ) : (
                                <User className="w-5 h-5 text-white/50 frutiger-icon-subtle" />
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
                                frutiger-input frutiger-glass-input w-full pl-10 pr-4 py-3
                                ${validationErrors.login ? 'frutiger-input-error' : 'frutiger-input-normal'}
                            `}
                            placeholder="votre@email.com ou username"
                        />
                        <div className="frutiger-input-glow"></div>
                    </div>
                    {validationErrors.login && (
                        <p className="text-sm text-red-300 frutiger-error-text frutiger-slide-down">{validationErrors.login}</p>
                    )}
                </div>

                {/* Champ Mot de passe avec effet Frutiger */}
                <div className="space-y-2 frutiger-field-group">
                    <label htmlFor="password" className="block text-sm font-medium text-white/90 frutiger-label">
                        Mot de passe
                    </label>
                    <div className="relative frutiger-input-container">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Lock className="w-5 h-5 text-white/50 frutiger-icon-subtle" />
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
                                frutiger-input frutiger-glass-input w-full pl-10 pr-12 py-3
                                ${validationErrors.password ? 'frutiger-input-error' : 'frutiger-input-normal'}
                            `}
                            placeholder="Votre mot de passe"
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
                    {validationErrors.password && (
                        <p className="text-sm text-red-300 frutiger-error-text frutiger-slide-down">{validationErrors.password}</p>
                    )}
                </div>

                {/* Options avec style Frutiger */}
                <div className="flex items-center justify-between frutiger-form-options">
                    <label className="flex items-center space-x-2 cursor-pointer frutiger-checkbox-container">
                        <input
                            type="checkbox"
                            name="rememberMe"
                            checked={formData.rememberMe}
                            onChange={handleInputChange}
                            className="frutiger-checkbox"
                        />
                        <span className="text-sm text-white/80 frutiger-checkbox-label">Se souvenir de moi</span>
                    </label>

                    <Link
                        to="/forgot-password"
                        className="text-sm frutiger-link-primary frutiger-link-glow frutiger-transition"
                    >
                        Mot de passe oublié ?
                    </Link>
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
                            <span className="frutiger-loading-text">Connexion...</span>
                        </div>
                    ) : (
                        <span className="frutiger-btn-text">Se connecter</span>
                    )}
                    <div className="frutiger-btn-shine"></div>
                </button>

                {/* Lien d'inscription avec style Frutiger */}
                {showRegisterLink && (
                    <div className="text-center frutiger-form-footer">
                        <p className="text-white/80 frutiger-footer-text">
                            Pas encore de compte ?{' '}
                            <Link
                                to={ROUTES.REGISTER}
                                className="frutiger-link-secondary frutiger-link-pulse font-medium frutiger-transition"
                            >
                                Créer un compte
                            </Link>
                        </p>
                    </div>
                )}
            </form>

            {/* Divider Frutiger Aero */}
            <div className="mt-8 frutiger-divider-container">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full frutiger-divider-line"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 text-white/60 frutiger-divider-text">
                            Connexion sécurisée avec Frutiger
                        </span>
                    </div>
                </div>
            </div>

            {/* Informations de sécurité avec glassmorphism */}
            <div className="mt-6 p-4 frutiger-glass-info frutiger-info-panel">
                <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0">
                        <Lock className="w-5 h-5 text-emerald-400 frutiger-icon-security" />
                    </div>
                    <div className="text-sm text-white/70 frutiger-info-content">
                        <p className="font-medium text-white/90 mb-1 frutiger-info-title">Connexion sécurisée</p>
                        <p className="frutiger-info-description">
                            Vos données sont protégées par un chiffrement de niveau bancaire
                            et une authentification à deux facteurs.
                        </p>
                    </div>
                </div>
                <div className="frutiger-info-glow"></div>
            </div>
        </div>
    );
};

export default LoginForm;