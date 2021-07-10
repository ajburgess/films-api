FROM node:16-alpine
WORKDIR /app
COPY package*.json .
RUN npm install --production
COPY * .
ENTRYPOINT [ "node", "index.js" ]