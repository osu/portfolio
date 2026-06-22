# Hasan Khan — Portfolio Desktop

An interactive portfolio that mimics a split macOS / Windows 11 / NVIDIA DGX desktop. Built with vanilla HTML, CSS, and JavaScript — no framework, no build step.

## Features

- **Three OS themes** — switch between macOS, Windows 11, and NVIDIA DGX OS from the menu bar
- **Window manager** — drag, resize, minimize, maximize, snap, Mission Control / Task View
- **Terminal** — shell with portfolio commands (`help`, `nvidia-smi`, `open`, etc.)
- **Live widgets** — simulated GPU stats, stock chart (AAPL / MSFT), GitHub activity feed
- **Cosmic collision** — drag the black & white holes together to trigger the IRIS big-bang transition into NVIDIA OS

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
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

- **macOS / NVIDIA** — grid launcher on the desktop; dock scrolls horizontally
- **Windows** — taskbar with Start menu (opens Launchpad); swipe taskbar for pinned apps
