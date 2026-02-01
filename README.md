# AtlasHub

A self-hosted backend platform similar to Supabase, providing per-project PostgreSQL databases and private file storage via a REST API.

## Features

- **Database-per-project**: Each project gets its own isolated PostgreSQL database
- **Private storage**: MinIO-backed object storage with presigned URLs
- **REST CRUD API**: Safe, parameterized queries (no raw SQL from clients)
- **Admin SQL editor**: Full SQL access for administrators
- **Docker-ready**: Works on Windows (amd64) and Raspberry Pi (arm64)
- **Cloudflare integration**: Tunnel + Access for secure exposure

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### Local Development

1. **Clone and install dependencies:**

   ```bash
   git clone <repo-url>
   cd atlashub
   pnpm install
   ```

2. **Set up environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your secrets (generate a PLATFORM_MASTER_KEY!)
   ```

3. **Start infrastructure:**

   ```bash
   docker compose --profile dev up -d
   ```

4. **Run migrations:**

   ```bash
   pnpm --filter @atlashub/gateway db:migrate
   ```

5. **Start development servers:**

   ```bash
   pnpm dev
   ```

   - Gateway: http://localhost:3000
   - Dashboard: http://localhost:3001
   - MinIO Console: http://localhost:9001

### Development Auth Bypass

In development mode, use the header `x-dev-admin-token` with your `DEV_ADMIN_TOKEN` value:

```bash
curl http://localhost:3000/admin/projects \
  -H "x-dev-admin-token: dev-secret-token-change-me"
```

## Project Structure

```
atlashub/
├── gateway/               # Fastify API server
│   └── src/
│       ├── routes/        # API routes (admin + public)
│       ├── services/      # Business logic
│       ├── middleware/    # Auth middleware
│       ├── db/            # Database utilities + migrations
│       └── lib/           # Utilities (crypto, query builder)
├── dashboard/             # Next.js admin UI
│   ├── app/               # App router pages
│   ├── components/        # React components
│   └── lib/               # Utilities + API client
├── packages/
│   └── shared/            # Shared Zod schemas + types
├── docs/                  # Documentation
└── docker-compose.yml     # Docker configuration
```

## Deployment

### Raspberry Pi / Production

1. **Build images:**

   ```bash
   docker compose build
   ```

2. **Set production environment:**

   ```bash
   # Edit .env for production values:
   # - Strong passwords
   # - CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUDIENCE
   # - CLOUDFLARE_TUNNEL_TOKEN
   ```

3. **Start services:**
   ```bash
   docker compose up -d
   ```

### Cloudflare Tunnel Setup

1. Create a tunnel in Cloudflare Zero Trust
2. Add routes:
   - `admin.yourdomain.com` → `http://dashboard:3001`
   - `api.yourdomain.com` → `http://gateway:3000`
3. Set the tunnel token in `.env`

### Cloudflare Access Setup

1. Create an Access application for `admin.yourdomain.com`
2. Add your email to the allowed users
3. Copy the audience tag to `CF_ACCESS_AUDIENCE`
4. Set `CF_ACCESS_TEAM_DOMAIN` to your team domain

## API Documentation

See [docs/USAGE.md](docs/USAGE.md) for complete API documentation.

Quick example:

```typescript
// Fetch data from your AtlasHub project
const res = await fetch('https://api.yourdomain.com/v1/db/users?limit=10', {
  headers: {
    'x-api-key': process.env.ATLASHUB_SECRET_KEY,
  },
});
const { data } = await res.json();
```

## Security

- API keys are stored as SHA-256 hashes only
- Project database credentials are encrypted with AES-256-GCM
- Admin routes protected by Cloudflare Access
- Public API accepts no raw SQL, only parameterized CRUD
- Rate limiting per project

## Environment Variables

| Variable                  | Required | Description                            |
| ------------------------- | -------- | -------------------------------------- |
| `POSTGRES_PASSWORD`       | Yes      | Platform database password             |
| `MINIO_ACCESS_KEY`        | Yes      | MinIO access key                       |
| `MINIO_SECRET_KEY`        | Yes      | MinIO secret key                       |
| `PLATFORM_MASTER_KEY`     | Yes      | 32+ char key for credential encryption |
| `DEV_ADMIN_TOKEN`         | Dev      | Development admin bypass token         |
| `CF_ACCESS_TEAM_DOMAIN`   | Prod     | Cloudflare Access team domain          |
| `CF_ACCESS_AUDIENCE`      | Prod     | Cloudflare Access audience tag         |
| `CLOUDFLARE_TUNNEL_TOKEN` | Prod     | Cloudflare Tunnel token                |

See `.env.example` for all options.

## Backup

### Database

```bash
docker exec atlashub-postgres pg_dumpall -U postgres > backup.sql
```

### Storage

```bash
docker run --rm -v atlashub_minio_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/minio-backup.tar.gz /data
```

## License

MIT
