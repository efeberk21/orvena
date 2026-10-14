# Orvena — Trust, Identity & AI Infrastructure

13 Ekim 2026. Kullanıcının Chrome'daki [track sayfası](https://hackathon.monad.xyz/tracks/trust-identity-ai) bütünüyle okundu. Yeni onay protokolü ve SDK uygulanıp Monad testnet'e dağıtıldı. Ayrıntılı güncel durum STATUS.md içindedir.

## Ürün

AI yayınlama ve müşteri yanıtı araçları için passkey ile onaylanan, iptal edilebilen, sürümleri birbirine bağlanan içerik makbuzları. Ana çıktı başka uygulamaların kullandığı contract + SDK. Web uygulaması ve ayrı origin'deki yayınlama örneği bunun referans entegrasyonlarıdır.

AI taslağı hazırlar; kullanıcı tam sürümü passkey ile onaylar; yayınlayan uygulama kendi belirlediği yetkili hesabı, içeriğin eşleşmesini ve güncel iptal durumunu doğrular. Onaylayan hesabın gerçek kişi/kurum kimliği ve içeriğin doğruluğu otomatik kanıtlanmaz.

## Beş jüri kriteri

| Kriter | Uygulanan karşılık ve kanıt |
| --- | --- |
| Teknik uygulama %20 | Her approve/revoke için içeriğe/eyleme bağlı WebAuthn/P256; nonce, süre, chain/contract; yanlış key/RP/origin, değişmiş içerik ve replay testleri; 23 test; fiziksel cihaz approve/revoke ve ayrı synthetic testnet işlemleri |
| Design & Craft %20 | requestContentApproval ve createApprovalReader SDK; açık doğrulama durumları; kısa rehber; başka origin'de yayınlama örneği; bağımsız Node consumer testi |
| Özgünlük ve track uyumu %15 | Platform veritabanından bağımsız, iptal edilebilir ve sürüm bağlantılı hesap onayı; salt'lı commitment; zincire gönderilmeyen içerik; kullanıcıda taşınabilir makbuz |
| Müşteri ve pazar %25 | AI yayınlama/müşteri yanıtı uygulaması geliştiricileri; onay sonrası değişmiş metni engelleme ihtiyacı; kendi WebAuthn/provenance/revocation altyapısını kurmama gerekçesi |
| Traction ve devam %20 | Proje dışındaki consumer ile gerçek testnet okuma ve ayrı-origin örneği; bağımsız ekip ilgisi elde edilirse gerçek kanıt; üç hedef ekipte pilot planı |

Bizim örneklerimiz bağımsız müşteri traction'ı değildir. Pilotta entegrasyon süresi, onay tamamlama oranı, değişiklik/iptal kontrolünün yakaladığı hatalar ve sponsor maliyeti ölçülür. İlgili ekiplere mesaj gönderimi ayrıca kullanıcı tarafından açıkça istenmeden yapılmaz. Olası gelir: yönetilen sponsor ve entegrasyon desteği; doğrulama açık kalır. Kriterlere karşılık vermek ödül garantisi değildir.

## Track'in doğrulanan şartları

Ana ürün protokol/primitive/altyapı olmalı. P256, ERC-8004 ve BTX yapı taşları olarak anılıyor; üçü birden veya model API'si zorunlu teslim olarak listelenmiyor. Biz P256 kullanıyoruz; ERC-8004/BTX entegrasyonu veya canlı model çağrısı iddia etmiyoruz.

Son teslim: **14 Ekim 2026 06:59 Türkiye saati**. Zorunlu: 3 MB altı logo, public GitHub, Monad mainnet/testnet üzerinde erişilebilir ürün linki/talimatları, en fazla 3 dakika çalışan ürün demosu ve en fazla 2 dakika pitch. Otuz saniyelik reklam isteğe bağlı ve puanlanmıyor. Portalın project-selection alanı önce proje oluşturulmasını istiyor; repo bulunması başvurunun tamamlandığını göstermez.

## Kapsam ve teslim

- [x] İçeriğe bağlı approve/revoke contract ve güvenlik testleri.
- [x] Monad testnet deployment, public ABI/adres metadata'sı.
- [x] Ana onay akışı, makbuz indirme/ithal, sürüm bağlantısı, public verifier.
- [x] SDK, yayınlama entegrasyonu ve kısa dokümantasyon.
- [x] Yerel ve testnet HTTP integration; synthetic P256 olduğu açıkça belirtiliyor.
- [x] Orijinal CSS, 3D kilit animasyonu, timeline ve geometri korunuyor.
- [x] Kullanıcı tarafından fiziksel passkey onay/iptal denemesi.
- [x] Final HTTPS domaini ve fiziksel cihazda tekrar kontrol.
- [x] Public GitHub'daki son kod ve canlı ürün linki.
- [x] Uygun format/boyuttaki logo ve demo/pitch kayıtları.
- [x] Portal takım/proje/track seçimi ve teslim: Trust, Identity & AI Infrastructure; 14 Ekim 2026, portal durumu Ready for judging.

Protokolün güvenlik sınırları SECURITY.md; cihaz kontrolü PASSKEY-SUPPORT.md; demo/pitch senaryosu DEMO.md içinde. Hassas içerik ve makbuz salt'ı paylaşımı ayrı gizlilik sorunudur. Passkey origininin güvenilirliği ve uygulamanın yayınlama sınırında güncel kontrolü uygulaması gerekir.
