FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

ARG LIBERICA_VERSION=25.0.3+11
ARG NODE_VERSION=18
ENV DEBIAN_FRONTEND=noninteractive
ENV NVM_DIR=/usr/local/share/nvm
ENV NODE_PATH=${NVM_DIR}/versions/node/v${NODE_VERSION}/lib/node_modules
ENV PATH=${NVM_DIR}/versions/node/v${NODE_VERSION}/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ENV GALAPAGOS_DIR=/opt/galapagos

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        gnupg \
        unzip \
        wget \
        xz-utils \
        zip \
    && rm -rf /var/lib/apt/lists/*

# Match the repo's CI choice: Liberica JDK 25 with JavaFX-capable package.
RUN wget -q "https://download.bell-sw.com/java/${LIBERICA_VERSION}/bellsoft-jdk${LIBERICA_VERSION}-linux-amd64.deb" \
    && apt-get update \
    && apt-get install -y ./bellsoft-jdk${LIBERICA_VERSION}-linux-amd64.deb \
    && rm bellsoft-jdk${LIBERICA_VERSION}-linux-amd64.deb \
    && rm -rf /var/lib/apt/lists/*

# Install Node 18 and npm via nvm so the major version stays pinned to the workflow.
RUN mkdir -p ${NVM_DIR} \
    && curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash \
    && . ${NVM_DIR}/nvm.sh \
    && nvm install ${NODE_VERSION} \
    && nvm alias default ${NODE_VERSION} \
    && nvm use default \
    && npm install -g npm@latest

# Install sbt from the official repo.
RUN apt-get update \
    && apt-get install -y apt-transport-https \
    && echo "deb https://repo.scala-sbt.org/scalasbt/debian all main" > /etc/apt/sources.list.d/sbt.list \
    && echo "deb https://repo.scala-sbt.org/scalasbt/debian /" > /etc/apt/sources.list.d/sbt_old.list \
    && curl -sL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x2EE0EA64E40A89B84B2DF73499E82A75642AC823" | gpg --dearmor > /etc/apt/trusted.gpg.d/scalasbt-release.gpg \
    && chmod 644 /etc/apt/trusted.gpg.d/scalasbt-release.gpg \
    && apt-get update \
    && apt-get install -y sbt \
    && rm -rf /var/lib/apt/lists/*

# Seed a checkout so another project can reference it immediately.
RUN git clone --recurse-submodules https://github.com/NetLogo/Galapagos ${GALAPAGOS_DIR} \
    && chown -R vscode:vscode ${GALAPAGOS_DIR}

USER vscode
WORKDIR /workspaces

# Warm the common caches once. Fail softly so first build is still usable if upstream flakes.
RUN bash -lc 'cd ${GALAPAGOS_DIR} && npm ci && sbt -v update compile' || true

FROM bellsoft/liberica-openjdk-debian:25

ENV DEBIAN_FRONTEND=noninteractive


RUN apt-get update \
  && apt-get install -y --no-install-recommends \
  ca-certificates curl gnupg git bash wget \
  && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && mkdir -p /etc/apt/keyrings \
  && curl -fsSL https://repo.scala-sbt.org/scalasbt/debian/sbt-1.9.9.gpg.key \
  | gpg --dearmor -o /etc/apt/keyrings/sbt.gpg \
  && echo "deb [signed-by=/etc/apt/keyrings/sbt.gpg] https://repo.scala-sbt.org/scalasbt/debian all main" \
  > /etc/apt/sources.list.d/sbt.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends sbt \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

EXPOSE 9000

CMD ["bash"]
