import { prisma } from "../db/prisma";
import { AppError } from "../middlewares/errorHandler";

export const getContactById = async (
  id: number
) => {
  const contact =
    await prisma.contact.findUnique({ where: { id }});

  if (!contact)
    throw new AppError(
      404,
      "Contact_not_found"
    );

  return contact;
};