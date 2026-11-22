# FARK Ders Tasarımcısı V1.1 — izole geliştirme adayı

**Durum (22 Kasım 2026):** Bu paket yalnızca `/mnt/data` altında yerel olarak hazırlandı; GitHub'a commit, push, PR, merge veya yayın yapılmadı. Kod karşılaştırma temeli: `merttiramisu-art/fark-study-engine` PR #39, dal `integration/v5-pre-pc-acceptance`, head `f4c4c3e9bfef01f246acc566ef65f0686178eb95`. Gerçek depo entegrasyonu ve fiziksel cihaz kabulü bekliyor.

## Ne yapıyor?

Kod veya Markdown yazmadan Türkçe form üzerinden **tek ünite + tek kazanım + tek ders** ve **1–2 çoktan seçmeli soru** ile isteğe bağlı kesir karşılaştırma, sayı doğrusu veya iki olaylı zaman çizelgesi tanımlanabilir. Çıktı yeni bir içerik şeması değil, mevcut **`fark-open-content-pack` v1 JSON** yapısıdır. Web arayüzü, dışa aktarmadan veya önizlemeden önce mevcut `importOpenContentPack` kaynağını çağırır. Aynı paket mevcut `Study Desk` içerik alanından içeri alınabilir. Öğrenci geçmişi, değerlendirme puanı veya ustalık tahmini oluşmaz.

V1.1 değişiklikleri:

- Önceden Ders Tasarımcısı tarafından oluşturulmuş JSON paketini seçip yeniden düzenleme (`restoreLessonAuthoringDraft`). Dosya cihazdan okunur; hiçbir yere yüklenmez.
- Desteklenmeyen ekstra ünite, kazanım, lisans kaynağı bağlantısı, kart eşleştirmesi, çeldirici yanılgısı, revizyon veya soru ID'si görünce kayıpsız düzenleme garantisi veremediği için **reddetme**. Hatalı dosya mevcut formu değiştirmemeli.
- Yalnızca güncel ve doğrulanmış içerik önizlenir; form değişiminde eski önizleme ve indirme izni iptal edilir.
- Bounded sayı doğrusu, seçilen noktaları işaretleyen yatay bir şema olarak gösterilir (0 ücretli bağımlılık).
- Çekirdek doğrulamasını geçen orijinal JSON ve yeniden oluşturulan JSON, formu değiştirmeden önce kontrol edilir.

Güvenlik sınırı: eğitimci metni yalnızca `textContent` ve `createTextNode` ile gösterilir. HTML/JS çalıştırılmaz; uzaktan erişim, izleme, yerel depolama, hesap, ücretli servis ve yeni runtime bağımlılığı yoktur. Hak sahipliği/lisans bilgisi üreticinin beyanıdır, sistem doğrulayamaz. Görseller fotoğraf yüklemesi değil, sınırlandırılmış metinsel/sayısal modellerdir.

## Entegrasyon adımları (GitHub'a yazmadan)

1. PR #39 temelinde temiz, ayrı yerel klon aç. GitHub dalına veya `main`e doğrudan yazma. Temel commit değiştiyse yeni farkı yeniden incele.
2. ZIP içindeki şu dosyaları repo içindeki aynı yollara kopyala: `src/lesson-authoring.js`, `examples/web/lesson-designer.html`, `examples/web/lesson-designer.js`, `examples/web/lesson-designer.css`, `test/lesson-authoring.test.js`, `test/lesson-authoring-roundtrip.test.js`, `test/lesson-designer-static.test.js`, `docs/LESSON_DESIGNER_V1.md`.
3. **ZIP içindeki küçük `package.json`'u mevcut `package.json` üzerine kopyalama.** Yalnızca paket izole test edilirken ESM için kullanılır.
4. Kök dizinde `git apply --check integration-edits.patch`, ardından `git apply integration-edits.patch`. Yama yalnızca `examples/serve-web.js` izinli rotalarını ve `examples/web/index.html` ana sayfa bağlantısını ekler.
5. `node --test test/lesson-authoring*.test.js test/lesson-designer-static.test.js` ve `npm test` çalıştır. `npm run demo:web` ile `http://127.0.0.1:4173/examples/web/lesson-designer.html` sayfasını aç. Form → doğrulama → JSON indirme → aynı JSON'u yeniden açma → yeniden doğrulama → Study Desk'e yükleme akışını test et.
6. Mobil 360px/393px, masaüstü 1280px, klavye odak sırası, ekran okuyucu ve hatalı/1MiB üstü dosya senaryolarını gerçek tarayıcıda ayrıca kabul et. Kullanıcının onayı olmadan PR/commit/push/merge/deploy yok.

## Yapılan kontroller ve kalanlar

- **Yerel izole Node testleri:** 14/14 başarılı (saf dönüştürücü, geri açma/round-trip, başarısız şema, web kaynak statik kontrolü). `node --check` ile yeni arayüz JavaScript sözdizimi kontrol edildi.
- **Yama uyumu:** Önceki PR #39 snapshot'ından hazırlanmış `examples/serve-web.js` ve `examples/web/index.html` üzerinde `git apply --check` başarılı.
- **Henüz yapılmayan:** gerçek `importOpenContentPack` ile *tam repo içindeki* çalışma testi, tüm `npm test` paketi, gerçek Chromium ve fiziksel cihaz etkileşim testi, bağımsız öğretmen kullanılabilirlik testi. Container Chromium başlatma denemesi sonuçlanmadı; bu yüzden tarayıcı başarısı iddiası yok.

## V1.1 sınırları

Birden fazla ünite, birden fazla kazanım, dersi var olan projeye birleştirme, görüntü dosyası, soru revizyon geçmişi veya öğretim içeriğinin grafik düzenleyicide serbest yeniden boyutlandırılması **yok**. İçe aktarma bilinçli biçimde yalnızca **bu sürümün eksiksiz koruyabildiği paketleri** kabul eder; başkasının kapsamlı içerik paketi ya da özel KPSS kaynakları için dönüştürme iddiası yoktur. Geliştirme adımları doğrulandıktan sonra çoklu içerik sürümlemesi ve kazanım ilişkileri planlanmalı.
