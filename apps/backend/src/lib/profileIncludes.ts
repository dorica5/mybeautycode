import type { Prisma } from "@prisma/client";

/** Load professions with the professional profile so `/me` can expose `profession_codes`. */
export const profileWithProfessionalForApiInclude = {
  professionalProfile: {
    include: {
      professionalProfessions: {
        include: {
          profession: { select: { code: true, sortOrder: true } },
        },
      },
    },
  },
} as const satisfies Prisma.ProfileInclude;
