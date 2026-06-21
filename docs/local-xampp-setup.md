# KARESEL - XAMPP Kurulum ve Dağıtım Rehberi

Bu rehber, KARESEL uygulamasını XAMPP üzerinde temiz ve güvenli bir şekilde yayınlamak için hazırlanmıştır. Kaynak kodları ile yayınlanacak kodların birbirine karışmasını önlemek amacıyla "Temiz Dağıtım" (Clean Deployment) modeli izlenmektedir.

## 1. Dizin Yapısı (Önerilen)

Geliştirme esnasında kaynak kodların (`src`, `node_modules`, `tests` vb.) bulunduğu klasör ile yayına alınan klasör ayrılmalıdır.

**Yanlış Yapı (Kaynak Kodlar Doğrudan XAMPP'te):**
```
htdocs/
  karesel/
    node_modules/
    src/
    package.json
    ...
```

**Doğru Yapı (Temiz Dağıtım):**
```
htdocs/
  karesel/                 <-- Çalışma dizini (Sadece çıktı dosyaları)
    assets/                <-- JS ve CSS dosyaları
    index.html
    .htaccess              <-- Yönlendirme dosyası
    ... (diğer statik public dosyalar)
```
*Geliştirme klasörünüz (örneğin `C:\projects\karesel-source`) XAMPP `htdocs` dışında bir yerde durmalı veya `htdocs` altında yayın klasörüyle (örneğin `htdocs/karesel_dev` ve `htdocs/karesel`) ayrı tutulmalıdır.*

## 2. Derleme (Build) Komutları

Uygulamayı derlemek için terminalde projenizin ana dizininde aşağıdaki komutları kullanabilirsiniz:

### Yerel Geliştirme/Hata Ayıklama İçin:
```bash
npm run build:local
```
*(Bu komut `source map` dosyalarını tutar, böylece tarayıcının geliştirici konsolunda hataları takip etmeniz kolaylaşır.)*

### İnternete Açık (Online) Üretim İçin:
```bash
npm run build:prod
```
*(Bu komut `source map` dosyalarını kapatır, dosya boyutunu küçültür ve kaynak kodunuzu gizler.)*

## 3. XAMPP'e Yükleme Adımları

1. Terminali açın ve projenizi derleyin: `npm run build:local`.
2. İşlem bittikten sonra projenin içindeki `dist/` klasörüne girin.
3. `dist/` klasörünün **içindeki tüm dosyaları** kopyalayın.
4. Kopyaladığınız dosyaları XAMPP'teki `C:\xampp\htdocs\karesel` dizininin içine yapıştırın.
5. Dosya yapınızın şu şekilde göründüğünden emin olun:
   - `C:\xampp\htdocs\karesel\index.html`
   - `C:\xampp\htdocs\karesel\assets\`
   - `C:\xampp\htdocs\karesel\.htaccess`

**Uyarı:**
Aşağıdaki dosya veya klasörler kesinlikle yayına (htdocs/karesel içerisine) taşınmamalıdır:
- `.git`
- `node_modules`
- `src`
- `tests`
- `package-lock.json`
- `vite.config.ts` vb.

## 4. URL ve Yönlendirme

Proje `http://localhost/karesel/` adresinde çalışacak şekilde ayarlanmıştır.

> [!NOTE]
> `.htaccess` dosyası, React'ın istemci taraflı yönlendirmesi (SPA) için tüm gelen trafikleri `index.html`'e yönlendirir. Uygulamayı alt dizinde (`/karesel/`) çalıştırdığınız için `.htaccess` içerisinde `RewriteBase /karesel/` tanımı bulunmaktadır.

## 5. Çevrimdışı Mod ve Arka Plan Silme Davranışı
Eğer XAMPP sunucunuzu internet bağlantısı olmadan kullanıyorsanız, uygulama bunu otomatik olarak algılar. Yapay zeka modeli internetten indirilemeyeceği için arka plan silme işlemi atlanır ve size güvenli, işlemi kesmeyen (non-blocking) turuncu bir uyarı çıkar. Görseliniz çökmeye sebep olmadan orijinal haliyle işlenmeye devam eder.

## 6. Sorun Giderme

- **Beyaz Ekran / Dosyalar Bulunamadı:** XAMPP dizininizin adının tam olarak `karesel` olduğundan emin olun (`htdocs/karesel`). Klasör adını değiştirirseniz `vite.config.ts` ve `.htaccess` içindeki `/karesel/` yollarını da güncellemeniz gerekir.
- **Eski Dosyalar Görünüyor:** Dağıtımdan önce tarayıcı önbelleğinizi (Cache) temizleyin veya Gizli Sekme üzerinden test edin.
