import { PrismaClient, InvoiceStatus, Plan } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Convert dollars to cents */
function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

async function main(): Promise<void> {
  console.warn("🌱 Seeding database...");

  const passwordHash = await bcrypt.hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@quickinvoice.app" },
    update: {},
    create: {
      email: "demo@quickinvoice.app",
      fullName: "Alex Demo",
      plan: Plan.PRO,
      businessName: "Alex Demo Studio",
      currency: "USD",
      locale: "en-US",
    },
  });

  console.warn(`✅ Demo user created: ${user.email}`);

  const client1 = await prisma.client.upsert({
    where: { id: "seed-client-1" },
    update: {},
    create: {
      id: "seed-client-1",
      userId: user.id,
      name: "Sarah Johnson",
      email: "sarah@acmecorp.com",
      company: "Acme Corp",
      address: "123 Main St, New York, NY 10001",
    },
  });

  const client2 = await prisma.client.upsert({
    where: { id: "seed-client-2" },
    update: {},
    create: {
      id: "seed-client-2",
      userId: user.id,
      name: "Tom Williams",
      email: "tom@startupco.io",
      company: "StartupCo",
      address: "456 Market St, San Francisco, CA 94105",
    },
  });

  console.warn(`✅ Demo clients created`);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  // Invoice 1 — PAID: Website redesign + SEO ($2,500)
  const inv1Subtotal = toCents(2500);
  await prisma.invoice.upsert({
    where: { id: "seed-invoice-1" },
    update: {},
    create: {
      id: "seed-invoice-1",
      userId: user.id,
      clientId: client1.id,
      invoiceNumber: "INV-0001",
      status: InvoiceStatus.PAID,
      currency: "USD",
      dueDate,
      subtotal: inv1Subtotal,
      taxRate: 0,
      taxAmount: 0,
      discountAmount: 0,
      total: inv1Subtotal,
      paidAt: new Date(),
      lineItems: {
        create: [
          {
            description: "Website redesign",
            quantity: 1,
            unitPrice: toCents(2000),
            amount: toCents(2000),
            sortOrder: 0,
          },
          {
            description: "SEO setup",
            quantity: 1,
            unitPrice: toCents(500),
            amount: toCents(500),
            sortOrder: 1,
          },
        ],
      },
    },
  });

  // Invoice 2 — SENT: Brand identity ($1,500 + 10% tax = $1,650)
  const inv2Subtotal = toCents(1500);
  const inv2Tax = Math.round(inv2Subtotal * 0.1);
  await prisma.invoice.upsert({
    where: { id: "seed-invoice-2" },
    update: {},
    create: {
      id: "seed-invoice-2",
      userId: user.id,
      clientId: client2.id,
      invoiceNumber: "INV-0002",
      status: InvoiceStatus.SENT,
      currency: "USD",
      dueDate,
      subtotal: inv2Subtotal,
      taxRate: 10,
      taxAmount: inv2Tax,
      discountAmount: 0,
      total: inv2Subtotal + inv2Tax,
      sentAt: new Date(),
      lineItems: {
        create: [
          {
            description: "Brand identity design",
            quantity: 1,
            unitPrice: toCents(1500),
            amount: toCents(1500),
            sortOrder: 0,
          },
        ],
      },
    },
  });

  // Invoice 3 — DRAFT: Monthly retainer ($3,000)
  const inv3Subtotal = toCents(3000);
  await prisma.invoice.upsert({
    where: { id: "seed-invoice-3" },
    update: {},
    create: {
      id: "seed-invoice-3",
      userId: user.id,
      clientId: client1.id,
      invoiceNumber: "INV-0003",
      status: InvoiceStatus.DRAFT,
      currency: "USD",
      dueDate,
      subtotal: inv3Subtotal,
      taxRate: 0,
      taxAmount: 0,
      discountAmount: 0,
      total: inv3Subtotal,
      lineItems: {
        create: [
          {
            description: "Monthly retainer — April 2026",
            quantity: 1,
            unitPrice: toCents(3000),
            amount: toCents(3000),
            sortOrder: 0,
          },
        ],
      },
    },
  });

  console.warn(`✅ Demo invoices created`);
  console.warn("🌱 Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
