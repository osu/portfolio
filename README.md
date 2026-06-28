# Hasan Khan — Portfolio Desktop

An interactive, NVIDIA-first portfolio desktop with optional macOS and Windows 11 themes. Built with vanilla HTML, CSS, and JavaScript — no framework or runtime build step.

## Features

- **Cinematic OS entry** — Apple auto-login opens the split desktop; macOS and Windows each authenticate on their first switch
- **Three OS themes** — switch between macOS, Windows 11, and NVIDIA DGX OS from the menu bar
- **Custom DGX environment** — a live Minecraft wallpaper, clear cinematic backdrop, and hardware-inspired desktop chrome
- **Window manager** — drag, resize, minimize, maximize, snap, Mission Control / Task View, and motion-reactive lighting
- **Spatial Asset Vault** — browse projects, credentials, systems, and community work in an accessible 3D explorer with instant previews
- **Terminal** — shell with portfolio commands (`help`, `nvidia-smi`, `open`, etc.)
- **Live widgets** — simulated GPU stats, stock chart (AAPL / MSFT), GitHub activity feed
- **IRIS cinematic** — a centered, single-use launch drives the Microsoft × Apple energy-core collision, Big Bang, mechanical digital-eye formation, and IRIS verification
- **Progressive loading** — project media, skills artwork, and the ambient wallpaper hydrate only when needed
- **Installable PWA** — responsive shell, offline navigation fallback, and platform-sized app icons

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘/Ctrl + K` | Search apps and actions |
| `⌘/Ctrl + Space` | Spotlight / Windows Search / Command Palette |
| `F3` | Mission Control / Task View |
| `Esc` | Minimize focused window (or close overlays) |

## Local development

```bash
# any static file server works
python3 -m http.server 8080
# open http://localhost:8080
```

The served CSS and JavaScript are checked-in minified builds. After editing their readable source files, refresh them with:

```bash
./scripts/build-static-assets.sh
```

## Project structure

```
index.html              # All portfolio content + window markup
assets/css/geforce-os.css   # Themes, layout, animations (source; `.min.css` is served)
assets/js/geforce-os.js     # Window manager, Asset Vault, collision engine (source; `.min.js` is served)
assets/images/              # Wallpapers, logos, project screenshots
scripts/build-static-assets.sh # Refresh checked-in production CSS/JS
```

## Deploy

Static hosting only — GitHub Pages, GitLab Pages, Vercel, Netlify, or any CDN. Point the host at the repo root; `index.html` is the entry.

## Mobile

- **macOS / NVIDIA** — touch-friendly home launcher with a compact essential-app dock
- **Windows** — taskbar with Start menu (opens Launchpad); swipe taskbar for pinned apps
