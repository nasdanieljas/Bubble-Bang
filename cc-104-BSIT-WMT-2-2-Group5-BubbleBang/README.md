# Bubble Bang

Bubble Bang is a responsive browser arcade game. Pop bubbles before they burst, build score multipliers through fast combos, and use special bubbles to survive increasingly difficult waves.

It is a dependency-free final-project website built with HTML, CSS, and JavaScript.

## Play it

Open `index.html` in a current web browser, or serve this folder locally:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Features

- Three selectable modes: Relaxed, Classic, and Challenge
- Endless arcade progression with levels that increase bubble growth and spawn rate
- Score, survival timer, lives, combo counter, and up-to-4× score multiplier
- Four special bubble types:
  - **Gold**: awards bonus points
  - **Burst**: clears nearby bubbles
  - **Freeze**: pauses bubble growth temporarily
  - **Heart**: restores one life, up to five lives
- Start, pause, resume, restart, game-over, and menu states
- Browser-local top-five leaderboard using `localStorage`
- Synthesized sound effects with a persistent mute setting (no copyrighted audio files)
- Tap-friendly controls, responsive layout, focus states, status announcements, and reduced-motion support

## Controls

| Action | Control |
| --- | --- |
| Pop a bubble | Click or tap it |
| Pause / resume | `Space` or `P` |
| Mute / unmute | `M` |
| Pause | `Esc` |
| Start another run after game over | `R` |

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Accessible menu, gameplay HUD, overlays, and game instructions |
| `style.css` | Responsive visual design, special-bubble styling, and motion effects |
| `game.js` | State management, gameplay loop, scoring, effects, sound, and local scores |

## Testing checklist

Before presentation or deployment, verify the following in Chrome, Edge, and a mobile browser:

- Every mode starts with its documented number of lives and becomes faster as score increases.
- Each special bubble applies the described effect.
- Pause freezes both bubble growth and the survival timer; resume continues the same run.
- Scores persist after a page refresh and can be cleared from the menu.
- Mute remains selected after a refresh.
- Layout, buttons, and tap targets remain usable at narrow mobile widths.
- Keyboard focus is visible on all menu and game controls.

## Deployment

This is a static site, so it can be deployed directly with GitHub Pages:

1. Push this folder to the repository's default branch.
2. In GitHub, open **Settings → Pages**.
3. Deploy from the branch and choose the folder that contains `index.html`.
4. Add the published URL to the project presentation and repository About section.

## Team presentation notes

For the final defense, be ready to explain:

- how `requestAnimationFrame` keeps growth smooth and stops when the game is paused;
- how the game state prevents input after pause or game over;
- how difficulty is calculated from score;
- why browser `localStorage` is suitable for a small offline leaderboard;
- how responsive and reduced-motion styling improves usability.

> Replace this note with the group members, their roles, screenshots, and the deployed GitHub Pages URL before final submission.
