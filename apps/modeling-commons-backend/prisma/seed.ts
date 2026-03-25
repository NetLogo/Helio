import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Upsert seed user
  await prisma.user.upsert({
    where: { id: 'f59d0748-d455-4465-b0a8-8d8260b1c877' },
    update: {},
    create: {
      id: 'f59d0748-d455-4465-b0a8-8d8260b1c877',
      email: 'john@gmail.com',
    },
  });

  console.log('Seed completed');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
