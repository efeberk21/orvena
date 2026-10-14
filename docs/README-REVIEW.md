# README ve başvuru anlatımı incelemesi

14 Ekim 2026. İnceleme kapsamı: README, portalda teslim edilen açıklama/pazar stratejisi/deneme talimatları, çalışan kod ve mevcut kanıt dosyaları. Değişiklikler uygulamanın CSS'ine ve kilit animasyonuna dokunmaz.

## Önceki Monad kazananlarından alınan yapı

Güncel README'ler okundu; bunlar kazandıkları günkü dosyaların arşivlenmiş sürümü olarak sunulmuyor. İyi anlatım tercihleri bir ödülün neden kazanıldığını tek başına kanıtlamaz. Başka projelerin cümleleri, metrikleri, teknik iddiaları veya ödül rozetleri Orvena'ya taşınmadı.

| Kaynak | Okunan yaklaşım | Orvena'ya uygulanan karar |
| --- | --- | --- |
| [OwnPay README](https://github.com/0xashrk/ownpay/blob/main/README.md) | Somut kullanıcı sorunu, hızlı demo erişimi, görsel ürün sunumu, ağ seçiminin kullanım ihtiyacıyla açıklanması. | İlk paragrafta ürün ve kullanıcı; Monday/Tuesday örneği; banner ve video bağlantıları; Orvena'nın gerçekten kullandığı P256 üzerinden Monad gerekçesi. Genel TPS/1000x iddiaları kopyalanmadı. |
| [StitchAI MCP README](https://github.com/StitchAI/stitch-ai-mcp/blob/main/README.md) | Altyapı çıktısının somut araçları/parametreleri ve entegrasyon adımlarıyla anlatılması. | Contract + SDK ürün olarak öne çıktı; çalıştırılabilir API örneği, paket kurulum yolu ve doğrulama sonuçları eklendi. |
| [Swarm README](https://github.com/divyanshkhurana06/swarm/blob/main/README.md) | Ürün/örnek ayrımı, iddia-kanıt eşleştirmesi, canlı zincir kontrolleri ve yeniden çalıştırma yolu. | Kaynak, video, işlem hash'leri ve testler tek kanıt tablosuna toplandı; fiziksel cihaz ve synthetic testler ayrıldı; yerel sandbox yolu açıklandı. |

OwnPay'in üçüncülüğü ve StitchAI'nin beşinciliği [Monad Devs'in 8 Nisan 2025 duyurusunda](https://x.com/monad_dev/status/1909364454606958819) doğrudan tarayıcıdan doğrulandı; [StitchAI duyurusu](https://x.com/monad_dev/status/1909364883046711661). Swarm'ın kazanan bilgisi kendi README'sindeki Monad Blitz Hyderabad V3 beyanına dayanıyor; ayrı bir organizatör sonuç listesi doğrulanamadı. Bu kaynak doğrulama farkı korunuyor.

## Bulunan sorunlar ve düzeltmeler

| Önceki durum | Neden önemli | Düzeltme |
| --- | --- | --- |
| Ürün, protokol ve referans ekranlar iç içe anlatılıyordu. | Jüri bunu yalnızca başka bir passkey login ekranı sanabilir. | Ana ürün onay contract'ı ve SDK; iki web uygulaması referans entegrasyon olarak tanımlandı. |
| GitHub About özeti eski passkey login/profil ürününü anlatıyordu. | Yeni README ile ilk görülen repo özeti çelişiyordu. | GitHub açıklaması exact-content consent/revocation ve contract + SDK olarak güncellendi; canlı site Website alanına eklendi. |
| Somut kullanım örneği ilk ekranda yoktu. | Kullanıcı neden ihtiyaç duyacağını çıkaramıyordu. | Onaylanan Monday metninin Tuesday olarak değişmesiyle açık tetikleyici/sonuç örneği eklendi. |
| Monad seçimi özellik listesi içinde kalıyordu. | Zincirin kullanımı sonradan eklenmiş görünebilir. | Her eylemde WebAuthn/P256, sponsorun imza yerine geçememesi ve uygulamalar arası ortak güncel durum anlatıldı. |
| “Login/veritabanı bunu yapamaz” anlatımı fazla geneldi. | Tek uygulama güvenilir veritabanıyla onay yönetebilir. | Sorun uygulamalar arasındaki güven ve taşınabilir doğrulama olarak daraltıldı. |
| Kanıtlar dağınıktı ve SECURITY.md'de 20 test sayısı kalmıştı. | Tutarsızlık inceleme güvenini zayıflatır. | 23 test ve iki ayrı 12-check/4-tx synthetic run; fiziksel approve/revoke ayrı kanıt tablosunda. Güvenlik dokümanı düzeltildi. |
| README kurulum yolu sponsor anahtarı istemesine rağmen bunu başlangıçta söylemiyordu. | Temiz clone'dan deneme başarısız olabilir. | Ana yerel başlangıç `npm ci` + `npm run dev:local`; testnet sponsor yapılandırması ayrı anlatıldı. |
| `@orvena/sdk` import örneği npm'de yayımlanmış izlenimi verebilirdi. | Başka geliştirici `npm install @orvena/sdk` ile başlayıp takılır. | Tarball paketleme ve kurulum yolu, npm'de henüz yayımlanmama durumu açıklandı. |
| Fiziksel cihaza erişemeyen jüri için deneme yolu yeterince kolay değildi. | PRF desteği olmayan cihazda ürün değerlendirilemeyebilir. | Doğrudan import edilebilir recorded-receipt.json, newline eklenmemiş exact content ve no-login walkthrough eklendi. |
| “Taşınabilirlik” passkey'in de farklı domain'e taşınması gibi okunabilirdi. | WebAuthn RP bağı ve sağlayıcı desteği gerçek kısıt. | Makbuz/doğrulama taşınabilirliği ile yeni cihaz onayı/original RP bağı ayrıldı. |
| Kendi yayıncı örneği traction ile karışabilirdi. | Gerçek geliştirici ilgisi %20 kriterinin parçası. | Referans entegrasyon kanıtı olarak tutuldu; dış ekip/pilot/adoption yokluğu açıklandı. |
| Repo public olsa da repo çapında lisans dosyası yok. | Geniş üçüncü taraf dağıtımı için kullanım hakları açık olmalı. | “Open source” yerine public source/inspectable ifadesi; mevcut Solidity MIT başlıkları ile repo çapında lisans ihtiyacı ayrıldı. Sahibinin lisans kararı varsayılmadı. |

## Beş kriterde kalan gerçek boşluklar

[Resmi track kriterleri](https://hackathon.monad.xyz/tracks/trust-identity-ai) portalda yeniden okundu. Teslim alanları tamamlanmış olması bütün puanlama boyutlarında en güçlü durumda olduğumuz anlamına gelmez.

| Kriter | Kanıtlanan | Kalan boşluk |
| --- | --- | --- |
| Technical Execution %20 | Eyleme bağlı fresh WebAuthn/P256, replay/domain/deadline kontrolleri, 23 test, gerçek zincir ve cihaz kanıtı. | Harici audit yok; serverless sponsor dağıtık koordinasyonu ve abuse kontrolü üretim ölçeğine hazır değil. |
| Design & Craft %20 | API, ayrı-origin entegrasyon, paketlenebilir SDK, judge walkthrough ve bağımsız Node verifier. | npm yayını ve repo çapında lisans; dış geliştirici onboarding ölçümü henüz yok. |
| Originality & Track Insight %15 | Salt'lı exact-version onayı, güncel revocation ve makbuzun platform veritabanından bağımsız okunması. | Yeni passkey eylemlerinin original RP/hosted origin bağı sürüyor; tam platform bağımsızlığı/zero knowledge iddiası yapılamaz. |
| Founder & Market Readiness %25 | İlk kullanıcı ve tek başlangıç akışı net; kendi altyapısını kurmak yerine entegrasyon gerekçesi ve managed sponsor fikri. | Müşteri görüşmesi veya willingness-to-pay verisi yok. Plan olarak sunuldu. |
| Traction & Path Forward %20 | Kendi referans entegrasyonu ve üç hedef geliştirici ekiple pilot planı. | **En belirgin eksik: bağımsız ekip ilgisi veya entegrasyonu henüz yok.** Güzel metin bunun yerini tutmaz. |

Banner Apple Design'in amaç, tipografik hiyerarşi, boşluk, malzeme/derinlik ve sadelik ilkeleriyle mevcut kömür/kum renklerine ve navbar ikonuna göre native SVG olarak çizildi. Banner içindeki kart bir protokol illüstrasyonudur; gerçek ekran görüntüsü veya yeni test kanıtı değildir. PNG export'u GitHub'da tutarlı görünüm sağlar; alt metin ve README gövdesi görseldeki mesajı tekrar açıklar.
