const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({ datasources: { db: { url: 'file:' + path.resolve('apps/api/prisma/dev.db') } } });

function normalizePhoneNumber(phone) {
  if (!phone) return '';
  let clean = String(phone).trim().replace(/\D/g, '');
  if (clean.startsWith('84') && clean.length >= 11) {
    clean = '0' + clean.slice(2);
  } else if (!clean.startsWith('0') && clean.length === 9) {
    clean = '0' + clean;
  }
  return clean;
}

async function testLogin(phone, pass) {
  const trimmedInput = (phone || '').trim();
  const isLoginAsAdmin =
    trimmedInput.toLowerCase() === 'admin' ||
    trimmedInput === '0988888888';

  let user = null;

  if (isLoginAsAdmin) {
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: 'admin' },
          { role: 'ADMIN' },
          { phone: '0988888888' },
        ],
      },
    });
  } else {
    const cleanInputPhone = normalizePhoneNumber(trimmedInput);
    user = await prisma.user.findUnique({
      where: { phone: cleanInputPhone },
    });
  }

  if (!user) return { success: false, reason: 'User not found' };

  let isMatch = await bcrypt.compare(pass, user.passwordHash);
  const effectivePhone = normalizePhoneNumber(user.phone) || normalizePhoneNumber(trimmedInput);
  const last6 = effectivePhone.length >= 6 ? effectivePhone.slice(-6) : '';
  const rawLast6 = (user.phone || '').trim().replace(/\D/g, '').slice(-6);

  if (!isMatch) {
    if (user.role === 'ADMIN' || user.phone === 'admin' || isLoginAsAdmin) {
      if (pass === 'Admin@123') {
        isMatch = true;
      }
    } else {
      if (last6 && (pass === last6 || pass === rawLast6)) {
        isMatch = true;
      }
    }
  }

  return { success: isMatch, role: user.role, phone: user.phone };
}

async function run() {
  console.log('Username: "admin", Pass: "Admin@123" ->', await testLogin('admin', 'Admin@123'));
  console.log('Username: "admin", Pass: "wrong" ->', await testLogin('admin', 'wrong'));
  console.log('Employee: "0965648493", Pass: "648493" ->', await testLogin('0965648493', '648493'));
}

run().finally(() => prisma.$disconnect());
