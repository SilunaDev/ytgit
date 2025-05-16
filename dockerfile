FROM node:18

WORKDIR /app

COPY package*.json ./

RUN apt-get update && apt-get install -y python3

RUN npm ci

COPY . .

CMD ["node", "perfect.js"]
