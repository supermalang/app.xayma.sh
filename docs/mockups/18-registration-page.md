```markdown
# Design System Strategy: The Architect’s Ledger

## 1. Overview & Creative North Star
**Creative North Star: "The Technical Editorial"**
This design system moves away from the "bubble-gum" aesthetic of modern SaaS to embrace a sophisticated, high-precision layout reminiscent of architectural blueprints and Swiss editorial design. For a platform managing Odoo deployments, the UI must communicate **absolute stability** and **technical authority**. 

We achieve a "High-End" feel not through decorative flourishes, but through extreme intentionality in white space, a rigid 8px baseline grid, and a "Flat-Plus" philosophy. While the system adheres to a flat aesthetic (no heavy dropshadows or 3D skeuomorphism), it creates depth through **Tonal Layering** and **Asymmetric Balance**, ensuring the interface feels like a bespoke tool rather than a generic template.

---

## 2. Colors & Surface Hierarchy
The palette is rooted in a deep, authoritative primary blue, punctuated by a high-energy "Industrial Orange" for critical action paths.

### Surface Hierarchy & Nesting
To maintain a high-end "Flat" aesthetic, we strictly prohibit the use of 1px solid borders for general sectioning. Instead, boundaries are defined by **Background Shifts**.
- **Surface (Base):** `#f8f9ff` (Background) — The canvas.
- **Surface-Container-Low:** Used for large sidebar areas or secondary content blocks to create a subtle "recessed" feel.
- **Surface-Container-Lowest:** `#ffffff` — Reserved for high-priority interaction cards and modal bodies to create a "lifted" feel without using shadows.

### The "No-Line" Rule
Traditional UI relies on borders (`outline-variant`). This system utilizes **color-blocking**. When two functional areas meet, differentiate them by moving from `surface` to `surface-container-high`. This creates a cleaner, more modern "Paper-on-Paper" effect.

### Glassmorphism & Tonal Depth
For floating elements (like tooltips or fly-out menus), use a semi-transparent `surface_container_highest` with a `backdrop-filter: blur(12px)`. This allows the "flat" colors to bleed through, creating a sophisticated, airy texture that adds polish without breaking the "No Shadow" mandate.

---

## 3. Typography: The Humanist & The Machine
The typographic soul of this system lies in the contrast between **Inter** (The Humanist) and **IBM Plex Mono** (The Machine).

- **Inter (Headlines & Body):** 
    - **Display & Headline:** Used at `600-700` weight. Headlines must feel "Editorial"—use generous letter-spacing (-0.02em) to create a premium, tight appearance.
    - **Body:** `400-500` weight. High readability for complex Odoo configuration data.
- **IBM Plex Mono (Technical Layer):**
    - Reserved exclusively for Billing IDs, FCFA Currency, ISO 8601 Timestamps, and Database Keys. 
    - **Rule:** Never use Mono for UI labels. Use it only for *data*.

**The "3-Size" Constraint:** To maintain an editorial rigor, no single view should utilize more than three distinct font sizes. This forces the designer to use weight and color (on-surface vs on-surface-variant) to establish hierarchy rather than simply increasing size.

---

## 4. Elevation & Depth: Tonal Layering
Since shadows are prohibited, we use the **Layering Principle** to communicate importance.

1.  **Level 0 (The Ground):** `surface` (#f8f9ff).
2.  **Level 1 (The Layout):** `surface-container-low` for structural zones (e.g., Navigation rail).
3.  **Level 2 (The Interactive):** `surface-container-lowest` (#ffffff) for Cards. 
4.  **Level 3 (The Interrupt):** Glassmorphism for Modals/Tooltips.

**The "Ghost Border" Fallback:** 
If a border is required for accessibility (e.g., in a high-density data table), use the `outline_variant` at **20% opacity**. A 100% opaque border is considered "visual noise."

---

## 5. Components

### Buttons
- **Primary:** `primary_container` (#1e40af) background with `on_primary` text. Sharp, `0.375rem` (md) corners. No gradient. 
- **Secondary:** Outlined using `outline_variant` at 40% opacity. Text in `primary`.
- **Tertiary:** Pure text-link style using `primary` color. Reserved for "Cancel" or "Learn More."

### Status Badges (The "Pill")
- **Form:** Fully rounded (`full`). 
- **Style:** Use high-contrast pairings:
    - **Success:** `tertiary_container` background with `on_tertiary_fixed_variant` text.
    - **Danger:** `error_container` background with `on_error_container` text.
- **Iconography:** Always include a 16px icon (2px stroke) inside the badge for accessibility.

### Data Tables & Lists
- **Rule:** Forbid horizontal and vertical divider lines. 
- **Separation:** Use a `24px` gap between rows. On hover, change the row background to `surface_container_high`.
- **Alignment:** Numbers (FCFA) must be right-aligned and set in **IBM Plex Mono**.

### Credit Meter (Linear Progress)
- A 4px tall track (`surface_container_highest`) with a sharp-edged `primary` fill. No rounded caps on the progress bar—keep it architectural and precise.

---

## 6. Do’s and Don’ts

### Do:
- **Use ISO 8601:** Dates must be `YYYY-MM-DD HH:mm`. This is a technical tool; avoid "2 days ago."
- **Currency Precision:** Always append `FCFA` after the value (e.g., `50,000 FCFA`) in IBM Plex Mono.
- **Asymmetric Margins:** Experiment with large `64px` (8) left-side gutters to give the text an editorial "breathing room."

### Don’t:
- **No Shadows:** Do not use `box-shadow` to create depth. Use background color shifts.
- **No Gradients:** Colors must be flat. Texture is created through typography and spacing, not color blending.
- **No Rounded Overload:** Stick to `0.375rem` (md) for most components. Avoid the "pill" shape except for status badges.
- **No Generic Icons:** Use 2px stroke icons. Never use filled icons unless they represent an active "On" state.

---

## 7. Tone of Voice
**Concise. Action-Oriented. Authoritative.**
Instead of "It looks like your deployment is ready," use "Deployment Complete." 
Instead of "Would you like to add a new database?" use "Add Database." 

Every word should feel like it was chosen by an engineer with an eye for poetry.```