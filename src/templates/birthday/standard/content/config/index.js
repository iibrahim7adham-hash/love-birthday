import { ACTIVE_LOCALE } from "./locale";
import person from "./person";
import text from "./text";
import flow from "./flow";
import theme from "./theme";
import animation from "./animation";
import countdown from "./countdown";
import cake from "./cake";
import candles from "./candles";
import celebration from "./celebration";
import particles from "./particles";
import audio from "./audio";
import media from "./media";

// The single object every scene, UI overlay and object in this template
// reads customer-facing values from. Each domain lives in its own file
// (person.js, cake.js, celebration.js, ...) so the source of any one
// value is easy to find, but everything is assembled here into one
// import — `config` on the shared scene context — so nothing needs to
// know the config is split across files.
//
// To customize a reel for a customer: edit the files in this folder
// (plus ../messages.js for the actual message text). Nothing in
// managers/, objects/, scenes/ or ui/ should ever need to change.
const StandardConfig = {
  locale: ACTIVE_LOCALE,
  person,
  text,
  flow,
  theme,
  animation,
  countdown,
  cake,
  candles,
  celebration,
  particles,
  audio,
  media,
};

export default StandardConfig;
