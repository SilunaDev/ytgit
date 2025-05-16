# Use an official Node.js image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app
COPY . .

# Run your bot
CMD ["npm", "start"]