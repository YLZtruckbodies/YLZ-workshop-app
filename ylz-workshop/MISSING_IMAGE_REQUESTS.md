# Missing Image Requests

Images needed for the visual configurator. All missing images should use placeholder cards until replaced.
Placeholders can be swapped without any code changes — just replace the file at the same path.

---

## Image Library Structure

```
ylz-workshop/public/images/
├── truck-bodies/
│   ├── hardox-tipper.jpg          — 10m3 Hardox tipper body (primary hero)
│   ├── alloy-tipper.jpg           — Alloy tipper body
│   ├── hardox-tipper-side.jpg     — Side view
│   └── alloy-tipper-side.jpg      — Side view
├── trailers/
│   ├── dog-trailer-3axle.jpg      — 3-axle dog trailer
│   ├── dog-trailer-4axle.jpg      — 4-axle dog trailer
│   ├── dog-trailer-5axle.jpg      — 5-axle dog trailer
│   ├── semi-trailer-2axle.jpg     — 2-axle semi
│   ├── semi-trailer-3axle.jpg     — 3-axle semi
│   ├── pig-trailer.jpg            — Pig trailer
│   └── converter-dolly.jpg        — Converter dolly
├── combos/
│   ├── alloy-truck-dog-19m3.jpg   — 19m3 alloy truck + dog combo (PRIORITY)
│   └── alloy-truck-dog-20m3.jpg   — 20m3 alloy truck + dog combo (PRIORITY)
├── tarps/
│   ├── razor-electric.jpg         — Razor/EziTarp electric system
│   ├── pulltarp.jpg               — Pulltarp electric
│   ├── aero-easy.jpg              — Aero Easy Cover
│   ├── manual-pullover.jpg        — Manual pull-over tarp
│   └── rollover-mesh.jpg          — Rollover mesh tarp
├── hoists/
│   ├── hyva-alpha-191.jpg         — Hyva Alpha 191-4
│   ├── hyva-alpha-201.jpg         — Hyva Alpha 201-4
│   ├── hyva-alpha-241.jpg         — Hyva Alpha 241-4
│   └── palfinger-ph-t74.jpg       — Palfinger PH T74
├── options/
│   ├── barn-doors.jpg             — Barn door tailgate
│   ├── single-drop-down.jpg       — Single piece drop down tailgate
│   ├── bi-fold.jpg                — Bi-fold tailgate
│   ├── toolbox-underbody.jpg      — Underbody toolbox
│   ├── cab-guard.jpg              — Cab guard
│   ├── headboard.jpg              — Headboard
│   └── rope-rails.jpg             — Rope rails
├── brands/
│   ├── volvo.png                  — Volvo logo/truck silhouette
│   ├── kenworth.png               — Kenworth
│   ├── western-star.png           — Western Star
│   ├── isuzu.png                  — Isuzu
│   ├── man.png                    — MAN
│   ├── scania.png                 — Scania
│   ├── mercedes-benz.png          — Mercedes-Benz
│   ├── daf.png                    — DAF
│   ├── mack.png                   — Mack
│   ├── sitrak.png                 — Sitrak
│   ├── ud.png                     — UD
│   ├── hino.png                   — Hino
│   └── fuso.png                   — Fuso
├── axles/
│   ├── bpw-air-ride.jpg           — BPW air ride axle
│   ├── fuwa-air-ride.jpg          — Fuwa air ride axle
│   └── saf-air-ride.jpg           — SAF air ride axle
└── placeholders/
    ├── truck-body-placeholder.svg  — Generic truck body silhouette
    ├── trailer-placeholder.svg     — Generic trailer silhouette
    ├── option-placeholder.svg      — Generic option placeholder
    └── brand-placeholder.svg       — Brand placeholder
```

---

## Missing Images by Priority

### CRITICAL (needed for Quick Quote templates)

| # | Product | Category | File Path | Description | Angle |
|---|---------|---------|-----------|-------------|-------|
| 1 | 10m3 Hardox Tipper Body | truck-bodies | hardox-tipper.jpg | Body only, unpainted or painted black | 3/4 front-side view |
| 2 | Alloy Truck + Dog 19m3 | combos | alloy-truck-dog-19m3.jpg | Full combo on road | Side view or 3/4 |
| 3 | Alloy Truck + Dog 20m3 | combos | alloy-truck-dog-20m3.jpg | Full combo on road | Side view or 3/4 |
| 4 | EziTarp / Razor Electric Tarp | tarps | razor-electric.jpg | Fitted on body, showing mechanism | Close-up or fitted |

### HIGH PRIORITY (product selection UI)

| # | Product | Category | File Path | Description |
|---|---------|---------|-----------|-------------|
| 5 | 3-Axle Dog Trailer | trailers | dog-trailer-3axle.jpg | Complete trailer, alloy body |
| 6 | 4-Axle Dog Trailer | trailers | dog-trailer-4axle.jpg | Complete trailer, alloy body |
| 7 | 3-Axle Semi Trailer | trailers | semi-trailer-3axle.jpg | Complete semi |
| 8 | Alloy Tipper Body | truck-bodies | alloy-tipper.jpg | Alloy body on truck |
| 9 | Hyva Alpha 241-4 Hoist | hoists | hyva-alpha-241.jpg | Hoist alone or fitted under body |
| 10 | Barn Door Tailgate | options | barn-doors.jpg | Open or closed, fitted to body |

### MEDIUM PRIORITY (configurator steps)

| # | Product | Category | File Path |
|---|---------|---------|-----------|
| 11 | Bi-Fold Tailgate | options | bi-fold.jpg |
| 12 | Single Drop-Down Tailgate | options | single-drop-down.jpg |
| 13 | Underbody Toolbox | options | toolbox-underbody.jpg |
| 14 | Pulltarp Electric | tarps | pulltarp.jpg |
| 15 | Manual Pull-Over Tarp | tarps | manual-pullover.jpg |
| 16 | BPW Air Ride Axle | axles | bpw-air-ride.jpg |
| 17 | Cab Guard | options | cab-guard.jpg |

### LOWER PRIORITY (truck brand cards)

Truck brand logos/silhouettes (13 brands — see brands/ directory above).
Can use manufacturer official logos with appropriate attribution or simple text cards initially.

---

## Image Sourcing Guide

| Source | Priority | Use For |
|--------|---------|---------|
| YLZ website (ylztruckbodies.com.au) | 1st | Finished builds, real jobs |
| YLZ Google Drive job photos | 2nd | Workshop photos of completed builds |
| Manufacturer sites (Hyva, BPW, Razor) | 3rd | Option/component photos |
| Placeholder SVG | Last resort | Any missing image |

**Do NOT copy competitor branding or wording.**

---

## Placeholder Design Spec

Placeholders should be SVG or PNG cards with:
- Dark background (#1a1a1a matching app theme)
- YLZ orange border (#E8681A)
- Product name in white text
- "Photo coming soon" in muted text
- Size: 400×300px (4:3 ratio)

When a real photo replaces a placeholder, just swap the file — no code changes needed.
