# Modeling Commons Backend

## Development Setup
1. Install Helio (see [Helio README](../../README.md)).
2. Install [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/).
3. Run docker services (see below) or set up the required services locally and update the `.env` file with the appropriate connection information.
4. Start the development server

```bash
yarn run app
```

### Docker
Docker compose is used to run the required services for development. To start the services, run:
```bash
docker compose -f docker-compose.dev.yml up
```

or with optional services
```bash
docker compose -f docker-compose.dev.yml [--profile <profile-name>] up
```

Available profiles are found in the `docker-compose.dev.yml` file. By default, only the required services are started. For example, to start the cache and lambda services, run:
```bash
docker compose -f docker-compose.dev.yml --profile cache --profile lambda up
```

#### Services
| Service | Description | Optional | Notes | Requires Authentication |
|---------|-------------|----------|-------|-------------------------|
| PostgreSQL | Relational Database | No | | No |
| RustFS | Object Storage | No | | No |
| Redis | In-memory Cache | Yes | | No |
| Galapagos | NetLogo Web Instance | Yes | Frontend .nlogox files runtime | Yes |
| `netlogo-services` | NetLogo Desktop Lambda Functions | Yes | Used to generate thumbnails | Yes |

To authenticate Docker, use the following command
```bash
gh auth refresh -h github.com -s read:packages
gh auth token | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```
