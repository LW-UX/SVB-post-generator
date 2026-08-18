# SVB Social Media Post Generator

Browserbasierter Generator für markenkonforme Fußballgrafiken und allgemeine Ankündigungen des SV Bergheim.

## Funktionsumfang

- Spieltagsankündigung und Ergebnismeldung
- übergeordnete Auswahl zwischen Fußball und allgemeinen Vereinsbeiträgen
- allgemeine Ankündigungen mit eigener Titelseite in allen vier Formaten
- ein- oder zweiseitige 4:5-Ankündigungen mit nahtlosem Hintergrund, Seitenvorschau und gemeinsamem Export beider PNG-Dateien
- frei editierbare Titel-, Unterzeilen-, Headline-, Fließtext- und Disclaimer-Felder
- automatischer Textumbruch und dynamische Verkleinerung langer Fließtexte von 30 px bis 20 px
- Instagram Post, 4:5 (1080 × 1350; Export 2160 × 2700)
- Instagram Story, 9:16 (1080 × 1920; Export 2160 × 3840)
- Querformat, 3:2 (1500 × 1000; Export 1500 × 1000)
- 16:9-Querformat (1920 × 1080; Export 1920 × 1080)
- Live-Vorschau für Desktop und Mobilgeräte
- fest integrierte weiße und blaue SVB-Vereinslogos
- referenzgetreue Spieltagslayouts mit eigenen Positionen für alle vier Formate
- automatisches Mannschaftsdesign: diagonaler blau-weißer Verlauf für die Erste, Weiß mit blauen Akzenten für die Zweite
- lokal eingebundene variable Inter-Schrift für identische Vorschau und PNG-Ausgabe
- lokaler Upload für das Gegnerlogo
- automatische einfarbige Darstellung des Gegnerlogos in Weiß oder SVB-Blau
- PNG-Download der Hochformate in 2× und der Querformate in 1× Auflösung
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

Wird der Generator domainübergreifend in eine andere Website eingebettet, muss
der native Teilen- und Speichern-Dialog am `iframe` freigegeben werden:

```html
<iframe
  src="https://lw-ux.github.io/SVB-post-generator/"
  allow="web-share"
></iframe>
```

Ohne `allow="web-share"` fällt der PNG-Export im eingebetteten Generator auf
einen regulären Browser-Download zurück.

Firefox unterstützt das Teilen von Dateien über die Web Share API nicht. Dort
wird deshalb ein regulärer PNG-Download mit dem vorgesehenen Dateinamen
angeboten. Für die Übergabe an die Fotobibliothek ist auf Android Chrome und
auf iPhone oder iPad Safari erforderlich.

## Anpassung an das Vereinsdesign

Die Oberfläche und der Grafik-Renderer sind voneinander getrennt. Farben und Oberflächenstile liegen in `app/globals.css`; Inhalte, Größen und die vier Grafiklayouts liegen in `app/page.tsx`. Dadurch können die vorläufigen Layouts später ohne Änderungen an Upload- oder Downloadfunktionen durch die finalen Vereinsvorlagen ersetzt werden.
