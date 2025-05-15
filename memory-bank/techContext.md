# Technical Context

## Technology Stack
- **Runtime & Language:** Node.js (v16+), TypeScript
- **Web Framework:** Express
- **Database:** MongoDB accessed via Mongoose
- **Validation:** Joi
- **Security Middleware:** helmet, cors, csurf, express-mongo-sanitize
- **File Upload:** multer
- **Storage:** AWS S3 via AWS SDK v3
- **Logging & Monitoring:** Winston, @sentry/node

## Tooling & Configuration
- **TypeScript Config:** `tsconfig.json` with `rootDir` and path aliases to `/shared`.
- **Linting & Formatting:** ESLint, Prettier (config inherited from root).
- **Environment Variables:** Defined and validated in `envVars.ts`.
- **Package Management:** Yarn or npm workspaces at repo root.

## Constraints
- **Compatibility:** Align with existing user-service patterns.
- **Security Standards:** OWASP Top 10 compliance.
- **Performance:** Avoid blocking operations; use async/await. 