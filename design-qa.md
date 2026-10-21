# DAILY redesign QA

final result: passed

## Comparison target and evidence

- Source visual truth: supplied SHIFTER_TIPS_HANDOFF/reference/index.html, v43. Original HTML unmodified; rendered locally on port 5174. Hash verification: 11/11 files.
- Source capture: `C:/Users/pt_ya/Documents/Codex/2026-10-21/new-chat/outputs/redesign/reference-mobile.png`.
- Implementation: production build on port 5175 with synthetic records in a separate origin; final source smoke test and empty state on port 5173.
- Full-view comparison: `outputs/redesign/comparison-mobile.png` in this Codex chat's output directory. Both the source and implementation were opened together in this comparison image.
- Implementation captures: mobile-final.png, landscape-final.png, tablet-final.png, desktop-final.png; final-empty-mobile.png is from the final source including the in-panel save status.
- Mobile viewport: 390×844 CSS px, DPR approximately 1. Captured source 390px wide; scrollable implementation content is 375px wide because the embedded desktop browser reserves a 15px scrollbar. Comparison pads the implementation region rather than stretching it.
- Other viewports: 844×390 landscape, 820×1180 tablet, 1440×1000 PC. Full-page captures retain native pixel dimensions; each was inspected together in a responsive comparison sheet.
- State: home, initial 30-day moving average; synthetic body mass, meals, and stamp records. Source is a TIPS viewport, not a diet dashboard: layout/content differences are intentional and required by the user's brief. This is a design-language adaptation, not a pixel clone or iframe import.

## Comparison history

1. Initial captured implementation: P2 — resizing from desktop to mobile left today's table column offscreen. Fixed by observing the scroll viewport and aligning its right edge on width/period changes. Verified scrollLeft=210, scrollWidth=532, clientWidth=322 at mobile width.
2. Initial desktop capture: P2 — the decorative equipment rail could overlap the content track because of the main element's width plus margin. Fixed by reserving 105px in the desktop main width; no document-level overflow at any tested size.
3. Mobile source comparison: P2 — hardware identity was weaker after hiding the desktop side equipment. Added a compact 22px etched equipment rail in the header using the same fixed-size geometry, without stretching the artwork or displacing the principal input substantially.
4. Post-fix comparison: no remaining actionable P0/P1/P2. Final source additionally exposes save state within the body-mass panel and preserves the existing global/meal save state.

## Required fidelity surfaces

- Typography: supplied Zen Kaku Black headings, Dela large numerical input, Yomogi short support copy. Inputs use readable 16px system text on mobile. White main numerals remain directly editable HTML and retain a numeric keyboard hint. Subsets total 53,708 bytes; original OFL files retained.
- Spacing/layout: ordered body mass → chart → meals → stamp card. Angular double panel outlines, short header, single-column mobile food log, 44px stamps, sticky row labels and native horizontal table scroll. Tablet/PC use their available width. Control/navigation overlap and document overflow were checked.
- Colors/tokens: reference black/charcoal/ivory line work and low-strength bloom; accent reserved for completed stamps. Null, true, false are also distinguished by ○, ✓, − and accessible state labels. Medication counts remain independent.
- Assets/quality: supplied font shapes and the original jittered stroke technique are used. Static equipment rails and resize-only perimeter drawing reproduce screws, equipment marks and stable scratches. No generated images or unrelated space imagery. The reference's full cabin/viewport renderer was not copied into the application's render loop.
- Copy/content: all three application screens and Japanese operation labels remain. English serial labels are subordinate. No SHIFTER TIPS copy, administrator UI or fictional health advice was added. Visible QA health records are synthetic, explicitly labelled in meal text.
- Focused review: the numerical input/goal/average region, chart ticks and tooltip, meal input text, and all three stamp states were inspected at their native mobile scale; the table's today's column and row labels were checked after scrolling. Full-page evidence alone was not used to judge these details.

## Functional checks

- `npm run build`: passed. PWA generated with the new static/font assets. Existing Firebase vendor chunk-size advisory remains, unrelated to this redesign.
- `npm test`: 5 passed; emulator-only tests intentionally skipped by this command.
- `npm run test:rules`: 2 passed in Firestore emulator using demo project. No rules edits.
- Browser: valid JSON import with review dialog, home display, weight 109.6→109.7, meal autosave, past calendar day meal editing, 3-state stamp cycle, weekly navigation, rightward drag of the swipe surface to previous week, return to today.
- Exported JSON verified the edited weight, dinner, prior-day breakfast and null stamp were preserved. Synthetic export was moved into the chat work directory; it was not committed or mixed with user records.
- Chart: moving-average/raw toggles, dates and axes displayed; clicking the plotted surface produced `2026-10-06 / 実測 111.0 kg` tooltip.
- Console warning/error inspection: none from the application in the QA browser.
- Data boundary: git diff confirmed unchanged Firebase, store/model/rules/build/dependency configuration. No animation-induced reads or subscriptions.
- Performance/lifecycle inspection: panel Canvas draws on resize only, memoized decoration ignores data/input updates, bounded resolution; background listeners and observers clean up. Reduced-motion and hidden-document CSS/lifecycle paths present.

## Remaining verification limits

- Firebase production Google login and multi-device sync remain unverified because connection environment variables were not provided; integration code is unchanged.
- Real iOS/Android touch, pinch zoom, keyboard opening, PWA install and OS reduced-motion switching were not tested on physical devices. Browser mouse-drag gesture verification is not a claim of real-device touch verification.
- Low-end hardware FPS, memory profiling and device background suspension were not measured; no claims of benchmarked performance.
- No new dependency was added. Build-time font subsetting ran outside the project; runtime needs no font processing library.

## Implementation checklist

- [x] Source/package inspection and visual capture
- [x] Preserve functional/data code and existing health records
- [x] Monochrome etched panels, fonts, readable inputs, conditional motion
- [x] Four viewport captures and fix/recheck loop
- [x] Build, unit tests, rules tests, browser interaction checks
- [x] Final local preview retained

Follow-up polish: optional device-specific tuning after real-phone testing; no outstanding P0/P1/P2 issue in the verified desktop-browser states.
