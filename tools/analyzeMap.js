import fs from "node:fs";

const data = JSON.parse(
  fs.readFileSync("public/maps/de_nuke1.geometry.json", "utf8")
);

const strokeCounts = new Map();
const fillCounts = new Map();
const comboCounts = new Map();

for (const s of data.segments) {
  const stroke = s.stroke ?? "(none)";
  const fill = s.fill ?? "(none)";

  strokeCounts.set(stroke, (strokeCounts.get(stroke) ?? 0) + 1);
  fillCounts.set(fill, (fillCounts.get(fill) ?? 0) + 1);

  const combo = `${stroke} | ${fill}`;
  comboCounts.set(combo, (comboCounts.get(combo) ?? 0) + 1);
}

function printMap(title, map) {
  console.log("\n=== " + title + " ===");
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  for (const [key, count] of sorted.slice(0, 20)) {
    console.log(`${key}: ${count}`);
  }
}

printMap("Stroke counts", strokeCounts);
printMap("Fill counts", fillCounts);
printMap("Stroke + Fill combos", comboCounts);