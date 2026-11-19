// backend/prisma/seed.ts
import { PrismaClient, Role, AccountStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface SeedUserInput {
  name: string;
  role: Role;
  password: string;
  status: AccountStatus;
  kelas?: number;
  gender?: string;
  nip?: string;
  subject?: string;
}

async function upsertUser(username: string, input: SeedUserInput) {
  // Pisahkan password agar tidak ikut ter-spread dan menimpa hash
  const { password, status, ...profileData } = input;
  const hashed = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { username } });

  if (existing) {
    // Update HANYA profil. Jangan sentuh password & status
    // (agar password user yang sudah diganti & hasil approval admin tidak terbalik)
    await prisma.user.update({
      where: { username },
      data: {
        name: profileData.name,
        role: profileData.role,
        kelas: profileData.kelas ?? null,
        gender: profileData.gender ?? null,
        nip: profileData.nip ?? null,
        subject: profileData.subject ?? null,
      },
    });
    console.log(`↻ ${username} sudah ada, profil diperbarui.`);
  } else {
    // Create dengan password HASHED + status awal dari input
    await prisma.user.create({
      data: {
        username,
        password: hashed,
        status,
        ...profileData,
      },
    });
    console.log(`✓ ${username} dibuat (status: ${status}).`);
  }
}

async function main() {
  await upsertUser('admin_sd', {
    name: 'Administrator Sekolah',
    role: Role.admin,
    password: 'admin123',
    status: AccountStatus.ACTIVE,
  });

  await upsertUser('bu_rina', {
    name: 'Bu Rina',
    role: Role.teacher,
    password: 'guru123',
    status: AccountStatus.ACTIVE,
    nip: '198501012010012001',
    subject: 'Wali Kelas 5',
  });

  await upsertUser('guru_baru', {
    name: 'Pak Eko (Menunggu Persetujuan)',
    role: Role.teacher,
    password: 'guru123',
    status: AccountStatus.PENDING,
    nip: '199002022015021002',
    subject: 'Guru BK',
  });

  await upsertUser('raka', {
    name: 'Raka Pratama',
    role: Role.student,
    password: 'siswa123',
    status: AccountStatus.ACTIVE,
    kelas: 5,
    gender: 'Laki-laki',
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });