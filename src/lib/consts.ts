export const supportedLanguages = [
  "english",
  "spanish",
  "russian",
  "mandarin",
] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const sttPrompt: Record<SupportedLanguage, string> = {
  english:
    "This is a recording of a language student practicing English. Sometimes they don't know a word and switch to their native language, for example: I went to the... como se dice... store.",
  spanish:
    "Esta es una grabación de un estudiante que practica español. A veces no sabe una palabra y habla en inglés, por ejemplo: Ayer yo fui al... how do you say... tienda para comprar comida.",
  russian:
    "Это запись студента, который учит русский язык. Иногда он не знает слово и говорит по-английски, например: Вчера я пошёл в... how do you say... магазин и купил хлеб.",
  mandarin:
    "这是一个学习中文的学生的录音。有时候他不知道一个词就会说英语，比如：昨天我去了一个... how do you say... 商店买了很多东西。",
};

export const languageCode: Record<SupportedLanguage, string> = {
  english: "en",
  spanish: "es",
  russian: "ru",
  mandarin: "zh",
};

export const languageFlag: Record<SupportedLanguage, string> = {
  english: "🇬🇧",
  spanish: "🇪🇸",
  russian: "🇷🇺",
  mandarin: "🇨🇳",
};
