import 'dotenv/config';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

async function checkModels() {
  console.log('🔍 Checking Available Bedrock Models\n');
  console.log('AWS Configuration:');
  console.log(`  Region: ${process.env.AWS_REGION}`);
  console.log(`  Access Key: ${process.env.AWS_ACCESS_KEY_ID?.substring(0, 10)}...`);
  console.log('');

  const client = new BedrockRuntimeClient({ 
    region: process.env.AWS_REGION || 'us-east-1'
  });

  const modelsToTest = [
    'anthropic.claude-3-5-sonnet-20240620-v1:0',
    'anthropic.claude-3-5-sonnet-20241022-v2:0',
    'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
    'anthropic.claude-3-sonnet-20240229-v1:0',
    'anthropic.claude-3-haiku-20240307-v1:0',
    'us.anthropic.claude-3-5-sonnet-20240620-v1:0',
  ];

  for (const modelId of modelsToTest) {
    try {
      console.log(`Testing: ${modelId}`);
      
      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Say "Hello" in JSON format: {"message": "Hello"}',
          },
        ],
      };

      const command = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      });

      const response = await client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      console.log(`  ✅ SUCCESS - Model is available and working!`);
      console.log(`  Response: ${responseBody.content[0].text.substring(0, 50)}...`);
      console.log('');
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        console.log(`  ❌ Model marked as Legacy or not accessible`);
      } else if (error.name === 'ValidationException') {
        console.log(`  ❌ Invalid model ID`);
      } else if (error.name === 'AccessDeniedException') {
        console.log(`  ❌ Access denied - need to request model access`);
      } else {
        console.log(`  ❌ Error: ${error.message}`);
      }
      console.log('');
    }
  }
}

checkModels();
