# Project Brief

**Service Name:** course-service

**Monorepo Context:** This service is part of a Node.js/TypeScript microservices monorepo powering a learning platform. It mirrors patterns and conventions established in the user-service.

**Purpose:**
- Provide CRUD operations and related features (bookmarks, notes, progress) for course content.
- Handle file uploads and storage via AWS S3.
- Enforce security best practices (helmet, CORS, CSRF protection, sanitization).
- Connect to MongoDB using Mongoose.

**Goals & Requirements:**
- Well-structured MVC organization: routes, controllers, models, validations, middleware.
- Shared configuration and utilities under `/shared` to maximize code reuse.
- Robust error handling and response formatting (AppError, catchAsync, responseFormatter).
- Comprehensive logging to Winston and Sentry.
- Fully typed using TypeScript.

**Stakeholders:** Engineering team, product managers, front-end developers.

**Scope:**
- Core course management endpoints.
- Integration with S3 for storing course-related files.
- Integration tests and documentation to be added.

**Out of Scope (Initial):**
- CI/CD pipelines.
- Performance/load testing.
- Front-end application work. 