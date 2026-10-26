# FriendSpace

A small web app for meeting people nearby. Accounts, profiles, a swipe deck, and a weekly group of 3–6 people who liked each other or share interests. After a week, each person can stay, leave, or keep talking one to one. Group chats include nearby activity ideas and two browser games.

## Run locally

Docker is used for Postgres. The app stores photos on disk until Azure storage is configured.

```bash
docker compose up -d
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open http://localhost:3000.

Demo login: `demo@friendspace.app` / `password123`

The other seeded people use the same password: sam, jordan, riley, casey, avery, quinn, and taylor at `@friendspace.app`. Sam, Jordan, Riley, and Casey already liked Alex (the demo account), so a forced weekly run will put those five in a group.

```bash
curl -X POST -H "Authorization: Bearer dev-only-cron-secret" \
  http://localhost:3000/api/cron/groups?force=1
```

New groups are formed on Mondays (UTC) when that route runs. It also moves finished groups into the decision step, and closes out decisions that have been waiting 48 hours. Set `CRON_SECRET` and send it as `Authorization: Bearer …`.

## Azure

`infra/main.bicep` creates:

- Azure Database for PostgreSQL Flexible Server (burstable B1ms) and a `friendspace` database
- a private blob container named `photos`
- a Linux App Service (Basic B1, Node 20) with the app settings filled in
- a daily Logic App that calls `/api/cron/groups` at 08:00 UTC

```bash
az group create --name friendspace-rg --location eastus
az deployment group create \
  --resource-group friendspace-rg \
  --template-file infra/main.bicep \
  --parameters postgresPassword='A-long-password-1' authSecret='A-long-random-secret' cronSecret='Another-long-secret'
```

The Postgres password needs Azure’s complexity rules (letters, numbers, and a symbol). The template allows Azure services through the database firewall so App Service can connect. Photos stay private and are served through the app.

GitHub Actions workflow `.github/workflows/deploy.yml` builds the standalone Next.js app, runs `prisma migrate deploy`, and deploys to App Service. Add these repository secrets first:

- `AZURE_WEBAPP_NAME` — the web app name from the deployment output
- `AZURE_WEBAPP_PUBLISH_PROFILE` — downloaded from the App Service
- `DATABASE_URL` — `postgresql://fsadmin:PASSWORD@SERVER.postgres.database.azure.com:5432/friendspace?sslmode=require`

Copy `.env.example` when you need the local variable names. Do not commit `.env`.
