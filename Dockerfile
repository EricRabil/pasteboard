FROM node:17

WORKDIR /app

COPY package.json package.json

COPY packages/client/package.json packages/client/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/spotify/package.json packages/spotify/package.json
COPY packages/redis/package.json packages/redis/package.json
COPY packages/server/package.json packages/server/package.json

COPY .pnp.cjs .pnp.loader.mjs .yarnrc.yml yarn.lock ./
COPY .yarn/cache .yarn/cache
COPY .yarn/releases .yarn/releases
COPY .yarn/sdks .yarn/sdks

RUN yarn install

COPY packages/client/src packages/client/src
COPY packages/core/src packages/core/src
COPY packages/spotify/src packages/spotify/src
COPY packages/redis/src packages/redis/src
COPY packages/server/src packages/server/src

COPY packages/client/tsconfig.json packages/client/tsconfig.json
COPY packages/core/tsconfig.json packages/core/tsconfig.json
COPY packages/spotify/tsconfig.json packages/spotify/tsconfig.json
COPY packages/redis/tsconfig.json packages/redis/tsconfig.json
COPY packages/server/tsconfig.json packages/server/tsconfig.json

RUN yarn

COPY typescript/tsconfig-everything.json typescript/tsconfig-everything.json
COPY tsconfig-base.json tsconfig-base.json

RUN yarn build

COPY packages/redis/redis-scripts packages/redis/redis-scripts