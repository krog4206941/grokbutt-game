# GROKBUTT: Escape the Server (playable demo)

Plain HTML5 Canvas + WebAudio, no libraries, no build step.

- Play locally: open `play.html`, or run `python3 -m http.server` here and visit [http://localhost:8000/](https://krog4206941.github.io/grokbutt-game/play.html)
- Share page with X player card: `index.html` (see HOSTING.md)
- Card image: `card.png` (1200x1200)
- Headless tests: `python3 tools/shoot.py` (screenshots + console check) and `python3 tools/playthrough.py` (bot plays to the win screen). Both need a server on port 8765: `python3 -m http.server 8765 --bind 127.0.0.1`

Controls
- Touch: drag on the left half to move (floating joystick). Hold the right half to attack; it auto-aims the butt at the nearest enemy, or drag to aim by hand.
- Keyboard/mouse: WASD or arrows to move, the mouse aims the butt, click / Space / J to attack. P pauses, M mutes (or use the speaker button).
