import * as path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { dynamoDBService } from '../src/services/firestore.service';

async function seedUsers() {
  console.log('='.repeat(60));
  console.log('🌱 Seeding Firestore Users (kisanwise-f18e4)');
  console.log('='.repeat(60));

  const demoUsers = [
    { email: 'farmer@gmail.com', password: 'Password@123', name: 'Ramesh Patel (Farmer)', role: 'farmer', phone: '+919876543210' },
    { email: 'buyer@gmail.com', password: 'Password@123', name: 'AgroCorp Buyers Ltd', role: 'buyer', phone: '+919876543211' },
    { email: 'admin@krishiera.com', password: 'Admin@123', name: 'System Admin', role: 'admin', phone: '+919876543212' },
  ];

  let added = 0;
  let skipped = 0;

  for (const demo of demoUsers) {
    try {
      // Check if user already exists in Firestore
      const existing = await dynamoDBService.scan('users', 'email = :email', { ':email': demo.email });

      if (existing && existing.length > 0) {
        console.log(`⚠️ User ${demo.email} (${demo.role}) already exists in Firestore — skipping`);
        skipped++;
        continue;
      }

      const hashedPassword = await bcrypt.hash(demo.password, 10);
      const user = {
        id: uuidv4(),
        email: demo.email,
        password: hashedPassword,
        name: demo.name,
        role: demo.role,
        phone: demo.phone,
        phoneVerified: true,
        emailVerified: true,
        profile: {
          location: 'Pune, Maharashtra',
          farmSize: demo.role === 'farmer' ? 12 : undefined,
          companyName: demo.role === 'buyer' ? demo.name : undefined,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await dynamoDBService.put('users', user);
      console.log(`✅ Created Firestore user: ${demo.email} [${demo.role}]`);
      added++;
    } catch (err: any) {
      console.error(`❌ Error creating ${demo.email}:`, err.message);
    }
  }

  console.log(`\n🎉 Seed finished: ${added} created, ${skipped} skipped.`);
  console.log('\n📋 Demo Login Credentials:');
  console.log('┌──────────┬──────────────────────┬───────────────┐');
  console.log('│ Role     │ Email                │ Password      │');
  console.log('├──────────┼──────────────────────┼───────────────┤');
  console.log('│ Farmer   │ farmer@gmail.com     │ Password@123  │');
  console.log('│ Buyer    │ buyer@gmail.com      │ Password@123  │');
  console.log('│ Admin    │ admin@krishiera.com  │ Admin@123     │');
  console.log('└──────────┴──────────────────────┴───────────────┘');
}

seedUsers().catch(console.error);
