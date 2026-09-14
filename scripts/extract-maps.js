const fs = require("fs");
const path = require("path");
const htmlPath =
  process.argv[2] ||
  path.join(process.env.TEMP || "/tmp", "roma-guide.html");
if (!fs.existsSync(htmlPath)) {
  console.error("Missing HTML:", htmlPath);
  process.exit(1);
}
const html = fs.readFileSync(htmlPath, "utf8");
const out = [];
const re = /href="https:\/\/www\.google\.com\/url\?q=([^"&]+)/g;
let m;
while ((m = re.exec(html))) {
  let u = decodeURIComponent(m[1].replace(/&amp;/g, "&"));
  if (/maps/i.test(u)) out.push(u.split("&sa=D")[0]);
}
const seen = new Set();
const unique = out.filter((u) => {
  if (seen.has(u)) return false;
  seen.add(u);
  return true;
});
fs.writeFileSync(
  path.join(__dirname, "maps-urls.json"),
  JSON.stringify(unique, null, 2)
);
console.log("Extracted", unique.length, "URLs");
