FROM node:14-slim
RUN apt-get update && \
    apt-get install -y git build-essential python && \
    apt-get clean
WORKDIR /edumeet
RUN npm install -g nodemon && \
    npm install -g concurrently
CMD concurrently --names "server,app" "cd server && yarn && nodemon server.js" "cd app && yarn && yarn start"