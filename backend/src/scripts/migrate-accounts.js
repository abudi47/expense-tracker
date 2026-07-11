require('dotenv').config();
const mongoose = require('mongoose');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

/**
 * Non-destructive migration: does NOT modify existing transactions.
 * Creates default accounts for users who have none.
 */
const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      family: 4,
    });
    console.log('Connected to MongoDB');

    const userIds = await Transaction.distinct('userId');
    let created = 0;

    for (const userId of userIds) {
      const existing = await Account.countDocuments({ userId, isArchived: false });
      if (existing === 0) {
        await Account.insertMany([
          { userId, name: 'Cash', icon: 'cash', color: '#10b981', currency: 'USD', sortOrder: 0 },
          { userId, name: 'Main Wallet', icon: 'wallet', color: '#3b82f6', currency: 'USD', sortOrder: 1 },
        ]);
        created += 2;
      }
    }

    const legacyCount = await Transaction.countDocuments({ accountId: { $exists: false } });
    console.log(`Migration complete. Created ${created} default accounts.`);
    console.log(`${legacyCount} legacy transactions remain unlinked (by design).`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
};

migrate();
