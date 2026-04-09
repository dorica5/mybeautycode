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
      professionalHairProfile: { select: { colorBrand: true } },
      professionalNailsProfile: { select: { id: true } },
    },
  },
} as const satisfies Prisma.ProfileInclude;
