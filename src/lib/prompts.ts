export const prompts = {
  generatePracticePrompts: (
    words: string[],
    targetLang: string,
    nativeLang: string
  ) => `
    # Context
    You are a language learning assistant. The student speaks ${nativeLang} and is learning ${targetLang}.

    # Task
    You are given a list of vocabulary words in ${targetLang}. Pick 15 words from the list at random.
    Split them into 3 groups of 5 words. For each group, generate a short, conversational prompt
    that would naturally require the student to use those 5 words when speaking.

    The prompts should be everyday situations such that the user can speak freely. Write the prompt
    in ${nativeLang} so the student understands what to talk about.

    # Output Format
    Respond with ONLY a JSON object. No markdown, no backticks, no preamble.

    {
      "prompts": [
        {
          "prompt": string,
          "target_words": [string, string, string, string, string]
        },
        {
          "prompt": string,
          "target_words": [string, string, string, string, string]
        },
        {
          "prompt": string,
          "target_words": [string, string, string, string, string]
        }
      ]
    }

    # Word List
    ${words.join(", ")}
  `,

  findErrors: (
    transcript: string,
    targetLang: string,
    nativeLang: string,
    targetWords?: string[]
  ) => `
    # Context
    You are an expert language educator in ${targetLang}. You are fluent in ${nativeLang}.
    Your task is to analyse the following student's transcript for three types of errors:
    - "mistake" — grammatical or linguistic errors in ${targetLang}
    - "fallback" — the student switched to ${nativeLang} because they didn't know how to say it in ${targetLang}

    You must also assign a severity from 1 (minor pronunciation or hesitation) to 10 (phrasing that
    renders the message incomprehensible). A 5 would be awkward phrasing or a small grammatical error.
    ${
      targetWords && targetWords.length > 0
        ? `
    # Target Words
    The student was asked to use these words: ${targetWords.join(", ")}
    In your analysis, note which target words were used correctly, which were used incorrectly,
    and which were missed entirely. Include missed words in the "missed_target_words" field.
    `
        : ""
    }
    # Task
    Take the numbered transcript (in the <input> tags) and mark it for errors.
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
          "type": "fallback" | "mistake" | "hesitation",
          "original_text": string,
          "corrected_text": string,
          "context": string,
          "severity": number,
          "word_start": number,
          "word_end": number
        }
      ],
      "missed_target_words": string[],
      "summary": string
    }

    # Common Errors
    - The student doesn't know a word in ${targetLang} and says the ${nativeLang} equivalent instead (fallback).
    - The student uses awkward or unnatural phrasing in ${targetLang}.
    - The student uses the wrong grammatical case after a preposition (e.g. "с моя подруга" instead of "с моей подругой").
    - The student uses the wrong preposition, often directly translating from ${nativeLang} (e.g. "llegué en" from "arrived in").
    - The student conjugates a verb incorrectly or uses the wrong tense/aspect.
    - The student fails to make adjectives, possessives, or pronouns agree in gender, number, or case.
    - The student uses wrong word order, carrying over ${nativeLang} sentence structure.
    - The student overuses subject pronouns in a pro-drop language.
    - The student confuses two similar words with different meanings (false friends or near-synonyms).
    - The student starts a word or phrase, stops, and restarts (hesitation).

    # Examples

    ## Example 1
    <input>
    Target language: Russian
    Transcript: "[0] В [1] прошлом [2] году [3] я [4] ездил [5] в [6] Санкт-Петербург [7] с [8] моя [9] подруга [10] Мы [11] были [12] там [13] пять [14] дней [15] и [16] видели [17] много [18] красивых [19] мест [20] Каждый [21] день [22] мы [23] ходили [24] в [25] разные [26] museums [27] и [28] смотрели [29] на [30] старые [31] картины [32] Один [33] раз [34] мы [35] пошли [36] в [37] ресторан [38] и [39] я [40] заказал [41] рыба [42] с [43] рисом [44] Мне [45] кажется [46] что [47] Петербург [48] более [49] красивее [50] чем [51] Москва [52] В [53] последний [54] день [55] мы [56] поехали [57] на [58] аэропорт"
    </input>

    <input>
    Target language: Spanish
    Target words: tienda, cocinar, hermana, postre, receta
    Transcript: "[0] Ayer [1] yo [2] fui [3] al [4] store [5] porque [6] necesitaba [7] comprar [8] comida [9] para [10] la [11] semana [12] Cuando [13] yo [14] llegué [15] en [16] mi [17] casa [18] yo [19] cocinaba [20] la [21] cena [22] para [23] mi [24] familia [25] Mi [26] hermana [27] estaba [28] muy [29] hungry [30] Después [31] nosotros [32] miramos [33] a [34] la [35] televisión [36] juntos"
    </input>

    <output>
    {
      "errors": [
        {
          "type": "fallback",
          "severity": 6,
          "original_text": "store",
          "corrected_text": "tienda",
          "context": "yo fui al store porque",
          "word_start": 4,
          "word_end": 4
        },
        {
          "type": "fallback",
          "severity": 6,
          "original_text": "hungry",
          "corrected_text": "hambrienta",
          "context": "Mi hermana estaba muy hungry",
          "word_start": 29,
          "word_end": 29
        },
        {
          "type": "mistake",
          "severity": 3,
          "original_text": "llegué en mi casa",
          "corrected_text": "llegué a mi casa",
          "context": "Cuando yo llegué en mi casa",
          "word_start": 14,
          "word_end": 17
        },
        {
          "type": "mistake",
          "severity": 4,
          "original_text": "yo cocinaba la cena",
          "corrected_text": "cociné la cena",
          "context": "yo cocinaba la cena para mi familia",
          "word_start": 18,
          "word_end": 21
        },
        {
          "type": "mistake",
          "severity": 5,
          "original_text": "miramos a la televisión",
          "corrected_text": "vimos la televisión",
          "context": "nosotros miramos a la televisión juntos",
          "word_start": 32,
          "word_end": 35
        }
      ],
      "missed_target_words": ["postre", "receta"],
      "summary": "Used 3 of 5 target words. 'tienda' was attempted but fell back to English 'store'. 'cocinar' was used (as 'cocinaba', though with wrong tense) and 'hermana' was used correctly. 'postre' and 'receta' were never attempted. Common English-transfer errors with prepositions, tense selection, and verb choice."
    }

    ## Example 2
    <input>
    Target language: Spanish
    Transcript: "[0] Ayer [1] yo [2] fui [3] al [4] store [5] porque [6] necesitaba [7] comprar [8] comida [9] para [10] la [11] semana [12] Cuando [13] yo [14] llegué [15] en [16] mi [17] casa [18] yo [19] cocinaba [20] la [21] cena [22] para [23] mi [24] familia [25] Mi [26] hermana [27] estaba [28] muy [29] hungry [30] Después [31] nosotros [32] miramos [33] a [34] la [35] televisión [36] juntos"
    </input>

    <output>
    {
      "errors": [
        {
          "type": "fallback",
          "severity": 6,
          "original_text": "store",
          "corrected_text": "tienda",
          "context": "yo fui al store porque",
          "word_start": 4,
          "word_end": 4
        },
        {
          "type": "fallback",
          "severity": 6,
          "original_text": "hungry",
          "corrected_text": "hambrienta",
          "context": "Mi hermana estaba muy hungry",
          "word_start": 29,
          "word_end": 29
        },
        {
          "type": "mistake",
          "severity": 3,
          "original_text": "llegué en mi casa",
          "corrected_text": "llegué a mi casa",
          "context": "Cuando yo llegué en mi casa",
          "word_start": 14,
          "word_end": 17
        },
        {
          "type": "mistake",
          "severity": 4,
          "original_text": "yo cocinaba la cena",
          "corrected_text": "cociné la cena",
          "context": "yo cocinaba la cena para mi familia",
          "word_start": 18,
          "word_end": 21
        },
        {
          "type": "mistake",
          "severity": 5,
          "original_text": "miramos a la televisión",
          "corrected_text": "vimos la televisión",
          "context": "nosotros miramos a la televisión juntos",
          "word_start": 32,
          "word_end": 35
        }
      ],
      "missed_target_words": [],
      "summary": "The student communicates well but shows common English-transfer patterns: wrong preposition after 'llegar', preterite/imperfect confusion, and verb choice issues with 'mirar' vs 'ver'. Two English fallbacks for basic vocabulary."
    }

    # Your turn

    <input>
    Target language: ${targetLang}
    Transcript: "${transcript}"
    </input>
    <output>
  `,
};
