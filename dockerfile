FROM node:18-slim

WORKDIR /app

# Install Python 3 and dependencies, and create `python` alias
RUN apt-get update && \
    apt-get install -y python3 python3-distutils && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci

COPY . .

CMD ["npm", "start"]
