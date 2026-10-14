import { prisma } from "../src/config/db.js";

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Usage: npm run admin:promote -- <user-email>");
  process.exitCode = 1;
} else {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: "Admin" },
      select: { email: true, role: true },
    });

    console.log(`Promoted ${user.email} to ${user.role}.`);
  } catch (error) {
    console.error("Could not promote that user. Confirm the account exists.", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
