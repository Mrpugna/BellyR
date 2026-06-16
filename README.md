# BellyRub Pet Staycation

An internal pet-stay operations app with a persistent local SQLite database.

## Included

- Pet profiles with feeding, health, vaccine, owner, and temperament details
- Booking calendar with daycare, overnight, add-on, and booking statuses
- Daily care logs with meals, mood, activities, pee, poo, notes, and channel
- Financial dashboard with paid and pending payments plus CSV export
- Responsive desktop, tablet, and mobile layouts

## Run

```bash
python3 server.py
```

Open <http://127.0.0.1:4173/>.

The database is stored in `bellyrub.db`. See `BACKEND.md` for API examples.

## Messaging note

Care updates are saved locally and tagged for LINE or Instagram. External delivery requires business credentials for the LINE Messaging API or Meta/Instagram APIs; the app does not claim a message was delivered without those credentials.

## Netlify deployment

A Netlify-compatible version is included:

- Static app: `public/`
- Serverless API: `netlify/functions/api.mjs`
- Deploy config: `netlify.toml`

See `NETLIFY_DEPLOY.md` for step-by-step instructions.
