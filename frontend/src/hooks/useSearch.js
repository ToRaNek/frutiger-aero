// frontend/src/hooks/useSearch.js
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useVideoSearchWithDebounce } from './useVideo';
import { usePlaylistSearchWithDebounce } from './usePlaylist';

/**
 * Hook principal de recherche unifié pour vidéos et playlists
 * Gère les URL params, l'historique de recherche et la synchronisation d'état
 */
export const useSearch = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    // Hooks de recherche spécialisés
    const videoSearch = useVideoSearchWithDebounce(300);
    const playlistSearch = usePlaylistSearchWithDebounce(300);

    // État local de la recherche
    const [activeTab, setActiveTab] = useState('videos'); // 'videos' | 'playlists' | 'all'
    const [searchHistory, setSearchHistory] = useState([]);
    const [recentSearches, setRecentSearches] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Récupérer le terme de recherche depuis l'URL
    const searchTerm = searchParams.get('q') || '';
    const categoryFilter = searchParams.get('category') || '';
    const durationFilter = searchParams.get('duration') || '';
    const uploadDateFilter = searchParams.get('uploadDate') || '';
    const sortBy = searchParams.get('sortBy') || 'relevance';

    // Charger l'historique de recherche depuis le localStorage
    useEffect(() => {
        const saved = localStorage.getItem('frutiger_search_history');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setSearchHistory(parsed.history || []);
                setRecentSearches(parsed.recent || []);
            } catch (error) {
                console.warn('Erreur lors du chargement de l\'historique de recherche:', error);
            }
        }
    }, []);

    // Sauvegarder l'historique de recherche
    const saveSearchHistory = useCallback((term) => {
        if (!term || term.length < 2) return;

        setSearchHistory(prev => {
            const newHistory = [
                { term, timestamp: Date.now() },
                ...prev.filter(item => item.term !== term)
            ].slice(0, 100); // Garder max 100 recherches

            localStorage.setItem('frutiger_search_history', JSON.stringify({
                history: newHistory,
                recent: newHistory.slice(0, 10)
            }));

            return newHistory;
        });

        setRecentSearches(prev =>
            [term, ...prev.filter(t => t !== term)].slice(0, 10)
        );
    }, []);

    // Effectuer une recherche avec mise à jour de l'URL
    const performSearch = useCallback((term, options = {}) => {
        if (!term || term.trim().length < 2) {
            // Nettoyer l'URL si recherche vide
            if (searchTerm) {
                navigate(location.pathname, { replace: true });
            }
            return;
        }

        const trimmedTerm = term.trim();

        // Mettre à jour l'URL avec les nouveaux paramètres
        const newParams = new URLSearchParams();
        newParams.set('q', trimmedTerm);

        if (options.category) newParams.set('category', options.category);
        if (options.duration) newParams.set('duration', options.duration);
        if (options.uploadDate) newParams.set('uploadDate', options.uploadDate);
        if (options.sortBy && options.sortBy !== 'relevance') {
            newParams.set('sortBy', options.sortBy);
        }

        // Navigation vers la page de recherche avec les paramètres
        if (location.pathname !== '/search') {
            navigate(`/search?${newParams.toString()}`);
        } else {
            setSearchParams(newParams);
        }

        // Sauvegarder dans l'historique
        saveSearchHistory(trimmedTerm);

        // Masquer les suggestions
        setShowSuggestions(false);

        // Effectuer les recherches selon l'onglet actif
        const searchOptions = {
            category: options.category || categoryFilter,
            duration: options.duration || durationFilter,
            uploadDate: options.uploadDate || uploadDateFilter,
            sortBy: options.sortBy || sortBy
        };

        if (activeTab === 'videos' || activeTab === 'all') {
            videoSearch.searchVideos(trimmedTerm, searchOptions);
        }

        if (activeTab === 'playlists' || activeTab === 'all') {
            playlistSearch.searchPlaylists(trimmedTerm, searchOptions);
        }
    }, [
        searchTerm, location, navigate, setSearchParams, saveSearchHistory,
        activeTab, categoryFilter, durationFilter, uploadDateFilter, sortBy,
        videoSearch, playlistSearch
    ]);

    // Recherche automatique quand les paramètres URL changent
    useEffect(() => {
        if (searchTerm && location.pathname === '/search') {
            const searchOptions = {
                category: categoryFilter,
                duration: durationFilter,
                uploadDate: uploadDateFilter,
                sortBy
            };

            if (activeTab === 'videos' || activeTab === 'all') {
                videoSearch.searchVideos(searchTerm, searchOptions);
            }

            if (activeTab === 'playlists' || activeTab === 'all') {
                playlistSearch.searchPlaylists(searchTerm, searchOptions);
            }
        }
    }, [
        searchTerm, activeTab, categoryFilter, durationFilter,
        uploadDateFilter, sortBy, location.pathname, videoSearch, playlistSearch
    ]);

    // Générer des suggestions basées sur l'historique
    const generateSuggestions = useCallback((input) => {
        if (!input || input.length < 2) {
            setSuggestions([]);
            return;
        }

        const filtered = searchHistory
            .filter(item =>
                item.term.toLowerCase().includes(input.toLowerCase()) &&
                item.term.toLowerCase() !== input.toLowerCase()
            )
            .slice(0, 5)
            .map(item => item.term);

        // Ajouter des suggestions populaires (simulées)
        const popularSuggestions = [
            'tutoriel', 'gaming', 'musique', 'cuisine', 'voyage',
            'tech', 'sport', 'cinéma', 'nature', 'art'
        ].filter(term =>
            term.includes(input.toLowerCase()) &&
            !filtered.includes(term)
        ).slice(0, 3);

        setSuggestions([...filtered, ...popularSuggestions]);
    }, [searchHistory]);

    // Mettre à jour les filtres
    const updateFilters = useCallback((filters) => {
        performSearch(searchTerm, filters);
    }, [searchTerm, performSearch]);

    // Nettoyer la recherche
    const clearSearch = useCallback(() => {
        videoSearch.clearSearch();
        playlistSearch.clearSearch();
        navigate(location.pathname, { replace: true });
        setShowSuggestions(false);
    }, [videoSearch, playlistSearch, navigate, location]);

    // Nettoyer l'historique
    const clearSearchHistory = useCallback(() => {
        setSearchHistory([]);
        setRecentSearches([]);
        localStorage.removeItem('frutiger_search_history');
    }, []);

    // Supprimer un élément de l'historique
    const removeFromHistory = useCallback((termToRemove) => {
        setSearchHistory(prev => {
            const filtered = prev.filter(item => item.term !== termToRemove);
            localStorage.setItem('frutiger_search_history', JSON.stringify({
                history: filtered,
                recent: filtered.slice(0, 10).map(item => item.term)
            }));
            return filtered;
        });

        setRecentSearches(prev => prev.filter(term => term !== termToRemove));
    }, []);

    // État combiné des résultats
    const searchResults = useMemo(() => {
        const results = {
            videos: {
                items: videoSearch.searchResults,
                isLoading: videoSearch.isSearching,
                error: videoSearch.searchError
            },
            playlists: {
                items: playlistSearch.searchResults,
                isLoading: playlistSearch.isSearching,
                error: playlistSearch.searchError
            }
        };

        results.all = {
            items: [...results.videos.items, ...results.playlists.items],
            isLoading: results.videos.isLoading || results.playlists.isLoading,
            error: results.videos.error || results.playlists.error
        };

        return results;
    }, [videoSearch, playlistSearch]);

    // Vérifier si une recherche est en cours
    const isSearching = useMemo(() => {
        return videoSearch.isSearching || playlistSearch.isSearching;
    }, [videoSearch.isSearching, playlistSearch.isSearching]);

    // Vérifier si il y a des résultats
    const hasResults = useMemo(() => {
        const current = searchResults[activeTab];
        return current && current.items && current.items.length > 0;
    }, [searchResults, activeTab]);

    return {
        // État de la recherche
        searchTerm,
        activeTab,
        searchResults,
        isSearching,
        hasResults,

        // Filtres
        filters: {
            category: categoryFilter,
            duration: durationFilter,
            uploadDate: uploadDateFilter,
            sortBy
        },

        // Suggestions et historique
        suggestions,
        showSuggestions,
        searchHistory,
        recentSearches,

        // Actions
        performSearch,
        updateFilters,
        clearSearch,
        setActiveTab,
        generateSuggestions,
        setShowSuggestions,

        // Gestion de l'historique
        clearSearchHistory,
        removeFromHistory
    };
};

/**
 * Hook pour une barre de recherche avec auto-complétion
 */
export const useSearchBar = (options = {}) => {
    const {
        placeholder = 'Rechercher des vidéos...',
        showSuggestions: enableSuggestions = true,
        autoFocus = false,
        onSubmit = null
    } = options;

    const {
        searchTerm,
        performSearch,
        suggestions,
        showSuggestions,
        generateSuggestions,
        setShowSuggestions,
        recentSearches
    } = useSearch();

    const [inputValue, setInputValue] = useState(searchTerm);
    const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);

    // Synchroniser avec le terme de recherche global
    useEffect(() => {
        setInputValue(searchTerm);
    }, [searchTerm]);

    // Auto-focus si demandé
    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);

    // Gérer les changements d'input
    const handleInputChange = useCallback((event) => {
        const value = event.target.value;
        setInputValue(value);
        setSelectedSuggestion(-1);

        if (enableSuggestions) {
            generateSuggestions(value);
            setShowSuggestions(value.length > 0);
        }
    }, [enableSuggestions, generateSuggestions, setShowSuggestions]);

    // Gérer la soumission
    const handleSubmit = useCallback((event) => {
        event.preventDefault();
        const term = inputValue.trim();

        if (term) {
            performSearch(term);
            setShowSuggestions(false);
            inputRef.current?.blur();

            if (onSubmit) {
                onSubmit(term);
            }
        }
    }, [inputValue, performSearch, setShowSuggestions, onSubmit]);

    // Gérer les touches du clavier
    const handleKeyDown = useCallback((event) => {
        if (!showSuggestions || suggestions.length === 0) return;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                setSelectedSuggestion(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : 0
                );
                break;

            case 'ArrowUp':
                event.preventDefault();
                setSelectedSuggestion(prev =>
                    prev > 0 ? prev - 1 : suggestions.length - 1
                );
                break;

            case 'Enter':
                if (selectedSuggestion >= 0) {
                    event.preventDefault();
                    const suggestion = suggestions[selectedSuggestion];
                    setInputValue(suggestion);
                    performSearch(suggestion);
                    setShowSuggestions(false);
                }
                break;

            case 'Escape':
                setShowSuggestions(false);
                setSelectedSuggestion(-1);
                inputRef.current?.blur();
                break;

            default:
                break;
        }
    }, [showSuggestions, suggestions, selectedSuggestion, performSearch, setShowSuggestions]);

    // Sélectionner une suggestion
    const selectSuggestion = useCallback((suggestion) => {
        setInputValue(suggestion);
        performSearch(suggestion);
        setShowSuggestions(false);
        setSelectedSuggestion(-1);
    }, [performSearch, setShowSuggestions]);

    // Masquer les suggestions quand on clique ailleurs
    const handleBlur = useCallback((event) => {
        // Délai pour permettre les clics sur les suggestions
        setTimeout(() => {
            if (!suggestionsRef.current?.contains(event.relatedTarget)) {
                setShowSuggestions(false);
                setSelectedSuggestion(-1);
            }
        }, 150);
    }, [setShowSuggestions]);

    // Afficher les suggestions au focus
    const handleFocus = useCallback(() => {
        if (enableSuggestions && inputValue.length > 0) {
            generateSuggestions(inputValue);
            setShowSuggestions(true);
        }
    }, [enableSuggestions, inputValue, generateSuggestions, setShowSuggestions]);

    return {
        // Props pour l'input
        inputProps: {
            ref: inputRef,
            value: inputValue,
            onChange: handleInputChange,
            onKeyDown: handleKeyDown,
            onBlur: handleBlur,
            onFocus: handleFocus,
            placeholder,
            autoComplete: 'off'
        },

        // Props pour le formulaire
        formProps: {
            onSubmit: handleSubmit
        },

        // Props pour les suggestions
        suggestionsProps: {
            ref: suggestionsRef,
            suggestions,
            showSuggestions: enableSuggestions && showSuggestions,
            selectedSuggestion,
            onSelectSuggestion: selectSuggestion,
            recentSearches
        },

        // État
        hasInput: inputValue.length > 0,
        hasSuggestions: suggestions.length > 0
    };
};

/**
 * Hook pour les filtres de recherche avancés
 */
export const useSearchFilters = () => {
    const { filters, updateFilters } = useSearch();

    const [localFilters, setLocalFilters] = useState(filters);

    // Synchroniser avec les filtres globaux
    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);

    // Appliquer les filtres
    const applyFilters = useCallback(() => {
        updateFilters(localFilters);
    }, [localFilters, updateFilters]);

    // Réinitialiser les filtres
    const resetFilters = useCallback(() => {
        const defaultFilters = {
            category: '',
            duration: '',
            uploadDate: '',
            sortBy: 'relevance'
        };
        setLocalFilters(defaultFilters);
        updateFilters(defaultFilters);
    }, [updateFilters]);

    // Mettre à jour un filtre spécifique
    const updateFilter = useCallback((key, value) => {
        setLocalFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    return {
        filters: localFilters,
        updateFilter,
        applyFilters,
        resetFilters,
        hasActiveFilters: Object.values(localFilters).some(value => value && value !== 'relevance')
    };
};

/**
 * Hook pour les suggestions de recherche populaires
 */
export const usePopularSearches = () => {
    const [popularSearches, setPopularSearches] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Simuler le chargement des recherches populaires
    useEffect(() => {
        setIsLoading(true);

        // En production, ceci viendrait d'une API
        setTimeout(() => {
            setPopularSearches([
                'tutoriel react',
                'gaming highlights',
                'recettes cuisine',
                'voyage japon',
                'tech review 2024',
                'workout fitness',
                'DIY créatif',
                'musique relaxante'
            ]);
            setIsLoading(false);
        }, 500);
    }, []);

    return {
        popularSearches,
        isLoading
    };
};

export default useSearch;