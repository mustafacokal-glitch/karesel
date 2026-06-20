import { Component } from 'react';
import Header from './components/Header';
import UploadZone from './components/UploadZone';
import ControlPanel from './components/ControlPanel';
import Workspace from './components/Workspace';
import ColorLegend from './components/ColorLegend';
import ActionButtons from './components/ActionButtons';
import useProjectStore from './stores/useProjectStore';

// Error Boundary: herhangi bir bileşen hatası tüm uygulamayı çökertmesin
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: error.message };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Yakalanan hata:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-red-600 font-semibold">⚠️ Bir hata oluştu:</p>
          <p className="text-red-500 text-sm mt-1">{this.state.errorMsg}</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, errorMsg: '' });
              window.location.reload();
            }}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700"
          >
            Sayfayı Yenile
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoadingOverlay() {
  const isProcessing = useProjectStore((s) => s.isProcessing);
  const downloadProgressText = useProjectStore((s) => s.downloadProgressText);

  if (!isProcessing) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-sm mx-4">
        <div className="w-14 h-14 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        <p className="text-lg font-semibold text-gray-700 text-center">
          {downloadProgressText || "🤖 Görsel İşleniyor, Lütfen Bekleyin..."}
        </p>
        <p className="text-sm text-gray-400 text-center">
          {downloadProgressText ? "Bu işlem yalnızca ilk kullanımda bir kereliğine gerçekleştirilir." : "Arka plan temizleniyor, pikseller düzenleniyor ve renkler eşleştiriliyor."}
        </p>
      </div>
    </div>
  );
}

function ErrorBanner() {
  const error = useProjectStore((s) => s.error);
  const setError = useProjectStore((s) => s.setError);

  if (!error) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
      <div className="bg-red-600 text-white rounded-2xl shadow-2xl px-5 py-4 flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">⚠️</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Bir hata oluştu</p>
          <p className="text-sm opacity-90 mt-0.5 break-words">{error}</p>
        </div>
        <button
          onClick={() => setError(null)}
          className="flex-shrink-0 text-white/80 hover:text-white text-xl leading-none ml-2"
          aria-label="Kapat"
        >
          ×
        </button>
      </div>
    </div>
  );
}


export default function App() {
  return (
    <ErrorBoundary>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          {/* Header - tam genişlik */}
          <div className="mb-6">
            <Header />
          </div>

          {/* Asimetrik Layout: Sol panel (dar) + Sağ panel (geniş) */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sol Panel: Upload + Kontroller + Renk Tablosu */}
            <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0 space-y-6">
              <ErrorBoundary>
                <UploadZone />
              </ErrorBoundary>
              <ErrorBoundary>
                <ControlPanel />
              </ErrorBoundary>
              <ErrorBoundary>
                <ColorLegend />
              </ErrorBoundary>
            </aside>

            {/* Sağ Panel: Çalışma Alanı + Aksiyon Butonları */}
            <main className="flex-1 min-w-0 space-y-6">
              <ErrorBoundary>
                <Workspace />
              </ErrorBoundary>
              <div className="flex justify-center pt-2 pb-6">
                <ErrorBoundary>
                  <ActionButtons />
                </ErrorBoundary>
              </div>
            </main>
          </div>
        </div>

        {/* Yükleme Overlay */}
        <LoadingOverlay />

        {/* Hata Bildirimi */}
        <ErrorBanner />
      </div>
    </ErrorBoundary>
  );
}