# Use official Node.js 20 image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files separately for caching
COPY package.json package-lock.json ./

# Use cache for npm
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Copy the rest of your code
COPY . .

# Expose the port your app uses (change if not 3000)
EXPOSE 3000

# Start the app (change if your entry is not index.js)
CMD ["node", "perfect.js"]
