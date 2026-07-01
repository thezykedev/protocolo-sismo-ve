FROM alpine:3.20

ARG PB_VERSION=0.39.4
ARG TARGETARCH=amd64

RUN apk add --no-cache ca-certificates unzip wget \
  && wget -O /tmp/pocketbase.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip" \
  && unzip /tmp/pocketbase.zip -d /usr/local/bin \
  && chmod +x /usr/local/bin/pocketbase \
  && rm /tmp/pocketbase.zip

WORKDIR /pb

# El schema viaja en la imagen: PocketBase aplica estas migraciones al arrancar.
COPY pb_migrations /pb/pb_migrations
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8090

ENTRYPOINT ["entrypoint.sh"]
