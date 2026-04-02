import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const professions = [
    { code: "hair", sortOrder: 1 },
    { code: "brows_lashes", sortOrder: 2 },
    { code: "nails", sortOrder: 3 },
    { code: "esthetician", sortOrder: 4 },
  ];

  for (const p of professions) {
    await prisma.profession.upsert({
      where: { code: p.code },
      create: p,
      update: { sortOrder: p.sortOrder },
    });
  }
  console.log("Seeded professions:", professions.map((p) => p.code).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
