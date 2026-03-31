import { PrismaClient, InvoiceStatus, Plan } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.warn("🌱 Seeding database...");

  // Create demo user
  const passwordHash = await bcrypt.hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@quickinvoice.app" },
    update: {},
    create: {
      email: "demo@quickinvoice.app",
      name: "Alex Demo",
      passwordHash,
      plan: Plan.PRO,
      businessName: "Alex Demo Studio",
      currency: "USD",
    },
  });

  console.warn(`✅ Demo user created: ${user.email}`);

  // Create demo clients
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

  // Create demo invoices
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const pastDue = new Date();
  pastDue.setDate(pastDue.getDate() - 10);

  await prisma.invoice.upsert({
    where: { id: "seed-invoice-1" },
    update: {},
    create: {
      id: "seed-invoice-1",
      userId: user.id,
      clientId: client1.id,
      number: "INV-0001",
      status: InvoiceStatus.PAID,
      dueDate,
      currency: "USD",
      taxRate: 0,
      paidAt: new Date(),
      paidAmount: 2500,
      lineItems: {
        create: [
          {
            description: "Website redesign",
            quantity: 1,
            unitPrice: 2000,
            amount: 2000,
          },
          {
            description: "SEO setup",
            quantity: 1,
            unitPrice: 500,
            amount: 500,
          },
        ],
      },
    },
  });

  await prisma.invoice.upsert({
    where: { id: "seed-invoice-2" },
    update: {},
    create: {
      id: "seed-invoice-2",
      userId: user.id,
      clientId: client2.id,
      number: "INV-0002",
      status: InvoiceStatus.SENT,
      dueDate,
      currency: "USD",
      taxRate: 10,
      sentAt: new Date(),
      lineItems: {
        create: [
          {
            description: "Brand identity design",
            quantity: 1,
            unitPrice: 1500,
            amount: 1500,
          },
        ],
      },
    },
  });

  await prisma.invoice.upsert({
    where: { id: "seed-invoice-3" },
    update: {},
    create: {
      id: "seed-invoice-3",
      userId: user.id,
      clientId: client1.id,
      number: "INV-0003",
      status: InvoiceStatus.DRAFT,
      dueDate,
      currency: "USD",
      taxRate: 0,
      lineItems: {
        create: [
          {
            description: "Monthly retainer — April 2026",
            quantity: 1,
            unitPrice: 3000,
            amount: 3000,
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
