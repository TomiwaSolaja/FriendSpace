import { acceptsGender, distanceMiles } from "@/lib/people";
import type { Gender, InterestGender } from "@prisma/client";

export type MatchNode = {
  id: string;
  latitude: number;
  longitude: number;
  maxDistanceMi: number;
  gender: Gender;
  interestedIn: InterestGender;
  interestIds: string[];
};

export type DirectedLike = { fromId: string; toId: string };

type Edge = { a: string; b: string; score: number; mutual: boolean };

const MIN_SIZE = 3;
const TARGET_SIZE = 4;
const MAX_SIZE = 6;

/**
 * Groups of 3–6. Two people are linked by a like in either direction
 * or by at least two shared interests, after gender and distance checks.
 * A connected component of 3–6 is kept whole. Larger components are split,
 * seeding from the strongest mutual like.
 */
export function planGroups(nodes: MatchNode[], likes: DirectedLike[]) {
  const likeSet = new Set(likes.map((like) => `${like.fromId}->${like.toId}`));
  const edges: Edge[] = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (!acceptsGender(a.interestedIn, b.gender) || !acceptsGender(b.interestedIn, a.gender)) continue;
      const miles = distanceMiles(a.latitude, a.longitude, b.latitude, b.longitude);
      if (miles > a.maxDistanceMi || miles > b.maxDistanceMi) continue;

      const aLikesB = likeSet.has(`${a.id}->${b.id}`);
      const bLikesA = likeSet.has(`${b.id}->${a.id}`);
      const shared = a.interestIds.filter((id) => b.interestIds.includes(id)).length;
      if (!aLikesB && !bLikesA && shared < 2) continue;

      const mutual = aLikesB && bLikesA;
      let score = shared * 5 - miles * 0.5;
      if (mutual) score += 100;
      else if (aLikesB || bLikesA) score += 50;
      edges.push({ a: a.id, b: b.id, score, mutual });
    }
  }

  const neighbors = new Map<string, string[]>();
  for (const node of nodes) neighbors.set(node.id, []);
  for (const edge of edges) {
    neighbors.get(edge.a)?.push(edge.b);
    neighbors.get(edge.b)?.push(edge.a);
  }

  const seen = new Set<string>();
  const groups: string[][] = [];

  for (const node of nodes) {
    if (seen.has(node.id)) continue;
    const component: string[] = [];
    const stack = [node.id];
    seen.add(node.id);
    while (stack.length) {
      const id = stack.pop()!;
      component.push(id);
      for (const other of neighbors.get(id) ?? []) {
        if (!seen.has(other)) {
          seen.add(other);
          stack.push(other);
        }
      }
    }

    if (component.length < MIN_SIZE) continue;
    if (component.length <= MAX_SIZE) {
      groups.push(component);
      continue;
    }

    const remaining = new Set(component);
    while (remaining.size >= MIN_SIZE) {
      const seed = strongestEdge(edges, remaining);
      if (!seed) break;
      const group = [seed.a, seed.b];
      remaining.delete(seed.a);
      remaining.delete(seed.b);
      while (group.length < TARGET_SIZE) {
        const next = bestCandidate(edges, group, remaining);
        if (!next) break;
        group.push(next);
        remaining.delete(next);
      }
      if (group.length >= MIN_SIZE) groups.push(group);
      else break;
    }

    if (remaining.size >= MIN_SIZE && remaining.size <= MAX_SIZE && isConnected(edges, remaining)) {
      groups.push([...remaining]);
    }
  }

  return groups;
}

function strongestEdge(edges: Edge[], remaining: Set<string>) {
  let best: Edge | null = null;
  for (const edge of edges) {
    if (!remaining.has(edge.a) || !remaining.has(edge.b)) continue;
    if (!best || betterEdge(edge, best)) best = edge;
  }
  return best;
}

function bestCandidate(edges: Edge[], group: string[], remaining: Set<string>) {
  const inGroup = new Set(group);
  let bestId: string | null = null;
  let best: Edge | null = null;
  for (const edge of edges) {
    const aIn = inGroup.has(edge.a);
    const bIn = inGroup.has(edge.b);
    if (aIn === bIn) continue;
    const candidate = aIn ? edge.b : edge.a;
    if (!remaining.has(candidate)) continue;
    if (!best || betterEdge(edge, best)) {
      best = edge;
      bestId = candidate;
    }
  }
  return bestId;
}

function betterEdge(next: Edge, current: Edge) {
  if (next.mutual !== current.mutual) return next.mutual;
  return next.score > current.score;
}

function isConnected(edges: Edge[], ids: Set<string>) {
  const start = ids.values().next().value as string | undefined;
  if (!start) return false;
  const neighbors = new Map<string, string[]>();
  for (const id of ids) neighbors.set(id, []);
  for (const edge of edges) {
    if (!ids.has(edge.a) || !ids.has(edge.b)) continue;
    neighbors.get(edge.a)?.push(edge.b);
    neighbors.get(edge.b)?.push(edge.a);
  }
  const seen = new Set<string>([start]);
  const stack = [start];
  while (stack.length) {
    const id = stack.pop()!;
    for (const other of neighbors.get(id) ?? []) {
      if (!seen.has(other)) {
        seen.add(other);
        stack.push(other);
      }
    }
  }
  return seen.size === ids.size;
}
