// ===========================
// Ali Muneer — template-wide (scene-level) constants. Placeholder
// values only; the actual engagement invitation design comes later.
// ===========================

export const ALI_MUNEER_BACKGROUND_COLOR = "#F8F5EE";

export const ALI_MUNEER_CAMERA_Z = 10;

// ===========================
// Opening — Scene 1. A minimal, uncluttered opening screen: the basmala
// fading in, centered, over a warm marble/watercolor background — soft
// botanical leaf shadows entering from the upper-left, and flowing
// champagne-marble veins in the lower corners.
// ===========================
export const OPENING_TEXT = "بِسْمِ اللهِ الرَّحْمَنِ الرَّحِيمِ";
export const OPENING_TEXT_COLOR = "#C8A96B";

export const OPENING_FADE_IN_DELAY = 0.6;
export const OPENING_FADE_IN_DURATION = 3;

// The divider below the Bismillah — thin, symmetrical, same gold as the
// text, fading in just after it.
export const OPENING_DIVIDER_DELAY = OPENING_FADE_IN_DELAY + 1.2;
export const OPENING_DIVIDER_DURATION = 2.5;
export const OPENING_DIVIDER_OPACITY = 0.85;

// The marble/leaf atmosphere — fades in first, ahead of and slower than
// the text, so it reads as the scene's own setting rather than
// something layered on top afterward.
export const OPENING_ATMOSPHERE_DELAY = 0;
export const OPENING_ATMOSPHERE_DURATION = 4;
export const OPENING_MARBLE_OPACITY = 0.85;
export const OPENING_LEAF_OPACITY = 0.5;

export const OPENING_MARBLE_FILL_FROM = "#e9dcc0";
export const OPENING_MARBLE_FILL_TO = "#f8f5ee";
export const OPENING_MARBLE_VEIN_COLOR = "#c8a96b";
export const OPENING_LEAF_COLOR = "#8a7d5e";

// A few tiny gold sparkles resting along the marble veins — kept sparse
// per the "no glitter explosion" brief, with a very slow independent
// twinkle once they've faded in.
export const OPENING_SPARKLE_FADE_DURATION = 2.5;
export const OPENING_SPARKLE_OPACITY_RANGE = [0.3, 0.6];
export const OPENING_SPARKLE_TWINKLE_DURATION_RANGE = [5, 9];

// How long the finished Bismillah stays on screen before Scene 1 hands
// off to Scene 2 — a sequencing value only, not part of the approved
// entrance itself.
export const OPENING_HOLD_DURATION = 2.2;
export const OPENING_EXIT_DURATION = 1.2;

// ===========================
// Hero — Scene 3. The main HTML UI overlay, taking over once the
// envelope (Scene 2) has fully finished its dismiss transition. Built
// in parts; these are Part 1's own values (monogram, top ornament,
// subtitle) only — later parts add their own constants alongside these.
// ===========================
export const HERO_MONOGRAM_TEXT = "SA";
export const HERO_SUBTITLE_TEXT = "دعوة عقد قران";

// Champagne gold — same family as OPENING_TEXT_COLOR/the envelope's own
// gold trim, reused here for visual continuity across the handoff.
export const HERO_GOLD_LIGHT = "#d8bd88";
export const HERO_GOLD = "#c8a96b";
export const HERO_GOLD_DARK = "#a9854f";

// Deep warm charcoal — same tone as the invitation card's own body
// copy (.am-invite-line in envelope/Envelope.css).
export const HERO_CHARCOAL = "#263a33";

// ---- Part 2 — the groom/bride names, stacked with a small "&" between
// them, below the Part 1 crest. Same couple as the invitation card's
// own copy (.am-invite-name in envelope/Envelope.js), just laid out
// differently here: full names, one per line, not the card's side-by-
// side row.
export const HERO_GROOM_NAME = "علي منير رمزي يونس";
export const HERO_BRIDE_NAME = "سمية غانم أحمد";

// ---- Part 3 — body text and date, below the Part 2 names divider.
export const HERO_BODY_TEXT = "يسعدنا دعوتكم لمشاركتنا فرحتنا";
export const HERO_DATE_TEXT = "31 أغسطس 2026";

// ===========================
// Event Details — Scene 4. A plain document-flow section sitting right
// beneath the Hero, reached by scrolling once the Hero's own entrance
// (Part 4 above) has settled. Same champagne-gold/ivory/charcoal
// identity as Hero/Envelope; date/ceremony/venue/time are all
// confirmed copy now.
// ===========================
export const EVENT_DETAILS_TITLE = "تفاصيل المناسبة";

export const EVENT_DETAILS_DATE_LABEL = "التاريخ";
export const EVENT_DETAILS_DATE_VALUE = HERO_DATE_TEXT;

export const EVENT_DETAILS_CEREMONY_LABEL = "نوع المناسبة";
export const EVENT_DETAILS_CEREMONY_VALUE = "عقد قران";

export const EVENT_DETAILS_TIME_LABEL = "الوقت";
export const EVENT_DETAILS_TIME_VALUE = "من الساعة 5:30 إلى الـ 9:00 مساءً";

export const EVENT_DETAILS_LOCATION_LABEL = "المكان";
export const EVENT_DETAILS_LOCATION_VALUE =
  "قاعة هوى بغداد - الصالحية - مقابل مكتب الخطوط الجوية العراقية";
export const EVENT_DETAILS_LOCATION_LINK_TEXT = "عرض الموقع";

// The couple's confirmed venue link — shared with the Venue & Map
// section below (see VENUE_MAP_BUTTON_HREF), single source of truth
// for both the Event Details card's "عرض الموقع" button and that
// section's own "فتح في خرائط Google" button.
export const EVENT_DETAILS_LOCATION_MAP_URL =
  "https://maps.app.goo.gl/6WEJUeURv5nZBasL9?g_st=ic";

// ===========================
// Countdown — Scene 5. A plain document-flow section right beneath
// Event Details, reached by scrolling. Same champagne-gold/ivory/
// charcoal identity as the rest of the invitation; a live countdown to
// the wedding date (same date as HERO_DATE_TEXT/EVENT_DETAILS_DATE_VALUE
// above).
// ===========================
export const COUNTDOWN_SECTION_ID = "ali-muneer-countdown";

export const COUNTDOWN_TITLE = "العد التنازلي لقاء الفرح";

// ISO string (local time, no zone suffix) so `new Date(...)` parses it
// as midnight in the visitor's own local time rather than UTC.
export const COUNTDOWN_TARGET_DATE = "2026-08-31T00:00:00";

export const COUNTDOWN_DAYS_LABEL = "أيام";
export const COUNTDOWN_HOURS_LABEL = "ساعات";
export const COUNTDOWN_MINUTES_LABEL = "دقائق";
export const COUNTDOWN_SECONDS_LABEL = "ثوانٍ";

// ===========================
// Venue & Map — Scene 6. A plain document-flow section right beneath
// Event Details, reached by scrolling. Same champagne-gold/ivory/
// charcoal identity as the rest of the invitation; the venue is
// confirmed (see VENUE_MAP_VENUE_NAME below) but the embed itself is
// still a `q=`-based search embed off that name/address rather than a
// pinned-coordinate embed, styled to sit inside the "printed
// invitation" aesthetic rather than look like a bare Google widget —
// see the filter on .am-venue-map-iframe in venuemap/VenueMap.css.
// ===========================
export const VENUE_MAP_SECTION_ID = "ali-muneer-venue-map";

export const VENUE_MAP_TITLE = "موقع الحفل";

export const VENUE_MAP_VENUE_NAME = EVENT_DETAILS_LOCATION_VALUE;

// `maps.app.goo.gl` short links resolve via redirect, not usable as an
// <iframe> src (Google's embed endpoint needs a direct, non-redirecting
// URL) — so the embed keeps using a `q=`-based search embed off the
// venue's own name/address text, while every clickable link
// (EVENT_DETAILS_LOCATION_MAP_URL below and VENUE_MAP_BUTTON_HREF) goes
// straight to the couple's actual Google Maps share link.
export const VENUE_MAP_EMBED_SRC = `https://www.google.com/maps?q=${encodeURIComponent(VENUE_MAP_VENUE_NAME)}&output=embed`;

export const VENUE_MAP_BUTTON_TEXT = "فتح في خرائط Google";
export const VENUE_MAP_BUTTON_HREF = EVENT_DETAILS_LOCATION_MAP_URL;

// ===========================
// RSVP — Scene 7. The final plain document-flow section, right beneath
// Venue & Map, reached by scrolling. Same champagne-gold/ivory/
// charcoal identity as every section above it. No backend to submit
// to yet — the form's own "confirm" state is purely client-side (see
// RSVP.js), swapping the form for RSVP_SUCCESS_TEXT on submit.
// ===========================
export const RSVP_SECTION_ID = "ali-muneer-rsvp";

export const RSVP_TITLE = "تأكيد الحضور";

export const RSVP_INTRO_TEXT = "يسعدنا حضوركم وتشريفكم، يرجى تأكيد الحضور";

export const RSVP_NAME_LABEL = "الاسم الكامل";
export const RSVP_NAME_PLACEHOLDER = "اكتب اسمك الكامل";

export const RSVP_ATTENDEES_LABEL = "عدد الحضور";
// "+5" kept as its own last option rather than an open-ended number
// input — a large party is rare enough that a rough upper band is
// plenty, and it keeps the field a clean single-tap select on mobile.
export const RSVP_ATTENDEES_OPTIONS = ["1", "2", "3", "4", "5", "+5"];

export const RSVP_STATUS_LABEL = "حالة الحضور";
// Three options rather than a plain attending/regret binary — a
// "maybe" middle ground, and softer, more personal phrasing than a
// dry form's usual button copy (each line reads like something a
// guest would actually say, not a UI label).
export const RSVP_STATUS_OPTIONS = [
  { value: "attending", label: "نعم، سأحضر بكل سرور" },
  { value: "maybe", label: "ربما، سأحاول الحضور" },
  { value: "regret", label: "أعتذر عن الحضور، مبارك لكم" },
];

export const RSVP_SUBMIT_TEXT = "إرسال التأكيد";
export const RSVP_SUBMIT_PENDING_TEXT = "جارٍ الإرسال...";

// No client-side backend — submitting POSTs the RSVP to /api/rsvp (see
// api/rsvp.js at the repo root), a Vercel serverless function that
// forwards it to Telegram using a token/chat id kept in server-side
// env vars (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID), never in client
// code. The guest stays on the page throughout (see _handleSubmit in
// RSVP.js).
export const RSVP_SUCCESS_TITLE = "تم التأكيد";
export const RSVP_SUCCESS_TEXT = "تم إرسال تأكيد حضورك بنجاح، شكراً لك!";

export const RSVP_ERROR_TEXT =
  "تعذر إرسال التأكيد، يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى";
