const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dataPath = path.join(__dirname, "..", "data.js");
const code = fs.readFileSync(dataPath, "utf8");
const sandbox = {};
vm.runInNewContext(code, sandbox);
const { GUIDE } = sandbox;

const tabs = [
  "inicio",
  ...GUIDE.days.map((d) => d.id),
  "comer",
  "info",
  "tren",
];
console.log("Tabs:", tabs.length, tabs.join(", "));

let stops = 0;
let missingMaps = 0;
GUIDE.days.forEach((d) => {
  d.sections.forEach((s) => {
    s.stops.forEach((stop) => {
      stops++;
      if (!stop.mapsUrl && stop.title && !/cena|comida|descanso|aterrizaje|encuentro|libre|repetir|opcional$/i.test(stop.title)) {
        missingMaps++;
      }
    });
  });
});
console.log("Timeline stops:", stops, "without maps (heuristic):", missingMaps);

["restaurants", "gelato", "street"].forEach((k) => {
  const withMaps = GUIDE.food[k].filter((f) => f.mapsUrl).length;
  console.log(`Food ${k}:`, GUIDE.food[k].length, "with maps:", withMaps);
});

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
["data.js", "app.js", "tailwindcss.com"].forEach((needle) => {
  if (!html.includes(needle)) throw new Error("Missing in index.html: " + needle);
});
console.log("index.html OK");
