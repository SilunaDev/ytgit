FROM node:18-slim

# Install system deps including python3 and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-dev build-essential git curl \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libgbm1 libasound2 libpangocairo-1.0-0 \
    libxss1 libgtk-3-0 libxshmfence1 libglu1 chromium \
    && ln -s /usr/bin/python3 /usr/bin/python \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

# Run npm ci with verbose to see detailed errors if any
RUN npm ci --verbose

COPY . .

CMD ["npm", "start"]
