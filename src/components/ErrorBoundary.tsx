import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Filter out harmless Supabase auth runtime errors
    if (error?.message?.includes('runtime error') || 
        error?.message?.includes('Unknown runtime error') ||
        error?.stack?.includes('@supabase/auth-js')) {
      console.log('Suppressed harmless Supabase auth error:', error.message);
      return { hasError: false }; // Don't show error boundary for these
    }
    
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Filter out harmless Supabase auth runtime errors
    if (error?.message?.includes('runtime error') || 
        error?.message?.includes('Unknown runtime error') ||
        error?.stack?.includes('@supabase/auth-js')) {
      console.log('Suppressed harmless Supabase auth error in componentDidCatch');
      return; // Don't log or set state for these errors
    }
    
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    // Reload the page to reset app state
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Oops! Something went wrong
            </h1>
            
            <p className="text-gray-600 mb-6">
              We encountered an unexpected error. This is usually temporary and can be fixed by refreshing the page.
            </p>
            
            <Button
              onClick={this.handleReset}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Page
            </Button>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error Details (Development)
                </summary>
                <div className="mt-2 p-4 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-48">
                  <p className="text-red-600 font-bold mb-2">
                    {this.state.error.toString()}
                  </p>
                  <pre className="text-gray-700 whitespace-pre-wrap">
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              </details>
            )}
            
            <p className="mt-6 text-xs text-gray-500">
              If this problem persists, please contact support at utmmandarinclub@gmail.com
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}