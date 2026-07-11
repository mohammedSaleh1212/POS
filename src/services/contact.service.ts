import { prisma } from "../db/prisma";
import { Prisma } from "../generated/prisma";
import { AppError } from "../middlewares/errorHandler";

export const getContactById = async (
  id: number,
db: Prisma.TransactionClient | typeof prisma = prisma

) => {
  const contact =
    await db.contact.findUnique({ where: { id }});

  if (!contact)
    throw new AppError(
      404,
      "Contact_not_found"
    );

  return contact;
};