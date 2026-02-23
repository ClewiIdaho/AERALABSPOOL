# AERA LABS POOL

A futuristic 8-ball pool game with advanced physics, cyberpunk neon visuals, and immersive music.

## Features

- **Advanced Physics Engine** - Realistic ball-ball elastic collisions, ball-cushion rebounds, sliding/rolling/spinning friction models, spin (english, topspin, backspin), and gravity-pull pocket detection
- **Futuristic Visuals** - Neon-lit table with cyan/magenta glow effects, holographic ball rendering, particle effects on collisions, trail effects, and animated background grid
- **Full 8-Ball Rules** - Standard 8-ball game logic including solids/stripes assignment, foul detection (scratch, wrong ball first, no rail contact), ball-in-hand placement, and proper win/loss conditions
- **17 Music Tracks** - Complete soundtrack with tracks from [Newgamemusic](https://github.com/ClewiIdaho/Newgamemusic) including shuffle playback and transport controls
- **Synthesized Sound Effects** - Ball collisions, cushion hits, pocket sounds, cue strikes, foul buzzers, and victory fanfares generated via Web Audio API
- **Spin Control** - Interactive spin control pad for applying english, topspin, and backspin to the cue ball
- **Responsive Design** - Scales to any screen size with mobile touch support

## How to Play

1. Open `index.html` in a modern web browser
2. Enter player names (optional) and click **BREAK**
3. **Aim**: Move mouse over the table to position the aim line
4. **Shoot**: Click and drag to set power (drag distance = shot power), then release to shoot
5. **Spin**: Use the spin control pad (bottom-left) to apply spin before shooting
6. **Ball-in-Hand**: After a foul, click on the table to place the cue ball

## Project Structure

```
index.html          - Main game page
css/style.css       - Futuristic cyberpunk stylesheet
js/vector.js        - 2D vector math library
js/physics.js       - Physics engine (collisions, friction, spin)
js/particles.js     - Particle effects system
js/audio.js         - Music player and synthesized SFX
js/renderer.js      - Canvas rendering (table, balls, effects)
js/input.js         - Mouse and touch input handling
js/game.js          - 8-ball game logic and rules
js/main.js          - Game initialization and main loop
```

## Physics Model

Inspired by [pooltool](https://github.com/ekiefl/pooltool), the physics engine implements:

- **Ball dynamics**: 2D position/velocity with 3-axis angular velocity (spin)
- **Friction model**: Sliding friction with spin transfer, rolling friction with deceleration, and spinning friction on vertical axis
- **State machine**: Balls transition between sliding, rolling, spinning, and stationary states
- **Elastic collisions**: Momentum-conserving ball-ball collisions with restitution and throw effects
- **Cushion physics**: Reflection with energy loss, english effects on rebound angle
- **Pocket detection**: Gravity-pull near pocket edges with configurable pocket radii

## Credits

- Physics model inspired by [pooltool](https://github.com/ekiefl/pooltool) by Erik Kiefl
- Music from [Newgamemusic](https://github.com/ClewiIdaho/Newgamemusic)
