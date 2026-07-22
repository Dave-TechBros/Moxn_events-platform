import { prisma } from "@/lib/prisma";
import { Prisma, PrismaClient } from "@prisma/client";
import { HOLD_MINUTES, REGISTRATION_STATUS } from "@/lib/constants";
import { randomCuid } from "@/lib/ids";

export class CapacityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CapacityError";
  }
}

const ACTIVE = [REGISTRATION_STATUS.HOLD, REGISTRATION_STATUS.CONFIRMED];

/**
 * Release any HOLDs whose timer expired, freeing their reserved capacity.
 * Called inside the same transaction before we check availability so we
 * never sell a seat that a dead hold is still reserving.
 */
async function releaseExpiredHolds(
  tx: PrismaClient | Prisma.TransactionClient
): Promise<void> {
  const cutoff = new Date(Date.now() - HOLD_MINUTES * 60 * 1000);
  const expired = await tx.registration.findMany({
    where: {
      status: REGISTRATION_STATUS.HOLD,
      holdExpiresAt: { lt: cutoff },
    },
    select: { id: true, ticketTypeId: true, quantity: true },
  });
  for (const r of expired) {
    await tx.ticketType.update({
      where: { id: r.ticketTypeId },
      data: { soldCount: { decrement: r.quantity } },
    });
    await tx.registration.update({
      where: { id: r.id },
      data: { status: REGISTRATION_STATUS.CANCELLED, cancelledAt: new Date() },
    });
  }
}

export type HoldInput = {
  eventId: string;
  ticketTypeId: string;
  userId: string;
  quantity: number;
};

/**
 * Atomic multi-step transaction: reserve a HOLD (capacity check + reserve)
 * before payment is confirmed. Prevents overselling under concurrency.
 */
export async function reserveHold(input: HoldInput) {
  return prisma.$transaction(async (tx) => {
    await releaseExpiredHolds(tx);

    const ticket = await tx.ticketType.findUnique({
      where: { id: input.ticketTypeId },
      include: { event: true },
    });
    if (!ticket || ticket.eventId !== input.eventId) {
      throw new CapacityError("That ticket type is not available.");
    }
    if (ticket.event.status !== "APPROVED") {
      throw new CapacityError("This event is not open for registration.");
    }

    const existing = await tx.registration.findFirst({
      where: {
        userId: input.userId,
        ticketTypeId: input.ticketTypeId,
        status: { in: ACTIVE },
      },
    });
    if (existing) {
      throw new CapacityError(
        "You already have a registration for this ticket type."
      );
    }

    const typeRemaining = ticket.quantity - ticket.soldCount;
    if (typeRemaining < input.quantity) {
      throw new CapacityError("Not enough tickets of this type remaining.");
    }

    const totals = await tx.ticketType.aggregate({
      where: { eventId: input.eventId },
      _sum: { quantity: true, soldCount: true },
    });
    const overallRemaining =
      (totals._sum.quantity ?? 0) - (totals._sum.soldCount ?? 0);
    if (overallRemaining < input.quantity) {
      throw new CapacityError("This event is sold out.");
    }

    const expires = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
    const registration = await tx.registration.create({
      data: {
        eventId: input.eventId,
        userId: input.userId,
        ticketTypeId: input.ticketTypeId,
        quantity: input.quantity,
        totalPrice: ticket.price * input.quantity,
        status: REGISTRATION_STATUS.HOLD,
        qrToken: randomCuid(),
        holdExpiresAt: expires,
      },
    });
    await tx.ticketType.update({
      where: { id: ticket.id },
      data: { soldCount: { increment: input.quantity } },
    });
    return registration;
  });
}

/** Step 2: confirm the hold into a real ticket (after mock payment). */
export async function confirmHold(registrationId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const reg = await tx.registration.findUnique({
      where: { id: registrationId },
    });
    if (!reg || reg.userId !== userId) {
      throw new CapacityError("Registration not found.");
    }
    if (reg.status === REGISTRATION_STATUS.CONFIRMED) return reg;
    if (reg.status !== REGISTRATION_STATUS.HOLD) {
      throw new CapacityError("This hold is no longer valid.");
    }
    if (reg.holdExpiresAt && reg.holdExpiresAt.getTime() < Date.now()) {
      await tx.ticketType.update({
        where: { id: reg.ticketTypeId },
        data: { soldCount: { decrement: reg.quantity } },
      });
      throw new CapacityError("Your hold expired. Please try again.");
    }
    return tx.registration.update({
      where: { id: registrationId },
      data: {
        status: REGISTRATION_STATUS.CONFIRMED,
        confirmedAt: new Date(),
        holdExpiresAt: null,
      },
    });
  });
}

/** Cancel a HOLD (no capacity impact beyond releasing the reserve). */
export async function cancelHold(registrationId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const reg = await tx.registration.findUnique({
      where: { id: registrationId },
    });
    if (!reg || reg.userId !== userId) return null;
    if (reg.status === REGISTRATION_STATUS.CONFIRMED) {
      throw new CapacityError(
        "Use the refund flow to cancel a confirmed ticket."
      );
    }
    await tx.ticketType.update({
      where: { id: reg.ticketTypeId },
      data: { soldCount: { decrement: reg.quantity } },
    });
    return tx.registration.update({
      where: { id: registrationId },
      data: {
        status: REGISTRATION_STATUS.CANCELLED,
        cancelledAt: new Date(),
      },
    });
  });
}

/** Refund/cancel a CONFIRMED ticket, freeing its capacity. */
export async function refundRegistration(
  registrationId: string,
  userId: string
) {
  return prisma.$transaction(async (tx) => {
    const reg = await tx.registration.findUnique({
      where: { id: registrationId },
    });
    if (!reg || reg.userId !== userId) return null;
    if (reg.status === REGISTRATION_STATUS.HOLD) {
      return cancelHold(registrationId, userId);
    }
    if (reg.status !== REGISTRATION_STATUS.CONFIRMED) return reg;
    await tx.ticketType.update({
      where: { id: reg.ticketTypeId },
      data: { soldCount: { decrement: reg.quantity } },
    });
    return tx.registration.update({
      where: { id: registrationId },
      data: {
        status: REGISTRATION_STATUS.REFUNDED,
        cancelledAt: new Date(),
      },
    });
  });
}

export type TypeAvailability = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  soldCount: number;
  remaining: number;
  soldOut: boolean;
};

export type EventAvailability = {
  totalCapacity: number;
  totalSold: number;
  overallRemaining: number;
  soldOut: boolean;
  perType: TypeAvailability[];
};

/** Compute display availability for an event (after releasing dead holds). */
export async function getEventAvailability(
  eventId: string
): Promise<EventAvailability> {
  await releaseExpiredHolds(prisma);
  const types = await prisma.ticketType.findMany({
    where: { eventId },
    orderBy: { price: "asc" },
  });
  const perType: TypeAvailability[] = types.map((t) => {
    const remaining = Math.max(0, t.quantity - t.soldCount);
    return {
      id: t.id,
      name: t.name,
      price: t.price,
      quantity: t.quantity,
      soldCount: t.soldCount,
      remaining,
      soldOut: remaining <= 0,
    };
  });
  const totalCapacity = perType.reduce((s, t) => s + t.quantity, 0);
  const totalSold = perType.reduce((s, t) => s + t.soldCount, 0);
  const overallRemaining = Math.max(0, totalCapacity - totalSold);
  return {
    totalCapacity,
    totalSold,
    overallRemaining,
    soldOut: overallRemaining <= 0,
    perType,
  };
}
