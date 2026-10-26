export type ActivitySuggestion = { title: string; detail: string };

export const fallbackActivities: ActivitySuggestion[] = [
  { title: "Get coffee", detail: "Pick a cafe between everyone" },
  { title: "Walk in a park", detail: "An easy way to meet up" },
  { title: "Try a local restaurant", detail: "Somewhere new for the group" },
  { title: "Visit a museum", detail: "Room to wander and talk" },
];

const cache = new Map<string, { at: number; items: ActivitySuggestion[] }>();
const MISS_TTL = 10 * 60 * 1000;
const HIT_TTL = 60 * 60 * 1000;

type OverpassElement = {
  tags?: { name?: string; amenity?: string; leisure?: string; tourism?: string };
};

export async function suggestActivities(latitude: number, longitude: number) {
  const key = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < (hit.items === fallbackActivities ? MISS_TTL : HIT_TTL)) return hit.items;

  try {
    const query = `[out:json][timeout:12];
(
  node["amenity"="cafe"](around:4000,${latitude},${longitude});
  node["leisure"="park"](around:4000,${latitude},${longitude});
  node["amenity"="restaurant"](around:4000,${latitude},${longitude});
  node["tourism"="museum"](around:4000,${latitude},${longitude});
);
out body 12;`;
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "text/plain", "User-Agent": "FriendSpace/0.1" },
      body: query,
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw new Error("Activity lookup failed");
    const data = (await response.json()) as { elements?: OverpassElement[] };
    const items = (data.elements ?? [])
      .map((element) => {
        const name = element.tags?.name;
        if (!name) return null;
        const kind = element.tags?.amenity || element.tags?.leisure || element.tags?.tourism || "place";
        return { title: name, detail: kind.replaceAll("_", " ") };
      })
      .filter((item): item is ActivitySuggestion => Boolean(item))
      .slice(0, 6);
    if (items.length === 0) {
      cache.set(key, { at: Date.now(), items: fallbackActivities });
      return fallbackActivities;
    }
    cache.set(key, { at: Date.now(), items });
    return items;
  } catch {
    cache.set(key, { at: Date.now(), items: fallbackActivities });
    return fallbackActivities;
  }
}
