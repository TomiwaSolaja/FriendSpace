import type { Gender, InterestGender } from "@prisma/client";

export function ageFromBirthDate(birthDate: Date, now = new Date()) {
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const month = now.getUTCMonth() - birthDate.getUTCMonth();
  if (month < 0 || (month === 0 && now.getUTCDate() < birthDate.getUTCDate())) age -= 1;
  return age;
}

export function isAtLeast18(birthDate: Date) {
  return ageFromBirthDate(birthDate) >= 18;
}

export function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

export function acceptsGender(interestedIn: InterestGender, gender: Gender) {
  if (interestedIn === "EVERYONE") return true;
  if (interestedIn === "MEN") return gender === "MAN";
  return gender === "WOMAN";
}

const EARTH_MILES = 3958.8;

export function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_MILES * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function distanceLabel(miles: number) {
  if (miles < 1) return "Less than a mile away";
  const rounded = Math.max(1, Math.round(miles));
  return `${rounded} mile${rounded === 1 ? "" : "s"} away`;
}
