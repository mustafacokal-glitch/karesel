
import useProjectStore from '../stores/useProjectStore';

export default function AIQESDashboard() {
  const report = useProjectStore((s) => s.aiqesReport);
  const processingMode = useProjectStore((s) => s.processingMode);
  const gradeLevel = useProjectStore((s) => s.gradeLevel);
  const difficultyLevel = useProjectStore((s) => s.difficultyLevel);
  const gridDimensions = useProjectStore((s) => s.gridDimensions);
  const colorMap = useProjectStore((s) => s.colorMap);

  if (processingMode !== 'educational_ai' || !report) return null;

  const { aiqesScore, recognizability, shapePreservation, educationalComplexity, colorSimplicity, worksheetEffort, motivation, printability, originalSimilarity, educationalUsability } = report;

  // -- Eğitsel Veri Hesaplamaları --
  const colorsCount = Object.keys(colorMap || {}).length;
  const totalBlocks = (gridDimensions?.rows || 0) * (gridDimensions?.cols || 0);
  const effort = totalBlocks * colorsCount;
  
  let timeEstimate = '10-15 dakika';
  if (effort > 6000) timeEstimate = '45-60+ dakika';
  else if (effort > 4000) timeEstimate = '30-45 dakika';
  else if (effort > 2000) timeEstimate = '20-30 dakika';

  const diffLabels: Record<number | string, string> = { 
    1: 'Kolay', 2: 'Orta', 3: 'Zor', 4: 'Uzman',
    'easy': 'Kolay', 'balanced': 'Orta', 'advanced': 'Zor' 
  };
  const difficultyLabel = diffLabels[difficultyLevel] || 'Orta';
  const ageLabel = gradeLevel ? `${gradeLevel}. Sınıf` : 'Belirtilmedi';

  // -- Güçlü Yönler ve Gelişim Önerileri Ayrıştırması --
  const strengths: string[] = [];
  const suggestions: string[] = [];

  const analyzeMetric = (metric: any, _title: string) => {
    if (!metric) return;
    // 85 ve üzeri puanlar güçlü yön kabul edilir
    if (metric.score >= 85) {
      strengths.push(metric.explanation);
    }
    // Gelişim önerileri varsa ve tam puan değilse önerilere ekle
    if (metric.score < 100 && metric.recommendations && metric.recommendations.length > 0) {
      metric.recommendations.forEach((rec: string) => suggestions.push(rec));
    }
  };

  analyzeMetric(recognizability, 'Tanınabilirlik');
  analyzeMetric(shapePreservation, 'Şekil Bütünlüğü');
  analyzeMetric(educationalComplexity, 'Yaş Uygunluğu');
  analyzeMetric(colorSimplicity, 'Odaklanma Süresi');
  analyzeMetric(worksheetEffort, 'Motor Beceriler');
  analyzeMetric(motivation, 'Eğitsel Motivasyon');
  analyzeMetric(printability, 'Yazdırılabilirlik');
  analyzeMetric(originalSimilarity, 'Orijinal Benzerliği');
  analyzeMetric(educationalUsability, 'Eğitsel Kullanılabilirlik');

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-amber-500';
    return 'text-red-500';
  };

  const getBadgeClass = (score: number) => {
    if (score >= 90) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (score >= 70) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-6 mt-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 border-b border-gray-100 pb-5 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            🧑‍🏫 Eğitsel Değerlendirme Raporu
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Yapay zeka asistanınız tarafından etkinliğin pedagojik analizi.
          </p>
        </div>
        <div className="text-start md:text-end bg-gray-50 p-3 rounded-xl border border-gray-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Eğitsel Uygunluk</p>
          <div className="text-4xl font-black flex items-baseline gap-1">
            <span className={getScoreColor(aiqesScore)}>{aiqesScore}</span>
            <span className="text-gray-500 text-xl font-bold">/ 100</span>
          </div>
          <span className={`px-2 py-0.5 rounded-md text-xs font-bold border mt-1 inline-block ${getBadgeClass(aiqesScore)}`}>
            {aiqesScore >= 85 ? 'Sınıf İçi Uygulamaya Hazır' : aiqesScore >= 70 ? 'Gözden Geçirilebilir' : 'Önerilmez'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-3">
          <div className="text-2xl">🎓</div>
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase">Hedef Kitle</p>
            <p className="font-bold text-gray-800">{ageLabel}</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center gap-3">
          <div className="text-2xl">⏳</div>
          <div>
            <p className="text-xs font-bold text-amber-600 uppercase">Tahmini Süre</p>
            <p className="font-bold text-gray-800">{timeEstimate}</p>
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex items-center gap-3">
          <div className="text-2xl">🎯</div>
          <div>
            <p className="text-xs font-bold text-purple-600 uppercase">Etkinlik Seviyesi</p>
            <p className="font-bold text-gray-800">{difficultyLabel}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Güçlü Yönler */}
        <div>
          <h3 className="text-sm font-bold text-emerald-700 flex items-center gap-2 mb-3">
            <span className="bg-emerald-100 p-1 rounded">🌟</span> Etkinliğin Güçlü Yönleri
          </h3>
          <ul className="space-y-2">
            {strengths.length > 0 ? strengths.map((str, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">✔</span> 
                <span>{str}</span>
              </li>
            )) : (
              <li className="text-sm text-gray-500 italic">Belirgin bir güçlü yön bulunamadı.</li>
            )}
          </ul>
        </div>

        {/* Gelişim Önerileri */}
        <div>
          <h3 className="text-sm font-bold text-amber-700 flex items-center gap-2 mb-3">
            <span className="bg-amber-100 p-1 rounded">💡</span> Öğretmene Tavsiyeler
          </h3>
          <ul className="space-y-2">
            {suggestions.length > 0 ? suggestions.map((sug, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">▪</span> 
                <span>{sug}</span>
              </li>
            )) : (
              <li className="text-sm text-gray-500 italic flex items-center gap-2">
                <span className="text-emerald-500">✔</span> Etkinlik şu anki haliyle ideal seviyede.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
