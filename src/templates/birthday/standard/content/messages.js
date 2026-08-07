import { pickLocale, interpolate } from "./config/locale";
import person from "./config/person";

// Placeholder love/memory messages and birthday-line templates, written
// as a localization-ready dictionary like config/text.js. Swap the
// arrays per customer, or add a locale key to translate them — nothing
// that reads memoryMessages/birthdayMessages needs to change either way.
const dictionary = {
  en: {
    memoryMessages: [
      "Every year with you is a gift.",
      "You make ordinary days feel like celebrations.",
      "Here's to another year of your laugh.",
      "So grateful you were born.",
      "May this year bring you everything you deserve.",
    ],

    // {name}/{age} are resolved against content/config/person.js below.
    birthdayMessages: [
      "Happy Birthday, {name}! \u{1F389}",
      "{age} looks amazing on you, {name}.",
    ],
  },
};

const content = pickLocale(dictionary);

export const memoryMessages = content.memoryMessages.map((text) => ({
  text,
}));

export const birthdayMessages = content.birthdayMessages.map((template) =>
  interpolate(template, person),
);
