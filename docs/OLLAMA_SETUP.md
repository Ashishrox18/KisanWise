# Ollama Setup Guide - Free Open Source AI

## What is Ollama?

Ollama is a free, open-source tool that lets you run powerful AI models locally on your computer. No API keys, no costs, complete privacy.

## Why Use Ollama?

✅ **Completely Free** - No API costs ever
✅ **Fast** - Runs on your machine, no network latency
✅ **Private** - Data never leaves your server
✅ **Easy** - Install in 5 minutes
✅ **Powerful** - Access to Llama 3.1, Mistral, Gemma, and more

## Installation

### macOS

```bash
# Download and install
curl -fsSL https://ollama.com/install.sh | sh

# Or use Homebrew
brew install ollama
```

### Linux

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Windows

Download from: https://ollama.com/download/windows

## Quick Start

### 1. Start Ollama Server

```bash
ollama serve
```

This starts the server on `http://localhost:11434`

### 2. Pull a Model

In a new terminal:

```bash
# Recommended: Llama 3.1 8B (4.7GB)
ollama pull llama3.1:8b

# Or other models:
ollama pull mistral:7b        # 4.1GB - Fast and efficient
ollama pull gemma2:9b         # 5.4GB - Google's model
ollama pull qwen2.5:7b        # 4.7GB - Great for structured output
```

### 3. Test It

```bash
ollama run llama3.1:8b "What is the capital of France?"
```

### 4. Configure Your App

Your `backend/.env` is already configured:

```env
USE_OLLAMA=true
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

### 5. Start Your Backend

```bash
cd backend
npm run dev
```

That's it! Your AI Selling Strategy will now use Ollama.

## Model Recommendations

### For Production (Best Quality)
```bash
ollama pull llama3.1:70b  # 40GB - Highest quality
```

### For Development (Balanced)
```bash
ollama pull llama3.1:8b   # 4.7GB - Recommended
```

### For Low-End Hardware
```bash
ollama pull mistral:7b    # 4.1GB - Fastest
```

## Hardware Requirements

| Model | RAM | Storage | Speed |
|-------|-----|---------|-------|
| Mistral 7B | 8GB | 4.1GB | Fast |
| Llama 3.1 8B | 8GB | 4.7GB | Fast |
| Gemma 2 9B | 12GB | 5.4GB | Medium |
| Llama 3.1 70B | 64GB | 40GB | Slow |

**Minimum:** 8GB RAM, 5GB free disk space

## Testing

### Test Ollama Directly

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1:8b",
  "prompt": "What is 2+2?",
  "stream": false
}'
```

### Test Through Your App

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `npm run dev`
3. Login as farmer
4. Go to Selling Strategy
5. Fill form and click "Get AI Strategy"

## Troubleshooting

### "Connection refused" Error

**Problem:** Ollama server not running

**Solution:**
```bash
# Start Ollama
ollama serve

# Or on macOS/Linux, run as service
sudo systemctl start ollama  # Linux
brew services start ollama    # macOS
```

### "Model not found" Error

**Problem:** Model not downloaded

**Solution:**
```bash
ollama pull llama3.1:8b
```

### Slow Responses

**Problem:** Model too large for your hardware

**Solution:**
```bash
# Use smaller model
ollama pull mistral:7b

# Update .env
OLLAMA_MODEL=mistral:7b
```

### Out of Memory

**Problem:** Not enough RAM

**Solutions:**
1. Close other applications
2. Use smaller model (mistral:7b)
3. Reduce context window in code

## Advanced Configuration

### Run Ollama on Different Port

```bash
OLLAMA_HOST=0.0.0.0:8080 ollama serve
```

Update `.env`:
```env
OLLAMA_URL=http://localhost:8080
```

### Run Ollama on Different Machine

If running Ollama on a separate server:

```env
OLLAMA_URL=http://192.168.1.100:11434
```

### Use Multiple Models

```bash
# Pull multiple models
ollama pull llama3.1:8b
ollama pull mistral:7b

# Switch in .env
OLLAMA_MODEL=mistral:7b  # or llama3.1:8b
```

## Comparison: Ollama vs AWS Bedrock

| Feature | Ollama | AWS Bedrock |
|---------|--------|-------------|
| Cost | Free | ~$0.003/request |
| Speed | 2-5 sec | 1-3 sec |
| Quality | Excellent | Excellent |
| Privacy | 100% Private | Data sent to AWS |
| Setup | 5 minutes | 30 minutes |
| Hardware | Needs 8GB+ RAM | None |
| Internet | Not required | Required |

## Production Deployment

### Option 1: Run on Same Server

```bash
# Install Ollama on your production server
curl -fsSL https://ollama.com/install.sh | sh

# Pull model
ollama pull llama3.1:8b

# Run as service
sudo systemctl enable ollama
sudo systemctl start ollama
```

### Option 2: Dedicated AI Server

1. Set up separate server for Ollama
2. Install Ollama and pull models
3. Update backend `.env`:
   ```env
   OLLAMA_URL=http://ai-server:11434
   ```

### Option 3: Use Cloud AI (Groq/Together)

If you don't want to manage infrastructure:

```bash
npm install groq-sdk

# .env
USE_OLLAMA=false
GROQ_API_KEY=your_key_here
```

## Model Updates

```bash
# Check for updates
ollama list

# Update a model
ollama pull llama3.1:8b

# Remove old models
ollama rm old-model:tag
```

## Performance Tips

1. **Keep Ollama Running**: Don't stop/start frequently
2. **Use SSD**: Much faster than HDD
3. **Allocate RAM**: Close unnecessary apps
4. **Use Appropriate Model**: Don't use 70B if 8B works
5. **Cache Results**: Cache common queries

## Monitoring

### Check Ollama Status

```bash
# List running models
ollama ps

# List available models
ollama list

# Check version
ollama --version
```

### Monitor Resource Usage

```bash
# macOS/Linux
top
htop

# Check Ollama process
ps aux | grep ollama
```

## Fallback Strategy

The code automatically falls back to mock data if Ollama is unavailable:

```typescript
// In ollama.service.ts
if (error.code === 'ECONNREFUSED') {
  console.warn('Ollama not running, using mock data');
  return this.getMockStrategy();
}
```

This ensures your app works even if Ollama is down.

## Support

- **Ollama Docs**: https://ollama.com/docs
- **Models Library**: https://ollama.com/library
- **GitHub**: https://github.com/ollama/ollama
- **Discord**: https://discord.gg/ollama

## Next Steps

1. ✅ Install Ollama
2. ✅ Pull llama3.1:8b
3. ✅ Start Ollama server
4. ✅ Test with your app
5. 🎉 Enjoy free AI!

