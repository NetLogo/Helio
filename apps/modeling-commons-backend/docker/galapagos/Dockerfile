FROM bellsoft/liberica-openjdk-debian:25-cds AS deps

ARG TARGETARCH

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl git bash gzip \
  && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && case "$TARGETARCH" in \
  amd64) CS_ARCH="x86_64-pc-linux" ;; \
  arm64) CS_ARCH="aarch64-pc-linux" ;; \
  *) echo "Unsupported arch: $TARGETARCH" && exit 1 ;; \
  esac \
  && curl -fL "https://github.com/coursier/launchers/raw/master/cs-${CS_ARCH}.gz" \
  | gzip -d > /usr/local/bin/cs \
  && chmod +x /usr/local/bin/cs \
  && cs install sbt --install-dir /usr/local/bin \
  && rm -rf /var/lib/apt/lists/*

ENV PATH="${JAVA_HOME}/bin:${PATH}"

FROM deps AS builder

ARG GALAPAGOS_REF=main

RUN git clone --recursive https://github.com/NetLogo/Galapagos.git /opt/galapagos
WORKDIR /opt/galapagos

RUN git fetch origin "$GALAPAGOS_REF" \
  && git checkout "$GALAPAGOS_REF" \
  && git submodule update --init --recursive

RUN sbt scrapePlay \
  && cp -Rv public/modelslib/ target/play-scrape/assets/ \
  && cp -Rv public/nt-modelslib/ target/play-scrape/assets/

FROM nginx:stable AS runtime

COPY --from=builder /opt/galapagos/target/play-scrape/ /opt/galapagos/target/play-scrape/
COPY docker/galapagos/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

ENTRYPOINT ["nginx", "-g", "daemon off;"]
