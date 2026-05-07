# Deployment Guide — RIS Admin Portal

> **Who this is for:** System administrators or IT staff deploying the admin portal on a Linux server.  
> No programming knowledge required — follow each step in order.

---

## What You Need Before Starting

Make sure you have all of these before you begin:

- [ ] A Linux server (Ubuntu 20.04 or newer recommended)
- [ ] The RIS Backend (FastAPI) already running on the same server (usually at port 8000)
- [ ] A domain name pointing to your server (e.g. `ris.yourhospital.com`)
- [ ] SSL certificate for your domain (free with Let's Encrypt — instructions below)
- [ ] Node.js 20 or newer installed on the server
- [ ] `pnpm` package manager installed (instructions below if missing)
- [ ] Nginx installed on the server

---

## Part 1 — Prepare the Server

### 1.1 Install Node.js (if not already installed)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs
node --version    # Should show v20.x.x or higher
```

### 1.2 Install pnpm (if not already installed)

```bash
npm install -g pnpm
pnpm --version    # Should show a version number
```

### 1.3 Install Nginx (if not already installed)

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## Part 2 — Get the Code on the Server

### 2.1 Copy the project folder to the server

If you have the project on your local computer, upload it to the server using any file transfer tool (FileZilla, WinSCP, or `scp`). Place it somewhere like:

```
/var/www/ris-admin-source/
```

Or if using Git:

```bash
cd /var/www
git clone https://your-repository-url.git ris-admin-source
cd ris-admin-source
```

### 2.2 Install project dependencies

```bash
cd /var/www/ris-admin-source
pnpm install
```

This downloads all the code libraries the project needs. It may take 1-3 minutes.

---

## Part 3 — Set Up Environment Variables

Environment variables tell the portal where to find the backend, what timezone to use, and other settings. You set these **before** building.

### 3.1 Create the production environment file

```bash
cd /var/www/ris-admin-source
cp .env.example .env.production
nano .env.production
```

### 3.2 Fill in the values

Edit the file to match your setup. Here is an example for a production hospital server:

```env
# ─── Required ───────────────────────────────────────────────────────────────

# The full URL of your backend API
# (If backend is on the same server, use the server's domain name)
VITE_API_BASE_URL=https://ris.yourhospital.com/api/v1

# ─── Optional (but recommended to change) ────────────────────────────────────

VITE_APP_NAME="Nuclear Medicine Admin Portal"
VITE_DEFAULT_LANGUAGE=en
VITE_DEFAULT_THEME=light
VITE_TIMEZONE=Asia/Kuwait

# How many minutes of inactivity before staff are auto-logged out (15 is required for compliance)
VITE_INACTIVITY_TIMEOUT_MINUTES=15

# How many minutes before auto-logout to show a warning
VITE_INACTIVITY_WARNING_MINUTES=2

# Roles that require two-factor authentication (MFA) — do not change unless you know what you're doing
VITE_REQUIRE_MFA_ROLES=ADMIN,RADIOLOGIST

# Links shown on the forbidden page to direct non-admin users to their portal
VITE_PATIENT_PORTAL_URL=https://ris.yourhospital.com
VITE_DOCTOR_PORTAL_URL=https://ris.yourhospital.com/doctor

# ─── Push Notifications (optional — only needed if you want browser notifications) ──
# Leave blank to disable push notifications. See Part 6 to set this up.
VITE_VAPID_PUBLIC_KEY=
```

**Save the file** (in nano: press `Ctrl+O`, then `Enter`, then `Ctrl+X`).

---

## Part 4 — Build the Portal

This step compiles the portal into static files ready for the web server.

```bash
cd /var/www/ris-admin-source

# Tell pnpm to use your production settings
export NODE_ENV=production

# Build the portal
pnpm build
```

The build takes about 30-60 seconds. When it finishes, you will see something like:

```
✓ built in 685ms
```

A new folder called `dist/` has been created. This is what gets served to users.

### 4.1 Copy the built files to the web server directory

```bash
# Create the directory where the portal will be served from
sudo mkdir -p /var/www/ris-portal-admin

# Copy the built files there
sudo cp -r dist/* /var/www/ris-portal-admin/

# Set correct ownership so Nginx can read the files
sudo chown -R www-data:www-data /var/www/ris-portal-admin
```

---

## Part 5 — Configure Nginx

Nginx is the web server that will serve your portal to users' browsers.

### 5.1 Create the Nginx configuration

```bash
sudo nano /etc/nginx/sites-available/ris-portal
```

Paste the following into the editor. **Replace `ris.yourhospital.com` with your actual domain name.**

```nginx
server {
    listen 80;
    server_name ris.yourhospital.com;

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name ris.yourhospital.com;

    # SSL certificate paths (will be filled in by Certbot in Part 5.3)
    ssl_certificate     /etc/letsencrypt/live/ris.yourhospital.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ris.yourhospital.com/privkey.pem;

    # Strong SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers (protects against common attacks)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "notifications=(self)" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https:; font-src 'self'; worker-src 'self';" always;

    # ── Admin Portal (/admin/) ───────────────────────────────────────────────

    location /admin/ {
        root /var/www;
        try_files $uri $uri/ /ris-portal-admin/index.html;

        # Cache HTML files for a very short time (so updates appear quickly)
        location ~* \.html$ {
            expires 5m;
            add_header Cache-Control "public, no-cache";
        }

        # Cache static assets (JS, CSS, fonts) for a long time
        # (Vite adds unique hashes to filenames, so this is safe)
        location ~* \.(js|css|woff2?|ttf|svg|png|ico)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # ── Service Worker must be served at exact path ──────────────────────────
    location = /admin/service-worker.js {
        root /var/www/ris-portal-admin;
        add_header Service-Worker-Allowed "/admin/";
        add_header Cache-Control "no-cache";
    }

    # ── Backend API (proxy to FastAPI) ───────────────────────────────────────
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings
        proxy_connect_timeout 30s;
        proxy_read_timeout 60s;
    }

    # ── Patient portal (if served from the same server) ─────────────────────
    # location / {
    #     root /var/www/ris-portal-patient;
    #     try_files $uri $uri/ /index.html;
    # }
}
```

**Save the file** (`Ctrl+O`, `Enter`, `Ctrl+X`).

### 5.2 Enable the site

```bash
# Enable the site configuration
sudo ln -s /etc/nginx/sites-available/ris-portal /etc/nginx/sites-enabled/

# Test the configuration for errors
sudo nginx -t

# If the test says "syntax is ok" and "test is successful", restart Nginx
sudo systemctl restart nginx
```

### 5.3 Get a free SSL certificate (HTTPS)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get a certificate for your domain
sudo certbot --nginx -d ris.yourhospital.com

# Follow the prompts:
# - Enter your email address
# - Agree to the terms (type A)
# - Choose whether to share your email with EFF (Y or N)
# - Certbot will automatically update your Nginx config
```

Certbot will also automatically renew the certificate every 90 days. No manual action needed.

---

## Part 6 — Set Up Push Notifications (Optional)

Push notifications allow the portal to alert staff to new bookings and critical findings — even when the browser tab is in the background. Skip this section if you don't need this feature.

### 6.1 Generate VAPID keys

Run this command **on any computer** (your local machine or the server, it doesn't matter):

```bash
npx web-push generate-vapid-keys
```

You will see output like this:

```
=======================================
Public Key:
BNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...

Private Key:
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
=======================================
```

**Copy both keys.** Keep them somewhere safe. Never share the private key.

### 6.2 Add the public key to the frontend

Edit the production environment file on the server:

```bash
nano /var/www/ris-admin-source/.env.production
```

Find the line `VITE_VAPID_PUBLIC_KEY=` and paste your public key after the `=`:

```env
VITE_VAPID_PUBLIC_KEY=BNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...
```

Then **rebuild the portal** (repeat Part 4):

```bash
cd /var/www/ris-admin-source
pnpm build
sudo cp -r dist/* /var/www/ris-portal-admin/
sudo chown -R www-data:www-data /var/www/ris-portal-admin
```

### 6.3 Add the private key to the backend

In your FastAPI backend's environment variables (e.g. `.env`), add:

```env
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PUBLIC_KEY=BNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...
VAPID_SUBJECT=mailto:admin@yourhospital.com
```

See `BACKEND_REQUIREMENTS.md` for the full list of new backend endpoints needed to support push notifications.

### 6.4 Convert notification icons to PNG

The push notifications display icons. These need to be in PNG format:

```bash
# Install sharp (image conversion tool)
npm install -g sharp-cli

# Convert the SVG icons to PNG
cd /var/www/ris-portal-admin
sharp -i notification-icon.svg -o notification-icon.png resize 192 192
sharp -i notification-badge.svg -o notification-badge.png resize 72 72
```

Alternatively, use any online SVG-to-PNG converter, save as 192×192 and 72×72 pixels.

---

## Part 7 — Verify the Deployment

Open a browser and go to `https://ris.yourhospital.com/admin/`

**Checklist:**

- [ ] The login page appears (not a blank page, not a 404)
- [ ] The page shows a padlock icon in the browser address bar (HTTPS is working)
- [ ] You can log in with a staff account
- [ ] The dashboard loads with today's appointment count
- [ ] The sidebar navigation works
- [ ] Auto-logout appears after 15 minutes of inactivity

**If push notifications are set up:**
- [ ] Go to Settings → Notifications
- [ ] Enable the master toggle — browser asks for notification permission
- [ ] Grant permission
- [ ] Create a test booking from the patient portal
- [ ] A browser notification should appear within 30 seconds

---

## Part 8 — Updating the Portal

When a new version is released:

```bash
# 1. Go to the source folder
cd /var/www/ris-admin-source

# 2. Pull the latest code (if using Git)
git pull

# 3. Install any new dependencies
pnpm install

# 4. Rebuild
pnpm build

# 5. Copy to the web directory
sudo cp -r dist/* /var/www/ris-portal-admin/
sudo chown -R www-data:www-data /var/www/ris-portal-admin

# 6. Reload Nginx (not required but clears any caching)
sudo systemctl reload nginx
```

Users will see the update the next time they refresh their browser. The service worker updates automatically in the background.

---

## Part 9 — Making a Backup

### Back up the built files

```bash
# Create a timestamped backup of the currently deployed files
sudo tar -czf /backups/ris-admin-$(date +%Y%m%d-%H%M).tar.gz /var/www/ris-portal-admin/
```

### Back up the environment file

```bash
sudo cp /var/www/ris-admin-source/.env.production /backups/ris-admin-env-$(date +%Y%m%d).env
```

> **Important:** The `.env.production` file contains sensitive configuration. Store it securely.

---

## Common Problems & Solutions

### "404 Not Found" when refreshing a page inside the portal

**Cause:** Nginx is trying to find a file at that path instead of serving `index.html`.  
**Fix:** Make sure your Nginx config has `try_files $uri $uri/ /ris-portal-admin/index.html;` for the `/admin/` location.

---

### Login works but then the page goes blank or shows an error

**Cause:** The frontend cannot reach the backend API.  
**Check:**
```bash
# Is the backend running?
curl http://127.0.0.1:8000/api/v1/health

# Should return something like: {"status": "ok"}
```
If you get "Connection refused", start your FastAPI backend.

---

### "Mixed Content" error in browser console

**Cause:** Your `VITE_API_BASE_URL` uses `http://` but the portal is served over `https://`.  
**Fix:** Change `VITE_API_BASE_URL` to use `https://` and rebuild.

---

### Push notifications don't arrive

1. Check that `VITE_VAPID_PUBLIC_KEY` in `.env.production` matches the key in the backend
2. Check that the user has granted notification permission in the browser
3. Check that the backend has implemented the `/api/v1/admin/push-subscribe` endpoint
4. On some corporate networks, push notifications are blocked by firewall rules

---

### The site is slow to load on first visit

**Cause:** The browser is downloading fonts and JavaScript bundles for the first time.  
**This is normal** — subsequent visits load instantly from cache. If it's very slow, check that Gzip compression is enabled in Nginx:

```bash
# Check if gzip is enabled
sudo nginx -T | grep gzip

# If not, add this to your nginx.conf inside the http {} block:
# gzip on;
# gzip_types text/plain application/javascript text/css application/json;
```

---

### Staff get logged out too quickly

**Cause:** `VITE_INACTIVITY_TIMEOUT_MINUTES` is set too low.  
**Fix:** Edit `.env.production`, change the value, then rebuild.

> **Note:** For medical software compliance (FDA 21 CFR Part 11), the recommended maximum idle timeout is 15 minutes. Do not set this higher than 30 minutes.

---

## Quick Reference — Useful Commands

```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx error logs (useful when something isn't working)
sudo tail -50 /var/log/nginx/error.log

# Check Nginx access logs
sudo tail -50 /var/log/nginx/access.log

# Restart Nginx after configuration changes
sudo systemctl restart nginx

# Reload Nginx without dropping connections
sudo systemctl reload nginx

# Test Nginx configuration before restarting
sudo nginx -t

# Check SSL certificate expiry date
sudo certbot certificates

# Manually renew SSL certificate (Certbot does this automatically, but you can force it)
sudo certbot renew

# Rebuild and redeploy the portal
cd /var/www/ris-admin-source && pnpm build && sudo cp -r dist/* /var/www/ris-portal-admin/
```

---

## Folder Layout on the Server

After a complete deployment, your server will look like this:

```
/var/www/
├── ris-admin-source/          ← Source code + environment file (not public)
│   ├── .env.production        ← Your settings (keep this private)
│   ├── src/
│   ├── dist/                  ← Built output (generated by pnpm build)
│   └── ...
│
└── ris-portal-admin/          ← What Nginx serves to users (public)
    ├── index.html
    ├── service-worker.js
    ├── notification-icon.png
    ├── notification-badge.png
    └── assets/
        ├── index-[hash].js    ← Main app bundle
        ├── index-[hash].css
        └── ...fonts...

/etc/nginx/
├── sites-available/
│   └── ris-portal             ← Your Nginx configuration
└── sites-enabled/
    └── ris-portal → ...       ← Symlink (created in Part 5.2)
```

---

## Support

If something is not working and you cannot find the answer here:

1. Check the Nginx error log: `sudo tail -100 /var/log/nginx/error.log`
2. Open browser developer tools → Console tab — look for red error messages
3. Check that the backend is running and responding at `/api/v1/health`
4. Verify the SSL certificate is valid: visit `https://ris.yourhospital.com/admin/` and look for the padlock icon

For application-level issues, contact the development team with:
- The exact error message from the browser console
- The relevant lines from the Nginx error log
- The output of `sudo nginx -t`
