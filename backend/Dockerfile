# Build stage
FROM --platform=linux/amd64 node:18-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM --platform=linux/amd64 node:18-alpine AS production

WORKDIR /usr/src/app

# Copy only necessary files from build stage
COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/dist ./dist

# Move these for migrations to run
COPY --from=build /usr/src/app/backend/drizzle ./drizzle

RUN npm install --omit=dev

ENV HOST=0.0.0.0 PORT=3000
EXPOSE 3000

CMD [ "npm", "start" ]
