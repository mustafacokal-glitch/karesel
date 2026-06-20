import useProjectStore from '../store/useProjectStore';
import { calculateGridDimensions } from '../utils/gridDimensions';
import { estimateCellSizeMM, MIN_CELL_SIZE_MM, computeTilingPlan } from '../utils/printLayout';

const miniLevel = { value: 0, label: 'Mini', sublabel: '1. Sınıf İçin', grid: '9x9', icon: '🌱' };

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

const GRADE_RECOMMENDATIONS = {
  1: [0, 1],       // 1. Sınıf: Mini, Kolay
  2: [0, 1, 2],    // 2. Sınıf: Mini, Kolay, Orta
  3: [1, 2, 3],    // 3. Sınıf: Kolay, Orta, Zor
  4: [2, 3, 4],    // 4. Sınıf: Orta, Zor, Uzman
};
const grades = [1, 2, 3, 4];

export default function ControlPanel() {
  const difficultyLevel = useProjectStore((s) => s.difficultyLevel);
  const setDifficultyLevel = useProjectStore((s) => s.setDifficultyLevel);
  const gradeLevel = useProjectStore((s) => s.gradeLevel);
  const orientation = useProjectStore((s) => s.orientation);
  const setOrientation = useProjectStore((s) => s.setOrientation);
  const imageAspectRatio = useProjectStore((s) => s.imageAspectRatio);
  const pixelGrid = useProjectStore((s) => s.pixelGrid);
  const uploadedImage = useProjectStore((s) => s.uploadedImage);

  const applyDifficultyChange = (lvlValue) => {
    const hadGrid = !!pixelGrid;
    if (hadGrid) {
      useProjectStore.getState().resetGridOnly();
    }
    setDifficultyLevel(lvlValue);
    if (hadGrid && uploadedImage) {
      useProjectStore.getState().triggerRegenerate();
    }
  };

  const handleDifficultyClick = (lvlValue) => {
    if (lvlValue === difficultyLevel) return;
    applyDifficultyChange(lvlValue);
    useProjectStore.getState().setDifficultyManuallySet(true);
  };

  const handleGradeClick = (gradeValue) => {
    if (gradeValue === gradeLevel) return;
    useProjectStore.getState().setGradeLevel(gradeValue);
    const alreadyManual = useProjectStore.getState().difficultyManuallySet;
    if (!alreadyManual) {
      const recommended = GRADE_RECOMMENDATIONS[gradeValue];
      if (recommended && recommended.length > 0 && recommended[0] !== difficultyLevel) {
        applyDifficultyChange(recommended[0]);
      }
    }
  };

  const getRecommendationStyle = (lvlValue) => {
    if (!gradeLevel) return {};
    const isRecommended = GRADE_RECOMMENDATIONS[gradeLevel]?.includes(lvlValue);
    if (isRecommended === false) {
      return { opacity: 'opacity-50', title: 'Bu sınıf için önerilmez ama kullanılabilir' };
    }
    return { isRecommended: true };
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 space-y-6">
      {/* Sınıf Seviyesi */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          👦 Hangi Sınıfa Hazırlıyorsunuz?
        </h3>
        <div className="flex gap-2">
          {grades.map((grade) => (
            <button
              key={grade}
              onClick={() => handleGradeClick(grade)}
              className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all border-2 ${
                gradeLevel === grade
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              {grade}. Sınıf
            </button>
          ))}
        </div>
      </div>

      {/* Zorluk Seviyesi */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          🎯 Zorluk Seviyesi
        </h3>

        {/* Mini Seviyesi */}
        <div className="mb-2">
          {(() => {
            const { rows, cols } = imageAspectRatio
              ? calculateGridDimensions(miniLevel.value, imageAspectRatio)
              : calculateGridDimensions(miniLevel.value, null);
            displayGrid = `${cols}x${rows}`;

            const recStyle = getRecommendationStyle(miniLevel.value);
            const opacityClass = recStyle.opacity || '';
            const titleAttr = recStyle.title || '';
            const isRecBadge = recStyle.isRecommended;

            const cellMM = estimateCellSizeMM(rows, cols, orientation);
            let badge = null;
            if (cellMM < MIN_CELL_SIZE_MM) {
              const plan = computeTilingPlan(rows, cols, orientation);
              const totalTiles = plan.numTileRows * plan.numTileCols;
              badge = { label: `${totalTiles} sayfa`, tone: 'info',
                title: `Bu boyut otomatik olarak ${totalTiles} parçaya bölünüp ayrı sayfalarda basılacak.` };
            } else if (cellMM < MIN_CELL_SIZE_MM + 2) {
              badge = { label: 'Dar', tone: 'warning',
                title: `Hücreler yaklaşık ${cellMM.toFixed(1)}mm olacak, biraz dar ama tek sayfada basılabilir.` };
            }

            return (
              <div className="relative">
                {isRecBadge && (
                  <span className="absolute -top-2 -right-2 bg-green-100 text-green-800 text-[9px] font-bold px-2 py-0.5 rounded-full border border-green-200 shadow-sm z-10">
                    Önerilen
                  </span>
                )}
                <button
                  title={titleAttr}
                  onClick={() => handleDifficultyClick(miniLevel.value)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${opacityClass} ${
                    difficultyLevel === miniLevel.value
                      ? 'bg-amber-500 text-white border-amber-500 shadow-md scale-[1.01]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300 hover:bg-amber-50/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{miniLevel.icon}</span>
                    <div className="text-left">
                      <span className="block font-bold">{miniLevel.label}</span>
                      <span className="block text-[10px] opacity-80">{miniLevel.sublabel}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-bold opacity-75">{displayGrid}</span>
                    {badge && (
                      <span
                        title={badge.title}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          badge.tone === 'info' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {badge.label}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            );
          })()}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {levels.map((lvl) => {
            // Dinamik grid boyutu gösterimi
            let displayGrid = lvl.grid;
            const { rows, cols } = imageAspectRatio
              ? calculateGridDimensions(lvl.value, imageAspectRatio)
              : calculateGridDimensions(lvl.value, null);
            displayGrid = `${cols}x${rows}`;

            const recStyle = getRecommendationStyle(lvl.value);
            const opacityClass = recStyle.opacity || '';
            const titleAttr = recStyle.title || '';
            const isRecBadge = recStyle.isRecommended;

            const cellMM = estimateCellSizeMM(rows, cols, orientation);
            let badge = null;
            if (cellMM < MIN_CELL_SIZE_MM) {
              const plan = computeTilingPlan(rows, cols, orientation);
              const totalTiles = plan.numTileRows * plan.numTileCols;
              badge = { label: `${totalTiles} sayfa`, tone: 'info',
                title: `Bu boyut otomatik olarak ${totalTiles} parçaya bölünüp ayrı sayfalarda basılacak.` };
            } else if (cellMM < MIN_CELL_SIZE_MM + 2) {
              badge = { label: 'Dar', tone: 'warning',
                title: `Hücreler yaklaşık ${cellMM.toFixed(1)}mm olacak, biraz dar ama tek sayfada basılabilir.` };
            }

            return (
              <div key={lvl.value} className="relative">
                {isRecBadge && (
                  <span className="absolute -top-2 -right-2 bg-green-100 text-green-800 text-[9px] font-bold px-2 py-0.5 rounded-full border border-green-200 shadow-sm z-10">
                    Önerilen
                  </span>
                )}
                <button
                  title={titleAttr}
                  onClick={() => handleDifficultyClick(lvl.value)}
                  className={`w-full flex flex-col items-center justify-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border-2 cursor-pointer hover:scale-[1.03] active:scale-[0.97] ${opacityClass} ${
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
                  {badge && (
                    <span
                      title={badge.title}
                      className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold leading-none ${
                        badge.tone === 'info' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {badge.label}
                    </span>
                  )}
                </button>
              </div>
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