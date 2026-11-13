# FARK Study Engine 📚
### Öğrenmenin arkasındaki zekâ. / The thinking behind learning.

> **Her öğrenci farklı öğreniyorsa, neden hepsi aynı şekilde çalışmak zorunda?**
>
> *If every student learns differently, why should everyone study the same way?*

**FARK Study Engine**, öğrencilerin yalnızca ne kadar çalıştığını değil, **neyi öğrendiğini, nerede zorlandığını ve neyi ne zaman tekrar etmesi gerektiğini** anlamaya yardımcı olmayı hedefleyen açık kaynak bir öğrenme altyapısıdır.

Bir sınav hazırlık deneyimi geliştirirken kendimize sorduğumuz basit bir sorudan doğdu: *Daha fazla soru çözmek mi önemli, yoksa gerçekten öğrenmek mi?*

FARK'ın uzun vadeli hedefi; şeffaf tekrar planlamasını, hata analizini ve kişiye uyarlanabilen çalışma deneyimlerini herkesin geliştirebileceği küçük, bağımsız yazılım bileşenleriyle mümkün kılmak. Yalnızca tek bir sınav için değil; farklı dersler, sınavlar ve kendi kendine öğrenme süreçleri için.

**Bu bir başlangıç.** Bugün yayımlanan v0.1.0, bu büyük fikrin ilk ve küçük teknik çekirdeğidir; tamamlanmış bir yapay zekâ öğretmeni, uyarlanabilir öğrenme sistemi veya sınav platformu değildir.

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

## Nereye gitmek istiyoruz? / Roadmap

Bunlar **gelecek hedefleri**, bugün tamamlanmış özellikler değil:

1. **Hata analizi:** bilgi eksiği, kavram karışıklığı ve dikkatsizlik gibi hata nedenlerini öğrenciye veya öğretmene görünür kılmak
2. **Daha anlamlı tekrar:** tek tip aralıklar yerine, gerçek öğrenme verileriyle değerlendirilebilir tekrar stratejileri
3. **Konu bazlı ilerleme:** güçlü ve zayıf alanları, bilinmeyeni uydurmadan ölçmek
4. **Uyarlanabilir çalışma önerileri:** öğrencinin geçmiş performansından yararlanarak öneriler sunmak; sonuçlarını test etmek
5. **Taşınabilirlik ve erişilebilirlik:** veri içe/dışa aktarma, farklı diller ve basit erişilebilir örnek arayüzler

Bu hedefleri adım adım, testler ve açık teknik kararlarla geliştirmek istiyoruz. Eğitimle ilgili iddiaları kanıt olmadan ürün gerçeği gibi sunmayacağız.

## Why FARK? (English)

FARK Study Engine grew out of a broader idea for better exam preparation: **studying longer is not the same as learning better**.

Our goal is to build transparent, reusable tools for spaced review, mistake analysis, and eventually adaptive study experiences. The project is intended for learners, educators, and developers working across many subjects and exams—not a single test.

**Current status: early prototype (v0.1.0).** The repository currently contains a small dependency-free review scheduler, mistake-aware due queue, basic progress summaries, tests, documentation, and an example. Advanced learner modeling, validated adaptive algorithms, persistence, and a user interface are **not implemented**.

We welcome careful experimentation, constructive criticism, test cases, documentation improvements, and reproducible evidence.

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
