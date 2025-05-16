# Use official Node.js image as base
FROM node:18-slim

# Install python3 and pip
RUN apt-get update && apt-get install -y python3 python3-pip && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of your app files
COPY . .

# If you want, set python3 as "python" command for compatibility
RUN ln -s /usr/bin/python3 /usr/bin/python

# Default command to run your Node.js app
CMD ["npm", "start"]
