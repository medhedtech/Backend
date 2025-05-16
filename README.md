# MEDH Backend Monorepo

This monorepo contains all microservices for the MEDH backend, each in its own directory under `services/`. All services are integrated through an API Gateway that allows them to be accessed from a single port (8080).

## Architecture

The backend uses a microservices architecture with the following components:

- **API Gateway**: Routes all requests to appropriate services (port 8080)
- **Service-to-Service Communication**: Internal service communication using shared utilities
- **Shared Models and Utilities**: Common code used across services
- **Single External API**: All services accessible via the same port

## Structure

```
medh-backend/
  services/
    api-gateway/      # API Gateway service
    user-service/     # User management and authentication
    course-service/   # Course creation and management
    email-service/    # Email notifications
    payment-service/  # Payment processing
    file-service/     # File upload and storage
    analytics-service/# Usage analytics and reporting
    admin-service/    # Admin panel functionality
    search-service/   # Search functionality
  shared/            # Shared code, models, and utilities
  docker-compose.yml # Docker configuration
  README.md
```

## Getting Started

### Run with npm

1. Install dependencies:
   ```
   npm install
   ```

2. Start all services (using concurrently):
   ```
   npm run start:all
   ```

3. Or start individual services:
   ```
   npm run start:gateway  # Start just the API Gateway
   npm run start:user     # Start just the User Service
   ```

### Run with Docker

1. Build and start all services:
   ```
   docker-compose up
   ```

2. Access all services via the API Gateway:
   ```
   http://localhost:8080/api/users
   http://localhost:8080/api/courses
   http://localhost:8080/api/payments
   etc.
   ```

## Service Integration

All services are integrated through the API Gateway. The service-to-service communication is handled using the `ServiceClient` utility in the shared code:

```typescript
// Example of one service calling another
import { ServiceClient } from '../../../shared/utils/service-client';

// User service getting course data
const courseDetails = await ServiceClient.get('COURSE', '/api/courses/123');
```

## Environment Configuration

All service configuration is managed through environment variables in `.env` files. The API Gateway and services read from these files at startup.

# Troubleshooting

## Common Issues

### 504 Gateway Timeout Errors

If you see 504 Gateway Timeout errors when accessing endpoints through the API Gateway, this means:

1. The API Gateway is running correctly at port 8080
2. The individual microservice for that endpoint is not running or not accessible

To resolve this:

```bash
# Start the specific service you need
npm run start:user    # For user service endpoints
npm run start:course  # For course service endpoints
npm run start:payment # For payment service endpoints
```

Or start all core services:

```bash
npm run start:all
```

### Port Already in Use Errors

If you see "EADDRINUSE: address already in use" errors:

```bash
# Kill processes on the specific ports
kill -9 $(lsof -t -i:8080) $(lsof -t -i:3001) $(lsof -t -i:3002) $(lsof -t -i:3003)
```

### TypeScript Errors in Services

If you encounter TypeScript errors in the services, you may need to add type assertions:

```typescript
// Example fix for middleware type errors
app.use(someMiddleware() as any);
``` 