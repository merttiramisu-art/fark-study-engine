# FARK Ders Tasarımcısı V1.2 — Çoklu İçerik Editörü

**Geliştirme durumu: izole kod adayı.** Güncel çalışma temeli: `merttiramisu-art/fark-study-engine` PR #39 (`integration/v5-pre-pc-acceptance`, başlangıçta `f4c4c3e9...`). Bu kaynak kod GitHub'a gönderilmedi, `main` değiştirilmedi, canlı dağıtım yapılmadı. V1.1 dosyaları geriye uyumluluk amacıyla pakette tutuldu.

## Kapsam

Bir öğretmen aynı `fark-open-content-pack` v1 dosyası altında çoklu **ünite → kazanım → ders → soru** oluşturabilir. İlgili üniteler/kazanımlar için ön koşullar ve ders/soru için birden fazla kazanım bağlantısı işaretlenebilir. Üç bildirimsel görsel korunur: kesir karşılaştırma, sayı doğrusu ve 2–8 olaylı zaman çizelgesi. Soru başına 2–8 seçenek, cevap anahtarı ve isteğe bağlı çeldirici yanılgı kimliği düzenlenebilir. Kaynak/lisans ve isteğe bağlı HTTPS kaynak URL'si korunur. Kayıtların sabit kimlikleri, soru/ders revizyonları, ilişki sırası, ders yanılgı kimlikleri ve soru şıkları kaynak dosyaya kayıpsız geri yazılabilir.

- **Yeni bir bilgi çekirdeği oluşturulmaz.** `src/course-authoring.js` mevcut `fark-open-content-pack` v1 yapısına güvenli, saf dönüştürücüdür.
- V1.2 arayüzü `examples/web/course-designer.html`. V1.1 `lesson-designer.html` dosyası da kullanılabilir.
- Kayıt ekle/çıkar yapılabilir; bağlantılı ünite/kazanım silinmesi güvenli biçimde engellenir. Kimlik değiştirme seçeneği sunulmaz (bağlantıların yanlışlıkla kopmasını önler).
- JSON dosyası yerelde açılır, önce mevcut `importOpenContentPack` adaptöründen geçer, sonra V1.2'nin kayıpsız form modeline alınır. Anlaşılmayan alan, ek format, `mappings` gibi düzenlenemeyen veriler **reddedilir**, kaybolmaz.
- **Dışa aktarma için kanonik doğrulama şarttır.** Girilen form alanlarından `buildCourseAuthoringPack` ile oluşturulan JSON ayrıca projenin mevcut `importOpenContentPack` fonksiyonuyla kontrol edilir. Her değişiklikte önizleme/indirme devreden çıkar.
- Kullanıcı metinleri DOM'da sadece `textContent`/`createTextNode` ile gösterilir. `innerHTML`, `fetch`, tarayıcı kalıcı deposu, dış servis, API anahtarı veya ücretli bağımlılık yoktur. Dosya sınırı 1 MiB'dir.
- Arayüz kontrollerinin çalışması, **öğrenci öğrenmesi, tarih doğruluğu veya lisans hak sahipliği** kanıtı değildir.

## Sınırlar

Bu arayüz en fazla **20 ünite, 80 kazanım, 100 ders, 120 soru** ile çalışır; alt sistemin daha yüksek sınırlarını bilerek aşmaz. Her soru ve ders en az bir kazanımla bağlıdır; en az bir ünite, kazanım ve soru zorunludur. Harici kart eşleştirmesi (`mappings`) ve desteklenmeyen ekstra JSON alanları içeren paketler burada düzenlenmez. Medya dosyası yükleme, gelişmiş WYSIWYG, gerçek dosya diski otomatik kayıt, senkronizasyon, kitap/PDF üretimi ve gerçek öğretmen kullanılabilirlik kanıtı yoktur.

## Doğrulama ve testler

- Bu izole adayın V1.1 dahil `npm test` sonucunda **30/30 Node testi geçti** (bu belgedeki sayı son test kayıtlarıyla uyumlu olarak doğrulanmalıdır).
- `src/course-authoring.js` ve tarayıcı JS dosyaları `node --check` kontrolünden geçti. `types/course-authoring.d.ts` TypeScript derleyicisinde sözdizimi kontrolünden geçti.
- `integration-edits.patch` ayrı bir **PR #39 metin örnek kopyasında** `git apply --check` ve `git apply` denendi; gerçek tam depo kökünde denenmiş değildir.
- Chromium'da masaüstü ve 393px mobil **DOM etkileşim duman testi** geçmiştir (preview, ekle, bağlantılı silme, dosya indir/yükle, HTML gibi metni çalıştırmama). Ortam gerçek localhost gezinmesini engellediği için bu testte modüller sayfaya özel olarak yüklenmiş ve **yalnızca testte kullanılan geçici `importOpenContentPack` benzeri doğrulayıcı** kullanılmıştır. Ekran görüntüleri bu koşula göre alınmıştır.
- **BEKLEYEN:** gerçek `importOpenContentPack` ve gerçek `knowledge-core` / `visual-*` modülleriyle tam entegrasyon, `npm test` tam PR #39 dalında, Node 20/22 GitHub CI, TypeScript dış tüketici paketi, erişilebilirlik/cihaz kabulü, versiyonlama ve yayın.

## Kurulum (GitHub'a yazmadan)

1. PR #39'daki dalı güncel SHA'dan ayrı temiz çalışma klasörüne al, varsa izinsiz mevcut dosyaları değiştirme. Yukarıdaki SHA sadece ilk referans; yeni başlığa göre yamayı yeniden kontrol et.
2. Bu ZIP'te bulunan `src/*`, `types/*`, `examples/web/*`, `test/*`, `docs/*` kaynaklarının ilgili yeni dosyalarını kopyala. `package.json` **izole test amaçlıdır: gerçek repo dosyasının üzerine kopyalanmamalıdır.**
3. `git apply --check integration-edits.patch`, ardından bu dosya tam olarak uygunsa `git apply integration-edits.patch`. Yama `examples/serve-web.js`, `examples/web/index.html`, `package.json` dosyalarında **küçük, gözden geçirilebilir** eklemeler yapar. PR #39 üzerinde eski V1.1 yaması zaten uygulandıysa bu kümülatif yamayı uygulama; iki kez eklemek yerine yalnızca V1.2 farkını ayır.
4. `npm test`, `tsc --strict --noEmit --skipLibCheck false types/course-authoring.d.ts`, `npm run demo:web` ve tarayıcıda `http://127.0.0.1:4173/examples/web/course-designer.html`.
5. Masaüstü 1280px / mobil 360px ve 393px / klavye / ekran okuyucu / büyük dosya / hatalı grafik / grafik ön koşul döngüleri / dışa aktarılan paketi Study Desk'te açma akışlarını gerçek adaptörle test et. GitHub commit, push, PR, merge veya deploy için ayrıca kullanıcı onayı gerekir.

**Güvenlik:** Özel KPSS kitaplarını, telifli soruları ve öğrencilerin kimlikli öğrenme geçmişlerini public açık kaynak depoya taşımayın.
