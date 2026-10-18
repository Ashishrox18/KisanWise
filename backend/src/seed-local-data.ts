import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { localStorageService } from './services/local-storage.service';

async function seedLocalData() {
  console.log('🌱 Seeding local data...');

  // Create your buyer account
  const hashedPassword = await bcrypt.hash('123456', 10);
  
  const buyerUser = {
    id: uuidv4(),
    email: 'buyer@gmail.com',
    password: hashedPassword,
    name: 'Buyer User',
    role: 'buyer',
    phone: '+1234567890',
    phoneVerified: true,
    profile: {
      company: 'Sample Company',
      location: 'Sample City'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Also create the test user from documentation
  const testPassword = await bcrypt.hash('password123', 10);
  const testUser = {
    id: uuidv4(),
    email: 'test@example.com',
    password: testPassword,
    name: 'Test Farmer',
    role: 'farmer',
    phone: '+1234567891',
    phoneVerified: true,
    profile: {
      farmSize: '10 acres',
      location: 'Test Village'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Create farmer@gmail.com account
  const farmerPassword = await bcrypt.hash('123456', 10);
  const farmerUser = {
    id: uuidv4(),
    email: 'farmer@gmail.com',
    password: farmerPassword,
    name: 'Farmer User',
    role: 'farmer',
    phone: '+1234567892',
    phoneVerified: true,
    profile: {
      farmSize: '25 acres',
      location: 'Karnataka, India'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await localStorageService.put('krishi-users', buyerUser);
    await localStorageService.put('krishi-users', testUser);
    await localStorageService.put('krishi-users', farmerUser);
    
    console.log('✅ Local data seeded successfully!');
    console.log('👤 Created accounts: buyer@gmail.com (buyer) · farmer@gmail.com (farmer) · test@example.com (farmer)');
    console.log('   See backend/data/users.json for hashed credentials.');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  }
}

// Run if called directly
if (require.main === module) {
  seedLocalData().then(() => process.exit(0));
}

export { seedLocalData };