// Geometry derived from SHIFTER handoff v43 paintCabin: seeded line jitter,
// small gauges, sliding switches, ribbed hoses and fixed repair scratches.
// Static SVG: generated once, never a per-frame background renderer.
import { writeFileSync } from "node:fs";
let seed = 4193;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
let paths = [];
const line = (points, color = "#99998b", width = 0.65) => {
  let d = `M${points[0].join(",")}`;
  for (let i = 1; i < points.length; i++) {
    let a = points[i - 1],
      b = points[i],
      steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 5));
    for (let j = 1; j <= steps; j++) {
      let t = j / steps,
        jitter = j === steps ? 0 : (random() - 0.5) * 0.65;
      d += `L${(a[0] + (b[0] - a[0]) * t + jitter).toFixed(2)},${(a[1] + (b[1] - a[1]) * t + jitter).toFixed(2)}`;
    }
  }
  paths.push(`<path d="${d}" stroke="${color}" stroke-width="${width}"/>`);
};
const rect = (x, y, w, h, color = "#75756c") =>
  line(
    [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
      [x, y],
    ],
    color,
  );
const circle = (x, y, r, color = "#939389") =>
  line(
    Array.from({ length: 33 }, (_, i) => {
      let a = (i / 32) * Math.PI * 2,
        j = 0.18 * Math.sin(i * 2.1);
      return [x + (r + j) * Math.cos(a), y + (r + j) * Math.sin(a)];
    }),
    color,
  );
for (let row = 0; row < 4; row++) {
  let y = 8 + row * 126;
  rect(14, y, 107, 110);
  rect(18, y + 4, 99, 102, "#3f3f39");
  for (let x of [22, 113])
    for (let yy of [y + 8, y + 102]) {
      circle(x, yy, 1.5);
      line(
        [
          [x - 1, yy + 1],
          [x + 1, yy - 1],
        ],
        "#b0b09a",
      );
    }
  if (row === 0 || row === 3) {
    rect(26, y + 15, 82, 45, "#acac98");
    for (let i = 0; i < 5; i++)
      line(
        [
          [29, y + 21 + i * 7],
          [105, y + 21 + i * 7],
        ],
        "#33332e",
      );
    let pts = Array.from({ length: 22 }, (_, i) => [
      29 + i * 3.6,
      y + 37 + (random() - 0.5) * 29,
    ]);
    line(pts, "#c1c1a9");
    for (let j = 0; j < 3; j++) {
      circle(40 + j * 27, y + 80, 8);
      line(
        [
          [40 + j * 27, y + 80],
          [43 + j * 27, y + 74],
        ],
        "#b8b89d",
      );
      circle(40 + j * 27, y + 80, 5, "#3f3f35");
    }
  } else if (row === 1) {
    for (let j = 0; j < 4; j++) {
      let x = 34 + j * 21;
      line(
        [
          [x, y + 21],
          [x, y + 84],
        ],
        "#b0b097",
      );
      rect(x - 3, y + 32 + random() * 28, 6, 12, "#d0d0b7");
      line(
        [
          [x - 6, y + 94],
          [x + 5, y + 94],
        ],
        "#787865",
      );
    }
  } else {
    for (let i = 0; i < 15; i++)
      line(
        [
          [27, y + 19 + i * 5],
          [108, y + 19 + i * 5],
        ],
        i % 2 ? "#44443b" : "#9b9b84",
      );
  }
  for (let j = 0; j < 10; j++) {
    let x = 26 + j * 8;
    line(
      [
        [x, y + 2],
        [x + 3, y + 3],
      ],
      "#b0b096",
    );
    line(
      [
        [x, y + 112],
        [x + 4, y + 114],
      ],
      "#606054",
    );
  }
}
for (let cable = 0; cable < 3; cable++) {
  const x = 3 + cable * 3;
  line(
    Array.from({ length: 100 }, (_, i) => [x + 2 * Math.sin(i / 7), i * 5.2]),
    cable % 2 ? "#4b4b40" : "#9c9c86",
  );
  for (let y = 0; y < 520; y += 13)
    line(
      [
        [x - 1, y],
        [x + 3, y + 1],
      ],
      "#b4b49a",
      0.4,
    );
}
for (let i = 0; i < 100; i++) {
  let x = 14 + random() * 110,
    y = random() * 512;
  line(
    [
      [x, y],
      [x + random() * 5, y + random() * 2],
    ],
    "#535348",
    0.35,
  );
}
writeFileSync(
  new URL("../public/hull-instruments.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 136 520" width="136" height="520"><g fill="none" stroke-linejoin="round" stroke-linecap="round">${paths.join("")}</g></svg>`,
);
// Same fixed-size source geometry, rotated for the compact mobile equipment rail.
const rail = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 136" width="520" height="136"><g transform="translate(520 0) rotate(90)" fill="none" stroke-linejoin="round" stroke-linecap="round">${paths.join("")}</g></svg>`;
writeFileSync(new URL("../public/console-rail.svg", import.meta.url), rail);
