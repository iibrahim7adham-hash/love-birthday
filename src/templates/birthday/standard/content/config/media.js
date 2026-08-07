// Image/photo slots the template is ready to consume once real assets
// and a photo-rendering feature exist (e.g. a customer photo on a
// Memories card). `src: null` placeholders follow the same pattern as
// the luxury template's content/memories.js — swap in a real URL per
// entry when that feature is built; this file is the single place that
// change happens.
const media = {
  photos: [
    { src: null, caption: "", colors: ["#ff6b9d", "#c44569"] },
    { src: null, caption: "", colors: ["#4a69bd", "#6a89cc"] },
  ],
};

export default media;
