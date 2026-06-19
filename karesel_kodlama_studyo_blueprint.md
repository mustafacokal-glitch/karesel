# 🎨 Karesel Kodlama Stüdyosu - Radikal Dönüşüm ve Mimari Şartname
## (Cline / AI Developer ve Ajanlar İçin Sıfırdan Kurulum Dokümanı)

Bu doküman, mevcut geleneksel HTML/JS yapısındaki karesel kodlama (Pixel Art) uygulamasını, modern web teknolojileri (React, Vite, Tailwind CSS, Zustand, Transformers.js ve jsPDF) ile sıfırdan ve endüstri standartlarında inşa etmek üzere hazırlanmış teknik bir şartnamedir. 

Temel hedef; ilkokul düzeyindeki (1-4. sınıf) çocukların motor becerilerine uygun, "çamurlaşmayan", keskin ve hatasız kodlama kağıtları ile öğretmenler için milimetrik A4 PDF çıktıları üreten jilet gibi net bir motor geliştirmektir.

---

## 1. TEKNOLOJİK YIĞIN (TECH STACK) VE PROJE YAPISI

### 1.1 Temel Teknolojiler
- **Çatı (Framework):** React 18+ (Vite Yapılandırması)
- **Durum Yönetimi (State Management):** Zustand (Hafif, modüler ve yüksek performanslı)
- **Stil ve Tasarım:** Tailwind CSS + Lucide React (Çocuk dostu, modern, minimalist arayüz)
- **Yapay Zeka / İmaj İşleme:** `@xenova/transformers` (Tarayıcı içi RMBG-1.4 Arka Plan Silme modeli)
- **PDF Motoru:** `jspdf` (Milimetrik A4 yerleşimi ve vektörel grid çizimi için)

### 1.2 Klasör Yapısı (Folder Architecture)
Proje dizini aşağıdaki gibi modüler ve atomik bileşen mimarisine uygun kurulmalıdır:

```text
karesel-kodlama-studyo/
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
└── src/
    ├── main.jsx
    ├── index.css
    ├── store/
    │   └── useProjectStore.js      # Global Zustand State
    ├── core/
    │   ├── bgRemover.js           # Transformers.js Arka Plan Silme Modülü
    │   ├── pixelEngine.js         # Oklab + Octree + Downscale Piksel Motoru
    │   ├── gridCleaners.js        # Zhang-Suen, Delik Doldurma ve İzole Piksel Filtreleri
    │   └── pdfGenerator.js        # jsPDF A4 Milimetrik Çıktı Motoru
    ├── components/
    │   ├── Header.jsx             # Çocuk ve Öğretmen Dostu Başlık Bölümü
    │   ├── UploadZone.jsx         # Sürükle-Bırak Gelişmiş Yükleme Alanı
    │   ├── ControlPanel.jsx       # Seviye, Kağıt Yönü ve İleri Ayarlar Paneli
    │   ├── Workspace.jsx          # Öğrenci Grid ve Çözüm Anahtarı İkili Önizleme Ekranı
    │   ├── ColorLegend.jsx        # Etkileşimli Kuru Boya Düzenleme Tablosu
    │   └── ActionButtons.jsx      # PDF/PNG Çıktı ve Sıfırlama Butonları
    └── App.jsx                    # Ana Yerleşim ve Entegrasyon