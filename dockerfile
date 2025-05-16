FROM node:18-slim

WORKDIR /app

# Install Python and other build essentials required for native modules
RUN apt-get update && apt-get install -y python3 python3-pip python3-distutils && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy rest of the app
COPY . .

CMD ["npm", "start"]
