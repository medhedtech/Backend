# MEDH Backend Monorepo

This monorepo contains all microservices for the MEDH backend, each in its own directory under `services/`.

## Structure

```
medh-backend/
  services/
    user-service/
    course-service/
    email-service/
    payment-service/
    file-service/
    analytics-service/
    admin-service/
    search-service/
  shared/           # Shared types, utils, configs
  docker-compose.yml
  README.md
```

## Getting Started
- Each service is a standalone Node.js + TypeScript project.
- Use Docker Compose to run all services locally.
- See each service's README for details. 