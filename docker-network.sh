#!/bin/bash

# Docker network setup for microservices
# This script creates a Docker network for local development and testing

# Define colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up Docker network for microservices...${NC}"

# Check if network exists
NETWORK_EXISTS=$(docker network ls --filter name=backend-network -q)

if [ -z "$NETWORK_EXISTS" ]; then
  echo -e "Creating backend-network..."
  docker network create backend-network
  echo -e "${GREEN}Network created successfully!${NC}"
else
  echo -e "${GREEN}Network already exists!${NC}"
fi

# Display network information
echo -e "\n${YELLOW}Network information:${NC}"
docker network inspect backend-network

echo -e "\n${GREEN}Setup complete! You can now start the services using:${NC}"
echo -e "npm run start:all    # Start all services with npm"
echo -e "docker-compose up    # Start all services with Docker" 