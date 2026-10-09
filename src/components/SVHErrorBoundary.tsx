import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface SVHErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface SVHErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

/**
 * Resilient Error Boundary for SVH AI (Study Vault Hub) sections and widgets.
 * Prevents unexpected runtime or rendering errors (e.g. malformed formulas, transient state glitches)
 * from crashing the application on Web or Android APK WebViews.
 */
export class SVHErrorBoundary extends React.Component<
  SVHErrorBoundaryProps,
  SVHErrorBoundaryState
> {
  public state: SVHErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
  };

  public static getDerivedStateFromError(error: Error): SVHErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected rendering issue occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('SVHErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, errorMessage: null });
    this.props.onReset?.();
  };

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="my-4 p-5 rounded-xl bg-[#0f172a] border border-[#d4af37]/35 text-[#fbf9f4] shadow-lg space-y-3 max-w-full overflow-hidden">
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertTriangle className="w-5 h-5 text-[#d4af37] shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="font-display text-sm sm:text-base font-bold text-[#fbf9f4] break-words">
                {this.props.fallbackTitle || 'Section Temporarily Paused'}
              </h3>
              <p className="text-xs text-[#cbd5e1] leading-relaxed break-words">
                {this.state.errorMessage ||
                  'Your progress and data are safely preserved. Tap below to reload this view.'}
              </p>
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={this.handleReset}
              className="px-3.5 py-2 rounded-xl bg-[#d4af37] hover:brightness-110 text-[#080d1a] font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Restore View</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
