FROM node:lts-alpine

RUN apk add --no-cache bash

ENV NODE_ENV=production

WORKDIR /app

COPY . /app

RUN npm ci

EXPOSE 80

CMD [ "bash", "-c", "node ./src/index.js" ]