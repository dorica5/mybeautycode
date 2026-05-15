const { Prisma } = require("@prisma/client");

const code = "haircut";
const lit = `'${JSON.stringify([code])}'::jsonb`;
const primary = Prisma.raw(lit);
const q = Prisma.sql`AND pp.discovery_categories::jsonb @> ${primary}`;

console.log("sql:", q.sql);
console.log("values:", q.values);

const lit2 = JSON.stringify([code]);
const q2 = Prisma.sql`AND pp.discovery_categories::jsonb @> ${lit2}::jsonb`;
console.log("sql2:", q2.sql);
console.log("values2:", q2.values);
