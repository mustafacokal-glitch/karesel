# KARESEL Phase 5: Dead Code and Unused File Audit

Bu rapor, projedeki kullanılmayan, eskimiş veya üretim (production) ortamına taşınmaması gereken dosya ve kod parçalarını listelemek amacıyla hazırlanmıştır. **Bu aşamada hiçbir dosya silinmemiş, yalnızca denetim (audit) gerçekleştirilmiştir.**

---

## 1. Do not deploy to XAMPP (Runtime-unnecessary files)
XAMPP'teki `htdocs/karesel` yayın dizinine (runtime) **kesinlikle taşınmaması** gereken klasör ve dosyalar:
- `node_modules/` (Sadece geliştirme bağımlılıklarıdır)
- `.git/` (Versiyon kontrol geçmişidir, sunucuda durması güvenlik riskidir)
- `src/` (Kaynak kodlar, derlenip `dist/` klasörüne aktarılmaktadır)
- `scratch/` (Geçici test ve deneme dosyaları)
- `package.json` ve `package-lock.json`
- `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json` (Derleme ayarları)
- `fixPdf.cjs`, `generate_report.ts` (Yardımcı scriptler)
- `karesel_kodlama_studyo_blueprint.md` (Eski dokümantasyon)
- Geliştirme (Local) modda oluşturulan `.map` uzantılı Source Map dosyaları (Online sunucuya çıkılırken `npm run build:prod` ile engellenmelidir).

---

## 2. Duplicate concepts (Needs manual review)
Projede aynı veri tiplerinin (types/interfaces) birden fazla dosyada tanımlandığı (kod tekrarı/duplicate) tespit edilmiştir. Bu durum, ileride TypeScript güncellemelerinde uyumsuzluklara yol açabilir.

- **`AIQESReport`**: Hem `src/types/index.ts` hem de `src/engine/quality/types.ts` içerisinde tanımlı.
- **`ProcessingIntent`**: Hem `src/types/index.ts` hem de `src/engine/grid/types.ts` içerisinde tanımlı.
- **`AgeGroup`**: Hem `src/engine/grid/types.ts` hem de `src/engine/color/types.ts` içerisinde tanımlı.

**Önerilen Aksiyon:** Aşama 6'da bu tiplerin yalnızca `src/types/index.ts` içinde barındırılması ve diğer dosyalarda buradan içe aktarılması (import) sağlanmalıdır.

---

## 3. Candidate for cleanup (Unused scripts & Old references)
Aşağıdaki dosyalar çalışma zamanında (runtime) kullanılmayan, ancak geliştirme sırasında oluşturulmuş yardımcı/eskimiş dosyalardır:

- **`fixPdf.cjs`**: `pdfGenerator.ts` dosyasında font importlarını düzenlemek için kullanılmış yerel bir script.
  - *Kullanım Durumu:* Sadece Development (Geliştirme).
  - *Önerilen Aksiyon:* Tamamen silmek yerine `scripts/` veya `tools/` gibi bir klasöre taşınabilir.
- **`generate_report.ts`**: Benchmark testleri için terminal üzerinden rapor üreten manuel bir script.
  - *Kullanım Durumu:* Sadece Development / Test.
  - *Önerilen Aksiyon:* `scripts/` klasörüne taşınmalıdır.
- **`scratch/` Klasörü (İçindeki `test_benchmark.cjs` vb.)**:
  - *Kullanım Durumu:* Geliştirme/Geçici.
  - *Önerilen Aksiyon:* Silinebilir veya test kodları arşive kaldırılabilir.
- **`karesel_kodlama_studyo_blueprint.md`**: Eski mimari plan.
  - *Önerilen Aksiyon:* `docs/archive/` klasörüne taşınabilir.

---

## 4. Safe to keep (But do not deploy)
Aşağıdaki dosyalar projenin sağlığı ve test edilebilirliği için kaynak kodda tutulmalı, ancak yayına (XAMPP'e) dahil edilmemelidir:

- **`src/engine/__tests__/benchmarks/`**: `VisualRegression.test.ts` için çok kritik veri setlerini (dataset) içerir.
- **Test dosyaları (`*.test.ts`)**: Kaynak kodda mutlaka kalmalıdır.

---

## 5. Do not touch (Working Code)
Denetim sırasında eski veya kopya gibi görünebilecek, ancak **kesinlikle silinmemesi gereken** kritik motor dosyaları:

- **`ShapePreservationEngine.ts` ve `KeyFeaturePreservationEngine.ts`**: Her ikisi de aktif olarak `AIOptimizationLoop.ts` ve `pixelEngine.ts` tarafından çağrılmakta ve Pedagogical Fidelity moduna güç vermektedir.
- **`bgRemover.ts`**: Aşama 2'de stabil hale getirilmiş olan offline/online çevresel arka plan silici modül.
- **`SmartGridSelector.ts` ve `gridCleaners.ts`**: Eğitsel grid sınırlandırmaları (grade tabanlı) için yoğun olarak kullanılmaktadır.
