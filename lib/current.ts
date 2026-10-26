import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { readSession, SESSION_COOKIE } from "@/lib/session";

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const userId = await readSession(token);
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      photos: { orderBy: { sortOrder: "asc" } },
      interests: { include: { interest: true } },
    },
  });
}
