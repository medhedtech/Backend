# System Patterns

## Architecture Overview
- **Monorepo Structure:** All microservices live under `/services`, with shared code in `/shared`.
- **Service Isolation:** Each service (e.g., course-service) has its own Express app, configuration, and routes.
- **Database Layer:** Mongoose ODM for MongoDB, with service-specific models under `src/models`.

## Key Patterns
1. **MVC (Model-View-Controller):**
   - **Routes:** Define HTTP endpoints and attach middleware.
   - **Controllers:** Implement request handling and business logic.
   - **Models:** Mongoose schemas and TypeScript interfaces.

2. **Middleware Stack:**
   - **Security:** helmet, cors, csurf, express-mongo-sanitize.
   - **Validation:** Joi schemas in `validations` folder.
   - **Error Handling:** Global error handler using AppError and catchAsync.

3. **Utilities & Helpers:**
   - **catchAsync:** Wrap async route handlers.
   - **AppError:** Standardized error class.
   - **responseFormatter:** Uniform API responses.
   - **Logger:** Winston + Sentry integration.

4. **File Upload & Storage:**
   - **Multer:** Middleware for handling multipart form data.
   - **AWS S3 Service:** Encapsulated in `utils/S3.ts`.

5. **Configuration Management:**
   - Centralized environment variable definitions in `envVars.ts`.
   - `config` folder for service-specific configuration.

## Component Relationships
- Controllers call services (e.g., S3, database) and utilities.
- Middleware layers apply before controllers to secure and validate requests.
- Shared code imported via absolute/aliased imports. 