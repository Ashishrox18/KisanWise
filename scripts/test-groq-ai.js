#!/usr/bin/env node

/**
 * Test script to verify Groq AI is working
 * Run: node scripts/test-groq-ai.js
 */

require('dotenv').config({ path: './backend/.env' });

const testGroqConnection = async () => {
  console.log('\n🌾 Testing Groq AI Connection...\n');

  const useGroq = process.env.USE_GROQ === 'true';
  const apiKey = process.env.GROQ_API_KEY;

  console.log('Configuration:');
  console.log(`  USE_GROQ: ${useGroq}`);
  console.log(`  API Key: ${apiKey ? (apiKey === 'your_groq_api_key_here' ? '❌ Not configured' : '✅ Configured') : '❌ Missing'}`);

  if (!useGroq) {
    console.log('\n❌ Groq is disabled. Set USE_GROQ=true in backend/.env');
    process.exit(1);
  }

  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    console.log('\n❌ Groq API key not configured.');
    console.log('\n📝 To enable AI recommendations:');
    console.log('   1. Visit: https://console.groq.com/keys');
    console.log('   2. Sign up (free, no credit card)');
    console.log('   3. Create an API key');
    console.log('   4. Add it to backend/.env:');
    console.log('      GROQ_API_KEY=gsk_your_key_here');
    console.log('\n💡 For now, the system will use fallback recommendations.');
    process.exit(0);
  }

  try {
    const Groq = require('groq-sdk');
    const client = new Groq({ apiKey });

    console.log('\n🔄 Testing API connection...');

    const completion = await client.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: 'Say "Hello from Groq!" if you can hear me.'
        }
      ],
      model: 'llama-3.1-70b-versatile',
      temperature: 0.5,
      max_tokens: 50,
    });

    const response = completion.choices[0]?.message?.content || '';
    
    console.log('\n✅ Groq AI is working!');
    console.log(`   Response: ${response}`);
    console.log('\n🎉 Your crop recommendations will now use AI!');
    console.log('   Visit: http://localhost:5173/farmer/crop-planning');

  } catch (error) {
    console.log('\n❌ Error connecting to Groq:');
    console.log(`   ${error.message}`);
    console.log('\n💡 Check your API key and try again.');
    console.log('   Get a new key: https://console.groq.com/keys');
    process.exit(1);
  }
};

testGroqConnection();
