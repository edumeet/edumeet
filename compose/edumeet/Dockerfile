FROM node:14-buster-slim
RUN apt-get update && \
    apt-get install -y git build-essential python pkg-config libssl-dev && \
    apt-get clean
WORKDIR /edumeet
ENV DEBUG=edumeet*,mediasoup*
RUN npm install -g nodemon && \
    npm install -g concurrently
CMD touch /.yarnrc && mkdir /.yarn && chown 775 /.yarn
CMD cd app && yarn && yarn build
CMD cd server && yarn
CMD concurrently --names "server,app" "cd server && yarn dev" "cd app && yarn start"