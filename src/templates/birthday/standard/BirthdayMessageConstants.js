// ===========================
// Standard — the short "Happy Birthday" moment inserted between the
// countdown and the cake reveal. Its own file, the same way
// cake/CakeConstants.js splits out from the flat Constants.js once a
// subsystem gets substantial enough — this stage has real particle/
// timing/color data of its own, not just a couple of strings.
// ===========================

// The one and only line this stage ever shows. Kept as three separate
// pieces (not one hardcoded string) so BirthdayMessage.js can reveal the
// sparkles and each word as their own independently-timed beats — see
// its own comment on why.
export const BIRTHDAY_MESSAGE_SPARKLE = "🤍";
export const BIRTHDAY_MESSAGE_WORD_1 = "Happy";
export const BIRTHDAY_MESSAGE_WORD_2 = "Birthday";

// ---- Palette — warm ivory/gold with a soft Baby Pink note, a
// deliberate bridge from Countdown's own pink-accented atmosphere
// toward the cake's own warm palette (see cake/CakeConstants.js's own
// palette comment). This stage IS the transition between the two, so it
// borrows the cake's warm language early rather than switching abruptly
// right at the cut — the same warm tones are meant to visually carry
// through into CakeReveal's own opening light.
export const BIRTHDAY_MESSAGE_PARTICLE_COLORS = [
  "#fff3e2",
  "#ffd9a0",
  "#ffd9a0",
  "#f3c6c6",
];

// ---- Particles — small, sparse points of light drifting in toward the
// center, never a burst/explosion. Count is halved below
// BIRTHDAY_MESSAGE_MOBILE_BREAKPOINT (see BirthdayMessage.js's own
// _buildParticles()) to keep this cheap on small/low-power devices —
// checked once at construction, not reactively, since this whole stage
// only lives a few seconds.
export const BIRTHDAY_MESSAGE_PARTICLE_COUNT = 16;
export const BIRTHDAY_MESSAGE_MOBILE_BREAKPOINT = 560; // px
export const BIRTHDAY_MESSAGE_PARTICLE_MIN_RADIUS_VW = 8;
export const BIRTHDAY_MESSAGE_PARTICLE_MAX_RADIUS_VW = 24;
export const BIRTHDAY_MESSAGE_PARTICLE_MIN_SIZE = 3; // px
export const BIRTHDAY_MESSAGE_PARTICLE_MAX_SIZE = 6; // px

// ---- Sequence timing — see BirthdayMessage.js's own master timeline.
export const MESSAGE_ENTER_DELAY = 0.6; // quiet pause right after "1" disappears
export const MESSAGE_ATMOSPHERE_FADE_DURATION = 1.0;

export const PARTICLE_GATHER_DURATION = 1.1; // each particle's own converge tween
export const PARTICLE_GATHER_STAGGER = 0.35; // spread across this window so they don't move in lockstep

// How long after particles begin drifting in that the first sparkle
// starts to form — partway through the gather, not after it finishes,
// so the phrase feels like it's condensing out of the still-arriving
// particles rather than waiting for them.
export const TEXT_REVEAL_START_OFFSET = 0.65;

export const SPARKLE_REVEAL_DURATION = 0.45;
export const WORD_REVEAL_DURATION = 0.45;
export const WORD_REVEAL_RISE_VH = 1.4;
export const MESSAGE_BEAT_STAGGER = 0.24; // gap between one phrase piece starting and the next

// A single soft breathe once the full phrase has settled — restrained,
// one cycle only, never a repeating idle loop (this stage's whole life
// is only a few seconds, so there's nothing to keep "alive" past this).
export const MESSAGE_BREATHE_SCALE = 1.03;
export const MESSAGE_BREATHE_DURATION = 1.0;

export const MESSAGE_HOLD_DURATION = 2.2;

export const MESSAGE_EXIT_DURATION = 0.8; // phrase dissolves
export const MESSAGE_EXIT_SCALE = 0.94;
export const PARTICLE_DISPERSE_DURATION = 0.9;
export const PARTICLE_DISPERSE_RADIUS_VW = 10; // extra outward drift on exit, on top of each particle's own gather radius
