FROM node:11-alpine

RUN apk add docker git openssh

WORKDIR /usr/src/app

COPY yarn.lock ./
COPY package.json ./

RUN yarn

COPY . .

EXPOSE 3000
CMD [ "yarn", "start" ]