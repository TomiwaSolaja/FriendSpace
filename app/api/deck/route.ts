import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { acceptsGender, ageFromBirthDate, distanceLabel, distanceMiles } from "@/lib/people";

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return error;
  if (user.latitude == null || user.longitude == null) {
    return NextResponse.json({ needsLocation: true, cards: [] });
  }

  const swipes = await prisma.swipe.findMany({
    where: { fromUserId: user.id },
    select: { toUserId: true },
  });
  const seen = swipes.map((swipe) => swipe.toUserId);
  const genderFilter =
    user.interestedIn === "MEN" ? "MAN" : user.interestedIn === "WOMEN" ? "WOMAN" : undefined;

  const candidates = await prisma.user.findMany({
    where: {
      id: { not: user.id, notIn: seen },
      latitude: { not: null },
      longitude: { not: null },
      ...(genderFilter ? { gender: genderFilter } : {}),
    },
    include: {
      photos: { orderBy: { sortOrder: "asc" } },
      interests: { include: { interest: true } },
    },
    take: 200,
  });

  const cards = candidates
    .filter((candidate) => acceptsGender(candidate.interestedIn, user.gender))
    .map((candidate) => {
      const miles = distanceMiles(user.latitude!, user.longitude!, candidate.latitude!, candidate.longitude!);
      return { candidate, miles };
    })
    .filter(({ candidate, miles }) => miles <= user.maxDistanceMi && miles <= candidate.maxDistanceMi)
    .sort((a, b) => a.miles - b.miles)
    .slice(0, 30)
    .map(({ candidate, miles }) => ({
      id: candidate.id,
      name: candidate.name,
      age: ageFromBirthDate(candidate.birthDate),
      bio: candidate.bio,
      distanceLabel: distanceLabel(miles),
      interests: candidate.interests.map((item) => item.interest.name),
      photoIds: candidate.photos.map((photo) => photo.id),
    }));

  return NextResponse.json({ needsLocation: false, cards });
}
