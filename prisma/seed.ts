import { PrismaClient, type Gender } from "@prisma/client";
import { hash } from "bcryptjs";
import { INTEREST_NAMES } from "../lib/interests";

const prisma = new PrismaClient();

const BASE_LAT = 40.7282;
const BASE_LNG = -73.9942;

function place(milesNorth: number, milesEast: number) {
  return {
    latitude: BASE_LAT + milesNorth / 69,
    longitude: BASE_LNG + milesEast / (69 * Math.cos((BASE_LAT * Math.PI) / 180)),
  };
}

const people: Array<{
  email: string;
  name: string;
  gender: Gender;
  bio: string;
  birthDate: string;
  interests: string[];
  north: number;
  east: number;
  likesDemo?: boolean;
}> = [
  {
    email: "demo@friendspace.app",
    name: "Alex",
    gender: "WOMAN",
    bio: "I walk a lot, cook a little, and will always say yes to coffee.",
    birthDate: "1996-03-14",
    interests: ["Hiking", "Coffee", "Movies", "Board games"],
    north: 0,
    east: 0,
  },
  {
    email: "sam@friendspace.app",
    name: "Sam",
    gender: "MAN",
    bio: "Weekend hikes and weeknight cooking. I like people who actually make plans.",
    birthDate: "1994-11-02",
    interests: ["Hiking", "Cooking", "Live music"],
    north: 0.4,
    east: 0.3,
    likesDemo: true,
  },
  {
    email: "jordan@friendspace.app",
    name: "Jordan",
    gender: "WOMAN",
    bio: "Museum days and long coffee orders. Still learning the neighborhood.",
    birthDate: "1998-06-21",
    interests: ["Coffee", "Art", "Travel"],
    north: -0.5,
    east: 0.6,
    likesDemo: true,
  },
  {
    email: "riley@friendspace.app",
    name: "Riley",
    gender: "MAN",
    bio: "I have a very friendly dog and a movie list that keeps getting longer.",
    birthDate: "1995-01-09",
    interests: ["Movies", "Fitness", "Dogs"],
    north: 0.8,
    east: -0.4,
    likesDemo: true,
  },
  {
    email: "casey@friendspace.app",
    name: "Casey",
    gender: "WOMAN",
    bio: "Board games, film photos, and a Saturday yoga class I rarely skip.",
    birthDate: "1997-08-30",
    interests: ["Board games", "Photography", "Yoga"],
    north: -0.3,
    east: -0.7,
    likesDemo: true,
  },
  {
    email: "avery@friendspace.app",
    name: "Avery",
    gender: "MAN",
    bio: "Cooks from recipes, reads on the train, and plays games too late.",
    birthDate: "1993-12-18",
    interests: ["Reading", "Food", "Gaming"],
    north: 1.2,
    east: 0.9,
  },
  {
    email: "quinn@friendspace.app",
    name: "Quinn",
    gender: "WOMAN",
    bio: "Brunch first, then a long walk. Dancing if the night goes that way.",
    birthDate: "1999-04-04",
    interests: ["Outdoors", "Brunch", "Dancing"],
    north: -1.1,
    east: 0.5,
  },
  {
    email: "taylor@friendspace.app",
    name: "Taylor",
    gender: "MAN",
    bio: "I will talk about a podcast for too long. Museums help.",
    birthDate: "1992-09-27",
    interests: ["Museums", "Podcasts", "Tech"],
    north: 0.6,
    east: 1.3,
  },
];

async function main() {
  const passwordHash = await hash("password123", 10);
  const interestIds = new Map<string, string>();
  for (const name of INTEREST_NAMES) {
    const interest = await prisma.interest.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    interestIds.set(name, interest.id);
  }

  const userIds = new Map<string, string>();
  for (const person of people) {
    const spot = place(person.north, person.east);
    const user = await prisma.user.upsert({
      where: { email: person.email },
      update: {
        name: person.name,
        gender: person.gender,
        bio: person.bio,
        birthDate: new Date(`${person.birthDate}T00:00:00.000Z`),
        passwordHash,
        latitude: spot.latitude,
        longitude: spot.longitude,
        maxDistanceMi: 25,
        interestedIn: "EVERYONE",
      },
      create: {
        email: person.email,
        name: person.name,
        gender: person.gender,
        bio: person.bio,
        birthDate: new Date(`${person.birthDate}T00:00:00.000Z`),
        passwordHash,
        latitude: spot.latitude,
        longitude: spot.longitude,
        maxDistanceMi: 25,
        interestedIn: "EVERYONE",
      },
    });
    userIds.set(person.email, user.id);
    await prisma.userInterest.deleteMany({ where: { userId: user.id } });
    await prisma.userInterest.createMany({
      data: person.interests.map((name) => ({ userId: user.id, interestId: interestIds.get(name)! })),
    });
  }

  const demoId = userIds.get("demo@friendspace.app")!;
  for (const person of people) {
    if (!person.likesDemo) continue;
    const fromId = userIds.get(person.email)!;
    await prisma.swipe.upsert({
      where: { fromUserId_toUserId: { fromUserId: fromId, toUserId: demoId } },
      update: { liked: true },
      create: { fromUserId: fromId, toUserId: demoId, liked: true },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
