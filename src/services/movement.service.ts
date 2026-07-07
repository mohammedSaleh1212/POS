import { prisma } from "../db/prisma";
import { InvoiceType } from "../generated/prisma";

export const openShift = async (userId: number, startingCash: number) => {
  const activeShift = await prisma.dailyMovement.findFirst({
    where: { 
      userId, 
      type: "SHIFT_START", 
      status: "OPEN" 
    }
  });

  if (activeShift) {
    // This is the trigger for the 409 error in your global handler
    throw new Error("Shift already open");
  }
  return prisma.dailyMovement.create({
    data: {
      userId,
      type: "SHIFT_START",
      amount: startingCash,
      description: "Drawer opened",
      status: "OPEN",
    },
  });
};


export const calculateExpectedCash = async (userId: number) => {
  // 1. Find the last movement for this user
  const lastMovement = await prisma.dailyMovement.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!lastMovement || lastMovement.type === "SHIFT_END") {
    throw new Error("No active shift found. You must start a shift first.");
  }

  const startingCash = Number(lastMovement.amount);

  // 2. Fetch all CASH invoices since the shift started
  const shiftInvoices = await prisma.invoice.findMany({
    where: {
      userId,
      paymentMethod: "CASH", // Only cash affects the drawer
      createdAt: {
        gte: lastMovement.createdAt,
      },
    },
  });

  // 3. Calculate cash flow based on invoice type
  let cashIn = 0;
  let cashOut = 0;

  for (const inv of shiftInvoices) {
    const amount = Number(inv.totalAmount);
    if (inv.type === InvoiceType.SALE || inv.type === InvoiceType.RETURN_PURCHASE) {
      cashIn += amount;
    } else if (inv.type === InvoiceType.PURCHASE || inv.type === InvoiceType.RETURN_SALE) {
      cashOut += amount;
    }
  }

  const expectedCash = startingCash + cashIn - cashOut;

  return { expectedCash, startingCash, cashIn, cashOut, shiftStart: lastMovement.createdAt };
};

export const closeShift = async (userId: number, actualEndingCash: number) => {
  // Backend calculates the truth. Ignore the frontend.
  const { expectedCash } = await calculateExpectedCash(userId);

  const discrepancy = actualEndingCash - expectedCash;
  const description = discrepancy === 0 
    ? "Drawer closed (Balanced)" 
    : `Drawer closed (Discrepancy: ${discrepancy})`;

  return prisma.dailyMovement.create({
    data: {
      userId,
      type: "SHIFT_END",
      amount: actualEndingCash,
      description,
      status: "CLOSED", 
    },
  });
};