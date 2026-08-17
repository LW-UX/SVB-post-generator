# SVB Social Media Post Generator

Browserbasierter Generator für markenkonforme Spieltags- und Ergebnisgrafiken des SV Bergheim.

## Funktionsumfang

- Spieltagsankündigung und Ergebnismeldung
- Instagram Post, 4:5 (1080 × 1350; Export 2160 × 2700)
- Instagram Story, 9:16 (1080 × 1920; Export 2160 × 3840)
- Querformat, 3:2 (1200 × 800; Export 2400 × 1600)
- 16:9-Querformat (1920 × 1080; Export 3840 × 2160)
- Live-Vorschau für Desktop und Mobilgeräte
- fest integrierte weiße und blaue SVB-Vereinslogos
- automatisches Mannschaftsdesign: blau-weißer Verlauf für die Erste, Weiß für die Zweite
- lokaler Upload für das Gegnerlogo
- PNG-Download in 2× Auflösung des gewählten Formats oder aller vier Formate
- keine Datenbank und keine Speicherung von Eingaben oder Uploads

## Lokale Entwicklung

Benötigt werden Node.js 22 oder neuer und pnpm.

```bash
pnpm install
pnpm run dev
```

## GitHub Pages

Der statische Build wird mit folgendem Befehl erstellt:

```bash
pnpm run build:pages
```

Der Workflow unter `.github/workflows/deploy-pages.yml` veröffentlicht den Inhalt von `pages-dist` nach jedem Push auf `main`. Im GitHub-Repository muss unter **Settings → Pages → Source** einmalig **GitHub Actions** ausgewählt werden.

## Anpassung an das Vereinsdesign

Die Oberfläche und der Grafik-Renderer sind voneinander getrennt. Farben und Oberflächenstile liegen in `app/globals.css`; Inhalte, Größen und die vier Grafiklayouts liegen in `app/page.tsx`. Dadurch können die vorläufigen Layouts später ohne Änderungen an Upload- oder Downloadfunktionen durch die finalen Vereinsvorlagen ersetzt werden.
