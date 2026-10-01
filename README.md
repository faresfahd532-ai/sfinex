# Sfinex

Professional multi-page security website covering:

- Penetration Testing
- Encryption (with live AES demo)
- Password Security (with strength checker)
- Network Testing

## Features

- Clean Corporate + Gradient Tech design
- English / Arabic language toggle (RTL + localStorage persistence)
- Client-side tools only (nothing sent to any server)
- Fully static — ready for GitHub Pages

## Pages

| File | Description |
|------|-------------|
| `index.html` | Home + About + Services overview |
| `penetration-testing.html` | Penetration Testing service page |
| `encryption.html` | Encryption guidance + AES encrypt/decrypt demo |
| `password-security.html` | Password best practices + strength checker |
| `network-testing.html` | Network testing overview |

## How to deploy on GitHub Pages

1. Create a new repository on GitHub
2. Upload all files in this folder
3. Go to **Settings → Pages**
4. Source = Deploy from branch → `main` → `/ (root)`
5. Save. Site will be live shortly.

## Customize before publishing

- Change `hello@sfinex.example` to your real email in `index.html`
- Optionally add a favicon

## Tech

- Pure HTML, CSS & JavaScript
- Web Crypto API for the encryption demo
- No frameworks, no build step
