> [Read in English](README.md) · **Türkçe sürüm**

# FARK Study Engine 📚
### Öğrenmenin arkasındaki zekâ. / The thinking behind learning.

> **Her öğrenci farklı öğreniyorsa, neden hepsi aynı şekilde çalışmak zorunda?**
>
> *If every student learns differently, why should everyone study the same way?*

**FARK Study Engine**, öğrencilerin yalnızca ne kadar çalıştığını değil, **neyi öğrendiğini, nerede zorlandığını ve neyi ne zaman tekrar etmesi gerektiğini** anlamaya yardımcı olmayı hedefleyen açık kaynak bir öğrenme altyapısıdır.

Bir sınav hazırlık deneyimi geliştirirken kendimize sorduğumuz basit bir sorudan doğdu: *Daha fazla soru çözmek mi önemli, yoksa gerçekten öğrenmek mi?*

FARK'ın uzun vadeli hedefi; şeffaf tekrar planlamasını, hata analizini ve kişiye uyarlanabilen çalışma deneyimlerini herkesin geliştirebileceği küçük, bağımsız yazılım bileşenleriyle mümkün kılmak. Yalnızca tek bir sınav için değil; farklı dersler, sınavlar ve kendi kendine öğrenme süreçleri için.

**Bu bir başlangıç.** **v0.5.0**, açık kaynak öğrenme çekirdeğini SM-2 uyarlanabilir tekrar zamanlaması, tohumlanmış kohort simülatörü, Cloze & Anki TSV desteği, gömülebilir `<fark-study-deck>` Web Component ve sıfır bağımlılıklı MCP sunucusuyla genişletiyor — hâlâ kanıtlanmış tek bir "en iyi" yapay zekâ öğretmeni olduğunu iddia etmeden.

> **Canlı İnteraktif Stüdyo (yalnızca tarayıcıda, sunucusuz):** [merttiramisu-art.github.io/fark-study-engine](https://merttiramisu-art.github.io/fark-study-engine/)

![FARK Study Engine İnteraktif Stüdyo](docs/images/interactive-lab.png)

---

## Şu anda neler çalışıyor? / What's available today?

Sıfır harici bağımlılıklı, çevrimdışı kullanılabilen küçük bir JavaScript modülü:

- **Öğrenme kartı oluşturma:** konu, özgün soru, yanıt ve kimlikle kart tanımlama
- **Şeffaf tekrar zamanlaması:** `again`, `hard`, `good`, `easy` yanıtlarına göre bir sonraki tekrar tarihini hesaplama
- **Hataları öne çıkarma:** tekrar zamanı gelmiş kartları, hata geçmişini dikkate alarak sıralama
- **Dürüst ilerleme özeti:** yeni, çalışılmış, tekrar zamanı gelmiş kartlar ve gerçekten ölçülebilen yanıt istatistikleri
- **Öngörülebilir davranış:** aynı girdi ve tarihle aynı sonucu veren, değiştirilebilir yerel veri nesneleri

**Önemli sınırlar:** Verileri diske kaydetmez, buluta göndermez, hesap açtırmaz, öğrenmeyi bilimsel olarak kesin ölçtüğünü iddia etmez. Kalıcılık, kullanıcı arayüzü ve gerçek öğrenme etkililiği değerlendirmesi bu sürümde yoktur.

## Hemen dene / Quick start

**Node.js 20+** yeterli. API anahtarı, abonelik, paket kurulumu veya ücretli servis gerekmez.

```bash
npm test
npm run demo
npm run demo:planner
npm run demo:web  # http://127.0.0.1:4173/examples/web/
```

```js
import {
  createCard,
  reviewCard,
  selectReviewQueue,
  getStudySummary
} from './src/index.js';

const now = '2026-11-13T12:00:00Z';
const card = createCard({
  id: 'math-01',
  topic: 'Matematik',
  question: '2 + 3 kaçtır?',
  answer: '5'
});

const reviewed = reviewCard(card, 'good', now);
console.log(reviewed.dueAt); // 2026-11-14T12:00:00.000Z
console.log(selectReviewQueue([reviewed], '2026-11-14T12:00:00Z'));
console.log(getStudySummary([reviewed], now));
```

Tekrar aralıklarının nasıl belirlendiği [algoritma belgesinde](docs/algorithm.md) açıkça anlatılır. Kullanılan kurallar **deneme amaçlı sezgisel kurallardır**; kanıtlanmış kişisel öğrenme tahminleri değildir.


### v0.5.0 — yeni modüller, simülatör ve 3 sekmeli stüdyo

- **SM-2 stratejisi ve neden-duyarlı planlama (`./strategies`, `./planner`):** Gözlemlenebilir tekrar geçmişinden `1.3–2.8` kolaylık çarpanı hesaplayan `sm2` stratejisi, `reasonAware: true` ile kavram yanılgılarını dikkatsizlik hatalarının önüne alan önceliklendirme ve dürüst konu odaklı öneriler (`getStudyRecommendations`).
- **30 günlük kohort simülatörü (`simulateCohort`, `fark simulate`):** `steady`, `cramming` ve `missed-days` öğrenen profilleriyle `balanced`, `gentle`, `intensive` ve `sm2` stratejilerinin günlük tekrar yükü ve birikme eğilimini deterministik biçimde karşılaştırır.
- **Cloze, ters kartlar ve Anki TSV (`./interchange`):** Satır içi `{{boşluk}}`, `{{c1::yanıt::ipucu}}` ve `[[boşluk]]` ayrıştırıcı (`parseClozePrompt`), kartın orijinalini bozmadan Q↔A çeviren `reverseCardPrompt`, Anki/Quizlet `.tsv` dönüştürücüsü (`exportStudyTsv` / `importStudyTsv`) ve 4 örnek konu paketi (`buildSamplePack`).
- **Sıfır bağımlılıklı Web Component (`./widget`):** Herhangi bir statik HTML sayfasına gömülebilen `<fark-study-deck>` özel öğesi ([örnek sayfa](examples/widget-demo.html)).
- **Sıfır bağımlılıklı stdio MCP sunucusu (`./mcp`, `fark mcp`):** Claude Desktop / Claude Code gibi yapay zekâ istemcilerine JSON-RPC 2.0 üzerinden 7 deterministik FARK aracını sunar; böylece model zihinden tarih uydurmak yerine gerçek motoru çalıştırır.
- **3 sekmeli İnteraktif Stüdyo (`examples/web/`):** `Çalışma Stüdyosu`, `Strateji Simülatörü` ve `Deste Stüdyosu & Paketler` sekmeleriyle sadeleştirilmiş tasarım; TR/EN dil desteği, klavye kısayolları ve JSON/CSV/TSV/Markdown aktarımı (v0.2–v0.4 temelleri: [öğrenme içgörüleri](docs/learning-insights.md), [taşınabilir desteler](docs/portable-decks.md), [oturum planı](docs/session-planner.md), [CSV ve CLI](docs/csv-and-cli.md), [stratejiler](docs/strategies-and-markdown.md), [interaktif laboratuvar](docs/interactive-lab.md), [mobil QA](docs/mobile-qa.md)).

## Nereye gitmek istiyoruz? / Roadmap

Bunlar **gelecek hedefleri**, bugün tamamlanmış özellikler değil:

1. **Hata analizi:** bilgi eksiği, kavram karışıklığı ve dikkatsizlik gibi hata nedenlerini öğrenciye veya öğretmene görünür kılmak
2. **Daha anlamlı tekrar:** tek tip aralıklar yerine, gerçek öğrenme verileriyle değerlendirilebilir tekrar stratejileri
3. **Konu bazlı ilerleme:** güçlü ve zayıf alanları, bilinmeyeni uydurmadan ölçmek
4. **Uyarlanabilir çalışma önerileri:** öğrencinin geçmiş performansından yararlanarak öneriler sunmak; sonuçlarını test etmek
5. **Taşınabilirlik ve erişilebilirlik:** veri içe/dışa aktarma, farklı diller ve basit erişilebilir örnek arayüzler

Bu hedefleri adım adım, testler ve açık teknik kararlarla geliştirmek istiyoruz. Eğitimle ilgili iddiaları kanıt olmadan ürün gerçeği gibi sunmayacağız.

## Açık kaynak yaklaşımımız / Open-source principles

- **Şeffaflık:** Kullanıcıya gösterilen ilerlemenin neye dayandığı anlaşılabilir olmalı
- **Gizlilik:** Örnek veri dışında gerçek öğrenci bilgileri, kimlik bilgileri veya özel proje dosyaları burada yayımlanmaz
- **Özgünlük:** Telifli yayın soruları, kitap içerikleri ve izinsiz materyaller paylaşılmaz
- **Bağımsızlık:** Çekirdek, ücretli API veya takip servisine bağlı değildir
- **Titizlik:** Çalışıyor görünmesi yeterli değil; davranışların test edilmesi önemli

## Katılmak ister misin? / Contributing

Projeye katkı yapmak için deneyimli bir geliştirici olman gerekmiyor. Bir hatayı tekrar üretmek, test önermek, dokümantasyonu iyileştirmek veya küçük bir özellik geliştirmek bile değerli olabilir.

Önce [katkı rehberini](CONTRIBUTING.md) inceleyebilirsin. Özellikle öğrenme bilimiyle ilgili fikirlerin test edilebilir ve sınırlılıkları açık olacak biçimde sunulmasını önemsiyoruz.

## Lisans / License

[MIT](LICENSE) — özgürce kullanılabilir ve geliştirilebilir.
