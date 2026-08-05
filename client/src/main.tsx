import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[React ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', color: '#ffffff', backgroundColor: '#1a1a24', fontFamily: 'monospace', minHeight: '100vh', boxSizing: 'border-box' }}>
          <h2 style={{ color: '#ff4d4d', margin: '0 0 16px 0' }}>⚠️ Enterprise IRC Client Recovered from an Error</h2>
          <div style={{ background: '#0f0f15', padding: '16px', borderRadius: '4px', border: '1px solid #333344', marginBottom: '20px' }}>
            <code>{this.state.error?.toString() || 'Unknown Error'}</code>
          </div>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{ padding: '10px 20px', background: '#00e5ff', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🔄 Reset & Reload Client
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
