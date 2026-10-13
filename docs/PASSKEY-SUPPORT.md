# Passkey cihaz kontrolü

Orvena Mera 0.2.0 üzerinden WebAuthn PRF ile hesap türetiyor. İçerik onayı ve iptali ayrıca ES256/P256 WebAuthn assertion gerektiriyor. Sağlayıcı/OS/tarayıcı uyumluluğu değişebilir; [Mera'nın resmi destek tablosunu](https://github.com/category-labs/mera/blob/main/docs/src/content/docs/authenticator-support.md) final cihaz için kontrol edin. Bütün cihazlarda destek iddia edilmiyor.

1. Chrome/Edge'de localhost:5173 veya final HTTPS origininde passkey oluştur/seç.
2. Zararsız taslağı oku ve Approve this version with passkey yap. Gerçek transaction ve makbuzu kontrol et.
3. Verify'da makbuz, aynı metin ve bağımsız bildiğin hesap adresini kullan. Tam eşleşme geçmeli; değiştirilen metin geçmemeli.
4. Revoke with passkey yap; güncel doğrulama revoked dönmeli.
5. Yeni sürüm onayını ve önceki sürüm bağlantısını kontrol et.
6. İlk onchain key kaydı tamamlandıktan sonra public credential metadata'sı silinip aynı discoverable passkey ile girişte adres değişmemeli. Onchain kaydı tamamlanmamış credential'ın public key metadata'sını önceden silmeyin.
7. İkinci fiziksel cihaz için aynı credential ve PRF/provider erişimi gerekir. Bunu gerçekten denemeden cross-device recovery başarısı iddia etmeyin.

Final HTTPS RP için yeni credential gerekir; localhost credential başka domain'e taşınmaz. Önceki identity prototipindeki cihaz başarısı yeni içerik onayı testinin yerine geçmez. Otomatik testlerdeki P256 anahtarları synthetic fixture'dır; parmak izi/Windows Hello testi değildir.
