FROM node:lts-buster-slim
RUN apt-get update && \
    apt-get install -y git build-essential python pkg-config libssl-dev && \
    apt-get clean
WORKDIR /edumeet
ENV DEBUG=edumeet*,mediasoup*
RUN npm install -g nodemon && \
    npm install -g concurrently
CMD cd app && yarn && yarn build
CMD concurrently --names "server,app" "cd server && yarn && nodemon server.js" "cd app && yarn && yarn start"