# Stage 2 Outputs — leaderboard.elo.ts

## Agent 01

### showEloExplainer

This function removes any existing Elo explainer modal from the DOM, then creates and displays a new modal containing an explanation of the Elo rating system. The function first calls `document.getElementById('elo-explainer-modal')?.remove()` to delete a previous modal if one exists.

It creates a new `div` element with id `'elo-explainer-modal'` and applies fixed positioning styles to overlay the entire viewport. The modal uses CSS animations (`coloFadeIn` and `coloSlideUp`) for visual transitions and is rendered with flexbox to center content at the bottom of the screen. The function populates the modal's `innerHTML` with a formatted card containing the Elo rating explanation, including a header with the title "⚔️ ELO RATING" and a close button, followed by multiple sections describing how the rating system works. The content includes four scenarios showing how Elo moves based on win/loss outcomes relative to opponent ranking, a breakdown of Elo number ranges and their meanings (1000–1199 through 1800+), and a note that Elo only changes in Ranked debates. The function attaches a click event listener to the modal that removes the modal when the user clicks the modal background itself (not its content). Finally, the function appends the modal to `document.body`, making it visible on the page. The function does not return a value and reads no parameters or module-level state.

## Agent 02

### showEloExplainer

The function reads no parameters and accesses the DOM to check for an existing element with id `elo-explainer-modal`. If found, it removes that element.

The function then creates a new `div` element and assigns it the id `elo-explainer-modal`. It sets the element's `cssText` property to define a fixed-position overlay with flex layout, setting `inset:0` to cover the viewport, a background color from the CSS variable `--mod-bg-overlay`, and a z-index of 10000. It sets the `innerHTML` property to a large string containing HTML markup for the modal's content—including a header with an X button labeled `close-elo-explainer`, explanatory text about Elo ratings, sections describing how Elo moves, and a table of Elo number ranges with skill descriptions.

The function then calls `addEventListener` on the modal to attach a click handler. This handler checks if the click target is the modal element itself (not a child); if so, it removes the modal. Finally, the function appends the modal to `document.body`, making it visible.

The function is synchronous, returns `void`, writes to the DOM by creating and appending an element, and does not read or write module-level state.

## Agent 03

### showEloExplainer

When called, this function first removes any existing element with id `elo-explainer-modal` from the DOM if present. It then creates a new `div` element, assigns it the id `elo-explainer-modal`, and sets its CSS to position it as a fixed overlay filling the viewport with a flexbox layout that aligns content to the bottom center. The modal is assigned a CSS animation called `coloFadeIn` lasting 0.2 seconds.

The function populates the modal's `innerHTML` with a modal card containing an Elo rating explainer. The card includes a header with the title "⚔️ ELO RATING" styled with a display font and a close button marked with the data attribute `data-action="close-elo-explainer"`. Below the header, the card contains explanatory text about Elo ratings, including an introductory paragraph explaining that Elo is a skill number starting at 1200 that changes with wins and losses. The content includes a section explaining "HOW IT MOVES" with four scenarios (beating someone higher-ranked for big gain, beating someone lower-ranked for small gain, losing to someone lower-ranked for big drop, losing to someone higher-ranked for small drop), each with visual indicators using colored triangles. A second section labeled "WHAT THE NUMBERS MEAN" lists five Elo tiers from 1000–1199 through 1800+, each associated with a descriptive label and color. The card concludes with text noting that Elo only moves in Ranked debates. The card element is wrapped in a `div` with a linear gradient background, border, border-radius, padding, max-width, and overflow styling, and is assigned a `coloSlideUp` animation lasting 0.25 seconds.

The function then attaches a click event listener to the modal that removes the modal from the DOM if the click target is the modal element itself (backdrop click), which allows dismissal by clicking outside the card. Finally, the function appends the modal to `document.body`, making it visible in the DOM.

## Agent 04

### showEloExplainer

When called, this function removes any existing element with the id `elo-explainer-modal` from the DOM. It then creates a new `div` element with that id, sets its inline styles to position it as a fixed overlay covering the viewport, applies a fade-in animation, and configures it to display flexbox content aligned to the bottom-center. The function populates the div's `innerHTML` with a modal containing an Elo rating explainer—a header with the title "⚔️ ELO RATING" and a close button, followed by explanatory text covering three sections: an overview of Elo as a skill number starting at 1200, a "HOW IT MOVES" section with four bullet points describing how ratings change based on win/loss outcomes relative to opponent ranking, and a "WHAT THE NUMBERS MEAN" section showing Elo range thresholds and their associated skill levels (1000–1199 through 1800+). The modal also includes a note that Elo only changes in Ranked debates. The function attaches a click event listener to the modal itself (not the inner content) that removes the modal from the DOM if the user clicks on the overlay. Finally, the function appends the modal element to `document.body`. The function is synchronous, returns `void`, and has no error handling—it reads the DOM (via `getElementById` and the presence or absence of an existing modal element) and writes to it (via `createElement`, `appendChild`, and the event listener).

## Agent 05

### showEloExplainer

When called, this function first removes any existing element with ID `elo-explainer-modal` from the DOM by calling `document.getElementById('elo-explainer-modal')?.remove()`. It then creates a new div element and assigns it the ID `elo-explainer-modal` and inline styles that position it as a fixed overlay spanning the viewport, with a dark semi-transparent background, flex layout centering content at the bottom, and a fade-in animation. The modal's innerHTML is set to a complete HTML template with inline styles that includes a card with rounded top corners, a header with "⚔️ ELO RATING" title and a close button marked with `data-action="close-elo-explainer"`, and body text explaining the Elo rating system. The body includes: an introductory paragraph explaining that Elo is a skill number starting at 1200; a "HOW IT MOVES" section with four scenarios (big gain, small gain, big drop, small drop) describing how Elo changes based on beating or losing to higher or lower ranked opponents; a "WHAT THE NUMBERS MEAN" section listing five Elo tiers with labels from "Getting started" (1000–1199) to "Gladiator elite" (1800+); and a footer note that Elo only moves in Ranked debates. After setting up the modal structure, the function attaches a click event listener to the modal that removes the modal if the click target is the modal itself (background click), then appends the modal element to `document.body`. The function is synchronous and does not return a value.
