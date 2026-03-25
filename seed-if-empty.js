const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Base = require('./models/Base');
const Asset = require('./models/Asset');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/military_assets';

async function seedIfEmpty() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if users already exist
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('Database already seeded. Skipping seed.');
      await mongoose.disconnect();
      return true;
    }

    // Drop stale indexes (e.g. username_1 from old schemas)
    try {
      await User.collection.dropIndex('username_1');
      console.log('Dropped stale username_1 index');
    } catch (e) { /* index didn't exist, that's fine */ }

    // Clear existing data
    await Promise.all([User.deleteMany(), Base.deleteMany(), Asset.deleteMany()]);
    console.log('Cleared existing data');

    // Create bases
    const bases = await Base.insertMany([
      { name: 'Alpha Base', location: 'Northern Sector', code: 'ALPHA' },
      { name: 'Bravo Base', location: 'Eastern Sector', code: 'BRAVO' },
      { name: 'Charlie Base', location: 'Southern Sector', code: 'CHARLIE' },
    ]);
    console.log('Bases created');

    // Create users
    await User.create([
      { name: 'Super Admin', email: 'admin@military.gov', password: process.env.ADMIN_PASSWORD || 'admin123', role: 'admin' },
      { name: 'Col. James Wright', email: 'commander@military.gov', password: process.env.COMMANDER_PASSWORD || 'cmd123', role: 'commander', base: bases[0]._id },
      { name: 'Sgt. Maria Chen', email: 'logistics@military.gov', password: process.env.LOGISTICS_PASSWORD || 'log123', role: 'logistics', base: bases[0]._id },
      { name: 'Col. David Kane', email: 'commander2@military.gov', password: process.env.COMMANDER_PASSWORD || 'cmd123', role: 'commander', base: bases[1]._id },
      { name: 'Sgt. Paul Torres', email: 'logistics2@military.gov', password: process.env.LOGISTICS_PASSWORD || 'log123', role: 'logistics', base: bases[1]._id },
    ]);
    console.log('Users created');

    // Create assets
    await Asset.insertMany([
      { name: 'M1A2 Abrams Tank', type: 'vehicle', base: bases[0]._id, quantity: 12, assignedQuantity: 3, unit: 'unit', description: 'Main battle tank' },
      { name: 'Humvee HMMWV', type: 'vehicle', base: bases[0]._id, quantity: 25, assignedQuantity: 8, unit: 'unit', description: 'Light tactical vehicle' },
      { name: 'M4 Carbine', type: 'weapon', base: bases[0]._id, quantity: 150, assignedQuantity: 60, unit: 'unit', description: 'Standard issue rifle' },
      { name: 'M9 Pistol', type: 'weapon', base: bases[0]._id, quantity: 80, assignedQuantity: 20, unit: 'unit', description: 'Standard sidearm' },
      { name: '5.56mm Ammunition', type: 'ammunition', base: bases[0]._id, quantity: 50000, assignedQuantity: 10000, unit: 'round', description: 'NATO standard rounds' },
      { name: '9mm Ammunition', type: 'ammunition', base: bases[0]._id, quantity: 20000, assignedQuantity: 5000, unit: 'round', description: 'Pistol ammunition' },
      { name: 'M1117 Guardian', type: 'vehicle', base: bases[1]._id, quantity: 8, assignedQuantity: 2, unit: 'unit', description: 'Armored security vehicle' },
      { name: 'M16A4 Rifle', type: 'weapon', base: bases[1]._id, quantity: 120, assignedQuantity: 45, unit: 'unit', description: 'Standard battle rifle' },
      { name: '7.62mm Ammunition', type: 'ammunition', base: bases[1]._id, quantity: 30000, assignedQuantity: 8000, unit: 'round', description: 'Rifle ammunition' },
      { name: 'Night Vision Goggles', type: 'equipment', base: bases[1]._id, quantity: 40, assignedQuantity: 15, unit: 'unit', description: 'AN/PVS-14 monocular' },
      { name: 'Body Armor Vest', type: 'equipment', base: bases[2]._id, quantity: 200, assignedQuantity: 80, unit: 'unit', description: 'Interceptor body armor' },
      { name: 'M249 SAW', type: 'weapon', base: bases[2]._id, quantity: 30, assignedQuantity: 10, unit: 'unit', description: 'Squad automatic weapon' },
      { name: '.50 Cal Ammunition', type: 'ammunition', base: bases[2]._id, quantity: 15000, assignedQuantity: 3000, unit: 'round', description: 'Heavy machine gun rounds' },
    ]);
    console.log('Assets created');

    console.log('\n--- Seed complete ---');
    console.log('Admin:     admin@military.gov');
    console.log('Commander: commander@military.gov');
    console.log('Logistics: logistics@military.gov');
    
    await mongoose.disconnect();
    return true;
  } catch (err) {
    console.error('Seed error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

module.exports = seedIfEmpty;
