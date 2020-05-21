FROM node:14

WORKDIR /usr/src/app

COPY package.json ./
COPY yarn.lock ./

RUN yarn
RUN yarn build

COPY . .

EXPOSE 3000

CMD [ "node", "." ]