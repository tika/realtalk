type SupportedLanguage = "english" | "spanish" | "russian" | "mandarin";

export const nativeLang: SupportedLanguage = "english"; // TODO: allow for other native languages
export const targetLang: SupportedLanguage = "russian"; // TODO: add UI to change this

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

// TODO: auto-generate these based on the user's previous topics
export const storyPrompts = [
  "A time you tried something new and it didn’t go as planned",
  "A memorable conversation you had with a stranger",
  "A time you felt out of your comfort zone",
  "A cultural difference that surprised you",
  "A challenge you faced in college and how you handled it",
  "A place you visited that exceeded your expectations",
  "A time you misunderstood something in another language",
  "A person who has influenced you and why",
  "A goal you set for yourself and your progress so far",
  "A time you had to make a difficult decision",
  "Your daily routine and what you would like to change about it",
  "A piece of advice you received that stuck with you",
  "A time you helped someone (or someone helped you)",
  "Your experience learning this language so far",
  "How your perspective has changed in the past year",
];
