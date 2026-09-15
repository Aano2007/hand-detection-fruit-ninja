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

/**
 * Relaxes internal trail vertices using physical bending stiffness (Laplacian smoothing).
 * Eliminates angular bends or kinks so the trail behaves like a flexible thread under tension.
 */
export function relaxTrailPoints(points: Point[], stiffness = 0.35, iterations = 2): Point[] {
  if (points.length < 3) return points;

  let current = points.map((p) => ({ x: p.x, y: p.y }));
  for (let iter = 0; iter < iterations; iter++) {
    const next = [...current];
    // Keep ends exact; smooth internal vertices
    for (let i = 1; i < current.length - 1; i++) {
      const prev = current[i - 1];
      const nxt = current[i + 1];
      const midX = (prev.x + nxt.x) * 0.5;
      const midY = (prev.y + nxt.y) * 0.5;
      next[i] = {
        x: current[i].x * (1 - stiffness) + midX * stiffness,
        y: current[i].y * (1 - stiffness) + midY * stiffness,
      };
    }
    current = next;
  }
  return current;
}

/**
 * Generates an ultra-smooth, continuous curve using Centripetal Catmull-Rom Spline (alpha = 0.5).
 * Unlike standard cubic splines, the centripetal parameterization is mathematically proven
 * to prevent cusps, self-intersections, and overshoot, yielding a silky, flowing thread.
 */
export function generateCurvingThread(points: Point[], pointsPerSegment = 8): Point[] {
  if (points.length < 2) return points;
  if (points.length === 2) {
    const p0 = points[0];
    const p1 = points[1];
    const res: Point[] = [];
    for (let i = 0; i <= pointsPerSegment; i++) {
      const t = i / pointsPerSegment;
      res.push({
        x: p0.x + (p1.x - p0.x) * t,
        y: p0.y + (p1.y - p0.y) * t,
      });
    }
    return res;
  }

  // Virtual endpoints for complete boundary curvature through p0 and p_{n-1}
  const n = points.length;
  const pStart: Point = {
    x: 2 * points[0].x - points[1].x,
    y: 2 * points[0].y - points[1].y,
  };
  const pEnd: Point = {
    x: 2 * points[n - 1].x - points[n - 2].x,
    y: 2 * points[n - 1].y - points[n - 2].y,
  };

  const fullPoints: Point[] = [pStart, ...points, pEnd];
  const thread: Point[] = [];

  const alpha = 0.5; // Centripetal parameterization

  const getT = (tPrev: number, pA: Point, pB: Point) => {
    const d = distance(pA, pB);
    return tPrev + Math.pow(Math.max(d, 0.0001), alpha);
  };

  for (let i = 1; i < fullPoints.length - 2; i++) {
    const p0 = fullPoints[i - 1];
    const p1 = fullPoints[i];
    const p2 = fullPoints[i + 1];
    const p3 = fullPoints[i + 2];

    const t0 = 0;
    const t1 = getT(t0, p0, p1);
    const t2 = getT(t1, p1, p2);
    const t3 = getT(t2, p2, p3);

    const steps = pointsPerSegment;
    for (let step = 0; step < steps; step++) {
      const t = t1 + ((t2 - t1) * step) / steps;

      const t1_t0 = Math.max(t1 - t0, 0.0001);
      const t2_t1 = Math.max(t2 - t1, 0.0001);
      const t3_t2 = Math.max(t3 - t2, 0.0001);
      const t2_t0 = Math.max(t2 - t0, 0.0001);
      const t3_t1 = Math.max(t3 - t1, 0.0001);

      const a1x = ((t1 - t) * p0.x + (t - t0) * p1.x) / t1_t0;
      const a1y = ((t1 - t) * p0.y + (t - t0) * p1.y) / t1_t0;

      const a2x = ((t2 - t) * p1.x + (t - t1) * p2.x) / t2_t1;
      const a2y = ((t2 - t) * p1.y + (t - t1) * p2.y) / t2_t1;

      const a3x = ((t3 - t) * p2.x + (t - t2) * p3.x) / t3_t2;
      const a3y = ((t3 - t) * p2.y + (t - t2) * p3.y) / t3_t2;

      const b1x = ((t2 - t) * a1x + (t - t0) * a2x) / t2_t0;
      const b1y = ((t2 - t) * a1y + (t - t0) * a2y) / t2_t0;

      const b2x = ((t3 - t) * a2x + (t - t1) * a3x) / t3_t1;
      const b2y = ((t3 - t) * a2y + (t - t1) * a3y) / t3_t1;

      const cx = ((t2 - t) * b1x + (t - t1) * b2x) / t2_t1;
      const cy = ((t2 - t) * b1y + (t - t1) * b2y) / t2_t1;

      thread.push({ x: cx, y: cy });
    }
  }

  // Include exact tip (the final point)
  thread.push({ x: points[points.length - 1].x, y: points[points.length - 1].y });

  return thread;
}

export interface ScrambledCutData {
  cutOffset: number;
  scrambledPoints: Point[];
  sliceAngle: number;
  impactPoint: Point;
}

/**
 * Generates an organic, scrambled (jagged / torn) cut profile passing through
 * the point where the user's finger/cursor touched the fruit.
 */
export function generateScrambledCut(
  fruitPos: Point,
  radius: number,
  impactPoint: Point,
  sliceAngle: number,
  segments: number = 14
): ScrambledCutData {
  // Normal vector perpendicular to slice direction: n = (-sin(theta), cos(theta))
  const nx = -Math.sin(sliceAngle);
  const ny = Math.cos(sliceAngle);

  // Vector from fruit center to impact point
  const dx = impactPoint.x - fruitPos.x;
  const dy = impactPoint.y - fruitPos.y;

  // Signed perpendicular offset of the cut chord from the fruit center
  const rawOffset = dx * nx + dy * ny;

  // Clamp offset so both halves have substantial volume (max 65% of radius)
  const maxOffset = radius * 0.65;
  const cutOffset = Math.max(-maxOffset, Math.min(maxOffset, rawOffset));

  // Half chord length where line x = cutOffset intersects circle x^2 + y^2 = radius^2
  const halfChord = Math.sqrt(Math.max(1, radius * radius - cutOffset * cutOffset));
  const topY = -halfChord;
  const botY = halfChord;

  const scrambledPoints: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments; // 0 (top) -> 1 (bottom)
    const baseY = topY + t * (botY - topY);
    const baseX = cutOffset;

    if (i === 0 || i === segments) {
      // Perfectly align with outer fruit rind boundary
      scrambledPoints.push({ x: baseX, y: baseY });
    } else {
      // Jagged teeth and torn pulp jitter, modulated by smooth envelope so ends meet cleanly
      const envelope = Math.sin(t * Math.PI);
      const jaggedSign = i % 2 === 0 ? 1 : -1;
      const jitterX = (jaggedSign * 0.18 + (Math.random() - 0.5) * 0.16) * radius * envelope;
      const jitterY = (Math.random() - 0.5) * 4 * envelope;
      scrambledPoints.push({
        x: baseX + jitterX,
        y: baseY + jitterY,
      });
    }
  }

  return {
    cutOffset,
    scrambledPoints,
    sliceAngle,
    impactPoint,
  };
}

