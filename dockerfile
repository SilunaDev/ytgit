FROM node:18-slim

WORKDIR /app

RUN apt-get update && apt-get install -y python3 python3-distutils && ln -s /usr/bin/python3 /usr/bin/python

COPY package*.json ./

ENV NODE_ENV=development
RUN npm ci
ENV NODE_ENV=production

COPY . .

CMD ["npm", "start"]
