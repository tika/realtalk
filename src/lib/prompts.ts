import { nativeLang, targetLang } from "./consts";

export const prompts = {
  findHesitations: () => `
  `,
  findErrors: (transcript: string) => `
    # Context
    You are an expert language educator in the ${targetLang} language. The educator is fluent in ${nativeLang}.
    Your task is to grade/mark the following student's transcript for two types of errors:
    - "mistake" (grammatical and linguistic errors)
    - "blank" (words the student is unsure of how to say in ${targetLang})

    Once you have flagged these errors, you need to generate corrections for them, as well as "language_item"s.
    These language items are flashcards that the student can use to learn to speak ${targetLang} correctly.
    Each language item must include a short "purpose" label describing what the learner is drilling.
    Keep "purpose" to a few words, specific, and instructionally useful.

    You must also come up with a rating for this error from 1 (pronunctiation, minor issue) to 10 (phrasing that
    renders the message incomprehensible). A 5 would using awkward phrasing or a small grammatical error.

    # Task
    Take the numbered transcript (in the <input> tags) in ${targetLang} and mark the transcript for errors (blanks and mistakes).
    Every token is prefixed with a zero-based word index like [12].

    For every error, you must:
    - copy the student's erroneous phrase into "original_text" without the numeric markers
    - return the inclusive zero-based start and end word indices in "word_start" and "word_end"
    - make sure the indexed span matches the words that produced the error

    # Output Format
    Respond with ONLY a JSON object. No markdown, no backticks, no preamble, and NO CLOSING </output> TAG.

    {
      "errors": [
        {
          "type": "blank" | "mistake",
          "original_text": string,
          "corrected_text": string,
          "context": string,
          "rating": number,
          "word_start": number,
          "word_end": number,
          "language_item": {
            "type": "vocab" | "grammar_rule" | "phrase",
            "purpose": string,
            "target_text": string,
            "native_text": string
          }
        }
      ]
    }

    # Common Errors
    - The student is unsure of how to say a word in ${targetLang}, and resorts to saying the ${nativeLang} equivalent.
    - The student uses awkward/unnatural phrasing or expression in ${targetLang}.
    - The student uses the wrong grammatical case after a preposition (e.g. "с моя подруга" instead of "с моей подругой").
    - The student uses the wrong preposition, often directly translating from ${nativeLang} (e.g. "llegué en" from "arrived in").
    - The student conjugates a verb incorrectly or uses the wrong tense/aspect (e.g. imperfect when preterite is needed, or wrong verb aspect pair).
    - The student fails to make adjectives, possessives, or pronouns agree in gender, number, or case with the noun they modify.
    - The student uses the wrong word order, carrying over ${nativeLang} sentence structure.
    - The student overuses subject pronouns in a pro-drop language (e.g. repeating "yo" before every verb in Spanish).
    - The student confuses two similar words that have different meanings (false friends or near-synonyms, e.g. "спросить" vs "попросить").

    # Examples
    ## Example 1
    <input>
    Target language: Russian
    Transcript: "[0] В [1] прошлом [2] году [3] я [4] ездил [5] в [6] Санкт-Петербург [7] с [8] моя [9] подруга [10] Мы [11] были [12] там [13] пять [14] дней [15] и [16] видели [17] много [18] красивых [19] мест [20] Каждый [21] день [22] мы [23] ходили [24] в [25] разные [26] museums [27] и [28] смотрели [29] на [30] старые [31] картины [32] Один [33] раз [34] мы [35] пошли [36] в [37] ресторан [38] и [39] я [40] заказал [41] рыба [42] с [43] рисом [44] Мне [45] кажется [46] что [47] Петербург [48] более [49] красивее [50] чем [51] Москва [52] В [53] последний [54] день [55] мы [56] поехали [57] на [58] аэропорт"
    </input>

    # Examples

    ## Example 1
    <input>
    Target language: Russian
    Transcript: "В прошлом году я ездил в Санкт-Петербург с моя подруга. Мы были там пять дней и видели много красивых мест. Мне очень понравился город потому что он такой красивый. Каждый день мы ходили в разные museums и смотрели на старые картины. Один раз мы пошли в ресторан и я заказал рыба с рисом. Еда была очень вкусная. Потом мы гуляли по набережной и смотрели на реку. Я хочу вернуться в Петербург в следующем году потому что я не успел посетить все места. Мне кажется что Петербург более красивее чем Москва но это только моё мнение. В последний день мы поехали на аэропорт и я был очень грустный потому что не хотел уезжать."
    </input>

    <output>
    {
      "errors": [
        {
          "type": "mistake",
          "rating": 4,
          "original_text": "с моя подруга",
          "corrected_text": "с моей подругой",
          "context": "ездил в Санкт-Петербург с моя подруга",
          "word_start": 7,
          "word_end": 9,
          "language_item": {
            "type": "grammar_rule",
            "purpose": "с requires instrumental case",
            "target_text": "Я ездил туда с моей подругой",
            "native_text": "I went there with my friend (f)"
          }
        },
        {
          "type": "blank",
          "rating": 6,
          "original_text": "museums",
          "corrected_text": "музеи",
          "context": "ходили в разные museums и",
          "word_start": 26,
          "word_end": 26,
          "language_item": {
            "type": "vocab",
            "purpose": "музеи = museums",
            "target_text": "Мы ходили в разные музеи",
            "native_text": "We went to different museums"
          }
        },
        {
          "type": "mistake",
          "rating": 3,
          "original_text": "заказал рыба",
          "corrected_text": "заказал рыбу",
          "context": "я заказал рыба с рисом",
          "word_start": 40,
          "word_end": 41,
          "language_item": {
            "type": "grammar_rule",
            "purpose": "direct object accusative",
            "target_text": "Я заказал рыбу с рисом",
            "native_text": "I ordered fish with rice"
          }
        },
        {
          "type": "mistake",
          "rating": 3,
          "original_text": "более красивее",
          "corrected_text": "красивее",
          "context": "Петербург более красивее чем Москва",
          "word_start": 48,
          "word_end": 49,
          "language_item": {
            "type": "grammar_rule",
            "purpose": "avoid double comparative",
            "target_text": "Петербург красивее, чем Москва",
            "native_text": "Petersburg is more beautiful than Moscow"
          }
        },
        {
          "type": "mistake",
          "rating": 4,
          "original_text": "поехали на аэропорт",
          "corrected_text": "поехали в аэропорт",
          "context": "мы поехали на аэропорт и",
          "word_start": 56,
          "word_end": 58,
          "language_item": {
            "type": "grammar_rule",
            "purpose": "в аэропорт after motion",
            "target_text": "Мы поехали в аэропорт",
            "native_text": "We went to the airport"
          }
        }
      ]
    }
    </output>

    ## Example 2
    <input>
    Target language: Spanish
    Transcript: "[0] Ayer [1] yo [2] fui [3] al [4] store [5] porque [6] necesitaba [7] comprar [8] comida [9] para [10] la [11] semana [12] Cuando [13] yo [14] llegué [15] en [16] mi [17] casa [18] yo [19] cocinaba [20] la [21] cena [22] para [23] mi [24] familia [25] Mi [26] hermana [27] estaba [28] muy [29] hungry [30] Después [31] nosotros [32] miramos [33] a [34] la [35] televisión [36] juntos"
    </input>

    <output>
    {
      "errors": [
        {
          "type": "blank",
          "rating": 6,
          "original_text": "store",
          "corrected_text": "tienda",
          "context": "yo fui al store porque",
          "word_start": 4,
          "word_end": 4,
          "language_item": {
            "type": "vocab",
            "purpose": "tienda = store",
            "target_text": "Fui a la tienda a comprar comida",
            "native_text": "I went to the store to buy food"
          }
        },
        {
          "type": "blank",
          "rating": 6,
          "original_text": "hungry",
          "corrected_text": "hambrienta",
          "context": "Mi hermana estaba muy hungry",
          "word_start": 29,
          "word_end": 29,
          "language_item": {
            "type": "vocab",
            "purpose": "hambrienta = hungry",
            "target_text": "Mi hermana tenía mucha hambre",
            "native_text": "My sister was very hungry"
          }
        },
        {
          "type": "mistake",
          "rating": 3,
          "original_text": "llegué en mi casa",
          "corrected_text": "llegué a mi casa",
          "context": "Cuando yo llegué en mi casa",
          "word_start": 14,
          "word_end": 17,
          "language_item": {
            "type": "grammar_rule",
            "purpose": "llegar a a destination",
            "target_text": "Llegué a mi casa por la noche",
            "native_text": "I arrived at my house at night"
          }
        },
        {
          "type": "mistake",
          "rating": 4,
          "original_text": "yo cocinaba la cena",
          "corrected_text": "cociné la cena",
          "context": "yo cocinaba la cena para mi familia",
          "word_start": 18,
          "word_end": 21,
          "language_item": {
            "type": "grammar_rule",
            "purpose": "preterite for completed event",
            "target_text": "Ayer cociné la cena para todos",
            "native_text": "Yesterday I cooked dinner for everyone"
          }
        },
        {
          "type": "mistake",
          "rating": 5,
          "original_text": "miramos a la televisión",
          "corrected_text": "vimos la televisión",
          "context": "nosotros miramos a la televisión juntos",
          "word_start": 32,
          "word_end": 35,
          "language_item": {
            "type": "phrase",
            "purpose": "ver la televisión",
            "target_text": "Vimos la televisión juntos",
            "native_text": "We watched TV together"
          }
        }
      ]
    }
    </output>

    # Your turn

    <input>
    ${transcript}
    </input>
    <output>
  `,
};
