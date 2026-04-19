# Stage 2 Outputs — arena-css-unplugged.ts

## Agent 01

### injectUnpluggedCSS

When called, this function creates a new `<style>` element and inserts it into the DOM. It reads no parameters. It writes to the DOM by calling `document.createElement('style')` to create a style element, setting the element's `textContent` property to a CSS ruleset string containing six unplugged and amplified styling rules (targeting `.arena-rank-badge.unplugged`, `.arena-rank-card.unplugged`, `.arena-rank-card.unplugged:hover`, `.arena-rank-card.unplugged:active`, `.arena-rank-card.amplified:hover`, `.arena-rank-card.amplified:active`, and `.arena-card-badge.unplugged`), and calling `document.head.appendChild(style)` to attach the element to the document head. The function is synchronous and returns `undefined`.

## Agent 02

### injectUnpluggedCSS

This function, called with no parameters, creates a new `<style>` element via `document.createElement('style')` and populates its `textContent` property with a string containing CSS rules for `unplugged` and `amplified` variants of arena rank badges and cards, defining colors using RGBA values and CSS custom properties like `var(--mod-gold)` and `var(--mod-accent-border)`. It then appends this style element to the document head by calling `document.head.appendChild(style)`. The function returns `void`. The CSS rules define styling for `.arena-rank-badge.unplugged`, `.arena-rank-card.unplugged` and its hover/active states, `.arena-rank-card.amplified` hover/active states, and `.arena-card-badge.unplugged`.

## Agent 03

### injectUnpluggedCSS

When called, this function creates a new `<style>` element by calling `document.createElement('style')`. It then sets the `textContent` property of that element to a string containing six CSS rules that define styling for "unplugged" and "amplified" arena UI components. These rules apply background colors, borders, and color properties using RGBA values and CSS custom properties. The function then appends this style element to `document.head` via `appendChild()`. The function returns `void` and has no parameters. It reads the DOM's head element and the document object, and it writes a new style node to the DOM's head, which applies the CSS rules globally to the page when rendered.

## Agent 04

### injectUnpluggedCSS

When called, this function creates a new `style` element using `document.createElement('style')`, assigns a string containing CSS rules to its `textContent` property, and appends this element to `document.head` using `appendChild()`. The CSS rules define styling for elements with the `unplugged` and `amplified` class names across several CSS classes related to arena rank badges and cards—setting background colors, border colors, and hover/active state styles using both absolute RGBA color values and CSS custom properties like `--mod-gold` and `--mod-accent-border`. The function is synchronous and does not return any value. Its effect is to mutate the DOM by injecting a stylesheet that colors arena UI elements in the "unplugged" visual style.

## Agent 05

### injectUnpluggedCSS

When this function is called, it creates a new `<style>` DOM element by calling `document.createElement('style')`. It then sets the `textContent` property of the style element to a string containing CSS rules for unplugged ruleset styling—specifically rules for `.arena-rank-badge.unplugged`, `.arena-rank-card.unplugged` and its hover/active states, `.arena-rank-card.amplified` hover/active states, and `.arena-card-badge.unplugged`, which define colors, borders, and background values using inline RGBA color values and CSS variables like `--mod-gold` and `--mod-accent-border`. Finally, it appends the style element to `document.head` by calling `document.head.appendChild(style)`, which causes the CSS rules to take effect in the current document. The function is not async and returns `void`.
