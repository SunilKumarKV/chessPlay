# Security Policy

## Supported Version

| Version | Status |
| --- | --- |
| v1.3.0 | Supported |

## Secret Handling

Never commit real secrets or private configuration values. The following must remain private:

```txt
.env
.env.*
backend/.env
frontend/.env
DATABASE_URL
MONGO_URI
MONGODB_URI
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
SMTP_PASS
TELEGRAM_BOT_TOKEN
CLOUDINARY_API_SECRET
STRIPE_SECRET_KEY
PAYPAL_CLIENT_SECRET
PAYMENT_SIGNING_SECRET
ADMIN_EMAILS
```

Use only placeholder values in `.env.example` files.

## GitHub Secrets

Store CI/CD and deployment secrets in GitHub Secrets or hosting provider environment settings. Do not hardcode them in source code, README files, workflow files, or frontend bundles.

Recommended GitHub Secrets:

```txt
DATABASE_URL
MONGO_URI
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
REDIS_URL
VITE_API_URL
VITE_SOCKET_URL
```

## Public Repository Safety

Do not expose the following in public showcase or docs repositories:

- Backend source code
- Auth implementation details
- Admin dashboard logic
- Payment or premium backend logic
- Referral earning backend logic
- Database models, migration internals, or credentials
- Production API keys, tokens, or secrets

## Reporting Security Issues

Report security issues privately to the maintainer. Do not open public issues containing exploit details, secrets, or private deployment data.
