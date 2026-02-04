/**
 * ============================================================================
 * BACKFILL SCRIPT: Populate monnifyTransactionRef in existing ledger entries
 * ============================================================================
 * 
 * This script:
 * 1. Finds all TICKET_SALE ledger entries without monnifyTransactionRef
 * 2. Looks up the associated ticket → payment → monnifyTransactionRef
 * 3. Updates the ledger entry with the monnifyTransactionRef
 * 4. Identifies and removes duplicate entries (keeping the newest one)
 * 
 * ONLY processes Monnify transactions (entries with valid monnifyTransactionRef)
 * Legacy Paystack entries (without monnifyTransactionRef) are left unchanged
 * 
 * Run with: npx ts-node src/scripts/backfill-ledger-monnify-refs.ts
 * ============================================================================
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function backfillLedgerMonnifyRefs() {
  console.log('============================================================');
  console.log('BACKFILL SCRIPT: Ledger Monnify Transaction References');
  console.log('============================================================\n');

  // Step 1: Find all TICKET_SALE entries without monnifyTransactionRef
  const entriesWithoutRef = await prisma.ledgerEntry.findMany({
    where: {
      type: 'TICKET_SALE',
      monnifyTransactionRef: null,
      ticketId: { not: null },
    },
    select: {
      id: true,
      ticketId: true,
      organizerId: true,
      amount: true,
      entryDate: true,
    },
  });

  console.log(`Found ${entriesWithoutRef.length} TICKET_SALE entries without monnifyTransactionRef\n`);

  if (entriesWithoutRef.length === 0) {
    console.log('No entries to backfill. Exiting.\n');
    return;
  }

  // Step 2: Get ticket IDs and look up their payments
  const ticketIds = entriesWithoutRef
    .map(e => e.ticketId)
    .filter((id): id is string => id !== null);

  const tickets = await prisma.ticket.findMany({
    where: { id: { in: ticketIds } },
    select: {
      id: true,
      payment: {
        select: {
          id: true,
          reference: true,
          monnifyTransactionRef: true,
          status: true,
          paidAt: true,
        },
      },
    },
  });

  // Create lookup map: ticketId -> payment info
  const ticketPaymentMap = new Map(
    tickets.map(t => [t.id, t.payment])
  );

  // Step 3: Update ledger entries with monnifyTransactionRef
  let updated = 0;
  let skippedNoMonnifyRef = 0;
  let skippedNoPayment = 0;

  for (const entry of entriesWithoutRef) {
    const payment = ticketPaymentMap.get(entry.ticketId!);

    if (!payment) {
      skippedNoPayment++;
      continue;
    }

    // Only update if there's a valid Monnify transaction ref
    // (This is a Monnify transaction, not legacy Paystack)
    if (!payment.monnifyTransactionRef) {
      skippedNoMonnifyRef++;
      continue;
    }

    try {
      await prisma.ledgerEntry.update({
        where: { id: entry.id },
        data: {
          monnifyTransactionRef: payment.monnifyTransactionRef,
          paymentReference: payment.reference,
          paymentId: payment.id,
          valueDate: payment.paidAt || entry.entryDate,
        },
      });
      updated++;
      console.log(`✅ Updated entry ${entry.id} with monnifyRef: ${payment.monnifyTransactionRef}`);
    } catch (error: any) {
      // Handle unique constraint violation (duplicate monnifyRef)
      if (error.code === 'P2002') {
        console.log(`⚠️  Duplicate detected for entry ${entry.id} (monnifyRef: ${payment.monnifyTransactionRef})`);
      } else {
        console.error(`❌ Error updating entry ${entry.id}:`, error.message);
      }
    }
  }

  console.log(`\n--- Backfill Summary ---`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no Monnify ref - likely Paystack): ${skippedNoMonnifyRef}`);
  console.log(`Skipped (no payment found): ${skippedNoPayment}`);
  console.log(`Total processed: ${entriesWithoutRef.length}\n`);

  // Step 4: Find and remove duplicate entries
  await removeDuplicateLedgerEntries();
}

async function removeDuplicateLedgerEntries() {
  console.log('============================================================');
  console.log('STEP 2: Finding and removing duplicate ledger entries');
  console.log('============================================================\n');

  // Find all TICKET_SALE entries with monnifyTransactionRef
  const entriesWithMonnifyRef = await prisma.ledgerEntry.findMany({
    where: {
      type: 'TICKET_SALE',
      monnifyTransactionRef: { not: null },
    },
    select: {
      id: true,
      monnifyTransactionRef: true,
      organizerId: true,
      amount: true,
      entryDate: true,
    },
    orderBy: { entryDate: 'desc' }, // Newest first
  });

  // Group by monnifyTransactionRef
  const groupedByRef = new Map<string, typeof entriesWithMonnifyRef>();
  
  for (const entry of entriesWithMonnifyRef) {
    const ref = entry.monnifyTransactionRef!;
    if (!groupedByRef.has(ref)) {
      groupedByRef.set(ref, []);
    }
    groupedByRef.get(ref)!.push(entry);
  }

  // Find duplicates (more than one entry per monnifyTransactionRef)
  const duplicateGroups = Array.from(groupedByRef.entries())
    .filter(([_, entries]) => entries.length > 1);

  if (duplicateGroups.length === 0) {
    console.log('No duplicate entries found. ✅\n');
    return;
  }

  console.log(`Found ${duplicateGroups.length} monnifyTransactionRefs with duplicate entries\n`);

  let totalRemoved = 0;

  for (const [monnifyRef, entries] of duplicateGroups) {
    // Keep the newest entry (first in list since ordered desc)
    const [keepEntry, ...duplicatesToRemove] = entries;
    
    console.log(`\nMonnify Ref: ${monnifyRef}`);
    console.log(`  Keeping entry: ${keepEntry.id} (${keepEntry.entryDate.toISOString()})`);
    
    for (const dupEntry of duplicatesToRemove) {
      console.log(`  Removing duplicate: ${dupEntry.id} (${dupEntry.entryDate.toISOString()})`);
      
      try {
        await prisma.ledgerEntry.delete({
          where: { id: dupEntry.id },
        });
        totalRemoved++;
      } catch (error: any) {
        console.error(`  ❌ Error removing entry ${dupEntry.id}:`, error.message);
      }
    }
  }

  console.log(`\n--- Duplicate Removal Summary ---`);
  console.log(`Total duplicate entries removed: ${totalRemoved}`);
  console.log(`Unique Monnify transactions affected: ${duplicateGroups.length}\n`);
}

async function verifyLedgerIntegrity() {
  console.log('============================================================');
  console.log('STEP 3: Verifying ledger integrity');
  console.log('============================================================\n');

  // Count entries by type
  const countsByType = await prisma.ledgerEntry.groupBy({
    by: ['type'],
    _count: { id: true },
    _sum: { amount: true },
  });

  console.log('Ledger Entry Counts by Type:');
  for (const entry of countsByType) {
    const sumAmount = entry._sum.amount;
    const amount = sumAmount instanceof Decimal 
      ? sumAmount.toNumber() 
      : Number(sumAmount ?? 0);
    console.log(`  ${entry.type}: ${entry._count.id} entries, Total: ₦${amount.toFixed(2)}`);
  }

  // Check for entries with monnifyTransactionRef
  const withMonnifyRef = await prisma.ledgerEntry.count({
    where: { monnifyTransactionRef: { not: null } },
  });

  const withoutMonnifyRef = await prisma.ledgerEntry.count({
    where: { monnifyTransactionRef: null },
  });

  console.log(`\nMonnify Reference Status:`);
  console.log(`  With monnifyTransactionRef: ${withMonnifyRef}`);
  console.log(`  Without monnifyTransactionRef: ${withoutMonnifyRef}`);

  // Check for any remaining duplicates
  const duplicateCheck = await prisma.$queryRaw`
    SELECT "monnifyTransactionRef", COUNT(*) as count
    FROM "LedgerEntry"
    WHERE "monnifyTransactionRef" IS NOT NULL AND "type" = 'TICKET_SALE'
    GROUP BY "monnifyTransactionRef"
    HAVING COUNT(*) > 1
  `;

  const duplicates = duplicateCheck as any[];
  if (duplicates.length > 0) {
    console.log(`\n⚠️  WARNING: ${duplicates.length} monnifyTransactionRefs still have duplicates!`);
  } else {
    console.log(`\n✅ No duplicate monnifyTransactionRefs found. Ledger is clean.`);
  }

  console.log('\n============================================================');
  console.log('BACKFILL COMPLETE');
  console.log('============================================================\n');
}

// Main execution
async function main() {
  try {
    await backfillLedgerMonnifyRefs();
    await verifyLedgerIntegrity();
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
