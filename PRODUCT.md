# AGRIGUARD — Product context

## What it is

AGRIGUARD is an AI crop disease screening tool for small and medium farmers in India.

1. **Photo → AI check.** A farmer takes or uploads a photo of a leaf. The app returns the likely disease, a confidence level and plain-language advice. When confidence is low (below 70%), it tells the farmer to consult the local agriculture officer or Krishi Vigyan Kendra (KVK).
2. **Field alerts.** Field sensors (ESP32 + SIM module) watch soil and weather conditions and send WhatsApp/SMS alerts to the land owner when something needs attention.

**It is a screening tool, not a final diagnosis.** Every result says "AI-assisted screening, not a final diagnosis". The product should never sound more certain than the model is.

## Who it's for

- Small and medium Indian farmers. Many are first-time smartphone users, and literacy and English fluency vary.
- Land owners who may not be in the field and rely on WhatsApp/SMS alerts from the sensors.
- Secondary: students and home gardeners (the app has a separate "Student / Home" view).

## Constraints that shape every design decision

| Constraint | What it means for the UI |
|---|---|
| Low-end Android phones | Keep JavaScript small. No WebGL or heavy animation on working pages. Test at **360px** width. |
| Slow or patchy internet (2G/3G) | Downscale photos before upload and show a clear, patient loading state that says what is happening. Self-host fonts. Show something useful before the network returns. |
| Used outdoors in sunlight | High contrast: dark ink on a light background. Big type (17px+ body) and no thin light-grey text. |
| Gloves, dirty or wet hands | Tap targets of **48px minimum**, generous spacing, primary action easy to reach with a thumb. |
| Language | English today, Tamil next, with more Indian languages after. All text goes through `t()` with keys in `en.json` and `ta.json`. Never bake text into images, and leave room for longer Tamil strings. |
| Trust | Show confidence honestly, show the "not a final diagnosis" line, and point to human experts (agriculture officer / KVK) when unsure. |

## Tone

Plain, calm, respectful and practical, like a knowledgeable neighbour rather than a tech startup. Use short sentences and everyday words ("leaf photo", "check my crop"), not jargon ("multispectral inference pipeline"). Never alarmist.

## Core flows

1. **Landing** (`/`): explains the product in one line and leads to one big action, "Check my crop".
2. **Upload** (`/scan`): pick a crop (or let it auto-detect), take or upload a photo, submit.
3. **Results** (`/scan/[id]`): likely disease, confidence, severity, what to do now, when to get help, listen (text-to-speech), and share on WhatsApp.
4. **Field / sensors** (`/field`): sensor readings and alert history.

## Brand

- Colours: text #1C2A1E, background #F7F5EE, primary #2E7D32, secondary #E6EFE0, accent #E9A23B. See DESIGN.md for the contrast-safe usage rules.
- Fonts: Fraunces for headings and Mukta Malar for body text (Tamil + English).
