# Hasan Khan — Portfolio Desktop

An interactive, NVIDIA-first portfolio desktop with optional macOS and Windows 11 themes. Built with vanilla HTML, CSS, and JavaScript — no framework or build step.

## Features

- **Cinematic OS entry** — Apple auto-login opens the split desktop; macOS and Windows each authenticate on their first switch
- **Three OS themes** — switch between macOS, Windows 11, and NVIDIA DGX OS from the menu bar
- **Window manager** — drag, resize, minimize, maximize, snap, Mission Control / Task View
- **Terminal** — shell with portfolio commands (`help`, `nvidia-smi`, `open`, etc.)
- **Live widgets** — simulated GPU stats, stock chart (AAPL / MSFT), GitHub activity feed
- **IRIS cinematic** — a centered, single-use launch drives the Microsoft × Apple energy-core collision, Big Bang, NVIDIA transition, and IRIS verification
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

## Project structure

```
index.html              # All portfolio content + window markup
assets/css/geforce-os.css   # Themes, layout, animations (incl. IRIS big-bang)
assets/js/geforce-os.js     # Window manager, terminal, GitHub, collision engine
assets/images/              # Wallpapers, logos, project screenshots
```

## Deploy

Static hosting only — GitHub Pages, GitLab Pages, Vercel, Netlify, or any CDN. Point the host at the repo root; `index.html` is the entry.

## Mobile

- **macOS / NVIDIA** — touch-friendly home launcher with a compact essential-app dock
- **Windows** — taskbar with Start menu (opens Launchpad); swipe taskbar for pinned apps
