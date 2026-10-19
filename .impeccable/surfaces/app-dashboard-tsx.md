---
version: 1
slug: "app-dashboard-tsx"
primary_target: "app/dashboard.tsx"
related_targets: ["app/frentista/attendant.tsx"]
---

# Surface brief: painel de gestão (`/`) e área do colaborador (`/frentista`)

Mode: Operate. Two surfaces, equal priority, one system.

- Admin (`/`, app/dashboard.tsx): month overview, fills, cadastros, monthly closing per institution (billing), prices, team. Desktop/tablet first, must work on phone.
- Colaborador (`/frentista`, app/frentista/attendant.tsx): log a fill in seconds at the pump on an old phone with bad signal; know beyond doubt that it was received.
- Constraints: keep the current green palette (PRODUCT.md); nothing infantile or loud; never slow down the phone flow. Must remain untouched: server rules, permissions, data model, routes.
- Memorable moment: the colaborador's full-screen receipt (placa grande, valor, hora) right after saving; the admin's per-institution statement that reads like a billing document.
- Quality bar: Stripe Dashboard, Linear, Nubank/Conta Azul.

## Direction contract

THESIS: The category standard played straight: a clean, quiet SaaS work tool where the month's billing per institution and the colaborador's confirmation are unmistakable. Refuses the incumbent's template tells: workspace switcher, decorative accent card, eyebrow kickers, 7–10px grey micro-text.

OWN-WORLD: White surfaces on #f5f7f5, green #157255 as the single action/selection colour, deep green #102d26 for the colaborador header and strong figures, light green #eaf4ed for selection. Neutral scale tinted green, every text ≥4.5:1, input borders ≥3:1. System UI stack, rem scale 12/13/14/16/20/24/30, tabular numerals right-aligned. 8px grid, 8px radii, hairline borders, one soft shadow for overlays.

STORY: The admin sees the month, finds any fill, and closes each institution with a statement it can export or print without rework. The colaborador picks the vehicle, taps the fuel, types litres and km, saves from the thumb zone and gets a receipt it trusts even on a weak connection.

FIRST VIEWPORT: Admin: light 240px sidebar in three labelled groups, page header (title, one-line context, month select, primary action), four plain KPI cards, "Litros por dia" chart beside "Por instituição" shares, recent fills table. Colaborador: compact deep-green header with status pill, segmented tabs, the form starting above the fold, sticky bottom bar with live total and the save button.

FORM: Category standard (canon) chosen by the user; seed key 214220a2.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
