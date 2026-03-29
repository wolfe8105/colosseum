# LCARS Complete Reference Guide
### Library Computer Access/Retrieval System — Research & Implementation Notes

---

## Table of Contents

1. [What is LCARS](#1-what-is-lcars)
2. [Framework Elements (16 Types)](#2-framework-elements-16-types)
3. [Content-Area / Complex Elements (10+ Types)](#3-content-area--complex-elements-10-types)
4. [The Glass Effect & Physical Construction](#4-the-glass-effect--physical-construction)
5. [Color Palette](#5-color-palette)
6. [Typography](#6-typography)
7. [Audio Grammar](#7-audio-grammar)
8. [Common Animations (10 Patterns)](#8-common-animations-10-patterns)
9. [System 47 Source Analysis](#9-system-47-source-analysis)
10. [Working Code: Animations Reference Sheet](#10-working-code-animations-reference-sheet)
11. [Working Code: Elbow + Bars Deploy Sequence](#11-working-code-elbow--bars-deploy-sequence)
12. [Key Open-Source LCARS Projects](#12-key-open-source-lcars-projects)

---

## 1. What is LCARS

LCARS (pronounced "el-karz") stands for **Library Computer Access/Retrieval System**. It is the fictional computer operating system seen in Star Trek from The Next Generation onward. The graphical interface was designed by scenic art supervisor **Michael Okuda**, and the displays are affectionately called **"Okudagrams"**.

The original design concept was influenced by Gene Roddenberry's request that instrument panels not have a great deal of activity on them. This minimalist look was designed to give a sense that the technology was much more advanced than in the original Star Trek.

LCARS retained the same basic layout and design across Federation starships and installations, with variations in color schemes. During normal operations, colors alternate between tans, purples, yellows, blues, aquas, and oranges. During emergencies, color schemes shift to reflect alert status (red/white for red alert, blue/white for blue alert).

---

## 2. Framework Elements (16 Types)

These are the structural building blocks that make up the LCARS chrome/frame around any display.

### 2.1 Elbow
The **signature shape** of LCARS. A 90-degree rounded corner bend connecting horizontal bars to vertical side panels. Comes in four orientations: top-left, top-right, bottom-left, bottom-right. The outer edge is straight, the inner edge sweeps through a quarter-circle.

### 2.2 Bars (Horizontal & Vertical)
Long, flat rectangular strips along display edges. Terminate with a rounded "half-pill" cap at the free end. Carry right-aligned text labels (section titles, stardate readouts, system identifiers). Gaps between bars create visual separation and rhythm.

### 2.3 Pill Caps / Half Pills
Rounded terminators on bar ends. A **full pill** is rounded on both ends (capsule shape). A **half pill** is flat on one side where it butts against an elbow or edge, rounded on the free end. When only one corner elbow is present on a side, the bar extends to the other corner and terminates with the characteristic half pill.

### 2.4 Buttons / Lozenges
Pill-shaped interactive touch targets. Stacked vertically in side panels. Each a different color. All-caps condensed labels. Meaning by shape:
- **Square/rectangular buttons** → primary input
- **Round buttons** → signify commands
- **End buttons** → attached to square buttons or elbows to show options

### 2.5 Sweep (S-Curve)
Two elbows pointing in opposite directions forming an **S or reverse-S shape**. Effectively two adjacent LCARS boxes separated by an input column. Divides the display into two distinct content zones with a graceful visual connector.

### 2.6 Brackets
Curved bracket pairs (top and bottom) that visually frame and group related content sections. Decorative but functional for visual organization.

### 2.7 Decorators
Small accent stripes added to the left (or right) edge of elements. Thin colored lines that add visual hierarchy.

### 2.8 Indicators
Small status dots/marks within elements showing state — active, idle, alert. Often a colored circle embedded in a button or element.

### 2.9 Headers
Thin horizontal bars acting as section dividers with right-aligned text labels naming the section (e.g., "ENGINEERING", "SUBSYSTEMS"). Break up vertical space within the content area.

### 2.10 Data Cascade
Animated scrolling numbers/text in the top header area. Gives the feel of live data streaming through the system. Called "data cascade" by the LCARS community. The most basic animated follies include scrolling numbers, polarized fade, and button blink/fade.

### 2.11 Segmented Bars
Side panel bars split into multiple colored segments, each with its own label. Often carried crew initials or reference numbers as in-jokes. Give the side panels that distinctive chunky, multicolored look.

### 2.12 Rectangles (LCARS Rect)
Basic square-cornered blocks on the grid. Fillers, status blocks, or spacing elements. Conform to strict grid units. Not as visually distinctive as pills or elbows but essential.

### 2.13 Toggles
On/off switch controls. Color shifts with status. LCARS-styled toggle buttons used in place of standard checkboxes.

### 2.14 Gauges / Sliders
Level meters showing quantities. Can be horizontal or vertical. Background color in gauge mode can be segmented into ranges with different colors for different thresholds.

### 2.15 D-Pad (Directional Control)
A directional navigation cross for spatial controls (sensor targeting, map navigation). Four directional buttons around a center confirm button.

### 2.16 Spacers
Transparent gaps between elements, sized to the strict grid system. Critical for visual rhythm and breathing room. The negative space is as intentional as the elements themselves.

### Underlying System: Grid
LCARS has a strict grid system where item sizes are set in multiples of unit size. `lcars-u-X-Y` sets width to X × unit width and height to Y × unit height. Everything snaps to this grid.

---

## 3. Content-Area / Complex Elements (10+ Types)

These are the specialized displays that live inside the content area framed by the structural elements above.

### 3.1 X/Y Circular Control ("The Compass")
The classic circular spatial controller. Concentric rings with crosshair lines and directional tick marks. Used for sensor targeting, navigation, and spatial positioning. Named "the compass" by prop collectors. Complex SVG geometry — prepackaged as special SVG elements in CSS frameworks.

Can be inserted as:
```html
<img id="xy_control" src="img/lcars_xy_circle_widget_optimized.svg" />
```
Or inline SVG for increased interactivity and DOM event handling.

### 3.2 Master Systems Display (MSD)
A large, wall-mounted cutaway diagram of the vessel. Shows all decks and systems with colored status indicators. The centerpiece of Engineering. The first MSD was created by Michael Okuda for the Enterprise-D sets and included in-jokes like a hamster on a treadmill alleged to be the true source of power for the warp engines.

### 3.3 Waveform / Analysis Display
Oscilloscope-style readouts for sensor scans, subspace signals, medical biosigns, and system diagnostics. Multiple overlaid waveforms in different colors on a grid background. LCARS displayed results of analyses like linguistic analyses, configuration analyses of system networks, and magnetic flux density analyses.

### 3.4 Tactical Grid / Polar Display
Radar-style circular grid with concentric range rings and bearing lines. Shows relative positions of ships, objects, and threats as colored blips. Used on tactical and Ops stations.

### 3.5 Shield Status Display
Ship silhouette surrounded by four shield arc segments, one per quadrant. Each shows strength percentage. Colors shift as shields weaken (blue → yellow → red). The deflector shield status readout updates with red and blue alert display functions.

### 3.6 Stellar Cartography / Star Map
Grid-overlaid star field showing stellar positions, navigation routes, and sector boundaries. Zoomable and interactive. Click on the grid to zoom and see objects in space.

### 3.7 Warp Core / Power Systems Monitor
Schematic of the warp core intermix chamber with plasma conduits to the nacelles. Animated glow segments show power flow status. If you eject the warp core, the MSD updates to show the core is not present and nacelles show a powered down state.

### 3.8 Medical Scan / Biosigns Readout
Sickbay bio-monitor display. Heart rate traces, respiration, neural activity. Multiple overlaid waveforms with vital readouts. LCARS was used to display recently recorded data like medical scans.

### 3.9 Sensor Sweep Arc
Semi-circular sweep display with a rotating scan line and degree markings. Objects appear as highlighted blips at their bearing and range.

### 3.10 Personnel / Database Record
Crew manifest record with portrait, rank, assignment, and biography. Customizable fields. Also used for alien species data files, artifact records, and medical reports.

### Additional Complex Elements
- Alert condition overlays (full-screen color shift)
- Transporter patterns
- Holodeck grid displays
- Tractor beam indicators
- Microscope feeds
- Comm channel matrices

---

## 4. The Glass Effect & Physical Construction

The translucent, glowing-from-within look of LCARS panels has a specific physical explanation:

**Original construction:**
- Okudagrams were made by underlying designs cut out of **black film (Kodalith)**
- Colored with **stage light filters or "gels"**
- Covered with **smoked plexiglass** (dark-tinted acrylic)
- **Backlit** from behind

When the backlight is off, it appears as a blank black panel. Turn on the light and the magic happens.

**Polarizing film** was used on the back of some panels to interact with on-set lightboxes, creating the effect of movement without any actual computer graphics.

**To recreate digitally:** Aim for **backlit translucency** — colors that look like they're glowing through tinted glass, rather than sitting on top of a surface.

---

## 5. Color Palette

### Classic TNG/DS9/VOY Palette
The "Classic Theme" prevalent across all three shows:

| Color Name | Use |
|---|---|
| Atomic Tangerine / Orange | Primary frame elements |
| Pale Canary / Yellow-cream | Secondary bars, accents |
| Lavender Purple | Buttons, section dividers |
| Periwinkle / Blue-violet | Side panel elements |
| Peach / Salmon | Tertiary accents |

### System 47 CSS Variable Palette

```css
--blackDarkest: #000000;
--grayDarker:   #1E2229;
--grayDark:     #2F3749;
--gray:         #52596E;
--grayLight:    #6D748C;
--grayLighter:  #9EA5BA;
--grayLightest: #DFE1E8;
--orangeDarker: #EF1D10;
--orangeDark:   #E7442A;
--orange:       #FF6753;
--orangeLight:  #FF977B;
--cyanDarker:   #002241;
--cyanDark:     #1C3C55;
--cyan:         #2A7193;
--cyanLight:    #37A6D1;
--cyanLighter:  #67CAF0;
```

### Alert Mode Color Shifts
- **Normal operations:** Full palette (tans, purples, yellows, blues, aquas, oranges)
- **Red Alert:** Shifts to red/white scheme
- **Blue Alert:** Shifts to blue/white scheme

### Spark/Particle Colors (System 47)
```javascript
const sparkColors = ["#D6EEFF", "#B2DFFF", "#7EC9FF", "#9A69A4"];
```

---

## 6. Typography

- **Font:** Condensed sans-serif. The show reportedly used **Swiss 911 Ultra Compressed**. Modern implementations use **Antonio** (Google Fonts) or **Tungsten**.
- **Case:** ALL UPPERCASE everywhere (though this reduces readability)
- **Alignment:** Text is typically **right-aligned** in bars and headers
- **Button labels:** Short, all-caps, condensed, often 5-letter codes in a two-letter-space-three-letter configuration

### System 47 Fonts
- Primary: **Antonio** (weights 100–700)
- Additional: **Microgramma**, **Jeffries** (bundled locally)

---

## 7. Audio Grammar

LCARS has a clear "grammar" for audio signals. Each sound maps to a semantic meaning:

### Sound Effect Map (from System 47 source)

| Sound Name | Semantic Meaning |
|---|---|
| `shortRandomBeep` / `shortBeep` | Tactile input acknowledged — basic button press |
| `beepX1Up` / `beepX1Upper` | Single beep, pitch shifted UP |
| `beepX1Down` / `beepX1Downer` | Single beep, pitch shifted DOWN |
| `beepX2Up` / `beepX2Upper` | Double beep UP |
| `beepX2Down` / `beepX2Downer` | Double beep DOWN |
| `beepX3Up` / `beepX3Upper` | Triple beep UP |
| `beepX3Down` / `beepX3Downer` | Triple beep DOWN |
| `negative` | Access denied / failure |
| `affirmative` | Confirmation |
| `awaiting` | Waiting for input |
| `deployed` | System activated |
| `executing` | Task running |
| `processing` | Heavy computation |
| `warningLow` | Soft alert |
| `warningHigh` | Loud alert |
| `warningLong` | Sustained warning |
| `notification` | Info ping |
| `exitTask` | Task complete / closing |
| `longTask` / `longTaskLow` | Extended operation |
| `powerUp` / `powerDown` | System boot / shutdown |

### Audio Implementation Pattern
All sounds use the **Web Audio API** with:
- `AudioContext.createBufferSource()` for playback
- Slight random pitch variation on each play (`playbackRate = randomRange * baseRate`)
- Gain node chain: source → per-sound gain → SFX master gain → master gain → destination
- Sound clips loaded as ArrayBuffers and decoded via `decodeAudioData()`

---

## 8. Common Animations (10 Patterns)

### 8.1 Data Cascade (Scrolling Numbers)
Animated text scrolling continuously in the header area. Random alphanumeric codes in columns, each scrolling at different speeds. Creates the "live data" feel.

**CSS:**
```css
@keyframes cascade-scroll {
  0%   { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}
.cascade-column {
  animation: cascade-scroll 2.8s linear infinite;
}
```

### 8.2 Button Pulse / Blink / Fade
Three distinct button states:
- **Pulse** = active/processing (opacity oscillates)
- **Blink** = alert/critical (hard on/off step animation)
- **Fade** = standby cycle (color + opacity shift)

**CSS:**
```css
@keyframes btn-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
@keyframes btn-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

### 8.3 Polarized Fade / Color Sweep
Gradient sweep across bars mimicking the backlit gel shimmer from the physical props. Background gradient animates position.

**CSS:**
```css
.polarized-bar {
  background: linear-gradient(90deg, #CC6633, #FFCC99, #CC6633);
  background-size: 200% 100%;
  animation: polarized-sweep 3s ease-in-out infinite;
}
@keyframes polarized-sweep {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

### 8.4 Sensor Sweep (Radar Rotation)
Rotating scan line with fading contact blips. Uses CSS `::before` pseudo-element with `transform-origin: bottom center`.

**CSS:**
```css
.sensor-sweep::before {
  width: 1px; height: 50%;
  background: #33CCFF;
  transform-origin: bottom center;
  animation: sweep-rotate 3s linear infinite;
  box-shadow: 0 0 8px #33CCFF;
}
@keyframes sweep-rotate {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

### 8.5 Gauge / Level Meter Animation
Vertical bars bouncing at different rates and phases. Each bar has its own animation duration and delay.

**CSS:**
```css
@keyframes gauge-bounce {
  0%, 100% { height: 30%; }
  25% { height: 85%; }
  50% { height: 50%; }
  75% { height: 95%; }
}
```

### 8.6 Warp Core Pulse
Plasma energy pulse traveling down the intermix chamber. A glowing element animates from top to bottom with opacity fade.

**CSS:**
```css
@keyframes warp-travel {
  0%   { top: -20px; opacity: 0; }
  20%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { top: 120px; opacity: 0; }
}
@keyframes warp-breathe {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}
```

### 8.7 Shield Arc Flicker
Four independent shield quadrant arcs flickering at different rates and phases. Each arc has its own animation duration and delay.

**CSS:**
```css
@keyframes shield-flicker {
  0%, 100% { opacity: 0.9; }
  25% { opacity: 0.5; }
  50% { opacity: 1; }
  75% { opacity: 0.3; }
}
```

### 8.8 Red Alert Flash
Pulsing emergency state. Background oscillates between bright red and dark red. Box-shadow glows and dims.

**CSS:**
```css
@keyframes red-alert-flash {
  0%, 100% { background: #CC0000; box-shadow: 0 0 20px rgba(255,0,0,0.5); }
  50% { background: #660000; box-shadow: 0 0 5px rgba(255,0,0,0.1); }
}
```

### 8.9 Elbow Color Cycle
Elbows transition through palette colors indicating mode changes or processing state.

**CSS:**
```css
@keyframes elbow-color-cycle {
  0%, 100% { fill: #CC6633; }
  33% { fill: #FFCC99; }
  66% { fill: #9999CC; }
}
```

### 8.10 Transporter Shimmer
Rising sparkle particles spawned via JavaScript DOM manipulation. Each particle has random position, size, color, duration, and self-removes on animation end.

**JavaScript pattern (from System 47):**
```javascript
function spawnParticle(container) {
  const p = document.createElement('div');
  p.className = 'shimmer-particle';
  p.style.left = Math.random() * 34 + 3 + 'px';
  p.style.animationDuration = (1 + Math.random() * 2) + 's';
  const colors = ['#99CCFF','#FFCC99','#FFFFFF','#CC99CC'];
  p.style.background = colors[Math.floor(Math.random()*colors.length)];
  container.appendChild(p);
  setTimeout(() => p.remove(), 3000);
}
setInterval(() => spawnParticle(container), 150);
```

---

## 9. System 47 Source Analysis

System 47 is the canonical LCARS screensaver/web app by MeWho (mewho.com). The YouTube video linked was from the `@system47` channel. The minified source code reveals the following architecture:

### 9.1 TaskTimeline Class (Animation Sequencer)

The core animation engine. A chainable delay-based task timeline that sequences all UI transitions:

```javascript
class TaskTimeline {
  constructor(name = '') {
    this.name = name;
    this.tasks = [];
    this.running = false;
    this.timerId = null;
  }

  delay(ms, task) {
    this.tasks.push({ delay: ms, task });
    if (!this.running) {
      this.running = true;
      this._next();
    }
    return this; // chainable!
  }

  _next() {
    const t = this.tasks.shift();
    this.timerId = setTimeout(() => {
      t.task();
      if (this.tasks.length > 0) this._next();
      else this.running = false;
    }, t.delay);
  }

  abort() {
    clearTimeout(this.timerId);
    this.tasks = [];
    this.running = false;
  }

  onAbort(callback) {
    this.abortTask = callback;
  }
}
```

**Usage pattern:**
```javascript
timeline
  .delay(100, () => { /* slide frame in */ })
  .delay(700, () => { /* play sound, show header */ })
  .delay(800, () => { /* blink, change color */ })
  .delay(400, () => { /* expand clip path */ })
  // ...20+ chained steps
```

### 9.2 Blink System

Three CSS blink classes, randomly selected, added then removed after 700ms:

```javascript
function blinkNode(el, style = 'random') {
  const styles = ['blink1', 'blink2', 'blink3'];
  if (style === 'random') style = styles[Math.floor(Math.random() * 3)];
  el.classList.remove(...styles);
  setTimeout(() => {
    el.classList.add(style);
    setTimeout(() => el.classList.remove(...styles), 700);
  }, 50);
}
```

### 9.3 Intro Boot-Up Sequence

The exact order things appear when System 47 loads:

1. Slide main frame in from right (`translateX(1300px)` → `0`)
2. Play `"processing"` sound, show header clock
3. Blink frame, play `"powerUp"`, change fill to `var(--orangeDark)`
4. Expand clip-path (content reveals via `y` and `height` transition)
5. Fade in UI blocks to `opacity: 1`
6. Slide sect2 clip path up (1200ms ease-in)
7. Start countdown timer
8. Slide sect3 in from left (1.2s ease-out)
9. Slide sect1 in (1s ease-out, starts at 0.4 opacity)
10. Start circular scan interval (1200ms cycle)
11. Show sect4, blink emblem
12. Expand sect4 clip path (2s ease-in-out)
13. Open windows one by one with staggered delays
14. Final: `STATUS: READY`, start episode rotation

### 9.4 Window Open/Close Pattern

```
OPEN:  scale(1,0) → scale(1,0.706) → scale(1,1)  (staggered 600ms steps)
CLOSE: scale(1,1) → scale(1,0)                     (600ms)
Content fades: opacity 0→1 with 250ms delay after window opens
```

### 9.5 Circular Scan Modes

```
PASSIVE: speed factor 0.4–1.0, random number updates <50% chance per cycle
ACTIVE:  speed factor 2.5–5.5, updates every cycle, double-speed offset changes
```

### 9.6 Technobabble Text Rotation

```javascript
// Pick random string + append random number
text = randomPick(technobabble).toUpperCase() + " • " + randomDigits(3-5);
// Flash "newStyle" dataset for 600ms
// Auto-reload after random 4000–10000ms
```

### 9.7 Spark/Particle Spawning Pattern

```
Spawn 1–4 particles every 900–5000ms
Each particle:
  - Random rotation: -45° to 30°
  - Random scale: 0.5–1.5
  - Random duration: 300–1300ms
  - 40% chance of "ease-in" timing
  - Color picked from: ["#D6EEFF", "#B2DFFF", "#7EC9FF", "#9A69A4"]
  - Self-removes on animationend
```

### 9.8 Technobabble String Banks

**Engineering/Warp Systems:**
```
WARP FACTOR, POWER TRANSFER LEVEL, WARP FIELD ESTABLISHED,
MAGNETIC FIELD STRENGTH, MAGNETIC FIELD GENERATOR,
MAGNETIC CONSTRICTION SEGMENT, ELECTROMAGNETIC FIELD,
MICROCOCHRANES MARGIN, SHIELD STRENGTH LEVEL,
OPTICAL DATA NETWORK, REACTION RATIO,
DILITHIUM RECRYSTALLIZATION, DILITHIUM CRYSTAL ARTICULATION,
PRIMARY DEUTERIUM TANKAGE, DEUTERIUM SUPPLY,
CONTINUUM DISTORTION FIELD, FUSION REACTION RATE,
PLANCK TIME REACTION, POWER TRANSPORT CONDUIT,
EPS DISTRIBUTION, PLASMA INJECTOR OFFLINE,
PLASMA STREAM WARNING, PLASMA CONTAINMENT,
ANTIMATTER CONTAINMENT, CONTAINMENT FIELD,
WARP CORE EJECTION SYSTEM, ANTIMATTER GENERATOR,
ANTIMATTER STORAGE POD, ANTIMATTER REACANT INJECTOR,
MATTER REACANT INJECTOR, CONVERSION FACTOR,
REACTION CHAMBER, BUSSARD RAMSCOOP,
SUBSPACE FIELD GEOMETRY, SUBSPACE FIELD FOLDS,
MATTER/ANTIMATER REACTION, QUANTUM CHARGE REVERSAL,
IMPULSE PROPULSION SYSTEM, WARP ENGINE EFFICIENCY,
WPS BREACH LEVEL, ELECTRO-PLASMA SYSTEM,
STARBOARD NACELLE, PORT NACELLE ONLINE,
WARP FIELD COILS, WARP CORE EJECTION,
WARP CORE C/F, DILITHIUM DEGRADATION,
STRUCTURAL INTEGRITY FIELD, RECRYSTALLIZATION REFINEMENT,
REACTION CHAMBER, WARP DRIVE ONLINE, ENERGY FLUX
```

**General Trek Technobabble:**
```
Heisenberg compensator, turboelevator system, universal translator,
the picard maneuver, Battle of Wolf 359, saucer separation,
Zefram Cochrane, hypospray 10cc, galaxy class starship,
holodeck 3 program is ready, holodeck safety protocol is offline,
warp ejection system is offline, transporter pattern buffer,
isolinear optical chips, library computer access & Retrieval System,
food replicator, professor moriarty, saucer module crash landing,
positronic brain, STRUCTURE INTEGRITY FIELD, full deflector shield,
shield modulation frequency, static warp shell, static warp bubble,
borg nanoprobe, farpoint station, quantum fissure,
subspace differential pulse, M-class Dyson Sphere,
Gravimetric interference, Molecular phase inverter, Triolic waves,
Phase discriminator amplifier, Temporal distortion,
subspace force field, Synchronic distortion, pattern enhancers,
holographic simulation, Argus Array Subspace Telescope,
Utopia Planitia Fleet Yards, space-time continuum,
inverse warp field, quantum incursion, Daystrom Institute,
tomographic imaging scanner, temporal causality loop,
antimatter containment field
```

### 9.9 Transform Origin Utility

System 47 uses a CSS variable pair trick for SVG transform-origin (since SVG transform-origin behaves differently than HTML):

```javascript
function setTransformOrigin(element, position, referenceNode) {
  const bbox = (referenceNode || element).getBBox();
  let tx, ty;
  // Calculate based on position string: "center", "left top", etc.
  // ...
  element.style.setProperty('--translatePlus',
    `translate(${tx}px, ${ty}px)`);
  element.style.setProperty('--translateMinus',
    `translate(${-tx}px, ${-ty}px)`);
}
```

Then used in CSS transforms as:
```css
transform: var(--translatePlus) scale(1,0) var(--translateMinus);
```

This is the **translate-scale-untranslate** pattern for scaling from an arbitrary origin point in SVG.

---

## 10. Working Code: Animations Reference Sheet

Complete standalone HTML file with all 10 common LCARS animation patterns, using the Antonio font and authentic LCARS colors. Pure HTML/CSS/JS, no libraries.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LCARS Common Animations Reference</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Antonio:wght@100..700&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: #000;
  color: #FF9900;
  font-family: 'Antonio', sans-serif;
  font-weight: 400;
  text-transform: uppercase;
  padding: 20px;
}

h2 {
  font-size: 14px;
  color: #99CCFF;
  letter-spacing: 2px;
  margin-bottom: 10px;
  font-weight: 300;
}

.section {
  margin-bottom: 40px;
  border-left: 4px solid #CC6633;
  padding-left: 16px;
}

.label {
  font-size: 11px;
  color: #888;
  margin-top: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* 1. DATA CASCADE */
.data-cascade {
  background: #111;
  height: 80px;
  overflow: hidden;
  position: relative;
  border-radius: 4px;
  max-width: 500px;
}
.cascade-column {
  position: absolute;
  top: 0;
  animation: cascade-scroll 3s linear infinite;
  font-family: 'Antonio', monospace;
  font-size: 14px;
  font-weight: 300;
  line-height: 1.6;
  white-space: nowrap;
}
.cascade-column:nth-child(1) { left: 10px; color: #CC6633; animation-duration: 2.8s; }
.cascade-column:nth-child(2) { left: 160px; color: #FFCC99; animation-duration: 3.4s; animation-delay: -0.5s; }
.cascade-column:nth-child(3) { left: 310px; color: #9999CC; animation-duration: 2.2s; animation-delay: -1.2s; }

@keyframes cascade-scroll {
  0%   { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}

/* 2. BUTTON ANIMATIONS */
.button-row { display: flex; gap: 8px; flex-wrap: wrap; }

.lcars-btn {
  padding: 6px 20px;
  border-radius: 14px;
  border: none;
  font-family: 'Antonio', sans-serif;
  font-size: 15px;
  text-transform: uppercase;
  cursor: pointer;
  letter-spacing: 1px;
  color: #000;
  font-weight: 500;
}
.btn-solid { background: #CC6633; }
.btn-pulse { background: #CC6633; animation: btn-pulse 2s ease-in-out infinite; }
.btn-blink { background: #FF3333; animation: btn-blink 1s step-end infinite; }
.btn-fade  { background: #9999CC; animation: btn-fade 2.5s ease-in-out infinite; }

@keyframes btn-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
@keyframes btn-blink { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes btn-fade  { 0%,100%{opacity:1;background:#9999CC} 50%{opacity:0.6;background:#6666AA} }

/* 3. POLARIZED FADE */
.polarized-bar {
  height: 16px; border-radius: 8px; max-width: 400px;
  background: linear-gradient(90deg, #CC6633, #FFCC99, #CC6633);
  background-size: 200% 100%;
  animation: polarized-sweep 3s ease-in-out infinite;
}
.polarized-bar-2 {
  height: 16px; border-radius: 8px; max-width: 400px; margin-top: 6px;
  background: linear-gradient(90deg, #9999CC, #CC99CC, #9999CC);
  background-size: 200% 100%;
  animation: polarized-sweep 4s ease-in-out infinite;
  animation-delay: -1s;
}
@keyframes polarized-sweep {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* 4. SENSOR SWEEP */
.sensor-sweep-container {
  width: 160px; height: 160px;
  position: relative; border-radius: 50%;
  border: 1.5px solid #CC6633; overflow: hidden;
}
.sensor-sweep-container::before {
  content: '';
  position: absolute; top: 50%; left: 50%;
  width: 1px; height: 50%;
  background: #33CCFF;
  transform-origin: bottom center;
  animation: sweep-rotate 3s linear infinite;
  box-shadow: 0 0 8px #33CCFF, -4px 0 15px rgba(51,204,255,0.3);
}
.sweep-ring-2 {
  position: absolute; top: 50%; left: 50%;
  width: 40px; height: 40px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 0.5px solid rgba(204,102,51,0.2);
}
.sweep-crosshair-h {
  position: absolute; top: 50%; left: 0;
  width: 100%; height: 1px;
  background: rgba(204,102,51,0.15);
}
.sweep-crosshair-v {
  position: absolute; top: 0; left: 50%;
  width: 1px; height: 100%;
  background: rgba(204,102,51,0.15);
}
.sweep-blip {
  position: absolute; width: 6px; height: 6px;
  border-radius: 50%; background: #FF3333;
  animation: blip-fade 3s ease-out infinite;
}
.blip-1 { top: 30%; left: 60%; animation-delay: -0.5s; }
.blip-2 { top: 65%; left: 35%; animation-delay: -1.8s; }

@keyframes sweep-rotate { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
@keyframes blip-fade { 0%,30%{opacity:0} 35%{opacity:1} 100%{opacity:0.2} }

/* 5. GAUGE ANIMATION */
.gauge-container { display: flex; gap: 8px; align-items: flex-end; height: 80px; }
.gauge-bar { width: 24px; border-radius: 4px; background: #333; position: relative; overflow: hidden; height: 100%; }
.gauge-fill { position: absolute; bottom: 0; left: 0; right: 0; border-radius: 4px; animation: gauge-bounce 3s ease-in-out infinite; }
.g1 .gauge-fill { background: #CC6633; animation-duration: 2.5s; }
.g2 .gauge-fill { background: #FFCC99; animation-duration: 3.2s; animation-delay: -0.4s; }
.g3 .gauge-fill { background: #9999CC; animation-duration: 2.8s; animation-delay: -0.8s; }
.g4 .gauge-fill { background: #CC99CC; animation-duration: 3.5s; animation-delay: -1.2s; }
.g5 .gauge-fill { background: #FF9966; animation-duration: 2.2s; animation-delay: -0.2s; }
.g6 .gauge-fill { background: #CC6633; animation-duration: 3.8s; animation-delay: -1.5s; }

@keyframes gauge-bounce { 0%,100%{height:30%} 25%{height:85%} 50%{height:50%} 75%{height:95%} }

/* 6. WARP CORE PULSE */
.warp-core { width: 30px; height: 120px; background: #112; border-radius: 6px; position: relative; overflow: hidden; border: 1px solid #334; }
.warp-pulse { position: absolute; left: 0; right: 0; height: 20px; background: radial-gradient(ellipse, rgba(51,204,255,0.8) 0%, transparent 70%); animation: warp-travel 1.5s ease-in-out infinite; }
.warp-glow { position: absolute; left: 0; right: 0; top: 0; bottom: 0; background: linear-gradient(180deg, rgba(51,204,255,0.05) 0%, rgba(51,204,255,0.15) 50%, rgba(51,204,255,0.05) 100%); animation: warp-breathe 1.5s ease-in-out infinite; }

@keyframes warp-travel { 0%{top:-20px;opacity:0} 20%{opacity:1} 80%{opacity:1} 100%{top:120px;opacity:0} }
@keyframes warp-breathe { 0%,100%{opacity:0.3} 50%{opacity:0.8} }

/* 7. SHIELD ARC FLICKER */
.shield-demo { width: 160px; height: 120px; position: relative; }
.shield-demo svg { width: 100%; height: 100%; }
.shield-arc { fill: none; stroke-width: 3; stroke-linecap: round; }
.arc-fwd  { stroke: #33CCFF; animation: shield-flicker 4s ease-in-out infinite; }
.arc-aft  { stroke: #33CCFF; animation: shield-flicker 4s ease-in-out infinite 1s; }
.arc-port { stroke: #FFCC00; animation: shield-flicker 3s ease-in-out infinite 0.5s; }
.arc-star { stroke: #33CCFF; animation: shield-flicker 3.5s ease-in-out infinite 1.5s; }

@keyframes shield-flicker { 0%,100%{opacity:0.9} 25%{opacity:0.5} 50%{opacity:1} 75%{opacity:0.3} }

/* 8. RED ALERT */
.red-alert-bar {
  max-width: 500px; padding: 10px 20px; border-radius: 10px;
  background: #CC0000; color: #fff; font-size: 20px;
  text-align: center; letter-spacing: 6px;
  animation: red-alert-flash 1.2s ease-in-out infinite;
}
@keyframes red-alert-flash {
  0%,100% { background: #CC0000; box-shadow: 0 0 20px rgba(255,0,0,0.5); }
  50% { background: #660000; box-shadow: 0 0 5px rgba(255,0,0,0.1); }
}

/* 9. ELBOW COLOR CYCLE */
.elbow-anim { width: 200px; height: 80px; }
.elbow-anim svg { width: 100%; height: 100%; }
.elbow-path { animation: elbow-color-cycle 6s ease-in-out infinite; }
@keyframes elbow-color-cycle { 0%,100%{fill:#CC6633} 33%{fill:#FFCC99} 66%{fill:#9999CC} }

/* 10. TRANSPORTER SHIMMER */
.transporter-column { width: 40px; height: 100px; position: relative; overflow: hidden; border-radius: 4px; }
.shimmer-particle {
  position: absolute; width: 3px; height: 3px;
  background: #99CCFF; border-radius: 50%;
  animation: shimmer-float 2s ease-in-out infinite; opacity: 0;
}
@keyframes shimmer-float {
  0%   { transform: translateY(100px) scale(0); opacity: 0; }
  30%  { opacity: 1; transform: scale(1); }
  70%  { opacity: 0.8; }
  100% { transform: translateY(-10px) scale(0.3); opacity: 0; }
}

.flex-row { display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
</style>
</head>
<body>

<div class="section">
  <h2>1. Data Cascade (scrolling numbers)</h2>
  <div class="data-cascade" id="cascade"></div>
  <p class="label">Animated text scrolling in header areas</p>
</div>

<div class="section">
  <h2>2. Button animations</h2>
  <div class="button-row">
    <button class="lcars-btn btn-solid">Static</button>
    <button class="lcars-btn btn-pulse">Pulse</button>
    <button class="lcars-btn btn-blink">Blink</button>
    <button class="lcars-btn btn-fade">Fade</button>
  </div>
  <p class="label">Pulse = active · Blink = alert · Fade = standby</p>
</div>

<div class="section">
  <h2>3. Polarized fade / color sweep</h2>
  <div class="polarized-bar"></div>
  <div class="polarized-bar-2"></div>
  <p class="label">Gradient sweep — the backlit gel shimmer</p>
</div>

<div class="section">
  <h2>4. Sensor sweep (radar rotation)</h2>
  <div class="sensor-sweep-container">
    <div class="sweep-crosshair-h"></div>
    <div class="sweep-crosshair-v"></div>
    <div class="sweep-ring-2"></div>
    <div class="sweep-blip blip-1"></div>
    <div class="sweep-blip blip-2"></div>
  </div>
  <p class="label">Rotating scan line with fading blips</p>
</div>

<div class="section">
  <h2>5. Gauge / level meter animation</h2>
  <div class="gauge-container">
    <div class="gauge-bar g1"><div class="gauge-fill"></div></div>
    <div class="gauge-bar g2"><div class="gauge-fill"></div></div>
    <div class="gauge-bar g3"><div class="gauge-fill"></div></div>
    <div class="gauge-bar g4"><div class="gauge-fill"></div></div>
    <div class="gauge-bar g5"><div class="gauge-fill"></div></div>
    <div class="gauge-bar g6"><div class="gauge-fill"></div></div>
  </div>
  <p class="label">Vertical level bars bouncing — power distribution</p>
</div>

<div class="section">
  <h2>6. Warp core pulse &amp; 7. Shield arc flicker</h2>
  <div class="flex-row">
    <div>
      <div class="warp-core">
        <div class="warp-glow"></div>
        <div class="warp-pulse"></div>
      </div>
      <p class="label" style="max-width:100px">Plasma pulse</p>
    </div>
    <div>
      <div class="shield-demo">
        <svg viewBox="0 0 160 120">
          <polygon points="80,35 65,85 95,85" fill="none" stroke="#9999CC" stroke-width="1"/>
          <path class="shield-arc arc-fwd" d="M50,30 A50,40 0 0,1 110,30"/>
          <path class="shield-arc arc-aft" d="M55,92 A50,40 0 0,0 105,92"/>
          <path class="shield-arc arc-port" d="M48,35 A10,30 0 0,0 52,88"/>
          <path class="shield-arc arc-star" d="M112,35 A10,30 0 0,1 108,88"/>
          <text x="80" y="24" text-anchor="middle" font-family="Antonio" font-size="9" fill="#33CCFF">FWD 92%</text>
          <text x="80" y="104" text-anchor="middle" font-family="Antonio" font-size="9" fill="#33CCFF">AFT 88%</text>
          <text x="28" y="62" text-anchor="middle" font-family="Antonio" font-size="8" fill="#FFCC00">41%</text>
          <text x="132" y="62" text-anchor="middle" font-family="Antonio" font-size="9" fill="#33CCFF">87%</text>
        </svg>
      </div>
      <p class="label" style="max-width:160px">Shield arcs flicker per quadrant</p>
    </div>
  </div>
</div>

<div class="section">
  <h2>8. Red alert flash</h2>
  <div class="red-alert-bar">Red Alert</div>
  <p class="label">Full-screen flash overlay during emergency</p>
</div>

<div class="section">
  <h2>9. Elbow color cycle</h2>
  <div class="elbow-anim">
    <svg viewBox="0 0 200 80">
      <path class="elbow-path" d="M0,0 L0,50 Q0,70 20,70 L200,70 L200,60 Q10,60 10,50 L10,0 Z"/>
    </svg>
  </div>
  <p class="label">Elbows cycle through palette colors</p>
</div>

<div class="section">
  <h2>10. Transporter shimmer</h2>
  <div class="flex-row">
    <div class="transporter-column" id="tp1"></div>
    <div class="transporter-column" id="tp2"></div>
    <div class="transporter-column" id="tp3"></div>
  </div>
  <p class="label">Rising sparkle particles</p>
</div>

<script>
// DATA CASCADE
function generateCascadeColumn() {
  let lines = '';
  for (let i = 0; i < 20; i++) {
    const num = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
    const alpha = ['ALPHA','BETA','GAMMA','DELTA','THETA','OMEGA','SIGMA'][Math.floor(Math.random()*7)];
    const suffix = String(Math.floor(Math.random() * 999)).padStart(3, '0');
    lines += `${num} ${alpha} ${suffix}\n`;
  }
  return lines + lines;
}
const cascade = document.getElementById('cascade');
for (let i = 0; i < 3; i++) {
  const col = document.createElement('div');
  col.className = 'cascade-column';
  col.style.whiteSpace = 'pre';
  col.textContent = generateCascadeColumn();
  cascade.appendChild(col);
}

// TRANSPORTER SHIMMER
function spawnParticles(containerId) {
  const container = document.getElementById(containerId);
  setInterval(() => {
    const p = document.createElement('div');
    p.className = 'shimmer-particle';
    p.style.left = Math.random() * 34 + 3 + 'px';
    p.style.animationDuration = (1 + Math.random() * 2) + 's';
    p.style.animationDelay = Math.random() * 0.5 + 's';
    p.style.width = p.style.height = (2 + Math.random() * 3) + 'px';
    const colors = ['#99CCFF','#FFCC99','#FFFFFF','#CC99CC'];
    p.style.background = colors[Math.floor(Math.random()*colors.length)];
    container.appendChild(p);
    setTimeout(() => p.remove(), 3000);
  }, 150);
}
spawnParticles('tp1');
spawnParticles('tp2');
spawnParticles('tp3');
</script>
</body>
</html>
```

---

## 11. Working Code: Elbow + Bars Deploy Sequence

Complete standalone HTML file demonstrating the System 47 `TaskTimeline` pattern. Press "Deploy" → elbow sweeps across → 3 bars appear below with staggered timing.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LCARS Elbow + Bars Demo</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Antonio:wght@100..700&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --black: #000000;
  --grayDarker: #1E2229;
  --grayDark: #2F3749;
  --gray: #52596E;
  --grayLight: #6D748C;
  --orangeDark: #E7442A;
  --orange: #FF6753;
  --orangeLight: #FF977B;
  --cyanDark: #1C3C55;
  --cyan: #2A7193;
  --cyanLight: #37A6D1;
  --cyanLighter: #67CAF0;
}

html, body {
  width: 100%; height: 100%;
  background: var(--black);
  overflow: hidden;
  font-family: 'Antonio', sans-serif;
  text-transform: uppercase;
  color: var(--orangeLight);
  user-select: none;
}

#btnDeploy {
  position: fixed; bottom: 40px; left: 40px;
  width: 160px; height: 48px;
  background: var(--orange); border-radius: 24px; border: none;
  font-family: 'Antonio', sans-serif; font-size: 18px; font-weight: 400;
  text-transform: uppercase; letter-spacing: 2px; color: #000;
  cursor: pointer; transition: opacity 0.15s; z-index: 10;
}
#btnDeploy:active { opacity: 0.6; }
#btnDeploy[data-disabled] { pointer-events: none; opacity: 0.3; }

#elbowGroup {
  position: fixed; top: 50%; left: 0;
  transform: translateY(-50%);
  width: 100%; height: 200px;
  pointer-events: none; z-index: 5;
}

#elbowSvg {
  position: absolute; left: -600px;
  width: 100vw; height: 200px;
  opacity: 0; transition: left 0s, opacity 0s;
}
#elbowSvg[data-phase="flash"] {
  left: 0px; opacity: 1;
  transition: left 0.7s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.15s;
}
#elbowSvg[data-phase="settle"] { left: 0px; opacity: 1; transition: none; }
#elbowSvg[data-phase="dim"]    { left: 0px; opacity: 0.6; transition: opacity 0.8s ease; }

.blink1 { animation: blinkAni1 0.3s steps(2) 2; }
.blink2 { animation: blinkAni2 0.25s steps(2) 3; }
.blink3 { animation: blinkAni3 0.15s steps(2) 4; }
@keyframes blinkAni1 { 0%,100%{opacity:1} 50%{opacity:0.15} }
@keyframes blinkAni2 { 0%,100%{opacity:1} 50%{opacity:0.05} }
@keyframes blinkAni3 { 0%,100%{opacity:1} 50%{opacity:0} }

#barsGroup {
  position: fixed; top: calc(50% + 60px); left: 72px;
  display: flex; flex-direction: column; gap: 6px;
  z-index: 5; pointer-events: none;
}

.lcars-bar {
  height: 18px; border-radius: 9px;
  opacity: 0; transform: scaleX(0); transform-origin: left center;
  position: relative;
}
.lcars-bar[data-show] { opacity: 1; transform: scaleX(1); }

.bar-0 { width: min(70vw, 800px); background: var(--orangeLight);
  transition: transform 0.5s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.2s; }
.bar-1 { width: min(55vw, 620px); background: var(--orange);
  transition: transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1) 0.1s, opacity 0.2s 0.1s; }
.bar-2 { width: min(40vw, 450px); background: var(--orangeDark);
  transition: transform 0.7s cubic-bezier(0.22, 0.61, 0.36, 1) 0.2s, opacity 0.2s 0.2s; }

.bar-label {
  position: absolute; right: 12px; top: 50%;
  transform: translateY(-50%);
  font-size: 12px; font-weight: 300; color: #000;
  letter-spacing: 1px; white-space: nowrap;
  opacity: 0; transition: opacity 0.4s ease 0.3s;
}
.lcars-bar[data-show] .bar-label { opacity: 1; }

#statusText {
  position: fixed; bottom: 48px; left: 220px;
  font-size: 14px; font-weight: 300; letter-spacing: 2px;
  color: var(--cyanLight); opacity: 0; transition: opacity 0.3s;
}
#statusText[data-show] { opacity: 1; }

#btnReset {
  position: fixed; bottom: 40px; left: 400px;
  width: 100px; height: 48px;
  background: var(--grayDark); border-radius: 24px; border: none;
  font-family: 'Antonio', sans-serif; font-size: 15px; font-weight: 400;
  text-transform: uppercase; letter-spacing: 1px; color: var(--grayLight);
  cursor: pointer; opacity: 0; pointer-events: none;
  transition: opacity 0.4s; z-index: 10;
}
#btnReset[data-show] { opacity: 1; pointer-events: auto; }
#btnReset:active { opacity: 0.5; }
</style>
</head>
<body>

<button id="btnDeploy">Deploy</button>
<div id="statusText"></div>
<button id="btnReset">Reset</button>

<div id="elbowGroup">
  <svg id="elbowSvg" viewBox="0 0 1600 200" preserveAspectRatio="xMinYMid meet">
    <path id="elbowPath" d="
      M0,0 L0,70 Q0,100 30,100 L1600,100
      L1600,88 L38,88 Q12,88 12,62 L12,0 Z
    " fill="var(--orange)"/>
    <rect x="1580" y="88" width="12" height="12" rx="6" fill="var(--orange)"/>
    <rect x="3" y="0" width="4" height="65" rx="2" fill="var(--orangeDark)" opacity="0.5"/>
  </svg>
</div>

<div id="barsGroup">
  <div class="lcars-bar bar-0"><span class="bar-label"></span></div>
  <div class="lcars-bar bar-1"><span class="bar-label"></span></div>
  <div class="lcars-bar bar-2"><span class="bar-label"></span></div>
</div>

<script>
// TaskTimeline — from System 47
class TaskTimeline {
  constructor(name = '') {
    this.name = name;
    this.tasks = [];
    this.running = false;
    this.timerId = null;
  }
  delay(ms, task) {
    this.tasks.push({ delay: ms, task });
    if (!this.running) { this.running = true; this._next(); }
    return this;
  }
  _next() {
    const t = this.tasks.shift();
    this.timerId = setTimeout(() => {
      t.task();
      if (this.tasks.length > 0) this._next();
      else this.running = false;
    }, t.delay);
  }
  abort() {
    clearTimeout(this.timerId);
    this.tasks = [];
    this.running = false;
  }
}

// Web Audio beeps
let audioCtx;
function initAudio() { if (!audioCtx) audioCtx = new AudioContext(); }
function beep(freq = 1200, dur = 0.06, vol = 0.15, delay = 0) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine'; osc.frequency.value = freq;
  gain.gain.value = vol;
  osc.connect(gain); gain.connect(audioCtx.destination);
  const t = audioCtx.currentTime + delay;
  osc.start(t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.stop(t + dur + 0.01);
}

function playSound(name) {
  initAudio();
  const r = () => 0.9 + Math.random() * 0.2;
  switch(name) {
    case 'beepX2Upper':
      beep(1400*r(), 0.06, 0.15); beep(1800*r(), 0.08, 0.12, 0.1); break;
    case 'beepX3Upper':
      beep(1200*r(), 0.05, 0.12); beep(1500*r(), 0.06, 0.1, 0.09);
      beep(1900*r(), 0.08, 0.08, 0.2); break;
    case 'deployed':
      beep(800*r(), 0.12, 0.2); beep(1200*r(), 0.15, 0.15, 0.12); break;
    case 'executing': beep(600*r(), 0.2, 0.12); break;
    case 'beepX1Up': beep(1500*r(), 0.06, 0.1); break;
    case 'beepX2Downer':
      beep(900*r(), 0.06, 0.12); beep(600*r(), 0.08, 0.1, 0.12); break;
    case 'processing': beep(700*r(), 0.25, 0.1); break;
  }
}

// Blink utility
function blinkNode(el, style = 'random') {
  if (!el) return;
  const styles = ['blink1', 'blink2', 'blink3'];
  if (style === 'random') style = styles[Math.floor(Math.random() * 3)];
  el.classList.remove(...styles);
  setTimeout(() => {
    el.classList.add(style);
    setTimeout(() => el.classList.remove(...styles), 700);
  }, 50);
}

// Technobabble
const techStrings = [
  "EPS DISTRIBUTION", "WARP FIELD COILS", "PLASMA CONTAINMENT",
  "DILITHIUM RECRYSTALLIZATION", "SUBSPACE FIELD GEOMETRY",
  "ANTIMATTER CONTAINMENT", "FUSION REACTION RATE",
  "SHIELD STRENGTH LEVEL", "BUSSARD RAMSCOOP",
  "STRUCTURAL INTEGRITY FIELD", "IMPULSE PROPULSION",
  "QUANTUM CHARGE REVERSAL", "OPTICAL DATA NETWORK"
];
function randomTech() {
  return techStrings[Math.floor(Math.random() * techStrings.length)]
    + " • " + Math.floor(Math.random() * 99999);
}

// DOM
const btnDeploy  = document.getElementById('btnDeploy');
const btnReset   = document.getElementById('btnReset');
const elbowSvg   = document.getElementById('elbowSvg');
const elbowPath  = document.getElementById('elbowPath');
const bars       = document.querySelectorAll('.lcars-bar');
const barLabels  = document.querySelectorAll('.bar-label');
const statusText = document.getElementById('statusText');
const timeline   = new TaskTimeline('main');

// DEPLOY SEQUENCE
function deploy() {
  btnDeploy.dataset.disabled = '';
  timeline.abort();
  barLabels.forEach(l => l.textContent = randomTech());

  timeline
    .delay(50, () => {
      statusText.textContent = 'INITIALIZING...';
      statusText.dataset.show = '';
      playSound('deployed');
      elbowSvg.dataset.phase = 'flash';
      blinkNode(elbowSvg, 'blink2');
    })
    .delay(700, () => {
      elbowSvg.dataset.phase = 'settle';
      playSound('beepX2Upper');
      blinkNode(elbowPath, 'blink3');
      statusText.textContent = 'DEPLOYING SYSTEMS...';
    })
    .delay(500, () => {
      elbowSvg.dataset.phase = 'dim';
      playSound('executing');
    })
    .delay(400, () => {
      bars[0].dataset.show = '';
      playSound('beepX1Up');
      blinkNode(bars[0], 'blink1');
    })
    .delay(300, () => {
      bars[1].dataset.show = '';
      playSound('beepX1Up');
      blinkNode(bars[1], 'blink2');
    })
    .delay(300, () => {
      bars[2].dataset.show = '';
      playSound('beepX3Upper');
      blinkNode(bars[2], 'blink3');
      statusText.textContent = 'STATUS: READY';
    })
    .delay(600, () => {
      playSound('processing');
      blinkNode(statusText, 'blink2');
      btnReset.dataset.show = '';
    });
}

// RESET
function reset() {
  timeline.abort();
  playSound('beepX2Downer');
  delete btnReset.dataset.show;
  delete statusText.dataset.show;
  bars.forEach(b => delete b.dataset.show);
  setTimeout(() => {
    delete elbowSvg.dataset.phase;
    elbowSvg.style.transition = 'none';
    elbowSvg.offsetHeight;
    elbowSvg.style.transition = '';
    delete btnDeploy.dataset.disabled;
  }, 500);
}

btnDeploy.addEventListener('pointerdown', deploy);
btnReset.addEventListener('pointerdown', reset);
</script>
</body>
</html>
```

---

## 12. Key Open-Source LCARS Projects

| Project | URL | What It Is |
|---|---|---|
| **System 47** | mewho.com | The definitive LCARS screensaver/web app. Source analyzed in this doc. |
| **LCARS CSS Framework** | joernweissenborn.github.io/lcars | CSS framework (like Bootstrap) for LCARS UIs. Includes SVG special elements. |
| **The LCARS Website Template** | thelcars.com | Pure HTML/CSS LCARS templates by Jim Robertus. Classic, Nemesis Blue, Lower Decks themes. |
| **HA-LCARS** | github.com/th3jesta/ha-lcars | LCARS theme for Home Assistant. 100% CSS/JS, no extra assets. |
| **CB-LCARS** | github.com/snootched/cb-lcars | Home Assistant LCARS card library. Buttons, sliders, elbows, d-pad, animations. |
| **LCARS 47** | lcars47.com | Canon-accurate LCARS desktop app. MSD plugins, ship class support. |
| **Responsive LCARS** | github.com/louh/lcars | Responsive LCARS layout in HTML/CSS/JS. Works on tablets (PADDs). |
| **LCARS SVG for openHAB** | github.com/dome2048/lcars | Template SVG files for openHAB's HABPanel. 2370s-era design aesthetic. |
| **LCARS GFX** | lcarsgfx.wordpress.com | Master Systems Displays (MSDs) — high-detail ship cutaway schematics. |
| **LCARS Vector Shapes** | deviantart.com/retoucher07030 | 8-shape Photoshop custom shapes set with correct color palette. |

---

## Sources & Citations

- Memory Alpha Wiki: Library Computer Access and Retrieval System
- Memory Alpha Wiki: Okudagram
- Memory Alpha Wiki: Master Systems Display
- Wikipedia: LCARS
- Wrath of Dhan Prop Blog: Okudagrams Parts 1–5 (wrathofdhanprops.blogspot.com)
- Craft of Coding: The User Interfaces of Star Trek – LCARS
- System 47 source code (mewho.com) — minified JS analyzed directly
- LCARS CSS Framework documentation (joernweissenborn.github.io/lcars)
- CB-LCARS GitHub README (github.com/snootched/cb-lcars)
- LCARS R Package documentation (cran.r-project.org/web/packages/lcars)
- Hackaday.io: Experimental Okudagram Interfaces
- SlashFilm: Star Trek — What Does LCARS Stand For?
- Adafruit: Star Trek LCARS Display project
- Adafruit: LCARS-Inspired Circuit Board Panel design guide
- WorthPoint: Screen-Used LCARS Okudagram listing (construction details)

---

*Document compiled from a research session examining LCARS design elements, animation patterns, and source code. All code examples are working standalone HTML files.*
