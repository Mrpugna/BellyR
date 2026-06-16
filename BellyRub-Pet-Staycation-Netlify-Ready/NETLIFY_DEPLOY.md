# Deploy BellyRub Pet Staycation on Netlify

Netlify is a static hosting + serverless platform. The local app uses `server.py` and `bellyrub.db`, which are good for running on your computer but are not the right backend shape for Netlify. The Netlify version in this folder uses:

- `public/` for the browser app
- `netlify/functions/api.mjs` for `/api/...` backend routes
- Netlify Blobs for persistent app data
- `netlify.toml` for deploy configuration

## What I changed for Netlify

The browser app still calls the same API paths, such as `/api/pets` and `/api/settings`. On your computer, `server.py` answers those paths. On Netlify, `netlify/functions/api.mjs` answers those paths and saves data in Netlify Blobs.

## Files Netlify needs

Keep these files in your GitHub repository:

```text
public/index.html
public/styles.css
public/app.js
netlify/functions/api.mjs
netlify.toml
package.json
```

The local-only files can stay in the repo, but Netlify will publish only `public/`.

## Step-by-step deploy

1. Create a GitHub repository.

2. Upload this project folder to GitHub. Make sure `netlify.toml`, `package.json`, `public/`, and `netlify/functions/` are included.

3. Go to https://app.netlify.com/ and log in.

4. Choose **Add new project**.

5. Choose **Import an existing project**.

6. Pick GitHub, then choose your BellyRub repository.

7. Use these build settings:

```text
Build command: npm install
Publish directory: public
Functions directory: netlify/functions
```

`netlify.toml` already contains the publish and functions settings, so Netlify may fill those in automatically.

8. Click **Deploy**.

9. After deployment, open your Netlify site URL.

10. Test these in the app:

- Add a pet
- Edit a pet
- Delete a pet
- Add a booking
- Save a daily care log
- Add a payment
- Save settings

## Test the backend on Netlify

Open these URLs using your real Netlify site domain:

```text
https://YOUR-SITE.netlify.app/api/health
https://YOUR-SITE.netlify.app/api/pets
https://YOUR-SITE.netlify.app/api/settings
```

A healthy backend should show JSON.

## Test locally like Netlify

If you have Node.js installed:

```bash
npm install
npx netlify dev
```

Then open:

```text
http://localhost:8888
```

## Important notes

- Netlify Functions are serverless, not a long-running Python server.
- SQLite files should not be used as the live Netlify database.
- This Netlify setup uses Netlify Blobs for simple persistent storage.
- For a busy real business, the next upgrade would be a full database such as Supabase, Neon, or Netlify Database.
- LINE and Instagram delivery still need official API credentials before the app can send messages externally.
