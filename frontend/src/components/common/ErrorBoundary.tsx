import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CekGarasi Uncaught Error:', error, errorInfo);
  }

  public handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-5">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="font-display text-xl font-bold text-slate-900 mb-2">
              Terjadi Gangguan Tampilan
            </h1>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Sistem memulihkan koneksi halaman. Silakan muat ulang halaman untuk melanjutkan penjelajahan.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={this.handleReload}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Muat Ulang Halaman</span>
              </button>
              <a
                href="/"
                className="w-full inline-flex items-center justify-center rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Kembali ke Beranda
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
