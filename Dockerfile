FROM node:22-alpine

WORKDIR /app
COPY package.json yarn.lock tsconfig.json ./
COPY src ./src

RUN yarn && \
    yarn build && \
    yarn install --production && \
    yarn cache clean && \
    ln -s /app/dist/cli.js /usr/bin/config-cli

ENTRYPOINT ["/usr/bin/config-cli"]
