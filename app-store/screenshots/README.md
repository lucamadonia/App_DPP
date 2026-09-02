# App Store screenshots

The reproducible guest-mode set uses only fictional/static content and can be
regenerated with `npm run appstore:screenshots`.

Required output per localization:

- `iphone-6.9`: 1320 × 2868 px portrait
- `ipad-13`: 2064 × 2752 px portrait

Five screens are captured for German and English: Discover overview,
requirements, checklists, QR tool, and regulations. Apple permits 1–10 images;
these files intentionally show the app in use rather than a splash or login
screen.

Before upload, inspect every PNG at 100% and confirm:

- no real names, email addresses, customer data, or confidential product data;
- no Android UI, browser chrome, debug indicators, or placeholder copy;
- text is readable and not clipped;
- the screenshots still match the submitted binary;
- the final iPhone and iPad device builds have been visually checked separately.
