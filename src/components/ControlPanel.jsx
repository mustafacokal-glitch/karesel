import useProjectStore from '../store/useProjectStore';
import { calculateGridDimensions } from '../utils/gridDimensions';

const levels = [
  { value: 1, stars: '⭐', label: 'Kolay', grid: '15x15' },
  { value: 2, stars: '⭐⭐', label: 'Orta', grid: '30x30' },
  { value: 3, stars: '⭐⭐⭐', label: 'Zor', grid: '40x40' },
  { value: 4, stars: '⭐⭐⭐⭐', label: 'Uzman', grid: '50x50' },
];

// jsPDF yalnızca 'portrait' ve 'landscape' destekler — 'square' kaldırıldı
const orientations = [
  { value: 'portrait', label: '⬛ Dikey' },
  { value: 'landscape', label: '⬜ Yatay' },
];

export default function ControlPanel() {
  const difficultyLevel = useProjectStore((s) => s.difficultyLevel);
  const setDifficultyLevel = useProjectStore((s) => s.setDifficultyLevel);
  const orientation = useProjectStore((s) => s.orientation);
  const setOrientation = useProjectStore((s) => s.setOrientation);
  const imageAspectRatio = useProjectStore((s) => s.imageAspectRatio);
  const pixelGrid = useProjectStore((s) => s.pixelGrid);
  const uploadedImage = useProjectStore((s) => s.uploadedImage);

  const handleDifficultyClick = (lvlValue) => {
    if (lvlValue === difficultyLevel) return;

    const hadGrid = !!pixelGrid;

    if (hadGrid) {
      // Sadece oluşturulan grid verilerini temizle, görseli koru
      useProjectStore.getState().resetGridOnly();
    }

    setDifficultyLevel(lvlValue);

    // Eğer daha önce grid oluşturulduysa otomatik olarak anında yeniden üret
    if (hadGrid && uploadedImage) {
      useProjectStore.getState().triggerRegenerate();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 space-y-6">
      {/* Zorluk Seviyesi */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          🎯 Zorluk Seviyesi
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {levels.map((lvl) => {
            // Dinamik grid boyutu gösterimi
            let displayGrid = lvl.grid;
            if (imageAspectRatio) {
              const { rows, cols } = calculateGridDimensions(lvl.value, imageAspectRatio);
              displayGrid = `${cols}x${rows}`;
            }

            return (
              <button
                key={lvl.value}
                onClick={() => handleDifficultyClick(lvl.value)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border-2 cursor-pointer hover:scale-[1.03] active:scale-[0.97] ${
                  difficultyLevel === lvl.value
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md scale-[1.02]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:bg-purple-50/70'
                }`}
              >
                <span className="block text-amber-400 text-xs mb-0.5 filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]">
                  {lvl.stars}
                </span>
                <span className="font-bold">{lvl.label}</span>
                <span className="block text-[10px] opacity-75 mt-0.5">{displayGrid}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Kağıt Yönü */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          📄 Kağıt Yönü
        </h3>
        <div className="flex gap-2">
          {orientations.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setOrientation(opt.value);
              }}
              className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all border-2 ${
                orientation === opt.value
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}