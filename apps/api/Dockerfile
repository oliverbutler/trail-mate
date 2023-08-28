FROM --platform=linux/amd64 node:18-alpine

WORKDIR /app

RUN addgroup --system api && \
          adduser --system -G api api

COPY dist/apps/api api
COPY apps/api/drizzle api/drizzle
RUN chown -R api:api .

RUN npm --prefix api --omit=dev -f install

CMD [ "node", "api" ]
