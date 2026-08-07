// The one place that decides which language pack this reel speaks.
// Every localized content file (text.js, ../messages.js) is written as
// `{ en: {...}, ar: {...}, ... }` and resolved through `pickLocale()`
// instead of hardcoding a language — add a new locale key wherever
// content is authored, then point ACTIVE_LOCALE at it (or wire it to a
// customer profile / URL param later) to switch the whole reel.
export const DEFAULT_LOCALE = "en";
export const ACTIVE_LOCALE = DEFAULT_LOCALE;

export function pickLocale(dictionary) {
  return dictionary[ACTIVE_LOCALE] ?? dictionary[DEFAULT_LOCALE];
}

// Replaces `{token}` placeholders (e.g. "{name}", "{age}") with values
// from `values` — the one interpolation helper every piece of
// customer-facing copy runs through instead of scenes building strings
// by hand.
export function interpolate(template, values) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match,
  );
}
