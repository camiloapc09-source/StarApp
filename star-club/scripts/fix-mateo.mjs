import { PrismaClient } from '../src/generated/prisma/index.js';
const db = new PrismaClient();

async function main() {
  // Find all Mateo payments
  const payments = await db.payment.findMany({
    where: { player: { user: { name: { contains: 'Mateo' } } } },
    orderBy: { dueDate: 'asc' }
  });
  console.log('Mateo payments:', JSON.stringify(payments.map(p => ({
    id: p.id, status: p.status, dueDate: p.dueDate, paidAt: p.paidAt, concept: p.concept, amount: p.amount
  })), null, 2));
}

main().finally(() => db.$disconnect());
