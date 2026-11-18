# RB-202 — deploying Recipe Builder to AWS

## The short version

One EC2 instance runs everything: nginx (serves the built frontend and
proxies `/api` to the backend), the Spring Boot backend as a service, and
Postgres. No RDS, no S3, no CloudFront, no load balancer. The point is the
lowest bill that still gives us a public HTTPS address.

## Decisions

| Question | Answer |
|---|---|
| Where | One EC2 instance, Amazon Linux 2023, one region (us-west-2 unless Jose says otherwise) |
| Size | The smallest instance the account's free tier covers — Jose checks this in the console before launching |
| Address | An Elastic IP, so the domain survives a reboot |
| Domain | Jose's. An A record points at the Elastic IP |
| HTTPS | Let's Encrypt through certbot, renewed by cron |
| Frontend | `npm run build`, files copied to `/var/www/recipe-builder`, served by nginx |
| Backend | `app.jar` in `/opt/recipe-builder`, run by systemd as an unprivileged user |
| Database | Postgres on the same box, listening on localhost only |
| One origin | The browser only ever talks to the domain. `fetch('/api/...')` needs no code change |

## Where each secret lives

| Secret | Lives in | Never in |
|---|---|---|
| Spoonacular key | `/etc/recipe-builder.env` on the server (mode 600) | git, the frontend build, chat |
| Database password | `/etc/recipe-builder.env` | git |
| AWS account login | Jose's password manager; MFA on | anywhere shared |

## Things that are different in production

- The session cookie gets the Secure flag
  (`SERVER_SERVLET_SESSION_COOKIE_SECURE=true`) because the site is HTTPS.
- Migration V3 is **not run**. It gives the demo account the password
  `demo1234`, which would be a public login.
- Restarting the backend empties the cache, so every restart re-spends
  Spoonacular points from the 50 a day. Deploy outside demo hours.
- Backups stay on the same disk until someone copies them off the box.

## Not in scope

CI/CD, Docker, autoscaling, a second environment, monitoring beyond one
billing alarm.
