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

    # Task
    Take the transcript (in the <input> tags) in ${targetLang} and mark the transcript for errors (blanks and mistakes).

    # Output Format
    Respond with ONLY a JSON object. No markdown, no backticks, no preamble, and NO CLOSING </output> TAG.

    {
      "errors": [
        {
          "type": "blank" | "mistake",
          "said": string,
          "corrected": string,
          "context": string,
          "language_item": {
            "type": "vocab" | "grammar_rule" | "phrase",
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
    Transcript: "В прошлом году я ездил в Санкт-Петербург с моя подруга. Мы были там пять дней и видели много красивых мест. Мне очень понравился город потому что он такой красивый. Каждый день мы ходили в разные museums и смотрели на старые картины. Один раз мы пошли в ресторан и я заказал рыба с рисом. Еда была очень вкусная. Потом мы гуляли по набережной и смотрели на реку. Я хочу вернуться в Петербург в следующем году потому что я не успел посетить все места. Мне кажется что Петербург более красивее чем Москва но это только моё мнение. В последний день мы поехали на аэропорт и я был очень грустный потому что не хотел уезжать."
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
          "original_text": "с моя подруга",
          "corrected_text": "с моей подругой",
          "context": "ездил в Санкт-Петербург с моя подруга",
          "language_item": {
            "type": "grammar_rule",
            "target_text": "Я ездил туда с моей подругой",
            "native_text": "I went there with my friend (f)",
            "purpose": "с requires instrumental case"
          }
        },
        {
          "type": "blank",
          "original_text": "museums",
          "corrected_text": "музеи",
          "context": "ходили в разные museums и",
          "language_item": {
            "type": "vocab",
            "target_text": "Мы ходили в разные музеи",
            "native_text": "We went to different museums",
            "purpose": "музеи = museums"
          }
        },
        {
          "type": "mistake",
          "original_text": "заказал рыба",
          "corrected_text": "заказал рыбу",
          "context": "я заказал рыба с рисом",
          "language_item": {
            "type": "grammar_rule",
            "target_text": "Я заказал рыбу с рисом",
            "native_text": "I ordered fish with rice",
            "purpose": "заказать requires accusative case"
          }
        },
        {
          "type": "mistake",
          "original_text": "более красивее",
          "corrected_text": "красивее",
          "context": "Петербург более красивее чем Москва",
          "language_item": {
            "type": "grammar_rule",
            "target_text": "Петербург красивее, чем Москва",
            "native_text": "Petersburg is more beautiful than Moscow",
            "purpose": "don't combine более with -ее suffix"
          }
        },
        {
          "type": "mistake",
          "original_text": "поехали на аэропорт",
          "corrected_text": "поехали в аэропорт",
          "context": "мы поехали на аэропорт и",
          "language_item": {
            "type": "grammar_rule",
            "target_text": "Мы поехали в аэропорт",
            "native_text": "We went to the airport",
            "purpose": "аэропорт uses в not на for direction"
          }
        }
      ]
    }
    </output>

    ## Example 2
    <input>
    Target language: Spanish
    Transcript: "Ayer yo fui al store porque necesitaba comprar comida para la semana. Yo compré muchas frutas y también leche. Cuando yo llegué en mi casa, yo cocinaba la cena para mi familia. Mi hermana estaba muy hungry y ella comió todo muy rápido. Después nosotros miramos a la televisión juntos."
    </input>

    <output>
    {
      "errors": [
        {
          "type": "blank",
          "original_text": "store",
          "corrected_text": "tienda",
          "context": "yo fui al store porque",
          "language_item": {
            "type": "vocab",
            "target_text": "Fui a la tienda a comprar comida",
            "native_text": "I went to the store to buy food",
            "purpose": "tienda = store/shop"
          }
        },
        {
          "type": "blank",
          "original_text": "hungry",
          "corrected_text": "hambrienta",
          "context": "Mi hermana estaba muy hungry",
          "language_item": {
            "type": "vocab",
            "target_text": "Mi hermana tenía mucha hambre",
            "native_text": "My sister was very hungry",
            "purpose": "tener hambre = to be hungry"
          }
        },
        {
          "type": "mistake",
          "original_text": "llegué en mi casa",
          "corrected_text": "llegué a mi casa",
          "context": "Cuando yo llegué en mi casa",
          "language_item": {
            "type": "grammar_rule",
            "target_text": "Llegué a mi casa por la noche",
            "native_text": "I arrived at my house at night",
            "purpose": "llegar takes a, not en"
          }
        },
        {
          "type": "mistake",
          "original_text": "yo cocinaba la cena",
          "corrected_text": "cociné la cena",
          "context": "yo cocinaba la cena para mi familia",
          "language_item": {
            "type": "grammar_rule",
            "target_text": "Ayer cociné la cena para todos",
            "native_text": "Yesterday I cooked dinner for everyone",
            "purpose": "completed past actions use pretérito, not imperfecto"
          }
        },
        {
          "type": "mistake",
          "original_text": "miramos a la televisión",
          "corrected_text": "vimos la televisión",
          "context": "nosotros miramos a la televisión juntos",
          "language_item": {
            "type": "phrase",
            "target_text": "Vimos la televisión juntos",
            "native_text": "We watched TV together",
            "purpose": "ver la televisión, not mirar a"
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
