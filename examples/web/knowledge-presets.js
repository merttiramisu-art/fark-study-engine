/**
 * Original, MIT-licensed bilingual (EN / TR) Knowledge Core presets for FARK Study Engine.
 * Zero copyrighted exam items. Every outcome includes >=2 distinct gradable MCQ items
 * and misconception-aligned editorial micro-lessons so content-readiness passes cleanly.
 */

export const KNOWLEDGE_CORE_PRESETS = Object.freeze({
  'english-grammar': {
    id: 'english-grammar',
    title: {
      en: 'English Tenses & Conditionals (A2 → B2)',
      tr: 'İngilizce Zamanlar ve Koşul Yapıları (A2 → B2)'
    },
    description: {
      en: 'Prerequisite chain from irregular verb forms to present perfect, conditionals, and passive voice.',
      tr: 'Düzensiz fiil biçimlerinden Present Perfect, koşul cümleleri ve edilgen yapıya uzanan ön koşul zinciri.'
    },
    core: {
      format: 'fark-knowledge-core',
      version: 1,
      units: [
        {
          id: 'u-eng-foundations',
          label: 'Verb Foundations & Aspect',
          labelTr: 'Fiil Temelleri ve Görünüş',
          prerequisiteIds: []
        },
        {
          id: 'u-eng-structures',
          label: 'Conditionals & Voice',
          labelTr: 'Koşul Yapıları ve Çatı',
          prerequisiteIds: ['u-eng-foundations']
        }
      ],
      outcomes: [
        {
          id: 'eng-verb-forms',
          unitId: 'u-eng-foundations',
          label: 'Past Simple vs Past Participle (V2 vs V3)',
          labelTr: 'Past Simple ve Past Participle (V2 / V3)',
          prerequisiteIds: []
        },
        {
          id: 'eng-present-perfect',
          unitId: 'u-eng-foundations',
          label: 'Present Perfect with Since / For',
          labelTr: 'Present Perfect ve Since / For Kullanımı',
          prerequisiteIds: ['eng-verb-forms']
        },
        {
          id: 'eng-conditionals',
          unitId: 'u-eng-structures',
          label: 'Type 1 & Type 2 Conditionals',
          labelTr: 'Tip 1 ve Tip 2 Koşul Cümleleri',
          prerequisiteIds: ['eng-present-perfect']
        },
        {
          id: 'eng-passive-voice',
          unitId: 'u-eng-structures',
          label: 'Passive Voice (be + V3)',
          labelTr: 'Edilgen Çatı (be + V3)',
          prerequisiteIds: ['eng-verb-forms']
        }
      ],
      resources: [
        {
          id: 'res-eng-v2v3',
          outcomeIds: ['eng-verb-forms'],
          misconceptionIds: ['v2-used-as-v3'],
          kind: 'micro-lesson',
          revision: 'r1',
          title: {
            en: 'Separating V2 (Past Simple) from V3 (Participle)',
            tr: 'V2 (Geçmiş Zaman) ile V3 (Ortaç) Ayrımı'
          },
          summary: {
            en: 'Use V2 alone for finished past actions (wrote, went). Use V3 after have/has/had or be (has written, was taken).',
            tr: 'Tamamlanmış geçmiş eylemlerde tek başına V2 (wrote, went) kullanılır. have/has/had veya be yardımcı fiillerinden sonra mutlaka V3 (written, taken) gelir.'
          },
          wrongIntuition: {
            en: 'Assuming the past form works everywhere after "have" (e.g. "have went", "has wrote").',
            tr: 'Geçmiş zaman biçiminin "have" sonrasında da kullanılabileceğini varsaymak ("have went", "has wrote").'
          },
          rightPrinciple: {
            en: 'Helper verb present (have/has/be) → always reach for V3 (gone, written, spoken).',
            tr: 'Yardımcı fiil (have/has/be) varsa her zaman 3. hâl (V3: gone, written, spoken) seçilir.'
          },
          example: {
            en: 'She wrote the draft yesterday (V2). She has written three drafts this week (have + V3).',
            tr: 'She wrote the draft yesterday (V2). She has written three drafts this week (have + V3).'
          }
        },
        {
          id: 'res-eng-v2v3-general',
          outcomeIds: ['eng-verb-forms'],
          kind: 'guide',
          revision: 'r1',
          title: {
            en: 'Core Irregular Verb Families',
            tr: 'Temel Düzensiz Fiil Aileleri'
          },
          summary: {
            en: 'Group irregular verbs by vowel shifts (write-wrote-written, speak-spoke-spoken, go-went-gone) to anchor V3 recall.',
            tr: 'Düzensiz fiilleri ünlü değişim kalıplarına göre gruplamak (write-wrote-written, speak-spoke-spoken) V3 hatırlamasını kolaylaştırır.'
          },
          wrongIntuition: {
            en: 'Adding -ed to common irregular verbs or mixing V2 and V3.',
            tr: 'Yaygın düzensiz fiillere -ed eklemek veya V2 ile V3 biçimlerini karıştırmak.'
          },
          rightPrinciple: {
            en: 'Pair every irregular verb with a short anchor phrase using "have + V3".',
            tr: 'Her düzensiz fiili "have + V3" içeren kısa bir kalıp cümleyle eşleştir.'
          },
          example: {
            en: 'speak → spoke → have spoken; break → broke → was broken.',
            tr: 'speak → spoke → have spoken; break → broke → was broken.'
          }
        },
        {
          id: 'res-eng-pp-sincefor',
          outcomeIds: ['eng-present-perfect'],
          misconceptionIds: ['since-vs-for', 'finished-time-with-perfect'],
          kind: 'micro-lesson',
          revision: 'r1',
          title: {
            en: 'Since (Starting Point) vs For (Duration)',
            tr: 'Since (Başlangıç Noktası) ve For (Süre Uzunluğu)'
          },
          summary: {
            en: 'Present Perfect links past to now. Pair "since" with a point on a calendar/clock (since 2022, since Monday) and "for" with a length of time (for three years).',
            tr: 'Present Perfect geçmişi şimdiye bağlar. "since" bir başlangıç anıyla (since 2022, since Monday), "for" ise toplam süre uzunluğuyla (for three years) kullanılır.'
          },
          wrongIntuition: {
            en: 'Using "since" with durations ("since 3 years") or using Present Perfect with finished anchors like "yesterday".',
            tr: 'Süre uzunluklarıyla "since" kullanmak ("since 3 years") veya "yesterday" gibi bitmiş zaman zarflarıyla Present Perfect kurmak.'
          },
          rightPrinciple: {
            en: 'Duration → for. Starting timestamp → since. Finished past time marker → Past Simple.',
            tr: 'Süre → for. Başlangıç anı → since. Bitmiş geçmiş zaman zarfı → Past Simple.'
          },
          example: {
            en: 'I have lived here for four years / since 2022. I moved here in 2022.',
            tr: 'I have lived here for four years / since 2022. I moved here in 2022.'
          }
        },
        {
          id: 'res-eng-pp-general',
          outcomeIds: ['eng-present-perfect'],
          kind: 'guide',
          revision: 'r1',
          title: {
            en: 'When Present Perfect Fits Best',
            tr: 'Present Perfect Ne Zaman Seçilir?'
          },
          summary: {
            en: 'Use have/has + V3 for life experiences, unfinished time periods, and recent actions with a present result.',
            tr: 'Yaşam deneyimleri, henüz bitmemiş zaman dilimleri ve sonucu şimdiye uzanan eylemler için have/has + V3 kullanılır.'
          },
          wrongIntuition: {
            en: 'Translating every Turkish "-di" directly as Past Simple even when the state continues today.',
            tr: 'Türkçedeki her "-di" ekini, eylem bugün hâlâ sürerken bile Past Simple ile çevirmek.'
          },
          rightPrinciple: {
            en: 'Ask: "Is this bridge still connected to now?" If yes, choose Present Perfect.',
            tr: 'Kendine sor: "Bu durumun ucu hâlâ bugüne bağlı mı?" Evet ise Present Perfect seç.'
          },
          example: {
            en: 'She has worked at the lab since March (still works there now).',
            tr: 'She has worked at the lab since March (hâlâ orada çalışıyor).'
          }
        },
        {
          id: 'res-eng-cond-would',
          outcomeIds: ['eng-conditionals'],
          misconceptionIds: ['would-in-if-clause'],
          kind: 'micro-lesson',
          revision: 'r1',
          title: {
            en: 'Keep "will / would" Out of the If-Clause',
            tr: 'If-Cümleciğinde "will / would" Kullanmama Kuralı'
          },
          summary: {
            en: 'In standard Type 1 and Type 2 conditionals, the condition clause carries Present Simple or Past Simple, while "will" or "would" belongs in the result clause.',
            tr: 'Standart Tip 1 ve Tip 2 koşul cümlelerinde koşul (if) tarafı Present Simple veya Past Simple alır; "will" ya da "would" yalnızca sonuç cümleciğinde yer alır.'
          },
          wrongIntuition: {
            en: 'Writing "If I would have time, I would visit" by mirroring "would" into both clauses.',
            tr: '"If I would have time, I would visit" şeklinde iki tarafa birden "would" koymak.'
          },
          rightPrinciple: {
            en: 'Type 1: If + Present, will + V1. Type 2: If + Past, would + V1.',
            tr: 'Tip 1: If + Present, will + V1. Tip 2: If + Past, would + V1.'
          },
          example: {
            en: 'If I had more time, I would learn Japanese. (Not: If I would have...)',
            tr: 'If I had more time, I would learn Japanese. (Yanlış: If I would have...)'
          }
        },
        {
          id: 'res-eng-cond-general',
          outcomeIds: ['eng-conditionals'],
          kind: 'guide',
          revision: 'r1',
          title: {
            en: 'Real Future vs Hypothetical Present Conditions',
            tr: 'Gerçek Gelecek vs Varsayımsal Koşullar'
          },
          summary: {
            en: 'Match real future possibilities with Type 1 (Present + will) and imaginary/unlikely scenarios with Type 2 (Past + would).',
            tr: 'Gerçekleşmesi olası gelecek durumlar için Tip 1, varsayımsal veya gerçek dışı durumlar için Tip 2 kullanılır.'
          },
          wrongIntuition: {
            en: 'Thinking Past Simple in Type 2 refers to past time.',
            tr: 'Tip 2 içindeki Past Simple fiilinin geçmiş zamandan söz ettiğini sanmak.'
          },
          rightPrinciple: {
            en: 'In Type 2, Past Simple signals distance from reality, not past time.',
            tr: 'Tip 2 cümlelerinde Past Simple geçmiş zamanı değil, gerçeklikten uzaklığı (varsayımı) gösterir.'
          },
          example: {
            en: 'If it rains tomorrow, we will stay inside (real). If I were a bird, I would fly (imaginary).',
            tr: 'If it rains tomorrow, we will stay inside (gerçek). If I were a bird, I would fly (hayali).'
          }
        },
        {
          id: 'res-eng-passive',
          outcomeIds: ['eng-passive-voice'],
          misconceptionIds: ['missing-be-in-passive'],
          kind: 'micro-lesson',
          revision: 'r1',
          title: {
            en: 'Passive Formula: Conjugated "be" + V3',
            tr: 'Edilgen Formül: Çekimli "be" + V3'
          },
          summary: {
            en: 'Every passive verb phrase requires two parts: a tense-matched form of "be" (is/was/has been/will be) plus the past participle (V3).',
            tr: 'Her edilgen yüklem iki parça gerektirir: zamana göre çekimlenmiş "be" (is/was/has been/will be) ve ana fiilin 3. hâli (V3).'
          },
          wrongIntuition: {
            en: 'Dropping "be" ("The bridge built in 1990") or using V1 after "was" ("was build").',
            tr: '"be" fiilini unutmak ("The bridge built in 1990") veya "was" sonrası V1 yazmak ("was build").'
          },
          rightPrinciple: {
            en: 'Ask: Does the subject perform the action or receive it? If it receives it → [be in tense] + V3.',
            tr: 'Özne işi yapıyor mu yoksa işten etkileniyor mu? Etkileniyorsa → [zamana uygun be] + V3.'
          },
          example: {
            en: 'The report was written by the team. The parcels are delivered every morning.',
            tr: 'The report was written by the team. The parcels are delivered every morning.'
          }
        }
      ],
      questions: [
        {
          id: 'q-eng-v2v3-1',
          outcomeIds: ['eng-verb-forms'],
          resourceId: 'res-eng-v2v3',
          revision: 'r1',
          prompt: {
            en: 'Choose the grammatically accurate sentence: "She has ___ three articles this month."',
            tr: 'Dilbilgisi açısından doğru olan seçeneği belirle: "She has ___ three articles this month."'
          },
          choices: [
            { id: 'a', label: { en: 'wrote', tr: 'wrote' }, misconceptionId: 'v2-used-as-v3' },
            { id: 'b', label: { en: 'written', tr: 'written' } },
            { id: 'c', label: { en: 'writed', tr: 'writed' }, misconceptionId: 'v2-used-as-v3' }
          ],
          correctChoiceId: 'b'
        },
        {
          id: 'q-eng-v2v3-2',
          outcomeIds: ['eng-verb-forms'],
          resourceId: 'res-eng-v2v3-general',
          revision: 'r1',
          prompt: {
            en: 'Complete the sentence with the correct verb form: "Have you ever ___ to a live orchestra?"',
            tr: 'Cümleyi doğru fiil biçimiyle tamamla: "Have you ever ___ to a live orchestra?"'
          },
          choices: [
            { id: 'a', label: { en: 'went', tr: 'went' }, misconceptionId: 'v2-used-as-v3' },
            { id: 'b', label: { en: 'go', tr: 'go' } },
            { id: 'c', label: { en: 'been', tr: 'been' } }
          ],
          correctChoiceId: 'c'
        },
        {
          id: 'q-eng-pp-1',
          outcomeIds: ['eng-present-perfect'],
          resourceId: 'res-eng-pp-sincefor',
          revision: 'r1',
          prompt: {
            en: 'Which sentence correctly expresses an unfinished duration?',
            tr: 'Hangi cümle hâlâ süren bir zaman aralığını doğru biçimde ifade eder?'
          },
          choices: [
            { id: 'a', label: { en: 'I have studied chemistry since three years.', tr: 'I have studied chemistry since three years.' }, misconceptionId: 'since-vs-for' },
            { id: 'b', label: { en: 'I have studied chemistry for three years.', tr: 'I have studied chemistry for three years.' } },
            { id: 'c', label: { en: 'I have studied chemistry yesterday.', tr: 'I have studied chemistry yesterday.' }, misconceptionId: 'finished-time-with-perfect' }
          ],
          correctChoiceId: 'b'
        },
        {
          id: 'q-eng-pp-2',
          outcomeIds: ['eng-present-perfect'],
          resourceId: 'res-eng-pp-general',
          revision: 'r1',
          prompt: {
            en: 'Select the accurate pairing with a starting point in time:',
            tr: 'Bir başlangıç anıyla doğru eşleşen cümleyi seç:'
          },
          choices: [
            { id: 'a', label: { en: 'We have known each other for 2019.', tr: 'We have known each other for 2019.' }, misconceptionId: 'since-vs-for' },
            { id: 'b', label: { en: 'We have known each other since 2019.', tr: 'We have known each other since 2019.' } },
            { id: 'c', label: { en: 'We have knew each other since 2019.', tr: 'We have knew each other since 2019.' }, misconceptionId: 'v2-used-as-v3' }
          ],
          correctChoiceId: 'b'
        },
        {
          id: 'q-eng-cond-1',
          outcomeIds: ['eng-conditionals'],
          resourceId: 'res-eng-cond-would',
          revision: 'r1',
          prompt: {
            en: 'Choose the standard Type 2 hypothetical conditional:',
            tr: 'Standart Tip 2 varsayımsal koşul cümlesini seç:'
          },
          choices: [
            { id: 'a', label: { en: 'If I would have a studio, I would record daily.', tr: 'If I would have a studio, I would record daily.' }, misconceptionId: 'would-in-if-clause' },
            { id: 'b', label: { en: 'If I had a studio, I would record daily.', tr: 'If I had a studio, I would record daily.' } },
            { id: 'c', label: { en: 'If I have a studio, I would record daily.', tr: 'If I have a studio, I would record daily.' } }
          ],
          correctChoiceId: 'b'
        },
        {
          id: 'q-eng-cond-2',
          outcomeIds: ['eng-conditionals'],
          resourceId: 'res-eng-cond-general',
          revision: 'r1',
          prompt: {
            en: 'Pick the correct Type 1 conditional for a real future plan:',
            tr: 'Gerçek bir gelecek planı için doğru Tip 1 koşul cümlesini seç:'
          },
          choices: [
            { id: 'a', label: { en: 'If the train will arrive early, we will get coffee.', tr: 'If the train will arrive early, we will get coffee.' }, misconceptionId: 'would-in-if-clause' },
            { id: 'b', label: { en: 'If the train arrives early, we will get coffee.', tr: 'If the train arrives early, we will get coffee.' } },
            { id: 'c', label: { en: 'If the train arrived early, we will get coffee.', tr: 'If the train arrived early, we will get coffee.' } }
          ],
          correctChoiceId: 'b'
        },
        {
          id: 'q-eng-passive-1',
          outcomeIds: ['eng-passive-voice'],
          resourceId: 'res-eng-passive',
          revision: 'r1',
          prompt: {
            en: 'Complete the passive sentence: "The observatory ___ in 1968."',
            tr: 'Edilgen cümleyi tamamla: "The observatory ___ in 1968."'
          },
          choices: [
            { id: 'a', label: { en: 'built', tr: 'built' }, misconceptionId: 'missing-be-in-passive' },
            { id: 'b', label: { en: 'was build', tr: 'was build' }, misconceptionId: 'missing-be-in-passive' },
            { id: 'c', label: { en: 'was built', tr: 'was built' } }
          ],
          correctChoiceId: 'c'
        },
        {
          id: 'q-eng-passive-2',
          outcomeIds: ['eng-passive-voice'],
          resourceId: 'res-eng-passive',
          revision: 'r1',
          prompt: {
            en: 'Which sentence correctly uses present passive voice?',
            tr: 'Hangi cümle geniş zaman edilgen çatıyı doğru kullanır?'
          },
          choices: [
            { id: 'a', label: { en: 'Glass bottles recycle at this facility.', tr: 'Glass bottles recycle at this facility.' }, misconceptionId: 'missing-be-in-passive' },
            { id: 'b', label: { en: 'Glass bottles are recycled at this facility.', tr: 'Glass bottles are recycled at this facility.' } },
            { id: 'c', label: { en: 'Glass bottles are recycle at this facility.', tr: 'Glass bottles are recycle at this facility.' }, misconceptionId: 'missing-be-in-passive' }
          ],
          correctChoiceId: 'b'
        }
      ],
      mappings: []
    }
  },

  'cs-algorithms': {
    id: 'cs-algorithms',
    title: {
      en: 'Algorithms & Data Structures Core',
      tr: 'Algoritma Analizi ve Veri Yapıları Çekirdeği'
    },
    description: {
      en: 'From asymptotic growth (Big-O) to binary search preconditions, hash table trade-offs, and recursion call stacks.',
      tr: 'Asimptotik karmaşıklıktan (Big-O) ikili arama ön koşullarına, özet tablolarına ve özyineleme yığınına uzanan akış.'
    },
    core: {
      format: 'fark-knowledge-core',
      version: 1,
      units: [
        {
          id: 'u-cs-complexity',
          label: 'Complexity & Search',
          labelTr: 'Karmaşıklık ve Arama',
          prerequisiteIds: []
        },
        {
          id: 'u-cs-structures',
          label: 'Hashing & Recursion',
          labelTr: 'Özetleme ve Özyineleme',
          prerequisiteIds: ['u-cs-complexity']
        }
      ],
      outcomes: [
        {
          id: 'cs-big-o',
          unitId: 'u-cs-complexity',
          label: 'Big-O Asymptotic Growth',
          labelTr: 'Big-O Asimptotik Büyüme',
          prerequisiteIds: []
        },
        {
          id: 'cs-binary-search',
          unitId: 'u-cs-complexity',
          label: 'Binary Search Preconditions & Complexity',
          labelTr: 'İkili Arama Ön Koşulu ve Karmaşıklığı',
          prerequisiteIds: ['cs-big-o']
        },
        {
          id: 'cs-hash-tables',
          unitId: 'u-cs-structures',
          label: 'Hash Table Average vs Worst Case',
          labelTr: 'Hash Tablosu Ortalama vs En Kötü Durum',
          prerequisiteIds: ['cs-big-o']
        },
        {
          id: 'cs-recursion-stack',
          unitId: 'u-cs-structures',
          label: 'Recursion Base Cases & Stack Space',
          labelTr: 'Özyineleme Taban Durumu ve Yığın Belleği',
          prerequisiteIds: ['cs-binary-search']
        }
      ],
      resources: [
        {
          id: 'res-cs-bigo',
          outcomeIds: ['cs-big-o'],
          misconceptionIds: ['constant-factor-confusion'],
          kind: 'micro-lesson',
          revision: 'r1',
          title: {
            en: 'Dropping Constants & Lower-Order Terms in Big-O',
            tr: 'Big-O Gösteriminde Sabitleri ve Küçük Terimleri Atmak'
          },
          summary: {
            en: 'Big-O describes how operations scale as n grows very large. Constant multipliers (3n) and lower-order terms (+50) collapse into the dominant term: O(n).',
            tr: 'Big-O, n çok büyüdüğünde işlem sayısının nasıl arttığını ifade eder. Sabit çarpanlar (3n) ve küçük terimler (+50) baskın terime indirgenir: O(n).'
          },
          wrongIntuition: {
            en: 'Treating two sequential O(n) loops as O(n²) instead of O(2n) = O(n).',
            tr: 'Art arda gelen iki O(n) döngüyü O(2n) = O(n) yerine O(n²) sanmak.'
          },
          rightPrinciple: {
            en: 'Sequential steps add (O(n) + O(n) = O(n)); nested loops multiply (O(n) × O(n) = O(n²)).',
            tr: 'Ardışık adımlar toplanır (O(n) + O(n) = O(n)); iç içe döngüler çarpılır (O(n) × O(n) = O(n²)).'
          },
          example: {
            en: 'One pass to find max + one pass to normalize = 2n steps = O(n).',
            tr: 'Maksimumu bulmak için 1 geçiş + normalize için 1 geçiş = 2n adım = O(n).'
          }
        },
        {
          id: 'res-cs-bsearch',
          outcomeIds: ['cs-binary-search'],
          misconceptionIds: ['unsorted-binary-search'],
          kind: 'micro-lesson',
          revision: 'r1',
          title: {
            en: 'Why Binary Search Requires Sorted Order',
            tr: 'İkili Arama Neden Sıralı Veri Gerektirir?'
          },
          summary: {
            en: 'Binary search discards half the search space on each comparison. That elimination is only valid when the array is monotonically ordered.',
            tr: 'İkili arama her karşılaştırmada arama uzayının yarısını eler. Bu eleme ancak dizi sıralı (monotonik) olduğunda doğrudur.'
          },
          wrongIntuition: {
            en: 'Applying binary search directly to an unsorted array expecting O(log n) lookup.',
            tr: 'Sırasız bir dizide doğrudan ikili arama çalıştırıp O(log n) sonuç beklemek.'
          },
          rightPrinciple: {
            en: 'If data is unsorted and searched once, linear scan O(n) beats sorting O(n log n) + binary search.',
            tr: 'Veri sırasızsa ve yalnızca bir kez aranacaksa doğrusal tarama O(n), sıralama + ikili aramadan hızlıdır.'
          },
          example: {
            en: 'In a sorted array of 1,024 items, binary search checks at most 10–11 midpoints (log₂ 1024 = 10).',
            tr: '1.024 elemanlı sıralı bir dizide ikili arama en fazla 10–11 orta nokta kontrol eder (log₂ 1024 = 10).'
          }
        },
        {
          id: 'res-cs-hash',
          outcomeIds: ['cs-hash-tables'],
          misconceptionIds: ['always-o1-hash'],
          kind: 'micro-lesson',
          revision: 'r1',
          title: {
            en: 'Hash Collisions: Average O(1) vs Worst-Case O(n)',
            tr: 'Hash Çakışmaları: Ortalama O(1) vs En Kötü O(n)'
          },
          summary: {
            en: 'With a uniform hash function and bounded load factor, lookup is O(1) on average. If all keys collide into one bucket, lookup degrades to O(n).',
            tr: 'Dengeli bir özet fonksiyonu ve kontrollü doluluk oranıyla arama ortalama O(1) sürer. Tüm anahtarlar tek kovada çakışırsa arama O(n) olur.'
          },
          wrongIntuition: {
            en: 'Assuming hash table lookup is strictly O(1) under every possible input.',
            tr: 'Hash tablosu erişiminin her olası girdide kesinlikle O(1) olduğunu varsaymak.'
          },
          rightPrinciple: {
            en: 'Always distinguish expected average-case O(1) from worst-case collision chain O(n).',
            tr: 'Beklenen ortalama durum O(1) ile çakışma zinciri oluşan en kötü durum O(n) ayrımını daima koru.'
          },
          example: {
            en: 'A poor hash function returning key % 1 maps every key to bucket 0 → linked scan of all n items.',
            tr: 'Her anahtarı 0. kovaya eşleyen zayıf bir özet fonksiyonu tüm n elemanın tek tek taranmasına yol açar.'
          }
        },
        {
          id: 'res-cs-recursion',
          outcomeIds: ['cs-recursion-stack'],
          misconceptionIds: ['zero-space-recursion'],
          kind: 'micro-lesson',
          revision: 'r1',
          title: {
            en: 'Call Stack Frames and Base Cases',
            tr: 'Çağrı Yığını Çerçeveleri ve Taban Durumu'
          },
          summary: {
            en: 'Every active recursive call pushes a frame onto the call stack. Even without allocating arrays, recursion of depth d uses O(d) stack space.',
            tr: 'Her aktif özyinelemeli çağrı yığına (call stack) yeni bir çerçeve ekler. Ek dizi ayırmasanız bile d derinliğinde özyineleme O(d) bellek kullanır.'
          },
          wrongIntuition: {
            en: 'Believing recursive functions use O(1) auxiliary space when they declare no arrays.',
            tr: 'Dizi tanımlamayan özyinelemeli fonksiyonların O(1) ek bellek kullandığını sanmak.'
          },
          rightPrinciple: {
            en: 'Space complexity includes call-stack depth; every recursion must shrink toward an unreachable-free base case.',
            tr: 'Bellek karmaşıklığı çağrı yığını derinliğini içerir; her adım taban durumuna kesin olarak yaklaşmalıdır.'
          },
          example: {
            en: 'Recursive factorial(n) creates n stack frames → O(n) space; iterative loop uses O(1) space.',
            tr: 'Özyinelemeli factorial(n) n adet yığın çerçevesi oluşturur → O(n) bellek; döngü ise O(1) kullanır.'
          }
        }
      ],
      questions: [
        {
          id: 'q-cs-bigo-1',
          outcomeIds: ['cs-big-o'],
          resourceId: 'res-cs-bigo',
          revision: 'r1',
          prompt: {
            en: 'A function runs two separate sequential loops over an array of length n. What is its Big-O time complexity?',
            tr: 'Bir fonksiyon n uzunluğundaki dizi üzerinde art arda iki ayrı döngü çalıştırıyor. Big-O zaman karmaşıklığı nedir?'
          },
          choices: [
            { id: 'a', label: { en: 'O(n²)', tr: 'O(n²)' }, misconceptionId: 'constant-factor-confusion' },
            { id: 'b', label: { en: 'O(n)', tr: 'O(n)' } },
            { id: 'c', label: { en: 'O(log n)', tr: 'O(log n)' } }
          ],
          correctChoiceId: 'b'
        },
        {
          id: 'q-cs-bigo-2',
          outcomeIds: ['cs-big-o'],
          resourceId: 'res-cs-bigo',
          revision: 'r1',
          prompt: {
            en: 'Which expression simplifies to O(n²)?',
            tr: 'Aşağıdaki ifadelerden hangisi Big-O olarak O(n²) biçimine sadeleşir?'
          },
          choices: [
            { id: 'a', label: { en: '5n + 200', tr: '5n + 200' }, misconceptionId: 'constant-factor-confusion' },
            { id: 'b', label: { en: '0.5n² + 40n + 12', tr: '0.5n² + 40n + 12' } },
            { id: 'c', label: { en: 'n log n + 10n', tr: 'n log n + 10n' } }
          ],
          correctChoiceId: 'b'
        },
        {
          id: 'q-cs-bsearch-1',
          outcomeIds: ['cs-binary-search'],
          resourceId: 'res-cs-bsearch',
          revision: 'r1',
          prompt: {
            en: 'What precondition must hold before binary search can reliably find a target in an array?',
            tr: 'İkili aramanın bir dizide hedefi güvenilir biçimde bulabilmesi için hangi ön koşul sağlanmalıdır?'
          },
          choices: [
            { id: 'a', label: { en: 'The array length must be a power of two.', tr: 'Dizi uzunluğu 2\'nin kuvveti olmalıdır.' } },
            { id: 'b', label: { en: 'The array must be sorted according to the comparison key.', tr: 'Dizi karşılaştırma anahtarına göre sıralı olmalıdır.' } },
            { id: 'c', label: { en: 'No precondition; binary search works on any unsorted array.', tr: 'Ön koşul yoktur; sırasız her dizide çalışır.' }, misconceptionId: 'unsorted-binary-search' }
          ],
          correctChoiceId: 'b'
        },
        {
          id: 'q-cs-bsearch-2',
          outcomeIds: ['cs-binary-search'],
          resourceId: 'res-cs-bsearch',
          revision: 'r1',
          prompt: {
            en: 'You receive an unsorted list of 10,000 items and need to check once whether a single ID exists. Which approach has lower asymptotic cost?',
            tr: '10.000 elemanlı sırasız bir listede tek bir kimliğin olup olmadığını yalnızca bir kez kontrol edeceksiniz. Asimptotik olarak daha ucuz yöntem hangisidir?'
          },
          choices: [
            { id: 'a', label: { en: 'Binary search directly without sorting', tr: 'Sıralamadan doğrudan ikili arama yapmak' }, misconceptionId: 'unsorted-binary-search' },
            { id: 'b', label: { en: 'Linear scan in O(n)', tr: 'O(n) doğrusal tarama yapmak' } },
            { id: 'c', label: { en: 'Sort in O(n log n) then binary search once', tr: 'Önce O(n log n) sıralayıp sonra tek arama yapmak' } }
          ],
          correctChoiceId: 'b'
        },
        {
          id: 'q-cs-hash-1',
          outcomeIds: ['cs-hash-tables'],
          resourceId: 'res-cs-hash',
          revision: 'r1',
          prompt: {
            en: 'What is the worst-case lookup time of a chained hash table when every key hashes to the same bucket?',
            tr: 'Tüm anahtarların aynı kovada çakıştığı zincirlemeli bir hash tablosunda en kötü durum arama karmaşıklığı nedir?'
          },
          choices: [
            { id: 'a', label: { en: 'O(1)', tr: 'O(1)' }, misconceptionId: 'always-o1-hash' },
            { id: 'b', label: { en: 'O(n)', tr: 'O(n)' } },
            { id: 'c', label: { en: 'O(log n)', tr: 'O(log n)' } }
          ],
          correctChoiceId: 'b'
        },
        {
          id: 'q-cs-hash-2',
          outcomeIds: ['cs-hash-tables'],
          resourceId: 'res-cs-hash',
          revision: 'r1',
          prompt: {
            en: 'Why do production hash tables resize (rehash) when the load factor grows too high?',
            tr: 'Gerçek uygulamalarda hash tabloları doluluk oranı yükseldiğinde neden yeniden boyutlandırılır (rehash)?'
          },
          choices: [
            { id: 'a', label: { en: 'To keep collision chains short and preserve O(1) expected lookup', tr: 'Çakışma zincirlerini kısa tutup ortalama O(1) erişimi korumak için' } },
            { id: 'b', label: { en: 'Because hash tables sort keys alphabetically', tr: 'Hash tabloları anahtarları alfabetik sıraladığı için' }, misconceptionId: 'always-o1-hash' },
            { id: 'c', label: { en: 'To eliminate the need for a hash function', tr: 'Özet fonksiyonuna ihtiyacı ortadan kaldırmak için' } }
          ],
          correctChoiceId: 'a'
        },
        {
          id: 'q-cs-rec-1',
          outcomeIds: ['cs-recursion-stack'],
          resourceId: 'res-cs-recursion',
          revision: 'r1',
          prompt: {
            en: 'A recursive function sums an array of length n by calling sum(i + 1) until i === n, without creating new arrays. What is its auxiliary space complexity?',
            tr: 'Yeni dizi oluşturmadan sum(i + 1) çağrısıyla n elemanlı diziyi toplayan özyinelemeli fonksiyonun ek bellek karmaşıklığı nedir?'
          },
          choices: [
            { id: 'a', label: { en: 'O(1) because no arrays are allocated', tr: 'Yeni dizi ayrılmadığı için O(1)' }, misconceptionId: 'zero-space-recursion' },
            { id: 'b', label: { en: 'O(n) due to n active call-stack frames', tr: 'n adet aktif çağrı yığını çerçevesi yüzünden O(n)' } },
            { id: 'c', label: { en: 'O(log n)', tr: 'O(log n)' } }
          ],
          correctChoiceId: 'b'
        },
        {
          id: 'q-cs-rec-2',
          outcomeIds: ['cs-recursion-stack'],
          resourceId: 'res-cs-recursion',
          revision: 'r1',
          prompt: {
            en: 'What is the auxiliary call-stack space complexity of recursive binary search on a sorted array of size n?',
            tr: 'n elemanlı sıralı dizide özyinelemeli ikili aramanın çağrı yığını bellek karmaşıklığı nedir?'
          },
          choices: [
            { id: 'a', label: { en: 'O(1)', tr: 'O(1)' }, misconceptionId: 'zero-space-recursion' },
            { id: 'b', label: { en: 'O(log n)', tr: 'O(log n)' } },
            { id: 'c', label: { en: 'O(n²)', tr: 'O(n²)' } }
          ],
          correctChoiceId: 'b'
        }
      ],
      mappings: []
    }
  },

  'math-foundations': {
    id: 'math-foundations',
    title: {
      en: 'Ratios, Linear Functions & Probability',
      tr: 'Oran-Orantı, Doğrusal Fonksiyonlar ve Olasılık'
    },
    description: {
      en: 'Conceptual progression from proportional scaling to slope/intercept interpretation and independent probability.',
      tr: 'Orantılı ölçeklemeden eğim-kesişim yorumuna ve bağımsız olay olasılığına uzanan kavramsal gelişim.'
    },
    core: {
      format: 'fark-knowledge-core',
      version: 1,
      units: [
        {
          id: 'u-math-prop',
          label: 'Proportional Reasoning',
          labelTr: 'Orantısal Muhakeme',
          prerequisiteIds: []
        },
        {
          id: 'u-math-models',
          label: 'Functions & Uncertainty',
          labelTr: 'Fonksiyonlar ve Olasılık',
          prerequisiteIds: ['u-math-prop']
        }
      ],
      outcomes: [
        {
          id: 'math-ratios',
          unitId: 'u-math-prop',
          label: 'Multiplicative vs Additive Scaling',
          labelTr: 'Çarpımsal ve Toplamsal Ölçekleme',
          prerequisiteIds: []
        },
        {
          id: 'math-linear-fn',
          unitId: 'u-math-models',
          label: 'Slope as Rate of Change (Δy / Δx)',
          labelTr: 'Değişim Hızı Olarak Eğim (Δy / Δx)',
          prerequisiteIds: ['math-ratios']
        },
        {
          id: 'math-probability',
          unitId: 'u-math-models',
          label: 'Independent Events & Memoryless Trials',
          labelTr: 'Bağımsız Olaylar ve Belleksiz Denemeler',
          prerequisiteIds: ['math-ratios']
        }
      ],
      resources: [
        {
          id: 'res-math-ratios',
          outcomeIds: ['math-ratios'],
          misconceptionIds: ['additive-scaling'],
          kind: 'micro-lesson',
          revision: 'r1',
          title: {
            en: 'Ratios Scale by Multiplication, Not Addition',
            tr: 'Oranlar Eklemeyle Değil Çarpmayla Ölçeklenir'
          },
          summary: {
            en: 'Equivalent ratios preserve the multiplicative factor between parts. Adding the same constant to both terms changes the ratio.',
            tr: 'Denk oranlar parçalar arasındaki çarpımsal katı korur. Her iki terime aynı sayıyı eklemek oranı bozar.'
          },
          wrongIntuition: {
            en: 'Thinking 2:3 equals 4:5 because +2 was added to both numbers.',
            tr: 'Her iki sayıya +2 eklendiği için 2:3 ile 4:5 oranlarının eşit olduğunu sanmak.'
          },
          rightPrinciple: {
            en: 'Multiply or divide both quantities by the same nonzero factor: 2:3 = 4:6 = 6:9.',
            tr: 'İki niceliği de sıfırdan farklı aynı çarpanla çarp veya böl: 2:3 = 4:6 = 6:9.'
          },
          example: {
            en: 'A 2:5 syrup-to-water mix scaled to 6 cups of syrup needs 6 × (5/2) = 15 cups of water.',
            tr: '2:5 şurup-su karışımı 6 ölçek şuruba çıkarıldığında 6 × (5/2) = 15 ölçek su gerekir.'
          }
        },
        {
          id: 'res-math-slope',
          outcomeIds: ['math-linear-fn'],
          misconceptionIds: ['inverted-slope'],
          kind: 'micro-lesson',
          revision: 'r1',
          title: {
            en: 'Rise Over Run: Δy Divided by Δx',
            tr: 'Dikey Değişim / Yatay Değişim: Δy / Δx'
          },
          summary: {
            en: 'Slope measures how much the output y changes for each +1 unit increase in input x: m = (y₂ - y₁) / (x₂ - x₁).',
            tr: 'Eğim, girdi x her +1 birim arttığında çıktı y\'nin ne kadar değiştiğini ölçer: m = (y₂ - y₁) / (x₂ - x₁).'
          },
          wrongIntuition: {
            en: 'Computing Δx / Δy (run over rise) or subtracting coordinates in opposite order.',
            tr: 'Δx / Δy (yatay / dikey) hesaplamak veya noktaların sırasını ters çevirmek.'
          },
          rightPrinciple: {
            en: 'Keep vertical change (y) on top and subtract points in the same consistent order.',
            tr: 'Dikey değişimi (y) daima payda tut ve iki noktayı aynı sırayla çıkar.'
          },
          example: {
            en: 'Through (1, 3) and (5, 11): m = (11 - 3) / (5 - 1) = 8 / 4 = 2.',
            tr: '(1, 3) ve (5, 11) noktalarından geçen doğrunun eğimi: m = (11 - 3) / (5 - 1) = 8 / 4 = 2.'
          }
        },
        {
          id: 'res-math-prob',
          outcomeIds: ['math-probability'],
          misconceptionIds: ['gamblers-fallacy'],
          kind: 'micro-lesson',
          revision: 'r1',
          title: {
            en: 'Independent Trials Have No Memory',
            tr: 'Bağımsız Denemelerin Belleği Yoktur'
          },
          summary: {
            en: 'For a fair coin or die, past outcomes do not alter the probability of the next trial. Joint probability of independent events multiplies: P(A and B) = P(A) × P(B).',
            tr: 'Hilesiz bir para veya zarda geçmiş sonuçlar bir sonraki atışın olasılığını değiştirmez. Bağımsız olayların birlikte gerçekleşme olasılığı çarpılır: P(A ve B) = P(A) × P(B).'
          },
          wrongIntuition: {
            en: 'Believing Tails is "overdue" after 4 Heads in a row (Gambler\'s Fallacy).',
            tr: 'Üst üste 4 yazı geldikten sonra tura gelme olasılığının arttığını düşünmek (Kumarbaz Yanılgısı).'
          },
          rightPrinciple: {
            en: 'Each fair flip remains exactly 1/2 (50%), regardless of prior streaks.',
            tr: 'Önceki seriden bağımsız olarak hilesiz her atışta olasılık tam olarak 1/2 (%50) kalır.'
          },
          example: {
            en: 'Probability of two Heads in a row = 1/2 × 1/2 = 1/4, but the 5th flip alone is still 1/2.',
            tr: 'Üst üste iki yazı olasılığı = 1/2 × 1/2 = 1/4\'tür; ancak tek başına 5. atış hâlâ 1/2\'dir.'
          }
        }
      ],
      questions: [
        {
          id: 'q-math-ratio-1',
          outcomeIds: ['math-ratios'],
          resourceId: 'res-math-ratios',
          revision: 'r1',
          prompt: {
            en: 'A paint recipe mixes 2 parts blue to 3 parts yellow. If you use 6 parts blue, how many parts yellow preserve the exact same shade?',
            tr: 'Bir boya karışımında 2 birim maviye 3 birim sarı ekleniyor. 6 birim mavi kullanırsan aynı tonu korumak için kaç birim sarı gerekir?'
          },
          choices: [
            { id: 'a', label: { en: '7 parts yellow (added +4 to both)', tr: '7 birim sarı (ikisine de +4 eklendi)' }, misconceptionId: 'additive-scaling' },
            { id: 'b', label: { en: '9 parts yellow (multiplied both by 3)', tr: '9 birim sarı (ikisi de 3 ile çarpıldı)' } },
            { id: 'c', label: { en: '6 parts yellow', tr: '6 birim sarı' } }
          ],
          correctChoiceId: 'b'
        },
        {
          id: 'q-math-ratio-2',
          outcomeIds: ['math-ratios'],
          resourceId: 'res-math-ratios',
          revision: 'r1',
          prompt: {
            en: 'Which ratio is strictly equivalent to 4 : 10?',
            tr: 'Hangi oran 4 : 10 oranı ile kesin olarak denktir?'
          },
          choices: [
            { id: 'a', label: { en: '6 : 12', tr: '6 : 12' }, misconceptionId: 'additive-scaling' },
            { id: 'b', label: { en: '10 : 25', tr: '10 : 25' } },
            { id: 'c', label: { en: '8 : 14', tr: '8 : 14' }, misconceptionId: 'additive-scaling' }
          ],
          correctChoiceId: 'b'
        },
        {
          id: 'q-math-slope-1',
          outcomeIds: ['math-linear-fn'],
          resourceId: 'res-math-slope',
          revision: 'r1',
          prompt: {
            en: 'A line passes through (2, 4) and (6, 16). What is its slope m?',
            tr: 'Bir doğru (2, 4) ve (6, 16) noktalarından geçiyor. Eğimi m kaçtır?'
          },
          choices: [
            { id: 'a', label: { en: '1/3', tr: '1/3' }, misconceptionId: 'inverted-slope' },
            { id: 'b', label: { en: '3', tr: '3' } },
            { id: 'c', label: { en: '4', tr: '4' } }
          ],
          correctChoiceId: 'b'
        },
        {
          id: 'q-math-slope-2',
          outcomeIds: ['math-linear-fn'],
          resourceId: 'res-math-slope',
          revision: 'r1',
          prompt: {
            en: 'A battery drains from 80% to 50% over 6 hours at a steady rate. What is the slope in % per hour?',
            tr: 'Bir pil 6 saatte sabit hızla %80\'den %50\'ye iniyor. Saat başına değişim hızı (eğim) nedir?'
          },
          choices: [
            { id: 'a', label: { en: '-5% per hour', tr: 'Saatte -%5' } },
            { id: 'b', label: { en: '-0.2% per hour', tr: 'Saatte -%0,2' }, misconceptionId: 'inverted-slope' },
            { id: 'c', label: { en: '+5% per hour', tr: 'Saatte +%5' } }
          ],
          correctChoiceId: 'a'
        },
        {
          id: 'q-math-prob-1',
          outcomeIds: ['math-probability'],
          resourceId: 'res-math-prob',
          revision: 'r1',
          prompt: {
            en: 'A fair coin lands on Heads 4 times in a row. What is the probability that the 5th flip lands on Tails?',
            tr: 'Hilesiz bir madeni para üst üste 4 kez Yazı geldi. 5. atışın Tura gelme olasılığı nedir?'
          },
          choices: [
            { id: 'a', label: { en: 'Greater than 50%, because Tails is overdue', tr: '%50\'den büyük, çünkü artık Tura gelmesi beklenir' }, misconceptionId: 'gamblers-fallacy' },
            { id: 'b', label: { en: 'Exactly 50% (1/2)', tr: 'Tam olarak %50 (1/2)' } },
            { id: 'c', label: { en: 'Less than 50%, because Heads is on a streak', tr: '%50\'den küçük, çünkü Yazı serisi var' }, misconceptionId: 'gamblers-fallacy' }
          ],
          correctChoiceId: 'b'
        },
        {
          id: 'q-math-prob-2',
          outcomeIds: ['math-probability'],
          resourceId: 'res-math-prob',
          revision: 'r1',
          prompt: {
            en: 'Two fair 6-sided dice are rolled independently. What is the probability that both show a 6?',
            tr: 'İki hilesiz 6 yüzlü zar bağımsız olarak atılıyor. İkisinin de 6 gelme olasılığı nedir?'
          },
          choices: [
            { id: 'a', label: { en: '1/12', tr: '1/12' }, misconceptionId: 'gamblers-fallacy' },
            { id: 'b', label: { en: '1/36', tr: '1/36' } },
            { id: 'c', label: { en: '2/6', tr: '2/6' } }
          ],
          correctChoiceId: 'b'
        }
      ],
      mappings: []
    }
  }
});

export function cloneKnowledgeCorePreset(presetId) {
  const preset = KNOWLEDGE_CORE_PRESETS[presetId] ?? KNOWLEDGE_CORE_PRESETS['english-grammar'];
  return JSON.parse(JSON.stringify(preset.core));
}

export function localizedText(value, lang = 'en', fallback = '') {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    return value[lang] ?? value.en ?? value.tr ?? fallback;
  }
  return fallback;
}
