// frontend/src/components/search/SearchBar.js

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock, TrendingUp, Filter } from 'lucide-react';
import { useSearchBar, usePopularSearches } from '../../hooks/useSearch';
import LoadingSpinner from '../common/LoadingSpinner';
import {
    ROUTES,
    STORAGE_KEYS
} from '../../utils/constants';
import { getLocalStorage, setLocalStorage } from '../../utils/helpers';
import { truncateText } from '../../utils/formatters';

/**
 * Barre de recherche avec auto-complétion et suggestions Frutiger Aero
 *
 * Props:
 * - placeholder: string - Texte placeholder
 * - showSuggestions: boolean - Afficher les suggestions
 * - autoFocus: boolean - Focus automatique
 * - onSubmit: function - Callback de soumission personnalisé
 * - size: string - Taille (sm, md, lg)
 * - variant: string - Variante (default, header, page)
 * - showFilters: boolean - Afficher le bouton filtres
 * - initialValue: string - Valeur initiale
 * - maxSuggestions: number - Nombre max de suggestions
 */

const SearchBar = ({
                       placeholder = "Rechercher des vidéos, playlists, utilisateurs...",
                       showSuggestions = true,
                       autoFocus = false,
                       onSubmit,
                       size = 'md',
                       variant = 'default',
                       showFilters = false,
                       initialValue = '',
                       maxSuggestions = 8
                   }) => {
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [searchHistory, setSearchHistory] = useState([]);

    // Hooks personnalisés avec gestion d'erreur
    const searchBarHook = useSearchBar({
        placeholder,
        showSuggestions,
        autoFocus,
        onSubmit: handleSearchSubmit,
        initialValue
    });

    const popularSearchesHook = usePopularSearches();

    // Extraire les données avec valeurs par défaut pour éviter les erreurs
    const {
        inputProps = {},
        formProps = {},
        hasInput = false,
        suggestions = [],
        isLoadingSuggestions = false
    } = searchBarHook || {};

    const {
        popularSearches = []
    } = popularSearchesHook || {};

    // Chargement de l'historique de recherche
    useEffect(() => {
        try {
            const history = getLocalStorage(STORAGE_KEYS.SEARCH_HISTORY, []);
            setSearchHistory(Array.isArray(history) ? history.slice(0, 5) : []);
        } catch (error) {
            console.warn('Erreur lors du chargement de l\'historique:', error);
            setSearchHistory([]);
        }
    }, []);

    // Focus automatique
    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);

    // Fermeture des suggestions au clic extérieur
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                inputRef.current &&
                !inputRef.current.contains(event.target) &&
                suggestionsRef.current &&
                !suggestionsRef.current.contains(event.target)
            ) {
                setIsOpen(false);
                setSelectedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Soumission de recherche
    function handleSearchSubmit(query) {
        if (!query || !query.trim()) return;

        // Ferme les suggestions
        setIsOpen(false);
        setSelectedIndex(-1);

        // Sauvegarde dans l'historique
        saveToHistory(query.trim());

        // Callback personnalisé ou navigation
        if (onSubmit) {
            onSubmit(query.trim());
        } else {
            navigate(`${ROUTES.SEARCH}?q=${encodeURIComponent(query.trim())}`);
        }
    }

    // Sauvegarde dans l'historique
    const saveToHistory = (query) => {
        try {
            const history = getLocalStorage(STORAGE_KEYS.SEARCH_HISTORY, []);
            const newHistory = [
                query,
                ...history.filter(item => item !== query)
            ].slice(0, 10); // Garde les 10 dernières

            setLocalStorage(STORAGE_KEYS.SEARCH_HISTORY, newHistory);
            setSearchHistory(newHistory.slice(0, 5));
        } catch (error) {
            console.warn('Erreur lors de la sauvegarde:', error);
        }
    };

    // Suppression d'un élément de l'historique
    const removeFromHistory = (query) => {
        try {
            const history = getLocalStorage(STORAGE_KEYS.SEARCH_HISTORY, []);
            const newHistory = history.filter(item => item !== query);

            setLocalStorage(STORAGE_KEYS.SEARCH_HISTORY, newHistory);
            setSearchHistory(newHistory.slice(0, 5));
        } catch (error) {
            console.warn('Erreur lors de la suppression:', error);
        }
    };

    // Gestion des touches clavier
    const handleKeyDown = (e) => {
        if (!isOpen) return;

        const allSuggestions = getAllSuggestions();

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < allSuggestions.length - 1 ? prev + 1 : prev
                );
                break;

            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
                break;

            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < allSuggestions.length) {
                    const selected = allSuggestions[selectedIndex];
                    handleSearchSubmit(selected.query || selected);
                } else if (formProps.onSubmit) {
                    formProps.onSubmit(e);
                }
                break;

            case 'Escape':
                setIsOpen(false);
                setSelectedIndex(-1);
                inputRef.current?.blur();
                break;
        }
    };

    // Combinaison de toutes les suggestions
    const getAllSuggestions = () => {
        const allSuggestions = [];

        try {
            // Historique de recherche
            if (searchHistory.length > 0 && !hasInput) {
                allSuggestions.push(
                    ...searchHistory.map(query => ({
                        type: 'history',
                        query,
                        icon: Clock
                    }))
                );
            }

            // Suggestions en temps réel
            if (Array.isArray(suggestions) && suggestions.length > 0 && hasInput) {
                allSuggestions.push(
                    ...suggestions.slice(0, maxSuggestions).map(suggestion => ({
                        type: 'suggestion',
                        query: suggestion.query || suggestion,
                        count: suggestion.count,
                        icon: Search
                    }))
                );
            }

            // Recherches populaires (si pas d'input)
            if (!hasInput && Array.isArray(popularSearches) && popularSearches.length > 0) {
                allSuggestions.push(
                    ...popularSearches.slice(0, 5).map(popular => ({
                        type: 'popular',
                        query: popular.query || popular,
                        count: popular.count,
                        icon: TrendingUp
                    }))
                );
            }
        } catch (error) {
            console.warn('Erreur lors de la génération des suggestions:', error);
        }

        return allSuggestions;
    };

    // Classes CSS selon la taille
    const sizeClasses = {
        sm: 'text-sm py-2 px-3',
        md: 'text-base py-3 px-4',
        lg: 'text-lg py-4 px-5'
    };

    // Classes CSS selon la variante
    const variantClasses = {
        default: 'frutiger-search-bar',
        header: 'frutiger-search-bar-header glass-subtle',
        page: 'frutiger-search-bar-page glass-medium'
    };

    const allSuggestions = getAllSuggestions();
    const showSuggestionsPanel = isOpen && showSuggestions && allSuggestions.length > 0;

    return (
        <div className="relative w-full">
            {/* Barre de recherche */}
            <form {...formProps} className="relative">
                <div className={`
          relative flex items-center
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          transition-all duration-300
          ${isOpen ? 'frutiger-aurora-border' : ''}
        `}>
                    {/* Icône de recherche */}
                    <Search className="w-5 h-5 text-white/60 mr-3 flex-shrink-0" />

                    {/* Input de recherche */}
                    <input
                        ref={inputRef}
                        {...inputProps}
                        onFocus={() => setIsOpen(true)}
                        onKeyDown={handleKeyDown}
                        className="
              flex-1 bg-transparent border-0 outline-none text-white
              placeholder-white/50 focus:placeholder-white/30
            "
                    />

                    {/* Bouton clear */}
                    {hasInput && (
                        <button
                            type="button"
                            onClick={() => {
                                if (inputProps.onChange) {
                                    inputProps.onChange({ target: { value: '' } });
                                }
                                inputRef.current?.focus();
                            }}
                            className="
                p-1 text-white/60 hover:text-white/90 rounded-full
                hover:bg-white/10 transition-all duration-200
              "
                        >
                            <X size={16} />
                        </button>
                    )}

                    {/* Bouton filtres */}
                    {showFilters && (
                        <button
                            type="button"
                            onClick={() => {
                                // Logique d'ouverture des filtres
                                console.log('Ouvrir les filtres');
                            }}
                            className="
                p-2 ml-2 text-white/60 hover:text-white/90 rounded-lg
                hover:bg-white/10 transition-all duration-200
              "
                            title="Filtres de recherche"
                        >
                            <Filter size={18} />
                        </button>
                    )}

                    {/* Loading */}
                    {isLoadingSuggestions && (
                        <div className="ml-2">
                            <LoadingSpinner size="small" />
                        </div>
                    )}
                </div>
            </form>

            {/* Panel de suggestions */}
            {showSuggestionsPanel && (
                <div
                    ref={suggestionsRef}
                    className="
            absolute top-full left-0 right-0 mt-2 z-50
            bg-black/90 backdrop-blur-md rounded-xl
            border border-white/20 shadow-2xl
            max-h-96 overflow-y-auto
            glass-panel glass-strong
          "
                >
                    {/* Titre des sections */}
                    {!hasInput && searchHistory.length > 0 && (
                        <div className="px-4 py-2 border-b border-white/10">
                            <h4 className="text-sm font-medium text-white/70 flex items-center">
                                <Clock size={16} className="mr-2" />
                                Recherches récentes
                            </h4>
                        </div>
                    )}

                    {!hasInput && popularSearches.length > 0 && searchHistory.length === 0 && (
                        <div className="px-4 py-2 border-b border-white/10">
                            <h4 className="text-sm font-medium text-white/70 flex items-center">
                                <TrendingUp size={16} className="mr-2" />
                                Recherches populaires
                            </h4>
                        </div>
                    )}

                    {/* Liste des suggestions */}
                    <div className="py-2">
                        {allSuggestions.map((suggestion, index) => {
                            const Icon = suggestion.icon;
                            const isSelected = index === selectedIndex;

                            return (
                                <div
                                    key={`${suggestion.type}-${suggestion.query}-${index}`}
                                    onClick={() => handleSearchSubmit(suggestion.query)}
                                    className={`
                    flex items-center px-4 py-3 cursor-pointer
                    transition-all duration-200
                    ${isSelected
                                        ? 'bg-white/10 frutiger-aurora-subtle'
                                        : 'hover:bg-white/5'
                                    }
                  `}
                                >
                                    <Icon
                                        size={16}
                                        className={`
                      mr-3 flex-shrink-0
                      ${suggestion.type === 'history' ? 'text-blue-400' :
                                            suggestion.type === 'popular' ? 'text-orange-400' :
                                                'text-white/60'
                                        }
                    `}
                                    />

                                    <div className="flex-1 min-w-0">
                                        <p className="text-white truncate">
                                            {truncateText(suggestion.query, 50)}
                                        </p>
                                        {suggestion.count && (
                                            <p className="text-xs text-white/50">
                                                {suggestion.count} résultats
                                            </p>
                                        )}
                                    </div>

                                    {/* Bouton supprimer pour l'historique */}
                                    {suggestion.type === 'history' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeFromHistory(suggestion.query);
                                            }}
                                            className="
                        p-1 ml-2 text-white/40 hover:text-white/70 rounded
                        hover:bg-white/10 transition-all duration-200
                      "
                                            title="Supprimer de l'historique"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Message si aucune suggestion */}
                    {allSuggestions.length === 0 && hasInput && !isLoadingSuggestions && (
                        <div className="px-4 py-6 text-center text-white/60">
                            <Search size={24} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Aucune suggestion trouvée</p>
                        </div>
                    )}

                    {/* Loading des suggestions */}
                    {isLoadingSuggestions && (
                        <div className="px-4 py-6 text-center">
                            <LoadingSpinner size="small" />
                            <p className="text-sm text-white/60 mt-2">Recherche...</p>
                        </div>
                    )}

                    {/* Footer avec raccourcis clavier */}
                    {allSuggestions.length > 0 && (
                        <div className="px-4 py-2 border-t border-white/10 text-xs text-white/40">
                            <div className="flex items-center justify-between">
                                <span>↑↓ naviguer • ↵ sélectionner</span>
                                <span>Échap fermer</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Overlay pour fermer */}
            {showSuggestionsPanel && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};

export default SearchBar;