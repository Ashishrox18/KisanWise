# AWS CLI Installation Guide

Multiple methods to install AWS CLI on macOS without Homebrew.

## Method 1: Official AWS Installer (Recommended)

### Step 1: Download the installer

```bash
# Download the AWS CLI installer
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
```

### Step 2: Install

```bash
# Install using the package installer
sudo installer -pkg AWSCLIV2.pkg -target /
```

### Step 3: Verify installation

```bash
# Check AWS CLI version
aws --version
```

You should see output like: `aws-cli/2.x.x Python/3.x.x Darwin/xx.x.x`

### Step 4: Clean up

```bash
# Remove the installer file
rm AWSCLIV2.pkg
```

---

## Method 2: Direct Binary Installation

### Step 1: Download and extract

```bash
# Create a temporary directory
mkdir -p ~/aws-cli-install
cd ~/aws-cli-install

# Download the installer
curl "https://awscli.amazonaws.com/awscli-exe-darwin-x86_64.zip" -o "awscliv2.zip"

# Extract the archive
unzip awscliv2.zip
```

### Step 2: Install

```bash
# Run the installer
sudo ./aws/install
```

### Step 3: Verify

```bash
# Check installation
aws --version
```

### Step 4: Clean up

```bash
# Remove installation files
cd ~
rm -rf ~/aws-cli-install
```

---

## Method 3: Using Python pip (Alternative)

If you have Python installed:

```bash
# Install AWS CLI v2 using pip
pip3 install awscli --upgrade --user

# Add to PATH (add this to your ~/.zshrc file)
export PATH="$HOME/Library/Python/3.x/bin:$PATH"

# Reload shell configuration
source ~/.zshrc

# Verify installation
aws --version
```

---

## Configure AWS CLI

After installation, configure your AWS credentials:

```bash
# Run configuration wizard
aws configure
```

You'll be prompted for:
1. **AWS Access Key ID**: Your access key from IAM
2. **AWS Secret Access Key**: Your secret key from IAM
3. **Default region name**: `us-east-1` (or your preferred region)
4. **Default output format**: `json`

### Get AWS Credentials

If you don't have AWS credentials yet:

**Quick Method (Root User):**
1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Click your account name (top-right) → "Security credentials"
3. Scroll to "Access keys" → Click "Create access key"
4. Download the .csv file with your credentials

**Recommended Method (IAM User):**
1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Search for "IAM" → Click "Users" → "Create user"
3. Give it a name (e.g., `krishi-era-admin`)
4. Attach "AdministratorAccess" policy
5. Go to user → "Security credentials" → "Create access key"
6. Choose "CLI" → Download credentials

**Detailed guide:** See [GET_AWS_CREDENTIALS.md](./GET_AWS_CREDENTIALS.md)

---

## Verify Configuration

```bash
# Test AWS CLI is working
aws sts get-caller-identity
```

You should see output with your AWS account details.

---

## Troubleshooting

### Issue: Command not found after installation

**Solution**: Add AWS CLI to your PATH

```bash
# Check where AWS CLI is installed
which aws

# If not found, add to PATH in ~/.zshrc
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Issue: Permission denied

**Solution**: Use sudo for installation

```bash
sudo installer -pkg AWSCLIV2.pkg -target /
```

### Issue: Old version installed

**Solution**: Uninstall old version first

```bash
# Remove old AWS CLI
sudo rm -rf /usr/local/aws-cli
sudo rm /usr/local/bin/aws
sudo rm /usr/local/bin/aws_completer

# Then reinstall using Method 1 or 2
```

### Issue: Python version conflicts

**Solution**: Use the official installer (Method 1) instead of pip

---

## Update AWS CLI

To update to the latest version:

```bash
# Download latest installer
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"

# Install (will update existing installation)
sudo installer -pkg AWSCLIV2.pkg -target /

# Verify new version
aws --version

# Clean up
rm AWSCLIV2.pkg
```

---

## Uninstall AWS CLI

If you need to uninstall:

```bash
# Find installation location
which aws

# Remove AWS CLI
sudo rm -rf /usr/local/aws-cli
sudo rm /usr/local/bin/aws
sudo rm /usr/local/bin/aws_completer

# Remove configuration (optional)
rm -rf ~/.aws
```

---

## Next Steps

After installing AWS CLI:

1. Configure credentials: `aws configure`
2. Test connection: `aws sts get-caller-identity`
3. Run setup script: `./scripts/setup-aws.sh`
4. Continue with [Quick Start Guide](QUICK_START.md)

---

## Additional Resources

- [Official AWS CLI Documentation](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- [AWS CLI Command Reference](https://docs.aws.amazon.com/cli/latest/reference/)
- [AWS CLI Configuration Guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html)
