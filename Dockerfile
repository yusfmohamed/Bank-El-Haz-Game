FROM node:20-alpine

WORKDIR /app

# Copy manifests first so `npm install` is cached across builds unless
# dependencies actually change.
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/engine/package.json packages/engine/package.json

RUN npm install

# Now copy the rest of the source and build everything (server + web).
COPY . .
RUN npm run build

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "run", "start"]
