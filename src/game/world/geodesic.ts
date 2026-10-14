import { Vector3 } from "three";

/**
 * Esfera hexagonal (poliedro de Goldberg): cada vértice de um icosaedro
 * subdividido vira um tile (12 pentágonos + hexágonos).
 */
export interface HexSphere {
  count: number;
  /** Centro de cada tile (vetor unitário). */
  centers: Vector3[];
  /** Cantos do polígono do tile em ordem anti-horária vista de fora (unitários). */
  corners: Vector3[][];
  /** neighbors[i][k] é o tile do outro lado da aresta corners[k] → corners[k+1]. */
  neighbors: number[][];
}

const ICO_VERTS: [number, number, number][] = (() => {
  const t = (1 + Math.sqrt(5)) / 2;
  return [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ];
})();

const ICO_FACES: [number, number, number][] = [
  [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
  [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
  [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
];

export function buildHexSphere(frequency: number): HexSphere {
  const f = Math.max(1, Math.floor(frequency));
  const base = ICO_VERTS.map(([x, y, z]) => new Vector3(x, y, z).normalize());
  const verts: Vector3[] = [];
  const keyMap = new Map<string, number>();
  const getVert = (v: Vector3) => {
    const n = v.clone().normalize();
    const key = `${Math.round(n.x * 1e5)},${Math.round(n.y * 1e5)},${Math.round(n.z * 1e5)}`;
    let idx = keyMap.get(key);
    if (idx === undefined) {
      idx = verts.length;
      verts.push(n);
      keyMap.set(key, idx);
    }
    return idx;
  };

  const tris: [number, number, number][] = [];
  const tmp = new Vector3();
  for (const [ia, ib, ic] of ICO_FACES) {
    const A = base[ia], B = base[ib], C = base[ic];
    const grid: number[][] = [];
    for (let i = 0; i <= f; i++) {
      grid[i] = [];
      for (let j = 0; j <= f - i; j++) {
        const a = 1 - (i + j) / f, b = i / f, c = j / f;
        tmp.set(0, 0, 0).addScaledVector(A, a).addScaledVector(B, b).addScaledVector(C, c);
        grid[i][j] = getVert(tmp);
      }
    }
    for (let i = 0; i < f; i++) {
      for (let j = 0; j < f - i; j++) {
        tris.push([grid[i][j], grid[i + 1][j], grid[i][j + 1]]);
        if (j < f - 1 - i) tris.push([grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]]);
      }
    }
  }

  // Orienta todos os triângulos para fora.
  const e1 = new Vector3(), e2 = new Vector3(), cr = new Vector3();
  for (const t of tris) {
    const a = verts[t[0]], b = verts[t[1]], c = verts[t[2]];
    e1.subVectors(b, a);
    e2.subVectors(c, a);
    cr.crossVectors(e1, e2);
    if (cr.dot(a) < 0) {
      const s = t[1];
      t[1] = t[2];
      t[2] = s;
    }
  }

  const count = verts.length;
  const incident: number[][] = Array.from({ length: count }, () => []);
  tris.forEach((t, fi) => {
    incident[t[0]].push(fi);
    incident[t[1]].push(fi);
    incident[t[2]].push(fi);
  });
  const centroids = tris.map(([a, b, c]) => new Vector3().add(verts[a]).add(verts[b]).add(verts[c]).normalize());

  const corners: Vector3[][] = [];
  const neighbors: number[][] = [];
  const u = new Vector3(), w = new Vector3(), d = new Vector3();
  for (let v = 0; v < count; v++) {
    const n = verts[v];
    // Base tangente
    u.set(0, 1, 0);
    if (Math.abs(n.y) > 0.9) u.set(1, 0, 0);
    u.addScaledVector(n, -u.dot(n)).normalize();
    w.crossVectors(n, u);
    const faces = incident[v].slice();
    const ang = new Map<number, number>();
    for (const fi of faces) {
      d.subVectors(centroids[fi], n);
      ang.set(fi, Math.atan2(d.dot(w), d.dot(u)));
    }
    faces.sort((a, b) => ang.get(a)! - ang.get(b)!);
    corners[v] = faces.map((fi) => centroids[fi].clone());
    const nb: number[] = [];
    for (let k = 0; k < faces.length; k++) {
      const fa = tris[faces[k]], fb = tris[faces[(k + 1) % faces.length]];
      let other = -1;
      for (const x of fa) if (x !== v && fb.includes(x)) other = x;
      nb.push(other);
    }
    neighbors[v] = nb;
  }

  return { count, centers: verts, corners, neighbors };
}

/** Tile mais próximo de uma direção (caminhada gulosa pelo grafo de vizinhos). */
export function nearestTile(hex: HexSphere, dir: Vector3, hint = 0): number {
  let cur = hint >= 0 && hint < hex.count ? hint : 0;
  let best = hex.centers[cur].dot(dir);
  for (let guard = 0; guard < 4000; guard++) {
    let improved = false;
    for (const n of hex.neighbors[cur]) {
      const dd = hex.centers[n].dot(dir);
      if (dd > best) {
        best = dd;
        cur = n;
        improved = true;
      }
    }
    if (!improved) break;
  }
  return cur;
}

/** BFS: tiles a até `radius` passos de `start` (inclui o próprio). */
export function tilesWithin(hex: HexSphere, start: number, radius: number): { tile: number; dist: number }[] {
  const out: { tile: number; dist: number }[] = [{ tile: start, dist: 0 }];
  const seen = new Set<number>([start]);
  let frontier = [start];
  for (let r = 1; r <= radius; r++) {
    const next: number[] = [];
    for (const t of frontier) {
      for (const n of hex.neighbors[t]) {
        if (seen.has(n)) continue;
        seen.add(n);
        next.push(n);
        out.push({ tile: n, dist: r });
      }
    }
    frontier = next;
  }
  return out;
}
