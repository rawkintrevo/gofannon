# Gofannon Web Application

This monorepo contains the complete scaffolding for the Gofannon web application, including the React Web UI, Python API microservices, and infrastructure configurations.

## Project Structure

- **`/infra`**: Contains infrastructure-as-code for all deployment targets.
  - `/docker`: Local development environment using Docker Compose.
  - `/firebase`, `/amplify`, `/kubernetes`: Placeholders for target-specific configurations.
- **`/packages`**: Contains the source code for different parts of the application.
  - `/api`: Python-based microservices.
  - `/config`: Centralized, environment-aware configuration package.
  - `/webui`: The React (Vite + Material-UI) frontend.
- **`/tests`**: Houses end-to-end tests that span across the entire stack.

## Getting Started (Local Development)

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18+)
- [pnpm](https://pnpm.io/installation)
- [Docker](https://www.docker.com/products/docker-desktop/) and Docker Compose

### Installation

1.  Install project-wide dependencies from the root directory:
    ```bash
    pnpm install
    ```

### Running Locally

#### pnpm scripts (without Docker)

From the `webapp/` directory you can run both the Vite web UI and the FastAPI service via pnpm:

```bash
pnpm dev    # runs the Vite dev server and uvicorn together via concurrently
pnpm build  # builds the SPA into packages/webui/dist
pnpm start  # serves the API and the built SPA from FastAPI
```

`pnpm start` expects that `pnpm build` has already produced `packages/webui/dist`. During local development you can also control whether the FastAPI service serves the built UI by toggling the `SERVE_WEBUI_FROM_API` environment variable (defaults to `true`). Set it to `false` (or `0`, `no`, `off`) if you want the API to run without mounting the static assets.

#### Docker Compose

1.  Start all services using Docker Compose:
    ```bash
    cd infra/docker
    cp example.env .env  # also edit example key(s)
    docker-compose up --build
    ```

2.  Access the application:
    - Web UI: [http://localhost:3000](http://localhost:3000)
    - API: [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI)

This setup uses a mock authentication provider, allowing you to bypass login and develop features directly. Storage is handled by a local MinIO container that simulates an S3-compatible service.
