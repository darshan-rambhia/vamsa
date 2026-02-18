# Installation

This guide walks you through installing Vamsa on your own hardware or in the cloud. Pick the method that best fits your situation -- if you are unsure, go with Docker.

| Method | Best For | Time | Difficulty |
|--------|----------|------|------------|
| **[Docker](#docker-recommended)** | Most users, homelabs | 5 minutes | Easiest |
| **[Raspberry Pi](#raspberry-pi-arm)** | Low-power home servers | 10 minutes | Easy |
| **[Bare Metal](#bare-metal)** | Developers, tinkerers | 15 minutes | Moderate |
| **[Cloud Hosting](#cloud-hosting)** | No hardware needed | 10 minutes | Moderate |

---

## Docker (Recommended)

Docker bundles everything Vamsa needs into isolated containers so you do not have to install databases or runtimes yourself. This is the fastest way to get started.

### What you need

- **Docker Desktop** (Windows or Mac) or **Docker Engine + Docker Compose** (Linux)
- At least **2 GB of free RAM** and **2 GB of disk space**

!!! info "What is Docker?"
    Docker is a tool that packages applications and all their dependencies into "containers" -- self-contained boxes that run the same way on every machine. Think of it like a shipping container for software.

### Step 1 -- Download the code

Open a terminal and run:

```bash
git clone https://github.com/darshan-rambhia/vamsa.git
cd vamsa
```

You should see:

```
Cloning into 'vamsa'...
remote: Enumerating objects: ...
Receiving objects: 100% ...
```

!!! tip "Don't have Git?"
    You can also download Vamsa as a ZIP file from [the GitHub releases page](https://github.com/darshan-rambhia/vamsa/releases) and extract it.

### Step 2 -- Create your configuration file

```bash
cp .env.example .env
```

This copies the example configuration to a new file called `.env` that Docker will read. No output means it worked.

### Step 3 -- Set required passwords

Open the `.env` file in any text editor and change these two values:

```bash
# Generate a database password (copy the output into .env)
openssl rand -base64 24
```

You should see a random string like:

```
k7B3xQ9mN2pL5wR8vT1yF4hJ6dA0cE+
```

Copy that value and paste it next to `DB_PASSWORD=` in your `.env` file.

Do the same for `BETTER_AUTH_SECRET`:

```bash
# Generate an authentication secret
openssl rand -base64 32
```

Your `.env` file should now have lines like:

```ini
DB_PASSWORD=k7B3xQ9mN2pL5wR8vT1yF4hJ6dA0cE+
BETTER_AUTH_SECRET=aLongerRandomStringGoesHere1234567890abc=
```

!!! warning "Security: Change the defaults"
    Never run Vamsa in production with the example passwords. Always generate your own random values using the commands above.

You can also set the initial admin account:

```ini
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=         # Leave empty to auto-generate a secure password
```

!!! tip "Auto-generated admin password"
    If you leave `ADMIN_PASSWORD` empty, Vamsa will generate a strong password and print it to the logs the first time it starts. You can retrieve it with `docker logs vamsa-app 2>&1 | grep password`.

### Step 4 -- Start Vamsa

```bash
docker compose --env-file .env -f docker/docker-compose.yml up -d
```

You should see:

```
[+] Running 3/3
 ✔ Network vamsa-network      Created
 ✔ Container vamsa-db         Healthy
 ✔ Container vamsa-app        Started
```

### Step 5 -- Verify everything is running

```bash
docker ps
```

You should see something like:

```
CONTAINER ID   IMAGE              STATUS                   PORTS                NAMES
a1b2c3d4e5f6   vamsa-app          Up 2 minutes (healthy)   0.0.0.0:80->3000     vamsa-app
f6e5d4c3b2a1   postgres:18-alpine Up 3 minutes (healthy)   5432/tcp             vamsa-db
```

!!! info "What each container does"

    | Container | Purpose |
    |-----------|---------|
    | **vamsa-db** | PostgreSQL database -- stores all your family tree data |
    | **vamsa-app** | The Vamsa web application (Bun + Hono server) |

### Step 6 -- Open Vamsa

Open your browser and go to **[http://localhost](http://localhost)**.

You should see the Vamsa login page. Sign in with the admin email you set in Step 3. If you left the password empty, check the logs for the auto-generated password:

```bash
docker logs vamsa-app 2>&1 | grep -i password
```

### Optional: Enable automated backups

To add automatic daily database backups:

```bash
docker compose --env-file .env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.backup.yml \
  up -d
```

This adds a backup container that saves your database to the `backups/` folder every day. See [Configuration > Backups](configuration.md#backups) for retention settings.

### Stopping Vamsa

```bash
docker compose --env-file .env -f docker/docker-compose.yml down
```

Your data is safe -- it lives in Docker volumes that persist between restarts.

---

## Raspberry Pi / ARM

Vamsa works on ARM-based devices like the Raspberry Pi. The Docker images support both `amd64` and `arm64` architectures.

### What you need

- **Raspberry Pi 4 or 5** with at least **4 GB of RAM**
- **Raspberry Pi OS (64-bit)** or any ARM64 Linux distribution
- Docker and Docker Compose installed

!!! tip "Use an SSD instead of an SD card"
    Databases do a lot of reading and writing. An SD card will work, but an external SSD connected via USB 3 will be noticeably faster and last much longer. A 128 GB SSD is more than enough.

### Installation steps

The steps are identical to the [Docker installation above](#docker-recommended). SSH into your Pi and follow Steps 1 through 6.

```bash
# If Docker is not installed yet:
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in, then:
git clone https://github.com/darshan-rambhia/vamsa.git
cd vamsa
cp .env.example .env
# Edit .env as described in Steps 3 above
docker compose --env-file .env -f docker/docker-compose.yml up -d
```

### Performance expectations

| Pi Model | Users | Family Size | Experience |
|----------|-------|-------------|------------|
| Pi 4 (4 GB) | 1-3 | Up to 500 people | Smooth for everyday use |
| Pi 4 (8 GB) | 3-5 | Up to 2,000 people | Comfortable |
| Pi 5 (8 GB) | 5-10 | Up to 5,000 people | Fast |

!!! info "First startup is slower"
    The first time you start Vamsa on a Raspberry Pi, Docker needs to build the images. This can take 5-10 minutes. After that, restarts take just seconds.

### Accessing from other devices

To access Vamsa from other devices on your network, use your Pi's IP address instead of `localhost`. Find your Pi's IP with:

```bash
hostname -I
```

```
192.168.1.42 ...
```

Then open `http://192.168.1.42` in a browser on any device on your network.

---

## Bare Metal

This method runs Vamsa directly on your machine without Docker. This is best for developers who want to modify the code or who already have PostgreSQL running.

### What you need

- **[Bun](https://bun.sh)** (JavaScript runtime) -- version 1.1 or later
- **[PostgreSQL](https://www.postgresql.org/download/)** -- version 15 or later
- **[Git](https://git-scm.com/)**

### Step 1 -- Download and install dependencies

```bash
git clone https://github.com/darshan-rambhia/vamsa.git
cd vamsa
bun install
```

You should see:

```
bun install v1.x.x
...
Saved lockfile
Done in X.XXs
```

### Step 2 -- Configure the database connection

```bash
cp .env.example .env
```

Open `.env` and set `DATABASE_URL` to point to your PostgreSQL instance:

```ini
DATABASE_URL="postgresql://vamsa:your_password@localhost:5432/vamsa"
```

!!! info "Creating the database"
    If you do not already have a `vamsa` database, create one:

    ```bash
    createdb vamsa
    ```

    Or from the PostgreSQL prompt:

    ```sql
    CREATE DATABASE vamsa;
    ```

Also set `BETTER_AUTH_SECRET` (see [Docker Step 3](#step-3-set-required-passwords) for how to generate one).

### Step 3 -- Set up the database and seed initial data

```bash
bun run db:migrate
```

You should see:

```
Running migrations...
Migration complete.
```

Then seed the admin account:

```bash
bun run db:seed
```

```
Seeding database...
Created admin user: admin@vamsa.local
```

### Step 4 -- Build and start

```bash
bun run build
bun run start
```

You should see:

```
Starting Vamsa production server...
Listening on http://localhost:3000
```

### Step 5 -- Open Vamsa

Open your browser and go to **[http://localhost:3000](http://localhost:3000)**.

!!! tip "Development mode"
    If you want to make changes to the code with hot reloading, run `bun run dev` instead of `bun run build && bun run start`. The dev server starts at `http://localhost:3000`.

---

## Cloud Hosting

You can run Vamsa on cloud platforms that support Docker or Node.js-compatible runtimes. Here is a brief guide for popular platforms.

!!! warning "Cloud costs"
    Most cloud platforms have free tiers that work fine for small families. Larger trees or more users may need a paid plan. Check your provider's pricing before deploying.

### General requirements

Regardless of which cloud platform you choose:

1. You need a **PostgreSQL database** (most platforms offer managed PostgreSQL)
2. Set all required environment variables from `.env.example` (at minimum: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `ADMIN_EMAIL`)
3. Set `APP_URL` to your public domain (for example, `https://family.example.com`)
4. The build command is `bun run build`
5. The start command is `bun run start`

### Platform-specific notes

=== "Railway"

    1. Create a new project on [Railway](https://railway.app)
    2. Add a **PostgreSQL** plugin
    3. Connect your GitHub repository or deploy from the Vamsa code
    4. Set environment variables in the Railway dashboard:
        - `DATABASE_URL` -- Railway provides this automatically from the PostgreSQL plugin
        - `BETTER_AUTH_SECRET` -- generate with `openssl rand -base64 32`
        - `ADMIN_EMAIL` -- your email address
        - `APP_URL` -- the Railway-provided URL or your custom domain
    5. Railway will automatically build and deploy

=== "Fly.io"

    1. Install the [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/)
    2. Create a Postgres cluster: `fly postgres create`
    3. Create and deploy the app: `fly launch`
    4. Set secrets:
        ```bash
        fly secrets set BETTER_AUTH_SECRET=$(openssl rand -base64 32)
        fly secrets set ADMIN_EMAIL=you@example.com
        fly secrets set APP_URL=https://your-app.fly.dev
        ```

=== "Render"

    1. Create a new **Web Service** on [Render](https://render.com)
    2. Add a **PostgreSQL** database
    3. Connect your repository
    4. Set the build command to `bun run build`
    5. Set the start command to `bun run start`
    6. Add environment variables in the Render dashboard

!!! tip "Custom domain"
    After deploying, you can point your own domain (like `family.yourlastname.com`) to your cloud instance. Each platform has documentation on setting up custom domains.

---

## Next steps

Your Vamsa instance is running. Now head to the **[Quick Start](quick-start.md)** guide to add your first family members and explore the app.
