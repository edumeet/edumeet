FROM node:14-buster-slim
RUN apt-get update && \
    apt-get install -y git build-essential python pkg-config libssl-dev && \
    apt-get clean
WORKDIR /edumeet
ENV DEBUG=edumeet*,mediasoup*
RUN npm install -g nodemon && \
    npm install -g concurrently
RUN touch /.yarnrc && mkdir -p /.yarn /.cache/yarn && chmod -R 777 /.yarn /.yarnrc /.cache
CMD concurrently --names "server,app" \
    "cd server && sleep 1h && yarn && yarn dev" \
    " \
        cd lib-edumeet \
            && yarn \
        && cd ../app \
            && mkdir -p node_modules \
            && (ln -s ../../lib-edumeet node_modules/lib-edumeet || true) \
            && yarn \
            && yarn build \
            && yarn start \
    "
