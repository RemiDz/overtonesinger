# Fix: SPA Routing on GitHub Pages

## Problem
The `/about` and `/guide` routes return 404 on the live site (overtonesinger.com/about). This is because GitHub Pages doesn't know about client-side routes — it looks for an actual file at `/about/index.html` which doesn't exist.

The previous fix (copying index.html to 404.html at build time) doesn't work properly. We need the standard **spa-github-pages redirect pattern** which uses two parts working together.

## What to Do

### Step 1: Create `client/public/404.html`

Create this file (or replace the existing one). This is NOT a copy of index.html — it's a small redirect script:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <script>
    sessionStorage.redirect = location.href;
  </script>
  <meta http-equiv="refresh" content="0;URL='/'">
</head>
<body>
</body>
</html>
```

This saves the intended URL to sessionStorage, then redirects to the root `/`.

### Step 2: Add redirect handler script to `client/index.html`

In the `<head>` section of `client/index.html`, add this script BEFORE any other scripts (before the main app bundle):

```html
<script>
  (function(){
    var redirect = sessionStorage.redirect;
    delete sessionStorage.redirect;
    if (redirect && redirect !== location.href) {
      history.replaceState(null, null, redirect);
    }
  })();
</script>
```

This picks up the saved URL from sessionStorage and restores it in browser history before React Router loads, so the router sees the correct path.

### Step 3: Remove the old build-time copy approach

Check `vite.config.ts`, `package.json` build scripts, and the GitHub Actions workflow (`.github/workflows/`) for any `cp index.html 404.html` or similar commands that copy index.html to 404.html at build time. **Remove them** — they'll overwrite our custom 404.html with a plain copy of index.html which breaks the redirect pattern.

The 404.html in `client/public/` will automatically be included in the Vite build output (files in `public/` are copied as-is to `dist/`).

### Step 4: Commit and push

Commit message: `fix: proper SPA routing with 404.html redirect pattern`

## How It Works
1. User visits `overtonesinger.com/about`
2. GitHub Pages can't find `/about/index.html` → serves `404.html`
3. `404.html` saves the full URL to sessionStorage, redirects to `/`
4. GitHub Pages serves `index.html` at `/`
5. The script in `index.html` reads sessionStorage, restores `/about` in browser history
6. React Router loads, sees `/about` in the URL, renders the About page

## Verify
After deployment, test these URLs all load correctly:
- https://overtonesinger.com/ (main app)
- https://overtonesinger.com/about
- https://overtonesinger.com/guide
