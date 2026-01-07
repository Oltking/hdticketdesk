import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean up existing data (in correct order due to foreign keys)
  console.log('🧹 Cleaning up existing data...');
  
  await prisma.ledgerEntry.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.withdrawal.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.ticketTier.deleteMany();
  await prisma.event.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.organizerProfile.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleanup complete');

  // Hash password
  const hashedPassword = await bcrypt.hash('Password123!', 12);

  // ==================== CREATE USERS ====================
  console.log('👤 Creating users...');

  // Admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@hdticketdesk.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`  ✅ Admin: ${adminUser.email}`);

  // Organizer user
  const organizerUser = await prisma.user.create({
    data: {
      email: 'organizer@hdticketdesk.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Organizer',
      role: 'ORGANIZER',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      organizerProfile: {
        create: {
          title: 'Lagos Events Co.',
          description: 'Premier event organizers in Lagos, Nigeria',
          bankName: 'First Bank',
          bankCode: '011',
          accountNumber: '1234567890',
          accountName: 'John Organizer',
          bankVerified: true,
          pendingBalance: 0,
          availableBalance: 50000,
          withdrawnBalance: 25000,
        },
      },
    },
    include: {
      organizerProfile: true,
    },
  });
  console.log(`  ✅ Organizer: ${organizerUser.email}`);

  // Buyer user
  const buyerUser = await prisma.user.create({
    data: {
      email: 'buyer@hdticketdesk.com',
      password: hashedPassword,
      firstName: 'Jane',
      lastName: 'Buyer',
      role: 'BUYER',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`  ✅ Buyer: ${buyerUser.email}`);

  // Second buyer
  const buyerUser2 = await prisma.user.create({
    data: {
      email: 'buyer2@hdticketdesk.com',
      password: hashedPassword,
      firstName: 'Mike',
      lastName: 'Customer',
      role: 'BUYER',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`  ✅ Buyer 2: ${buyerUser2.email}`);

  // ==================== CREATE EVENTS ====================
  console.log('🎫 Creating events...');

  if (!organizerUser.organizerProfile) {
    throw new Error('Organizer profile not created');
  }

  // Event 1: Tech Conference (Upcoming, Featured)
  const techConference = await prisma.event.create({
    data: {
      title: 'Lagos Tech Conference 2025',
      slug: 'lagos-tech-conference-2025',
      description: 'The biggest tech conference in West Africa. Join industry leaders, startups, and innovators for a day of learning, networking, and inspiration.',
      status: 'PUBLISHED',
      startDate: new Date('2025-03-15T09:00:00Z'),
      endDate: new Date('2025-03-15T18:00:00Z'),
      location: 'Landmark Event Centre, Victoria Island, Lagos',
      isOnline: false,
      coverImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',
      isFeatured: true,
      organizerId: organizerUser.organizerProfile.id,
      tiers: {
        create: [
          {
            name: 'General Admission',
            description: 'Access to all sessions and networking areas',
            price: 25000,
            capacity: 500,
            sold: 127,
            refundEnabled: true,
            sortOrder: 1,
          },
          {
            name: 'VIP',
            description: 'Front row seats, exclusive lounge access, lunch included',
            price: 75000,
            capacity: 100,
            sold: 34,
            refundEnabled: true,
            sortOrder: 2,
          },
          {
            name: 'VVIP',
            description: 'All VIP benefits plus speaker dinner and networking session',
            price: 150000,
            capacity: 20,
            sold: 8,
            refundEnabled: false,
            sortOrder: 3,
          },
        ],
      },
    },
    include: {
      tiers: true,
    },
  });
  console.log(`  ✅ Event: ${techConference.title}`);

  // Event 2: Music Festival (Upcoming)
  const musicFestival = await prisma.event.create({
    data: {
      title: 'Afrobeats Summer Festival',
      slug: 'afrobeats-summer-festival-2025',
      description: 'Experience the best of Afrobeats with top artists performing live. Food, drinks, and good vibes guaranteed!',
      status: 'PUBLISHED',
      startDate: new Date('2025-04-20T16:00:00Z'),
      endDate: new Date('2025-04-20T23:00:00Z'),
      location: 'Eko Atlantic, Lagos',
      isOnline: false,
      coverImage: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200',
      isFeatured: true,
      organizerId: organizerUser.organizerProfile.id,
      tiers: {
        create: [
          {
            name: 'Regular',
            description: 'General access to the festival grounds',
            price: 15000,
            capacity: 2000,
            sold: 456,
            refundEnabled: true,
            sortOrder: 1,
          },
          {
            name: 'VIP',
            description: 'VIP area access with premium view and free drinks',
            price: 50000,
            capacity: 300,
            sold: 89,
            refundEnabled: true,
            sortOrder: 2,
          },
        ],
      },
    },
    include: {
      tiers: true,
    },
  });
  console.log(`  ✅ Event: ${musicFestival.title}`);

  // Event 3: Online Webinar
  const webinar = await prisma.event.create({
    data: {
      title: 'Startup Funding Masterclass',
      slug: 'startup-funding-masterclass',
      description: 'Learn how to raise funds for your startup from experienced VCs and angel investors.',
      status: 'PUBLISHED',
      startDate: new Date('2025-02-10T14:00:00Z'),
      endDate: new Date('2025-02-10T16:00:00Z'),
      isOnline: true,
      onlineLink: 'https://zoom.us/j/123456789',
      coverImage: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200',
      isFeatured: false,
      organizerId: organizerUser.organizerProfile.id,
      tiers: {
        create: [
          {
            name: 'Standard',
            description: 'Live access to the webinar',
            price: 5000,
            capacity: 500,
            sold: 234,
            refundEnabled: true,
            sortOrder: 1,
          },
          {
            name: 'Premium',
            description: 'Live access + recording + Q&A priority',
            price: 15000,
            capacity: 100,
            sold: 45,
            refundEnabled: false,
            sortOrder: 2,
          },
        ],
      },
    },
    include: {
      tiers: true,
    },
  });
  console.log(`  ✅ Event: ${webinar.title}`);

  // Event 4: Draft event (not published)
  const draftEvent = await prisma.event.create({
    data: {
      title: 'Upcoming Workshop (Draft)',
      slug: 'upcoming-workshop-draft',
      description: 'This is a draft event that is not yet published.',
      status: 'DRAFT',
      startDate: new Date('2025-06-01T10:00:00Z'),
      location: 'TBD',
      isOnline: false,
      organizerId: organizerUser.organizerProfile.id,
      tiers: {
        create: [
          {
            name: 'Early Bird',
            price: 10000,
            capacity: 50,
            sold: 0,
            refundEnabled: true,
            sortOrder: 1,
          },
        ],
      },
    },
  });
  console.log(`  ✅ Event (Draft): ${draftEvent.title}`);

  // ==================== CREATE TICKETS ====================
  console.log('🎟️ Creating tickets...');

  const generalTier = techConference.tiers.find(t => t.name === 'General Admission')!;

  // Create a payment first
  const payment1 = await prisma.payment.create({
    data: {
      reference: `HD-SEED-${Date.now()}-001`,
      amount: 25000,
      status: 'SUCCESS',
      buyerEmail: buyerUser.email,
      eventId: techConference.id,
      tierId: generalTier.id,
      buyerId: buyerUser.id,
      paystackRef: 'PSK_SEED_001',
      paystackPaidAt: new Date(),
    },
  });

  // Ticket 1: Active ticket
  const ticket1 = await prisma.ticket.create({
    data: {
      ticketNumber: 'HD-SEED-001',
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=HD-SEED-001',
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=HD-SEED-001',
      status: 'ACTIVE',
      buyerEmail: buyerUser.email,
      buyerFirstName: buyerUser.firstName,
      buyerLastName: buyerUser.lastName,
      amountPaid: 25000,
      paystackRef: 'PSK_SEED_001',
      eventId: techConference.id,
      tierId: generalTier.id,
      buyerId: buyerUser.id,
      paymentId: payment1.id,
    },
  });
  console.log(`  ✅ Ticket: ${ticket1.ticketNumber} (Active)`);

  // Create another payment
  const payment2 = await prisma.payment.create({
    data: {
      reference: `HD-SEED-${Date.now()}-002`,
      amount: 25000,
      status: 'SUCCESS',
      buyerEmail: buyerUser2.email,
      eventId: techConference.id,
      tierId: generalTier.id,
      buyerId: buyerUser2.id,
      paystackRef: 'PSK_SEED_002',
      paystackPaidAt: new Date(),
    },
  });

  // Ticket 2: Checked-in ticket
  const ticket2 = await prisma.ticket.create({
    data: {
      ticketNumber: 'HD-SEED-002',
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=HD-SEED-002',
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=HD-SEED-002',
      status: 'CHECKED_IN',
      checkedInAt: new Date(),
      buyerEmail: buyerUser2.email,
      buyerFirstName: buyerUser2.firstName,
      buyerLastName: buyerUser2.lastName,
      amountPaid: 25000,
      paystackRef: 'PSK_SEED_002',
      eventId: techConference.id,
      tierId: generalTier.id,
      buyerId: buyerUser2.id,
      paymentId: payment2.id,
    },
  });
  console.log(`  ✅ Ticket: ${ticket2.ticketNumber} (Checked In)`);

  // ==================== CREATE LEDGER ENTRIES ====================
  console.log('📒 Creating ledger entries...');

  await prisma.ledgerEntry.createMany({
    data: [
      {
        type: 'TICKET_SALE',
        amount: 23750, // 25000 - 5% fee
        description: 'Ticket sale - HD-SEED-001',
        organizerId: organizerUser.organizerProfile.id,
        ticketId: ticket1.id,
        pendingBalanceAfter: 23750,
        availableBalanceAfter: 50000,
      },
      {
        type: 'TICKET_SALE',
        amount: 23750,
        description: 'Ticket sale - HD-SEED-002',
        organizerId: organizerUser.organizerProfile.id,
        ticketId: ticket2.id,
        pendingBalanceAfter: 47500,
        availableBalanceAfter: 50000,
      },
    ],
  });
  console.log('  ✅ Ledger entries created');

  // ==================== SUMMARY ====================
  console.log('\n🎉 Seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log('  - Users: 4 (1 Admin, 1 Organizer, 2 Buyers)');
  console.log('  - Events: 4 (3 Published, 1 Draft)');
  console.log('  - Tickets: 2');
  console.log('  - Payments: 2');
  console.log('  - Ledger Entries: 2');
  
  console.log('\n🔑 Test Accounts:');
  console.log('  Admin:     admin@hdticketdesk.com / Password123!');
  console.log('  Organizer: organizer@hdticketdesk.com / Password123!');
  console.log('  Buyer:     buyer@hdticketdesk.com / Password123!');
  console.log('  Buyer 2:   buyer2@hdticketdesk.com / Password123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });