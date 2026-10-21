import { memo, useEffect, useRef, type ComponentProps } from "react";

/** Adapted from handoff v43 paintCabin: seeded jittered strokes and fixed print wear.
 * Only the panel perimeter is painted. No frame loop, app data or input dependencies. */
const Etching = memo(function Etching() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const parent = canvas.parentElement!;
    let last = "",
      frame = 0;
    function paint() {
      if (document.hidden) return;
      const W = Math.round(parent.clientWidth),
        H = Math.round(parent.clientHeight);
      const ratio = Math.min(devicePixelRatio || 1, 1.5, 2048 / Math.max(W, H));
      const key = `${W}:${H}:${ratio}`;
      if (!W || !H || last === key) return;
      last = key;
      canvas.width = Math.round(W * ratio);
      canvas.height = Math.round(H * ratio);
      const pen = canvas.getContext("2d")!;
      pen.scale(ratio, ratio);
      let seed = 4193;
      const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      const line = (points: number[][], color = "#92928a", width = 0.65) => {
        pen.strokeStyle = color;
        pen.lineWidth = width;
        pen.beginPath();
        pen.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1],
            b = points[i],
            steps = Math.max(
              1,
              Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 5),
            );
          for (let j = 1; j <= steps; j++) {
            const t = j / steps,
              jitter = j === steps ? 0 : (random() - 0.5) * 0.65;
            pen.lineTo(
              a[0] + (b[0] - a[0]) * t + jitter,
              a[1] + (b[1] - a[1]) * t + jitter,
            );
          }
        }
        pen.stroke();
      };
      line(
        [
          [15, 3],
          [W - 14, 3],
          [W - 3, 14],
          [W - 3, H - 13],
          [W - 15, H - 3],
          [14, H - 3],
          [3, H - 14],
          [3, 14],
          [15, 3],
        ],
        "#8a8a7f",
      );
      line(
        [
          [18, 8],
          [W - 18, 8],
          [W - 8, 18],
          [W - 8, H - 18],
          [W - 18, H - 8],
          [18, H - 8],
          [8, H - 18],
          [8, 18],
          [18, 8],
        ],
        "#41413b",
      );
      for (const x of [15, W - 15])
        for (const y of [17, H - 17]) {
          const points = Array.from({ length: 25 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2,
              r = 2.7 + 0.17 * Math.sin(i * 2.1);
            return [x + r * Math.cos(a), y + r * Math.sin(a)];
          });
          line(points, "#bbbbae");
          line(
            [
              [x - 1.5, y + 1],
              [x + 1.5, y - 1],
            ],
            "#4c4c46",
            0.8,
          );
        }
      // Repair scratches and double seams stay outside the readable content well.
      for (let i = 0; i < W / 14; i++) {
        const x = 24 + random() * (W - 48);
        for (const y of [3, H - 4])
          line(
            [
              [x, y],
              [x + 3 + random() * 6, y + (random() - 0.5) * 2],
            ],
            "#b7b7a0",
            0.45,
          );
      }
      for (let y = 40; y < H - 30; y += 29) {
        line(
          [
            [3, y],
            [6, y - 3],
          ],
          "#8e8e7e",
          0.5,
        );
        line(
          [
            [W - 7, y + 6],
            [W - 3, y + 2],
          ],
          "#8e8e7e",
          0.5,
        );
      }
      const image = pen.getImageData(0, 0, canvas.width, canvas.height),
        p = image.data;
      for (let i = 0; i < p.length; i += 4) {
        if (!p[i + 3]) continue;
        const px = (i / 4) % canvas.width,
          py = Math.floor(i / 4 / canvas.width);
        let n = Math.imul(px, 374761393) ^ Math.imul(py, 668265263);
        n = Math.imul(n ^ (n >>> 13), 1274126177);
        const grain = ((n ^ (n >>> 16)) >>> 0) / 4294967295;
        p[i + 3] *= grain < 0.09 ? 0.12 : grain < 0.3 ? 0.48 : 1;
      }
      pen.putImageData(image, 0, 0);
    }
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(paint);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(parent);
    document.addEventListener("visibilitychange", schedule);
    paint();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, []);
  return <canvas className="panel-etching" aria-hidden="true" ref={ref} />;
});
export function InstrumentPanel({
  children,
  className = "",
  ...props
}: ComponentProps<"section">) {
  return (
    <section className={className} {...props}>
      <Etching />
      {children}
    </section>
  );
}

export function useCabinMotion() {
  useEffect(() => {
    const update = () =>
      document.documentElement.classList.toggle(
        "cabin-paused",
        document.hidden,
      );
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      document.removeEventListener("visibilitychange", update);
      document.documentElement.classList.remove("cabin-paused");
    };
  }, []);
}
