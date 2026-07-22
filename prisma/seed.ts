import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { localToUtc } from "../src/lib/tz";
import { randomCuid } from "../src/lib/ids";

const prisma = new PrismaClient();

const now = new Date();
const hoursFromNow = (h: number) =>
  new Date(now.getTime() + h * 3600 * 1000);
const daysFromNow = (d: number) => hoursFromNow(d * 24);

async function main() {
  console.log("Seeding database...");

  await prisma.registration.deleteMany();
  await prisma.event.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash("password123", 10);

  // ---- Users ----
  const admin = await prisma.user.create({
    data: {
      email: "admin@moxn.app",
      name: "Moxn Admin",
      passwordHash: password,
      role: "ADMIN",
    },
  });
  const organizer1 = await prisma.user.create({
    data: {
      email: "nova@moxn.app",
      name: "Nova Rivera",
      passwordHash: password,
      role: "ORGANIZER",
    },
  });
  const organizer2 = await prisma.user.create({
    data: {
      email: "leo@moxn.app",
      name: "Leo Tanaka",
      passwordHash: password,
      role: "ORGANIZER",
    },
  });
  const organizer3 = await prisma.user.create({
    data: {
      email: "amara@moxn.app",
      name: "Amara Okafor",
      passwordHash: password,
      role: "ORGANIZER",
    },
  });
  const attendee = await prisma.user.create({
    data: {
      email: "sam@moxn.app",
      name: "Sam Carter",
      passwordHash: password,
      role: "ATTENDEE",
    },
  });
  const attendee2 = await prisma.user.create({
    data: {
      email: "mia@moxn.app",
      name: "Mia Chen",
      passwordHash: password,
      role: "ATTENDEE",
    },
  });

  // ---- Categories ----
  const categories = [
    { name: "Music", slug: "music", color: "280 70% 55%" },
    { name: "Tech", slug: "tech", color: "211 90% 50%" },
    { name: "Food & Drink", slug: "food-drink", color: "25 95% 53%" },
    { name: "Sports", slug: "sports", color: "142 71% 40%" },
    { name: "Arts", slug: "arts", color: "330 75% 55%" },
    { name: "Business", slug: "business", color: "243 75% 59%" },
    { name: "Community", slug: "community", color: "180 60% 40%" },
    { name: "Nightlife", slug: "nightlife", color: "300 60% 50%" },
  ];
  const catMap: Record<string, string> = {};
  for (const c of categories) {
    const created = await prisma.category.create({ data: c });
    catMap[c.slug] = created.id;
  }

  const cover = (seed: string) =>
    `https://picsum.photos/seed/${seed}/800/450`;

  type TicketDef = {
    name: string;
    description?: string;
    price: number;
    quantity: number;
  };

  async function makeEvent(opts: {
    title: string;
    description: string;
    date: Date;
    start: string;
    end: string;
    tz: string;
    venue: string;
    address: string;
    cat: string;
    organizer: string;
    status: string;
    tickets: TicketDef[];
    coverSeed: string;
    rejectionReason?: string;
  }) {
    const startTime = localToUtc(
      opts.date.toISOString().slice(0, 10),
      opts.start,
      opts.tz
    );
    const endTime = localToUtc(
      opts.date.toISOString().slice(0, 10),
      opts.end,
      opts.tz
    );
    const totalCapacity = opts.tickets.reduce((s, t) => s + t.quantity, 0);
    return prisma.event.create({
      data: {
        title: opts.title,
        description: opts.description,
        startTime,
        endTime,
        timezone: opts.tz,
        venueName: opts.venue,
        address: opts.address,
        coverImage: cover(opts.coverSeed),
        categoryId: catMap[opts.cat],
        organizerId: opts.organizer,
        status: opts.status,
        rejectionReason: opts.rejectionReason,
        capacity: totalCapacity,
        publishedAt:
          opts.status === "APPROVED" ? opts.date : null,
        ticketTypes: {
          create: opts.tickets.map((t) => ({
            name: t.name,
            description: t.description ?? null,
            price: t.price,
            quantity: t.quantity,
          })),
        },
      },
      include: { ticketTypes: true },
    });
  }

  // ---- APPROVED events ----
  const e1 = await makeEvent({
    title: "Skyline Synthwave Night",
    description:
      "A late-night electronic showcase on the rooftop with three resident DJs, immersive visuals, and city lights all around. 21+. General admission includes one drink.",
    date: hoursFromNow(6),
    start: "21:00",
    end: "02:00",
    tz: "America/New_York",
    venue: "The Rooftop at Pier 17",
    address: "89 South St, New York, NY",
    cat: "nightlife",
    organizer: organizer1.id,
    status: "APPROVED",
    tickets: [
      { name: "General", price: 2500, quantity: 120 },
      { name: "VIP Booth", description: "Private booth + bottle service", price: 9000, quantity: 20 },
    ],
    coverSeed: "synthwave",
  });

  const e2 = await makeEvent({
    title: "Founders & Coffee: Seed to Series A",
    description:
      "An intimate morning roundtable for early-stage founders. Hear from two operators who scaled from zero to eight figures, then open networking over specialty coffee.",
    date: daysFromNow(3),
    start: "08:30",
    end: "10:30",
    tz: "America/Los_Angeles",
    venue: "Soma Works",
    address: "675 5th St, San Francisco, CA",
    cat: "business",
    organizer: organizer2.id,
    status: "APPROVED",
    tickets: [
      { name: "General", price: 1500, quantity: 60 },
      { name: "Mentor Pass", description: "Includes 1:1 slot with a mentor", price: 4500, quantity: 10 },
    ],
    coverSeed: "founders",
  });

  const e3 = await makeEvent({
    title: "Riverside 10K & Fun Run",
    description:
      "Join 2,000 runners along the scenic riverfront. Chip-timed 10K, a 5K fun run, and a post-race festival with food trucks and live music.",
    date: daysFromNow(12),
    start: "07:00",
    end: "11:00",
    tz: "America/Chicago",
    venue: "Riverfront Plaza",
    address: "200 River Walk, Austin, TX",
    cat: "sports",
    organizer: organizer3.id,
    status: "APPROVED",
    tickets: [
      { name: "10K Timed", price: 3500, quantity: 1500 },
      { name: "5K Fun Run", price: 2000, quantity: 500 },
    ],
    coverSeed: "run",
  });

  const e4 = await makeEvent({
    title: "Neon Art Walk",
    description:
      "A self-guided tour of light installations across the arts district. Maps provided at check-in; family friendly until 9pm.",
    date: daysFromNow(20),
    start: "18:00",
    end: "22:00",
    tz: "Europe/London",
    venue: "Shoreditch Arts District",
    address: "Shoreditch High St, London",
    cat: "arts",
    organizer: organizer1.id,
    status: "APPROVED",
    tickets: [{ name: "General", price: 1200, quantity: 400 }],
    coverSeed: "neonart",
  });

  const e5 = await makeEvent({
    title: "Taco Festival 2026",
    description:
      "Fifty vendors, two stages, and the city's best tacos. Ticket includes 5 tasting tokens. Arrive hungry.",
    date: daysFromNow(8),
    start: "12:00",
    end: "20:00",
    tz: "America/Denver",
    venue: "Civic Center Park",
    address: "101 14th Ave, Denver, CO",
    cat: "food-drink",
    organizer: organizer2.id,
    status: "APPROVED",
    tickets: [
      { name: "General", price: 1800, quantity: 25 },
      { name: "VIP", description: "Skip-the-line + chef's table", price: 5000, quantity: 8 },
    ],
    coverSeed: "tacos",
  });

  const e6 = await makeEvent({
    title: "Indie Game Dev Meetup",
    description:
      "Show-and-tell for indie game developers. Demo your build, get feedback, and meet collaborators. Beginners welcome.",
    date: daysFromNow(5),
    start: "18:30",
    end: "21:30",
    tz: "Asia/Tokyo",
    venue: "Shibuya Hikarie",
    address: "2-21-1 Shibuya, Tokyo",
    cat: "tech",
    organizer: organizer3.id,
    status: "APPROVED",
    tickets: [{ name: "General", price: 0, quantity: 80 }],
    coverSeed: "gamedev",
  });

  const e7 = await makeEvent({
    title: "Sunset Jazz in the Park",
    description:
      "A relaxed evening of live jazz as the sun goes down. Bring a blanket. Food and drinks available on site.",
    date: hoursFromNow(-52),
    start: "18:00",
    end: "21:00",
    tz: "America/New_York",
    venue: "Prospect Park Bandshell",
    address: "9 Lincoln Rd, Brooklyn, NY",
    cat: "music",
    organizer: organizer1.id,
    status: "APPROVED",
    tickets: [{ name: "General", price: 0, quantity: 300 }],
    coverSeed: "jazz",
  });

  // A sold-out event
  const e8 = await makeEvent({
    title: "Warehouse Techno Session",
    description:
      "One room, one soundsystem, one unforgettable night of raw techno. Strictly limited capacity.",
    date: daysFromNow(2),
    start: "23:00",
    end: "05:00",
    tz: "Europe/Berlin",
    venue: "Tresor Basement",
    address: "Köpenicker Str. 70, Berlin",
    cat: "nightlife",
    organizer: organizer2.id,
    status: "APPROVED",
    tickets: [
      { name: "General", price: 3000, quantity: 30 },
      { name: "Early Bird", price: 2000, quantity: 20 },
    ],
    coverSeed: "techno",
  });

  // ---- SUBMITTED (pending admin approval) ----
  await makeEvent({
    title: "Community Potluck & Skill Share",
    description:
      "Bring a dish and a skill to share. We'll have stations for coding, gardening, and bread baking.",
    date: daysFromNow(15),
    start: "16:00",
    end: "19:00",
    tz: "America/Los_Angeles",
    venue: "Mission Community Hall",
    address: "400 Valencia St, San Francisco, CA",
    cat: "community",
    organizer: organizer3.id,
    status: "SUBMITTED",
    tickets: [{ name: "General", price: 0, quantity: 100 }],
    coverSeed: "potluck",
  });

  await makeEvent({
    title: "AI Builders Hacknight",
    description:
      "An overnight hackathon building agentic apps. Meals and GPUs provided.",
    date: daysFromNow(18),
    start: "18:00",
    end: "18:00",
    tz: "America/New_York",
    venue: "TechHub Downtown",
    address: "55 Broad St, New York, NY",
    cat: "tech",
    organizer: organizer1.id,
    status: "SUBMITTED",
    tickets: [
      { name: "Hacker", price: 0, quantity: 200 },
      { name: "Mentor", price: 0, quantity: 20 },
    ],
    coverSeed: "hacknight",
  });

  // ---- REJECTED ----
  await makeEvent({
    title: "Questionable Cash Raffle",
    description: "Buy a ticket, win a mystery prize. (This listing was rejected by moderation.)",
    date: daysFromNow(7),
    start: "20:00",
    end: "23:00",
    tz: "America/New_York",
    venue: "Unknown",
    address: "Unknown",
    cat: "community",
    organizer: organizer3.id,
    status: "REJECTED",
    rejectionReason: "Listings may not advertise raffles or lotteries.",
    tickets: [{ name: "General", price: 5000, quantity: 100 }],
    coverSeed: "raffle",
  });

  // ---- CANCELLED ----
  await makeEvent({
    title: "Rooftop Yoga at Dawn (Cancelled)",
    description: "This sunrise session was cancelled by the organizer due to weather.",
    date: daysFromNow(4),
    start: "06:00",
    end: "07:00",
    tz: "America/New_York",
    venue: "Skyline Yoga",
    address: "1 Rooftop Ave, New York, NY",
    cat: "community",
    organizer: organizer1.id,
    status: "CANCELLED",
    tickets: [{ name: "General", price: 2000, quantity: 40 }],
    coverSeed: "yoga",
  });

  // ---- DRAFT (organizer-only) ----
  await makeEvent({
    title: "Draft: Winter Light Market",
    description: "Work in progress — not yet submitted.",
    date: daysFromNow(30),
    start: "11:00",
    end: "19:00",
    tz: "America/New_York",
    venue: "TBD",
    address: "TBD",
    cat: "arts",
    organizer: organizer2.id,
    status: "DRAFT",
    tickets: [{ name: "General", price: 1000, quantity: 200 }],
    coverSeed: "market",
  });

  // ---- Registrations to make it feel alive ----
  async function confirmFor(
    event: any,
    user: any,
    ticketName: string,
    checkedIn = false
  ) {
    const tt = event.ticketTypes.find((t: any) => t.name === ticketName);
    if (!tt) return;
    const reg = await prisma.registration.create({
      data: {
        eventId: event.id,
        userId: user.id,
        ticketTypeId: tt.id,
        quantity: 1,
        totalPrice: tt.price,
        status: "CONFIRMED",
        qrToken: randomCuid(),
        confirmedAt: new Date(),
        checkedInAt: checkedIn ? new Date() : null,
      },
    });
    await prisma.ticketType.update({
      where: { id: tt.id },
      data: { soldCount: { increment: 1 } },
    });
    return reg;
  }

  await confirmFor(e1, attendee, "General");
  await confirmFor(e1, attendee2, "VIP Booth");
  await confirmFor(e2, attendee, "General");
  await confirmFor(e3, attendee2, "10K Timed");
  await confirmFor(e4, attendee, "General");
  await confirmFor(e5, attendee, "VIP");
  await confirmFor(e6, attendee, "General");
  // Past event checked-in
  await confirmFor(e7, attendee, "General", true);

  // Sold-out event: reserve all capacity (no individual rows needed to
  // demonstrate the sold-out state in the UI).
  for (const tt of e8.ticketTypes) {
    await prisma.ticketType.update({
      where: { id: tt.id },
      data: { soldCount: tt.quantity },
    });
  }

  // A report on a submitted event to populate admin queue
  await prisma.report.create({
    data: {
      eventId: (
        await prisma.event.findFirst({
          where: { status: "APPROVED" },
          orderBy: { createdAt: "desc" },
        })
      )!.id,
      userId: attendee.id,
      reason: "Venue address looks incorrect.",
    },
  });

  console.log("Seed complete.");
  console.log("Login with: admin@moxn.app / password123 (or any organizer/attendee above)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
