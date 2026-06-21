import { PrismaClient } from "@prisma/client";
import { repository } from "@/lib/data/repository";

const prisma = new PrismaClient();

async function main() {
  const created = repository.createQuarter({
    name: "2099 Persistence Check",
    startDate: "2099-01-01",
    endDate: "2099-03-31",
    status: "planning",
    createdBy: "u-admin"
  });

  await wait(500);
  const found = await prisma.quarter.findUnique({ where: { id: created.id } });
  if (!found) throw new Error("repository 写入没有持久化到 PostgreSQL");
  await prisma.quarter.delete({ where: { id: created.id } });
  console.log("repository persistence check passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
