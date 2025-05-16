FROM node:18-alpine

WORKDIR /app

# Copy package.json files
COPY ./package*.json ./
COPY ./services/api-gateway/package*.json ./services/api-gateway/

# Install dependencies
RUN npm install
RUN cd services/api-gateway && npm install

# Copy source code
COPY ./shared ./shared
COPY ./services/api-gateway ./services/api-gateway

# Build the API Gateway
RUN cd services/api-gateway && npm run build

# Expose port
EXPOSE 8080

# Start the service
CMD ["npm", "--prefix", "services/api-gateway", "start"] 