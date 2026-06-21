import useProjectStore from '../stores/useProjectStore';
import { calculateGridDimensions } from '../utils/gridDimensions';
import { estimateCellSizeMM, MIN_CELL_SIZE_MM } from '../utils/printLayout';
import { useTranslation } from 'react-i18next';

const miniLevel = { value: 0, label: 'miniLevel', sublabel: 'miniLevelSub', grid: '9x9', icon: '🌱' };

const levels = [
  { value: 1, stars: '⭐', label: 'easy', grid: '15x15' },
  { value: 2, stars: '⭐⭐', label: 'medium', grid: '30x30' },
  { value: 3, stars: '⭐⭐⭐', label: 'hard', grid: '40x40' },
  { value: 4, stars: '⭐⭐⭐⭐', label: 'expert', grid: '50x50' },
];

// jsPDF yalnızca 'portrait' ve 'landscape' destekler — 'square' kaldırıldı
const orientations = [
  { value: 'portrait', label: 'portrait' },
  { value: 'landscape', label: 'landscape' },
];

const GRADE_RECOMMENDATIONS = {
  1: [0, 1],       // 1. Sınıf: Mini, Kolay
  2: [0, 1, 2],    // 2. Sınıf: Mini, Kolay, Orta
  3: [1, 2, 3],    // 3. Sınıf: Kolay, Orta, Zor
  4: [2, 3, 4],    // 4. Sınıf: Orta, Zor, Uzman
};
const grades = [1, 2, 3, 4];

export default function ControlPanel() {
  const { t } = useTranslation();
  const difficultyLevel = useProjectStore((s) => s.difficultyLevel);
  const setDifficultyLevel = useProjectStore((s) => s.setDifficultyLevel);
  const gradeLevel = useProjectStore((s) => s.gradeLevel);
  const orientation = useProjectStore((s) => s.orientation);
  const setOrientation = useProjectStore((s) => s.setOrientation);
  const imageAspectRatio = useProjectStore((s) => s.imageAspectRatio);
  const pixelGrid = useProjectStore((s) => s.pixelGrid);
  const uploadedImage = useProjectStore((s) => s.uploadedImage);
  const processingMode = useProjectStore((s) => s.processingMode);
  const setProcessingMode = useProjectStore((s) => s.setProcessingMode);
  const colorTolerance = useProjectStore((s) => s.colorTolerance);
  const setColorTolerance = useProjectStore((s) => s.setColorTolerance);
  const offsetX = useProjectStore((s) => s.offsetX);
  const setOffsetX = useProjectStore((s) => s.setOffsetX);
  const offsetY = useProjectStore((s) => s.offsetY);
  const setOffsetY = useProjectStore((s) => s.setOffsetY);

  const applyDifficultyChange = (lvlValue: number) => {
    const hadGrid = !!pixelGrid;
    if (hadGrid) {
      useProjectStore.getState().resetGridOnly();
    }
    setDifficultyLevel(lvlValue);
    if (hadGrid && uploadedImage) {
      useProjectStore.getState().triggerRegenerate();
    }
  };

  const handleDifficultyClick = (lvlValue: number) => {
    if (lvlValue === difficultyLevel) return;
    applyDifficultyChange(lvlValue);
    useProjectStore.getState().setDifficultyManuallySet(true);
  };

  const handleGradeClick = (gradeValue: number) => {
    if (gradeValue === gradeLevel) return;
    useProjectStore.getState().setGradeLevel(gradeValue);
    const alreadyManual = useProjectStore.getState().difficultyManuallySet;
    if (!alreadyManual) {
      const recommended = (GRADE_RECOMMENDATIONS as Record<number, number[]>)[gradeValue];
      if (recommended && recommended.length > 0 && recommended[0] !== difficultyLevel) {
        applyDifficultyChange(recommended[0]);
      }
    }
  };

  const getRecommendationStyle = (lvlValue: number) => {
    if (!gradeLevel) return {};
    const isRecommended = (GRADE_RECOMMENDATIONS as Record<number, number[]>)[gradeLevel]?.includes(lvlValue);
    if (isRecommended === false) {
      return { opacity: 'opacity-50', title: t('controlPanel.notRecommended') };
    }
    return { isRecommended: true };
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 space-y-6">
      {/* Mod Seçici */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          {t('controlPanel.mode')}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setProcessingMode('classic')}
            className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all border-2 ${
              processingMode === 'classic'
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            {t('controlPanel.classicMode')}
          </button>
          <button
            onClick={() => setProcessingMode('educational_ai')}
            className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all border-2 ${
              processingMode === 'educational_ai'
                ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
            }`}
          >
            {t('controlPanel.aiMode')}
          </button>
        </div>
        {processingMode === 'educational_ai' && (
          <p className="text-xs text-purple-600 mt-2 font-medium">
            {t('controlPanel.aiHint')}
          </p>
        )}
      </div>

      {/* Sınıf Seviyesi */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          {t('controlPanel.grade')}
        </h3>
        <div className="flex gap-2" role="group" aria-label="{t('controlPanel.gradeSelect')}">
          {grades.map((grade) => (
            <button
              key={grade}
              onClick={() => handleGradeClick(grade)}
              aria-pressed={gradeLevel === grade}
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
          {t('controlPanel.difficulty')}
        </h3>

        {/* Mini Seviyesi */}
        <div className="mb-2">
          {(() => {
            const { rows, cols } = imageAspectRatio
              ? calculateGridDimensions(miniLevel.value, imageAspectRatio)
              : calculateGridDimensions(miniLevel.value, null);
            const displayGrid = `${cols}x${rows}`;

            const recStyle = getRecommendationStyle(miniLevel.value);
            const opacityClass = recStyle.opacity || '';
            const titleAttr = recStyle.title || '';
            const isRecBadge = recStyle.isRecommended;

            const cellMM = estimateCellSizeMM(rows, cols, orientation);
            let badge = null;
            if (cellMM < MIN_CELL_SIZE_MM) {
              badge = { label: t('controlPanel.smallCellBadge'), tone: 'error',
                title: `Hücreler ${cellMM.toFixed(1)}mm olacak. Çok küçük olabilir.` };
            } else if (cellMM < MIN_CELL_SIZE_MM + 1.5) {
              badge = { label: t('controlPanel.narrowBadge'), tone: 'warning',
                title: `Hücreler ${cellMM.toFixed(1)}mm olacak, biraz dar.` };
            }

            return (
              <div className="relative">
                {isRecBadge && (
                  <span className="absolute -top-2 -end-2 bg-green-100 text-green-800 text-[9px] font-bold px-2 py-0.5 rounded-full border border-green-200 shadow-sm z-10">
                    {t('controlPanel.recommended')}
                  </span>
                )}
                <button
                  title={titleAttr}
                  onClick={() => handleDifficultyClick(miniLevel.value)}
                  aria-pressed={difficultyLevel === miniLevel.value}
                  aria-label={`${t('controlPanel.' + miniLevel.label)} Seviyesi, ${t('controlPanel.' + miniLevel.sublabel)}`}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${opacityClass} ${
                    difficultyLevel === miniLevel.value
                      ? 'bg-amber-500 text-white border-amber-500 shadow-md scale-[1.01]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300 hover:bg-amber-50/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{miniLevel.icon}</span>
                    <div className="text-start">
                      <span className="block font-bold">{t('controlPanel.' + miniLevel.label)}</span>
                      <span className="block text-[10px] opacity-80">{t('controlPanel.' + miniLevel.sublabel)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-bold opacity-75">{displayGrid}</span>
                    {badge && (
                      <span
                        title={badge.title}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          badge.tone === 'error' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
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
            const { rows, cols } = imageAspectRatio
              ? calculateGridDimensions(lvl.value, imageAspectRatio)
              : calculateGridDimensions(lvl.value, null);
            const displayGrid = `${cols}x${rows}`;

            const recStyle = getRecommendationStyle(lvl.value);
            const opacityClass = recStyle.opacity || '';
            const titleAttr = recStyle.title || '';
            const isRecBadge = recStyle.isRecommended;

            const cellMM = estimateCellSizeMM(rows, cols, orientation);
            let badge = null;
            if (cellMM < MIN_CELL_SIZE_MM) {
              badge = { label: t('controlPanel.smallCellBadge'), tone: 'error',
                title: `Hücreler ${cellMM.toFixed(1)}mm olacak. Çok küçük olabilir.` };
            } else if (cellMM < MIN_CELL_SIZE_MM + 1.5) {
              badge = { label: t('controlPanel.narrowBadge'), tone: 'warning',
                title: `Hücreler ${cellMM.toFixed(1)}mm olacak, biraz dar.` };
            }

            return (
              <div key={lvl.value} className="relative">
                {isRecBadge && (
                  <span className="absolute -top-2 -end-2 bg-green-100 text-green-800 text-[9px] font-bold px-2 py-0.5 rounded-full border border-green-200 shadow-sm z-10">
                    {t('controlPanel.recommended')}
                  </span>
                )}
                <button
                  title={titleAttr}
                  onClick={() => handleDifficultyClick(lvl.value)}
                  aria-pressed={difficultyLevel === lvl.value}
                  aria-label={`${t('controlPanel.' + lvl.label)} Seviyesi, ${displayGrid} Boyut`}
                  className={`w-full flex flex-col items-center justify-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border-2 cursor-pointer hover:scale-[1.03] active:scale-[0.97] ${opacityClass} ${
                    difficultyLevel === lvl.value
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md scale-[1.02]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:bg-purple-50/70'
                  }`}
                >
                  <span className="block text-amber-400 text-xs mb-0.5 filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]">
                    {lvl.stars}
                  </span>
                  <span className="font-bold">{t('controlPanel.' + lvl.label)}</span>
                  <span className="block text-[10px] opacity-75 mt-0.5">{displayGrid}</span>
                  {badge && (
                    <span
                      title={badge.title}
                      className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold leading-none ${
                        badge.tone === 'error' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
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

      {/* Renk Hassasiyeti (Sadece Zor ve Uzman modlarında) */}
      {(difficultyLevel === 3 || difficultyLevel === 4) && (
        <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-gray-700">
              {t('controlPanel.colorTolerance', 'Renk Hassasiyeti')}
            </h3>
            <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
              {colorTolerance}%
            </span>
          </div>
          <p className="text-[10px] text-gray-500 mb-3">
            {t('controlPanel.colorToleranceHint', 'Düşük değer daha katı renk ayrımı yapar. Yüksek değer benzer renkleri daha agresif birleştirir.')}
          </p>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={colorTolerance}
            onChange={(e) => {
              setColorTolerance(Number(e.target.value));
              if (uploadedImage) {
                useProjectStore.getState().triggerRegenerate();
              }
            }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
        </div>
      )}

      {/* Grid Kaydırma (Offset) */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          {t('controlPanel.gridOffset', 'Grid Kaydırma (İnce Ayar)')}
        </h3>
        <p className="text-[10px] text-gray-500 mb-4">
          {t('controlPanel.gridOffsetHint', 'Küçük detayları (göz, ağız vb.) yakalamak için ızgarayı hafifçe kaydırın.')}
        </p>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-gray-600">X Eksenini Kaydır</label>
              <span className="text-xs font-bold text-gray-700 bg-gray-200 px-2 py-0.5 rounded-full">{offsetX}</span>
            </div>
            <input
              type="range"
              min="-5"
              max="5"
              step="1"
              value={offsetX}
              onChange={(e) => {
                setOffsetX(Number(e.target.value));
                if (uploadedImage) {
                  useProjectStore.getState().triggerRegenerate();
                }
              }}
              className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-gray-600">Y Eksenini Kaydır</label>
              <span className="text-xs font-bold text-gray-700 bg-gray-200 px-2 py-0.5 rounded-full">{offsetY}</span>
            </div>
            <input
              type="range"
              min="-5"
              max="5"
              step="1"
              value={offsetY}
              onChange={(e) => {
                setOffsetY(Number(e.target.value));
                if (uploadedImage) {
                  useProjectStore.getState().triggerRegenerate();
                }
              }}
              className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        </div>
      </div>

      {/* Kağıt Yönü */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          {t('controlPanel.orientation')}
        </h3>
        <div className="flex gap-2" role="group" aria-label="{t('controlPanel.orientationSelect')}">
          {orientations.map((opt) => (
            <button
              key={opt.value}
              aria-pressed={orientation === opt.value}
              onClick={() => {
                setOrientation(opt.value as 'portrait' | 'landscape');
              }}
              className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all border-2 ${
                orientation === opt.value
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
              }`}
            >
              {t('controlPanel.' + opt.label)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}