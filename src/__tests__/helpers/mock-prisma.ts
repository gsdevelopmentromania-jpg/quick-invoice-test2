/**
 * Shared Prisma mock factory used across API route tests.
 *
 * Usage:
 *   jest.mock("@/lib/prisma", () => ({ __esModule: true, default: createPrismaMock() }));
 *   const prismaMock = getPrismaMock();
 *
 * Keep this file test-only — never import in production code.
 */

// Single shared instance so every test file that calls getPrismaMock()
// gets the same jest.fn() references.
const prismaMock = {
  client: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  invoice: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  invoiceActivity: {
    create: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  verificationToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  passwordResetToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation(
    (arg: ((tx: typeof prismaMock) => Promise<unknown>) | Array<Promise<unknown>>) => {
      if (typeof arg === "function") {
        return arg(prismaMock);
      }
      return Promise.all(arg);
    }
  ),
};

export function getPrismaMock() {
  return prismaMock;
}

export function resetPrismaMock() {
  prismaMock.client.findFirst.mockReset();
  prismaMock.client.findMany.mockReset();
  prismaMock.client.count.mockReset();
  prismaMock.client.create.mockReset();
  prismaMock.client.update.mockReset();
  prismaMock.client.delete.mockReset();
  prismaMock.invoice.findFirst.mockReset();
  prismaMock.invoice.findMany.mockReset();
  prismaMock.invoice.count.mockReset();
  prismaMock.invoice.create.mockReset();
  prismaMock.invoice.update.mockReset();
  prismaMock.invoice.delete.mockReset();
  prismaMock.invoiceActivity.create.mockReset();
  prismaMock.user.findUnique.mockReset();
  prismaMock.user.create.mockReset();
  prismaMock.user.update.mockReset();
  prismaMock.user.delete.mockReset();
  prismaMock.verificationToken.findUnique.mockReset();
  prismaMock.verificationToken.create.mockReset();
  prismaMock.verificationToken.delete.mockReset();
  prismaMock.passwordResetToken.findUnique.mockReset();
  prismaMock.passwordResetToken.create.mockReset();
  prismaMock.passwordResetToken.update.mockReset();
  prismaMock.passwordResetToken.updateMany.mockReset();
  prismaMock.passwordResetToken.delete.mockReset();
  prismaMock.$transaction.mockReset();
  prismaMock.$transaction.mockImplementation(
    (arg: ((tx: typeof prismaMock) => Promise<unknown>) | Array<Promise<unknown>>) => {
      if (typeof arg === "function") {
        return arg(prismaMock);
      }
      return Promise.all(arg);
    }
  );
}
