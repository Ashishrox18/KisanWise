# Krishi Era AI - Backend API

Node.js/Express backend with AWS integration for the Krishi Era AI platform.

## Features

- RESTful API with Express.js
- AWS SDK integration (DynamoDB, S3, Bedrock, Rekognition, Location, SNS, IoT)
- JWT authentication
- Role-based access control
- TypeScript for type safety
- Comprehensive error handling
- Request logging with Winston

## Prerequisites

- Node.js 18+
- AWS Account with configured credentials
- DynamoDB tables created
- S3 buckets created
- AWS services configured (Bedrock, Rekognition, etc.)

## Installation

```bash
cd backend
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update environment variables with your AWS credentials and configuration

## AWS Setup

### DynamoDB Tables

Create the following tables:

1. **krishi-users**
   - Partition Key: `id` (String)
   - GSI: `email-index` on `email`

2. **krishi-crops**
   - Partition Key: `id` (String)
   - Sort Key: `userId` (String)

3. **krishi-orders**
   - Partition Key: `id` (String)
   - GSI: `farmerId-index` on `farmerId`
   - GSI: `buyerId-index` on `buyerId`

4. **krishi-shipments**
   - Partition Key: `id` (String)
   - GSI: `transporterId-index` on `transporterId`

5. **krishi-storage**
   - Partition Key: `id` (String)
   - GSI: `providerId-index` on `providerId`

6. **krishi-transactions**
   - Partition Key: `id` (String)
   - Sort Key: `createdAt` (String)

### S3 Buckets

Create buckets:
- `krishi-images` - For crop and quality inspection images
- `krishi-documents` - For contracts and certificates

### Amazon Bedrock

Enable Claude 3 Sonnet model access in your AWS account.

### Amazon Location Service

Create:
- Route calculator: `KrishiRouteCalculator`
- Place index: `KrishiPlaceIndex`

### SNS Topic

Create topic: `krishi-notifications`

## Development

```bash
# Start development server with hot reload
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh token

### Farmer
- `GET /api/farmer/dashboard` - Get farmer dashboard
- `POST /api/farmer/crop-recommendations` - Get AI crop recommendations
- `GET /api/farmer/crops` - List crops
- `POST /api/farmer/crops` - Create crop
- `PUT /api/farmer/crops/:id` - Update crop
- `DELETE /api/farmer/crops/:id` - Delete crop
- `GET /api/farmer/harvests` - List harvests
- `POST /api/farmer/harvests/:cropId/timing` - Get harvest timing
- `POST /api/farmer/harvests/:cropId/list` - List for sale
- `GET /api/farmer/weather` - Get weather data
- `GET /api/farmer/market-prices` - Get market prices

### Buyer
- `GET /api/buyer/dashboard` - Get buyer dashboard
- `GET /api/buyer/available-produce` - List available produce
- `POST /api/buyer/orders` - Create order
- `GET /api/buyer/orders` - List orders
- `GET /api/buyer/orders/:id` - Get order details
- `PUT /api/buyer/orders/:id/status` - Update order status
- `GET /api/buyer/inspections` - List inspections
- `POST /api/buyer/inspections` - Create inspection
- `PUT /api/buyer/inspections/:id` - Update inspection
- `POST /api/buyer/inspections/:id/analyze` - Analyze quality
- `GET /api/buyer/market-insights` - Get market insights
- `GET /api/buyer/price-trends` - Get price trends

### Transporter
- `GET /api/transporter/dashboard` - Get transporter dashboard
- `GET /api/transporter/shipments` - List shipments
- `POST /api/transporter/shipments/:id/accept` - Accept shipment
- `PUT /api/transporter/shipments/:id/status` - Update shipment status
- `POST /api/transporter/routes/optimize` - Optimize route
- `GET /api/transporter/available-loads` - List available loads
- `GET /api/transporter/fleet` - Get fleet status

### Storage
- `GET /api/storage/dashboard` - Get storage dashboard
- `GET /api/storage/facilities` - List facilities
- `POST /api/storage/facilities` - Create facility
- `GET /api/storage/bookings` - List bookings
- `POST /api/storage/bookings` - Create booking
- `PUT /api/storage/bookings/:id` - Update booking
- `GET /api/storage/requests` - List storage requests
- `POST /api/storage/requests/:id/accept` - Accept request
- `GET /api/storage/iot-data/:facilityId` - Get IoT sensor data

### Admin
- `GET /api/admin/dashboard` - Get admin dashboard
- `GET /api/admin/system-health` - Get system health
- `GET /api/admin/metrics` - Get performance metrics
- `GET /api/admin/users` - List users
- `GET /api/admin/analytics` - Get analytics data

### AI
- `POST /api/ai/crop-recommendations` - AI crop recommendations
- `POST /api/ai/harvest-timing` - AI harvest timing
- `POST /api/ai/route-optimization` - AI route optimization
- `POST /api/ai/price-analysis` - AI price analysis
- `POST /api/ai/quality-assessment` - AI quality assessment

## Architecture

```
backend/
├── src/
│   ├── controllers/      # Request handlers
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   │   └── aws/          # AWS service integrations
│   ├── middleware/       # Express middleware
│   ├── utils/            # Utility functions
│   └── server.ts         # Application entry point
├── logs/                 # Application logs
└── dist/                 # Compiled JavaScript
```

## Security

- JWT-based authentication
- Role-based access control
- Helmet.js for security headers
- Input validation
- AWS IAM for service access
- Encrypted data at rest (S3, DynamoDB)
- TLS for data in transit

## Monitoring

- Winston logging
- CloudWatch integration
- Performance metrics
- Error tracking
- API usage analytics

## Deployment

### AWS Elastic Beanstalk
```bash
npm run build
eb init
eb create
eb deploy
```

### Docker
```bash
docker build -t krishi-backend .
docker run -p 3000:3000 krishi-backend
```

### AWS ECS/Fargate
Use provided Dockerfile and deploy to ECS cluster.

## License

Proprietary - Krishi Era AI Platform
