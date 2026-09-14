export interface Point {
  x: number;
  y: number;
}

/**
 * Calculates Euclidean distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Checks if line segment (p1 -> p2) intersects with a circle (center, radius).
 * This solves the high-velocity "frame-skip" / tunneling issue where a rapid swipe
 * bypasses simple point-in-hitbox tests between two animation frames.
 */
export function lineIntersectsCircle(
  p1: Point,
  p2: Point,
  center: Point,
  radius: number
): { intersects: boolean; angle: number; impactPoint: Point } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;

  // Slicing angle
  const angle = Math.atan2(dy, dx);

  // If p1 and p2 are virtually identical, test single point distance
  if (lenSq < 0.0001) {
    const d = distance(p1, center);
    return {
      intersects: d <= radius,
      angle,
      impactPoint: { x: p1.x, y: p1.y },
    };
  }

  // Projection of center onto line segment: t = [(center - p1) • (p2 - p1)] / |p2 - p1|^2
  const t = Math.max(0, Math.min(1, ((center.x - p1.x) * dx + (center.y - p1.y) * dy) / lenSq));

  // Closest point on the segment
  const closestX = p1.x + t * dx;
  const closestY = p1.y + t * dy;

  const distSq = (closestX - center.x) * (closestX - center.x) + (closestY - center.y) * (closestY - center.y);

  return {
    intersects: distSq <= radius * radius,
    angle,
    impactPoint: { x: closestX, y: closestY },
  };
}

/**
 * Generates smooth points for dynamic glowing sword trail using Chaikin's algorithm
 */
export function smoothTrail(points: Point[], iterations = 1): Point[] {
  if (points.length <= 2) return points;

  let current = points;
  for (let iter = 0; iter < iterations; iter++) {
    const smoothed: Point[] = [current[0]];
    for (let i = 0; i < current.length - 1; i++) {
      const p0 = current[i];
      const p1 = current[i + 1];

      const q: Point = {
        x: 0.75 * p0.x + 0.25 * p1.x,
        y: 0.75 * p0.y + 0.25 * p1.y,
      };
      const r: Point = {
        x: 0.25 * p0.x + 0.75 * p1.x,
        y: 0.25 * p0.y + 0.75 * p1.y,
      };
      smoothed.push(q, r);
    }
    smoothed.push(current[current.length - 1]);
    current = smoothed;
  }
  return current;
}
