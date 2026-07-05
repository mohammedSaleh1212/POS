import { prisma } from "../db/prisma";

export const openShift = async (userId: number, startingCash: number) => {
  return prisma.dailyMovement.create({
    data: {
      userId,
      type: "SHIFT_START",
      amount: startingCash,
      description: "Drawer opened",
    },
  });
};

export const closeShift = async (userId: number, endingCash: number, expectedCash: number) => {
  const discrepancy = endingCash - expectedCash;
  const description = discrepancy === 0 
    ? "Drawer closed (Balanced)" 
    : `Drawer closed (Discrepancy: ${discrepancy})`;

  return prisma.dailyMovement.create({
    data: {
      userId,
      type: "SHIFT_END",
      amount: endingCash,
      description,
    },
  });
};