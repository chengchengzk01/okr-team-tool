import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  await prisma.$queryRaw`SELECT 1`;
  const [users, quarters, objectives, keyResults] = await Promise.all([
    prisma.user.count(),
    prisma.quarter.count(),
    prisma.objective.count(),
    prisma.keyResult.count()
  ]);

  console.log(`database check passed: users=${users}, quarters=${quarters}, objectives=${objectives}, keyResults=${keyResults}`);
} finally {
  await prisma.$disconnect();
}
