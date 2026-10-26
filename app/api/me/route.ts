import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/api";
import { ageFromBirthDate } from "@/lib/people";

function presentUser(user: NonNullable<Awaited<ReturnType<typeof requireUser>>["user"]>) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    bio: user.bio,
    gender: user.gender,
    interestedIn: user.interestedIn,
    age: ageFromBirthDate(user.birthDate),
    maxDistanceMi: user.maxDistanceMi,
    hasLocation: user.latitude != null && user.longitude != null,
    photos: user.photos.map((photo) => ({ id: photo.id })),
    interests: user.interests.map((item) => ({ id: item.interest.id, name: item.interest.name })),
  };
}

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return error;
  return NextResponse.json(presentUser(user));
}

export async function PATCH(request: Request) {
  const { user, error } = await requireUser();
  if (!user) return error;
  const body = await request.json().catch(() => null);
  const data: Prisma.UserUpdateInput = {};

  if (typeof body?.name === "string") {
    const name = body.name.trim();
    if (name.length < 1 || name.length > 40) return jsonError("Name must be 1–40 characters");
    data.name = name;
  }
  if (typeof body?.bio === "string") {
    if (body.bio.length > 500) return jsonError("Bio must be 500 characters or less");
    data.bio = body.bio.trim();
  }
  if (body?.gender === "MAN" || body?.gender === "WOMAN") data.gender = body.gender;
  if (body?.interestedIn === "MEN" || body?.interestedIn === "WOMEN" || body?.interestedIn === "EVERYONE") {
    data.interestedIn = body.interestedIn;
  }
  if (body?.maxDistanceMi != null) {
    const miles = Number(body.maxDistanceMi);
    if (!Number.isInteger(miles) || miles < 1 || miles > 200) {
      return jsonError("Distance must be a whole number from 1 to 200 miles");
    }
    data.maxDistanceMi = miles;
  }
  if (Array.isArray(body?.interestIds)) {
    const ids = [...new Set(body.interestIds.filter((id: unknown) => typeof id === "string"))] as string[];
    if (ids.length > 8) return jsonError("Pick up to 8 interests");
    const found = await prisma.interest.findMany({ where: { id: { in: ids } } });
    if (found.length !== ids.length) return jsonError("One of those interests is not available");
    data.interests = {
      deleteMany: {},
      create: ids.map((interestId) => ({ interestId })),
    };
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    include: {
      photos: { orderBy: { sortOrder: "asc" } },
      interests: { include: { interest: true } },
    },
  });
  return NextResponse.json(presentUser(updated));
}
