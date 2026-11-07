const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:' + path.resolve(__dirname, '../apps/api/prisma/dev.db'),
    },
  },
});

async function main() {
  const usersWithDots = await prisma.user.findMany({
    where: {
      phone: { contains: '.' }
    }
  });
  console.log('Users with dots in phone:', usersWithDots.length);
  for (const u of usersWithDots) {
    const rawDigits = u.phone.replace(/\D/g, '');
    const cleanLast6 = rawDigits.slice(-6);
    const rawLast6 = u.phone.slice(-6);
    const matchClean = await bcrypt.compare(cleanLast6, u.passwordHash);
    const matchRaw = await bcrypt.compare(rawLast6, u.passwordHash);
    console.log(`User ${u.phone}: rawDigits=${rawDigits}, cleanLast6=${cleanLast6} (match: ${matchClean}), rawLast6=${rawLast6} (match: ${matchRaw})`);
  }
}

main().finally(() => prisma.$disconnect());
