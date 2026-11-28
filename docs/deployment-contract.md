# RB-202 — deploying Recipe Builder to AWS

## The short version

One EC2 virtual machine runs the app: nginx (serves the built frontend and
proxies `/api` to the backend) and the Spring Boot backend as a service. The
database is PostgreSQL on Amazon RDS, a separate managed database server, and
the domain is registered and pointed at the server with Amazon Route 53. No
S3, no CloudFront, no load balancer. The point is a low bill that still gives
us a public HTTPS address.

**Changed during the sprint:** the first plan ran Postgres on the EC2 box
itself. Jose deployed the database on RDS instead, and registered the domain
through Route 53. This document now describes what was built.

## Decisions

| Question | Answer |
|---|---|
| Where | One EC2 instance, Amazon Linux 2023, one region (us-west-2 unless Jose says otherwise) |
| Size | The smallest instance the account's free tier covers — Jose checks this in the console before launching |
| Address | An Elastic IP, so the domain survives a reboot |
| Domain | Registered by Jose through Amazon Route 53. A record in its hosted zone points at the Elastic IP |
| HTTPS | Let's Encrypt through certbot, renewed by cron |
| Frontend | `npm run build`, files copied to `/var/www/recipe-builder`, served by nginx |
| Backend | `app.jar` in `/opt/recipe-builder`, run by systemd as an unprivileged user |
| Database | PostgreSQL on Amazon RDS, in the same VPC as the EC2 instance. Its security group should accept port 5432 from the EC2 instance only, never from the internet (to check with Jose) |
| One origin | The browser only ever talks to the domain. `fetch('/api/...')` needs no code change |

## Where each secret lives

| Secret | Lives in | Never in |
|---|---|---|
| Spoonacular key | `/etc/recipe-builder.env` on the server (mode 600) | git, the frontend build, chat |
| Database password and RDS address | `/etc/recipe-builder.env` | git |
| AWS account login | Jose's password manager; MFA on | anywhere shared |

## Things that are different in production

- The session cookie gets the Secure flag
  (`SERVER_SERVLET_SESSION_COOKIE_SECURE=true`) because the site is HTTPS.
- Migration V3 is **not run**. It gives the demo account the password
  `demo1234`, which would be a public login.
- Restarting the backend empties the cache, so every restart re-spends
  Spoonacular points from the 50 a day. Deploy outside demo hours.
- RDS takes automated backups by default, so they no longer depend on the
  EC2 disk (Jose to confirm they are switched on).
- RDS is billed separately from the EC2 instance; the billing alarm covers
  both.

## Not in scope

CI/CD, Docker, autoscaling, a second environment, monitoring beyond one
billing alarm.
