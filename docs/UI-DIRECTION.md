# Orvena — Living identity

Seçilen yön: koyu, heykelsi, sakin. Ana fikir: alışıldık bir dokunuştan, kullanıcıya ait açık bir kimliğe ve başka uygulamalarda kullanılabilir kayıtlara geçiş.

## Üç sahne

| Sahne | Görsel hareket | Ürünle ilişkisi |
| --- | --- | --- |
| A familiar touch | Doğal spiral parmak izi kabartması ve ortasında gerçek bir anahtar deliği | Cihazın mevcut güvenliğiyle passkey giriş |
| Your key, your way in | Anahtar silüeti yaklaşır, deliğe girer, çeyrek tur döner; yüzey açılır | Kullanıcının kontrol ettiği erişim için görsel anlatım |
| An identity of your own | Kilit açıldıktan sonra profil kartı ve uygulama/veri bağlantıları belirir | Public profil, ayrı kontrol kanıtı, SDK ve receipt doğrulama |

Parmak izi kullanıcıdan alınmaz; yalnızca sabit bir referans görseli kullanılır. Kullanıcının Google bağlantısında seçtiği Etsy görseli doğal spiral çizgi yapısı için incelendi, uygulamaya kopyalanmadı. Yüzeyde kullanılan referans [NIST — Scanned Fingerprint Whorl](https://www.nist.gov/image/scanned-fingerprint-whorl), görsel kredisi NIST'tir. Renkli kaynak uygulama içinde kabartma/alpha dokusuna dönüştürülür; altındaki ayrı kıvrım bölgesi çıkarılır ve anahtar deliği boş bırakılır. Matematiksel halka üretimi ve dekoratif kesintiler kaldırıldı.

Anlatımda anahtar ve kilit fiziksel passkey mekanizmasının görsel benzetmesidir. Kart gerçek kullanıcı verisi veya tamamlanmış işlem sonucu gibi sunulmaz. Gerçek uygulama `#app` altında; public example/verifier/developer ekranları ayrı çalışır.

## Görsel dil

Kömür siyahı zemin, sıcak beyaz metin ve bakır/kum vurguları. Ana vurgu `#d6a77a`, başlık tonu `#ddb994`, zemin `#12110f`, panel `#1c1a17`. Metal anahtar ve kilitle ilişkili sıcak bakır, Orvena'nın kendi görsel kimliğini kurar. Ana nesne kodla üretilmiş cam/metal kabartma; ışıklar, metal malzemeler ve SVG fallback aynı paleti kullanır. Tipografi sade sans-serif ile vurgulardaki italik serif arasında kurulur. İnce çizgiler ve boşluklar, yoğun arayüz panellerinden önce hikâyeyi taşır.

Hareket kaydırma konumuna bağlıdır, geri çevrilebilir ve mevcut pozisyon/hızdan yeniden hedeflenen sönümlü spring kullanır. Sürekli kendi kendine dönen nesne, otomatik kayan metin veya scroll kilidi yoktur. Normal tarayıcı kaydırması korunur; bölüm düğmeleri ve `Open app` anlatımı geçmek için kullanılabilir.

## Uygulama ve erişilebilirlik

- Gerçek passkey/profil/proof/veri işlevleri korunur; yalnızca sunum ve sayfa hiyerarşisi değişir.
- Mobilde gerçek uygulama paneli açıklama metninden önce gelir.
- Klavye bölüm seçimi anında konum değiştirir; focus görünürdür; skip link vardır.
- Reduced-motion tercihinde 3D sahne anahtar/giriş/açılmış durumlar arasında hareket olmadan değişir; sürekli dönüş ve kayma uygulanmaz.
- WebGL desteklenmezse SVG görseli ve anlatım devam eder.
- 3D ayrı bir lazy chunk'tır; public okuma sayfaları bu sahneyi başlatmaz.
- Grafik görünmüyorken veya sekme gizliyken render döngüsü durur; hareketsiz sahne sürekli render edilmez. Pixel ratio 1.5 ile sınırlıdır.

Apple-design becerisinin fiziksel süreklilik, anlık feedback ve reduced-motion ilkeleri kullanıldı. Kaydırmayı ürün hikâyesine bağlayan yaklaşım için [Hilo'nun kendi ürün anlatımı vaka incelemesi](https://hilostudiolab.com/en/projects/tabasco) incelendi. 3D uygulama [Three.js](https://threejs.org/docs/) ile yapılır; nesne geometrisi yerelde üretilir, parmak izi referansı yerel asset olarak saklanır. Kaynak görsel: `apps/web/src/visuals/fingerprint-whorl.jpg`.

Bu yerel tasarım prototipi yayınlanmadı. Ayrı logo dosyası ve final demo videoları hâlâ sonraki çıktılardır.

## Kontrol

TypeScript ve production build geçti. Chrome'da üç sahne, bölüm seçimiyle ileri/geri geçiş, 390×844 ve 375×667 telefon boyutları, yatay taşma ve uygulamaya atlama kontrol edildi. Yeni public örnekte gerçek yerel-chain receipt eşleşmesi ve tercihin uygulanması geçti; bu sayfa canvas başlatmıyor. Reduced-motion/fallback dalları uygulanmıştır; bütün cihaz/GPU kombinasyonlarında test yapıldığı iddia edilmez.

Doğal parmak izi + anahtar revizyonunda ayrıca giriş/dönüş sırasında kartın kapalı kaldığı, kilit açıldıktan sonra kartın görünür olduğu ve ileri/geri sahne seçiminin çalıştığı kontrol edildi. Dekoratif parmak izi katmanlarının yanlara ayrılması kaldırıldı.
