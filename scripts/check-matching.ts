import { planGroups, type DirectedLike, type MatchNode } from "../lib/matching";

function node(id: string, interests: string[], extra: Partial<MatchNode> = {}): MatchNode {
  return {
    id,
    latitude: 40.73,
    longitude: -73.99,
    maxDistanceMi: 25,
    gender: "WOMAN",
    interestedIn: "EVERYONE",
    interestIds: interests,
    ...extra,
  };
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const star = ["alex", "sam", "jordan", "riley", "casey"].map((id) => node(id, [id]));
const likes: DirectedLike[] = ["sam", "jordan", "riley", "casey"].map((id) => ({ fromId: id, toId: "alex" }));
const starGroups = planGroups(star, likes);
assert(starGroups.length === 1 && starGroups[0].length === 5, "one-way likes should make one group of 5");

const pair = planGroups([node("a", ["1"]), node("b", ["2"])], [{ fromId: "a", toId: "b" }]);
assert(pair.length === 0, "a pair should wait");

const interests = planGroups(
  [node("a", ["hike", "coffee"]), node("b", ["hike", "coffee"]), node("c", ["hike", "coffee"])],
  [],
);
assert(interests.length === 1 && interests[0].length === 3, "two shared interests should connect three people");

const blocked = planGroups(
  [
    node("a", ["hike", "coffee"], { gender: "WOMAN", interestedIn: "WOMEN" }),
    node("b", ["hike", "coffee"], { gender: "MAN", interestedIn: "EVERYONE" }),
    node("c", ["hike", "coffee"], { gender: "WOMAN", interestedIn: "WOMEN" }),
    node("d", ["hike", "coffee"], { gender: "WOMAN", interestedIn: "WOMEN" }),
  ],
  [],
);
assert(blocked.length === 1 && !blocked[0].includes("b"), "gender preferences remove incompatible people");

const far = planGroups(
  [
    node("a", ["hike", "coffee"], { maxDistanceMi: 1 }),
    node("b", ["hike", "coffee"], { latitude: 41.2, maxDistanceMi: 100 }),
    node("c", ["hike", "coffee"], { maxDistanceMi: 1 }),
    node("d", ["hike", "coffee"], { maxDistanceMi: 1 }),
  ],
  [],
);
assert(far.length === 1 && !far[0].includes("b"), "both people must be inside each other's distance");

const big = ["a", "b", "c", "d", "e", "f", "g"].map((id) => node(id, ["hike", "coffee"]));
const split = planGroups(big, []);
assert(split.length === 2, "seven connected people should split");
assert(split.every((group) => group.length >= 3 && group.length <= 6), "split groups stay in range");
assert(new Set(split.flat()).size === 7, "everyone in a connected set of 7 is placed");

console.log("matching checks passed", { star: starGroups.map((g) => g.length), split: split.map((g) => g.length) });
