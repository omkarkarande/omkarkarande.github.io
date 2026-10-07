// Generate only the original Fleu art; never touch portrait or library assets.
import { writeFile } from "node:fs/promises";
import { journalArtwork } from "../js/journal.mjs";
const palettes = {
  "": {
    plate: "#f2eee5",
    hi: "#213c32",
    edge: "#536957",
    mid: "#84957e",
    lo: "#b1beaa",
  },
  "-dark": {
    plate: "#171c18",
    hi: "#eee8d8",
    edge: "#b2b9a0",
    mid: "#83977c",
    lo: "#4c6250",
  },
};
for (const [suffix, palette] of Object.entries(palettes)) {
  const svg = journalArtwork()
    .replace(' aria-hidden="true"', "")
    .replace(' style="position:absolute;inset:0;width:100%;height:100%"', "")
    .replace(/var\(--hairline-(\w+),[^)]+\)/g, (_, key) => palette[key]);
  await writeFile(
    new URL(`../res/images/field-fleu${suffix}.svg`, import.meta.url),
    svg + "\n",
  );
}
