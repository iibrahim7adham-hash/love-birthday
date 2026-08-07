import { pickLocale } from "./locale";

// All UI chrome copy (titles, subtitles, button labels) in one
// localization-ready dictionary. `{name}`/`{age}` tokens are resolved
// by scenes via locale.js's `interpolate()` against content/config/person.js.
// Add a new locale key (e.g. "ar") alongside "en" to translate the whole
// reel without touching any scene or UI code — they all read through
// the resolved `text` object below.
const dictionary = {
  en: {
    intro: {
      title: "Happy Birthday, {name}!",
      subtitle: "A little something made just for you.",
      buttonLabel: "START",
    },

    blowCandles: {
      buttonLabel: "Blow the Candles",
    },
  },
};

const text = pickLocale(dictionary);

export default text;
