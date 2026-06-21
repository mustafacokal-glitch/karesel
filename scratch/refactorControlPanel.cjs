const fs = require('fs');

let c = fs.readFileSync('src/components/ControlPanel.tsx', 'utf8');

// Add import
c = c.replace(
  "import { estimateCellSizeMM, MIN_CELL_SIZE_MM } from '../utils/printLayout';",
  "import { estimateCellSizeMM, MIN_CELL_SIZE_MM } from '../utils/printLayout';\nimport { useTranslation } from 'react-i18next';"
);

// Add useTranslation
c = c.replace(
  "export default function ControlPanel() {",
  "export default function ControlPanel() {\n  const { t } = useTranslation();"
);

// Map text keys
c = c.replace("label: 'Mini', sublabel: '1. Sınıf İçin'", "label: 'miniLevel', sublabel: 'miniLevelSub'");
c = c.replace("label: 'Kolay'", "label: 'easy'");
c = c.replace("label: 'Orta'", "label: 'medium'");
c = c.replace("label: 'Zor'", "label: 'hard'");
c = c.replace("label: 'Uzman'", "label: 'expert'");
c = c.replace("label: '⬛ Dikey'", "label: 'portrait'");
c = c.replace("label: '⬜ Yatay'", "label: 'landscape'");

// Replace inline texts
c = c.replace('title: \'Bu sınıf için önerilmez ama kullanılabilir\'', "title: t('controlPanel.notRecommended')");
c = c.replace('🤖 Üretim Modu', "{t('controlPanel.mode')}");
c = c.replace('🎨 Klasik Mod', "{t('controlPanel.classicMode')}");
c = c.replace('🧠 Eğitsel Yapay Zeka', "{t('controlPanel.aiMode')}");
c = c.replace('* Yapay zeka, çocuğun yaşına göre renk ve zorluğu otomatik optimize edecektir.', "{t('controlPanel.aiHint')}");

c = c.replace('👦 Hangi Sınıfa Hazırlıyorsunuz?', "{t('controlPanel.grade')}");
c = c.replace('Sınıf Seviyesi Seçimi', "{t('controlPanel.gradeSelect')}");
c = c.replace(/\{grade\}\. Sınıf/g, "{grade}. Sınıf"); // leave grade formatting mostly intact for now, or use t() later

c = c.replace('🎯 Zorluk Seviyesi', "{t('controlPanel.difficulty')}");
c = c.replace(/Önerilen/g, "{t('controlPanel.recommended')}");

c = c.replace(/label: 'Küçük Hücre'/g, "label: t('controlPanel.smallCellBadge')");
c = c.replace(/title: `Hücreler \$\{cellMM\.toFixed\(1\)\}mm olacak\. Çok küçük olabilir\`/g, "title: t('controlPanel.smallCellHint')");
c = c.replace(/label: 'Dar'/g, "label: t('controlPanel.narrowBadge')");
c = c.replace(/title: `Hücreler \$\{cellMM\.toFixed\(1\)\}mm olacak, biraz dar\`/g, "title: t('controlPanel.narrowHint')");

c = c.replace(/miniLevel\.label/g, "t('controlPanel.' + miniLevel.label)");
c = c.replace(/miniLevel\.sublabel/g, "t('controlPanel.' + miniLevel.sublabel)");
c = c.replace(/lvl\.label/g, "t('controlPanel.' + lvl.label)");
c = c.replace(/opt\.label/g, "t('controlPanel.' + opt.label)");

c = c.replace('📄 Kağıt Yönü', "{t('controlPanel.orientation')}");
c = c.replace('Kağıt Yönü Seçimi', "{t('controlPanel.orientationSelect')}");

// Fix CSS logic
c = c.replace(/-right-2/g, "-end-2");
c = c.replace(/text-left/g, "text-start");
c = c.replace(/items-end/g, "items-end");

fs.writeFileSync('src/components/ControlPanel.tsx', c);
console.log('ControlPanel updated');
