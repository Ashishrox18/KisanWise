# AWS Setup Scripts

Automated scripts for setting up and managing AWS resources for Krishi Era AI.

## Scripts

### 1. setup-aws.sh
Automatically creates all required AWS resources.

```bash
chmod +x scripts/setup-aws.sh
./scripts/setup-aws.sh
```

### 2. verify-aws-setup.sh
Verifies all AWS resources are properly configured.

```bash
chmod +x scripts/verify-aws-setup.sh
./scripts/verify-aws-setup.sh
```

### 3. cleanup-aws.sh
Deletes all AWS resources (use with caution).

```bash
chmod +x scripts/cleanup-aws.sh
./scripts/cleanup-aws.sh
```

## Prerequisites

- AWS CLI installed and configured
- Appropriate AWS permissions
- Bash shell

## Usage

1. Run setup script to create resources
2. Run verify script to check setup
3. Update backend/.env with output values
4. Start your application
