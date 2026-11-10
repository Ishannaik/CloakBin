# Deploy to Fly.io

Run CloakBin on one [Fly.io](https://fly.io) machine, built from the repository's existing `Dockerfile`. Fly has no managed MongoDB, so store pastes in an external MongoDB such as a free MongoDB Atlas cluster.

You need [`flyctl`](https://fly.io/docs/flyctl/install/) (signed in with `fly auth login`), a clone of this repository, and a MongoDB connection string.

## Environment variables

| Variable                   | Required       | Where to set it   | Notes                                                                                                                           |
| -------------------------- | -------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `DB_TYPE`                  | yes            | `[env]`           | `mongodb`, or `memory` to try it out (pastes are lost when the machine stops)                                                   |
| `MONGODB_URI`              | with `mongodb` | `fly secrets set` | `mongodb+srv://...`                                                                                                             |
| `ADMIN_USER`, `ADMIN_PASS` | yes            | `fly secrets set` | Admin panel login at `/admin`                                                                                                   |
| `ORIGIN`                   | yes            | `[env]`           | Public URL, e.g. `https://my-cloakbin.fly.dev`. Admin login is rejected if it does not match.                                   |
| `MAX_PASTE_BYTES`          | no             | `[env]`           | Default 10 MiB. If you raise it, raise `BODY_SIZE_LIMIT` (default `12M`) above it too, with room for the JSON around the paste. |
| `CREATE_REQUIRES_LOGIN`    | no             | `[env]`           | `true` lets only signed-in members create pastes                                                                                |

The image already sets `PORT=3000`, `HOST=0.0.0.0` and `BODY_SIZE_LIMIT=12M`. See `.env.example` for the full list.

## 1. Create the app and `fly.toml`

```bash
fly apps create my-cloakbin
```

Create `fly.toml` at the root of your clone. Replace `my-cloakbin` and pick a [region](https://fly.io/docs/reference/regions/) close to your database.

```toml
app = "my-cloakbin"
primary_region = "cdg"

[build]
  dockerfile = "Dockerfile"

[env]
  DB_TYPE = "mongodb"
  ORIGIN = "https://my-cloakbin.fly.dev"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 1

  [[http_service.checks]]
    method = "GET"
    path = "/api/health"
    interval = "30s"
    timeout = "5s"
    grace_period = "20s"

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1
```

`/api/health` returns `503` when the database is unreachable, so Fly marks the machine unhealthy (see [API.md](API.md)).

## 2. Let Fly reach MongoDB

Do this before the first deploy. Fly machines have no fixed outgoing IP address by default, and Atlas rejects addresses that are not on its access list. Either allow `0.0.0.0/0` in Atlas (**Security > Network Access**) with a strong, unique database password, or allocate a static egress IP and allow only that address:

```bash
fly ips allocate-egress --app my-cloakbin -r cdg
```

Static egress IPs are per app and per region, and are billed. See [Fly's egress IP docs](https://fly.io/docs/networking/egress-ips/).

## 3. Set secrets and deploy

```bash
fly secrets set \
  MONGODB_URI='mongodb+srv://user:password@cluster.example.mongodb.net/cloakbin?retryWrites=true&w=majority' \
  ADMIN_USER=admin \
  ADMIN_PASS='a-long-random-password'

fly deploy --ha=false
```

Put a database name in `MONGODB_URI` (`cloakbin` above, before the `?`). Without one, pastes go to a database called `test`.

`--ha=false` tells Fly not to create spare machines. Keep CloakBin on one machine: rate limits and sign-in lockouts live in the server's memory, so each extra machine keeps its own count. `min_machines_running = 1` keeps that machine running when the app is idle: if Fly stopped it, the restart would clear the counters, and someone locked out after failed sign-ins could try again before the 15 minutes are up. Deploys and restarts still clear them. Check with `fly status` that only one machine is listed, then:

```bash
curl https://my-cloakbin.fly.dev/api/health
# {"ok":true,"db":"mongodb"}
```

If the deploy fails with a health check timeout and `fly logs` shows `MongooseServerSelectionError`, Atlas is blocking Fly: check step 2, then run `fly deploy --ha=false` again.

## Custom domain

Run `fly certs add paste.example.com`, follow the DNS instructions, set `ORIGIN = "https://paste.example.com"` in `fly.toml`, and run `fly deploy` again.

## Upgrading

`git pull`, then `fly deploy`.
