require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');
const { DEFAULT_CATEGORIES } = require('../constants/categories');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const cat of DEFAULT_CATEGORIES) {
      await Category.findOneAndUpdate(
        { name: cat.name },
        { ...cat, isDefault: true },
        { upsert: true, new: true }
      );
    }

    console.log(`Seeded ${DEFAULT_CATEGORIES.length} categories`);
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
};

seed();
