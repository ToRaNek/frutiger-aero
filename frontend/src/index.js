// frontend/src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';

import App from './App';

// Styles
import './styles/index.css';
import './styles/frutiger-aero.css';
import './styles/animations/aurora.css';
import './styles/animations/glass.css';
import './styles/animations/transitions.css';

// Configuration React Query
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: (failureCount, error) => {
                // Ne pas retry les erreurs 4xx
                if (error?.response?.status >= 400 && error?.response?.status < 500) {
                    return false;
                }
                return failureCount < 3;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
            refetchOnWindowFocus: false,
            refetchOnMount: true,
        },
        mutations: {
            retry: false,
        },
    },
});

// Configuration Toast
const toastOptions = {
    duration: 4000,
    position: 'top-right',
    style: {
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '16px',
        color: '#fff',
        fontSize: '14px',
        fontWeight: '500',
        padding: '12px 16px',
        boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)',
    },
    success: {
        style: {
            background: 'rgba(177, 255, 216, 0.2)',
            border: '1px solid rgba(177, 255, 216, 0.3)',
        },
        iconTheme: {
            primary: '#b1ffd8',
            secondary: '#fff',
        },
    },
    error: {
        style: {
            background: 'rgba(255, 107, 107, 0.2)',
            border: '1px solid rgba(255, 107, 107, 0.3)',
        },
        iconTheme: {
            primary: '#ff6b6b',
            secondary: '#fff',
        },
    },
    loading: {
        style: {
            background: 'rgba(100, 200, 220, 0.2)',
            border: '1px solid rgba(100, 200, 220, 0.3)',
        },
        iconTheme: {
            primary: '#64c8dc',
            secondary: '#fff',
        },
    },
};

// Gestionnaire d'erreurs global
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);

    // Ne pas afficher de toast pour les erreurs de développement
    if (process.env.NODE_ENV === 'development') {
        return;
    }

    // Afficher un message d'erreur générique pour l'utilisateur
    if (typeof event.reason === 'string') {
        console.error('Application error:', event.reason);
    } else if (event.reason?.message) {
        console.error('Application error:', event.reason.message);
    }
});

// Gestionnaire d'erreurs React
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);

    if (process.env.NODE_ENV === 'development') {
        return;
    }

    console.error('Une erreur inattendue s\'est produite');
});

// Détection des performances pour les Core Web Vitals
if (process.env.NODE_ENV === 'production') {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(console.log);
        getFID(console.log);
        getFCP(console.log);
        getLCP(console.log);
        getTTFB(console.log);
    });
}

// Service Worker pour le cache et les performances
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Composant d'erreur de fallback
function ErrorFallback({ error, resetErrorBoundary }) {
    return (
        <div className="error-fallback">
            <div className="error-container">
                <div className="glass-panel">
                    <h2>Oops ! Une erreur s'est produite</h2>
                    <p>Nous nous excusons pour la gêne occasionnée.</p>
                    <details>
                        <summary>Détails techniques</summary>
                        <pre>{error.message}</pre>
                    </details>
                    <div className="error-actions">
                        <button onClick={resetErrorBoundary} className="btn-primary">
                            Réessayer
                        </button>
                        <button onClick={() => window.location.reload()} className="btn-secondary">
                            Recharger la page
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Boundary d'erreur principal
class AppErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('App Error Boundary caught an error:', error, errorInfo);
    }

    resetErrorBoundary = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <ErrorFallback
                    error={this.state.error}
                    resetErrorBoundary={this.resetErrorBoundary}
                />
            );
        }

        return this.props.children;
    }
}

// Composant de loading global
function GlobalLoading() {
    return (
        <div className="global-loading">
            <div className="loading-container">
                <div className="frutiger-spinner">
                    <div className="spinner-aurora"></div>
                    <div className="spinner-glass"></div>
                </div>
                <p className="loading-text">Chargement de Frutiger Streaming...</p>
            </div>
        </div>
    );
}

// Composant racine avec tous les providers
function AppRoot() {
    return (
        <React.StrictMode>
            <AppErrorBoundary>
                <HelmetProvider>
                    <QueryClientProvider client={queryClient}>
                        <BrowserRouter>
                            <React.Suspense fallback={<GlobalLoading />}>
                                <App />
                            </React.Suspense>

                            {/* Toast notifications avec style Frutiger Aero */}
                            <Toaster toastOptions={toastOptions} />

                            {/* React Query DevTools en développement */}
                            {process.env.NODE_ENV === 'development' && (
                                <ReactQueryDevtools
                                    initialIsOpen={false}
                                    position="bottom-left"
                                />
                            )}
                        </BrowserRouter>
                    </QueryClientProvider>
                </HelmetProvider>
            </AppErrorBoundary>
        </React.StrictMode>
    );
}

// Rendu de l'application
const container = document.getElementById('root');
const root = createRoot(container);

root.render(<AppRoot />);

// Hot Module Replacement pour le développement
if (process.env.NODE_ENV === 'development' && module.hot) {
    module.hot.accept('./App', () => {
        const NextApp = require('./App').default;
        root.render(<AppRoot />);
    });
}

// Exposition des utilitaires globaux pour le debug en développement
if (process.env.NODE_ENV === 'development') {
    window.__FRUTIGER_DEBUG__ = {
        queryClient,
        clearCache: () => queryClient.clear(),
        invalidateQueries: (key) => queryClient.invalidateQueries(key),
        getQueryData: (key) => queryClient.getQueryData(key),
    };
}