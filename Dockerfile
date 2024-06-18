FROM node:lts-alpine

RUN apk add --no-cache bash

RUN apk add build-base pango-dev cairo-dev g++ make jpeg-dev giflib-dev librsvg-dev python3

ENV NODE_ENV=production

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global

RUN npm install -g node-gyp

WORKDIR /app

COPY . /app

RUN npm ci

EXPOSE 80

CMD [ "bash", "-c", "node ./src/index.js" ]