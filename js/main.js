/**
 * AERA LABS POOL - Main Entry Point
 * Game initialization, main loop, UI wiring
 */

(function () {
  let game, renderer, input;
  let lastTime = 0;
  let uiElements = {};

  function init() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
      console.error('Canvas not found');
      return;
    }

    // Initialize game systems
    game = new Game.GameLogic();
    renderer = new Renderer.GameRenderer(canvas);
    input = new Input.InputHandler(canvas, renderer);

    game.setRenderer(renderer);

    // Resize handler
    function handleResize() {
      renderer.resize();
    }
    window.addEventListener('resize', handleResize);
    handleResize();

    // Cache UI elements
    cacheUIElements();

    // Wire input handlers
    wireInput();

    // Set up UI event listeners
    setupUIEvents();

    // Start with menu
    showMenu();

    // Start game loop
    requestAnimationFrame(gameLoop);
  }

  function cacheUIElements() {
    uiElements = {
      menu: document.getElementById('mainMenu'),
      hud: document.getElementById('hud'),
      startBtn: document.getElementById('startBtn'),
      p1Name: document.getElementById('p1Name'),
      p2Name: document.getElementById('p2Name'),
      p1Score: document.getElementById('p1Score'),
      p2Score: document.getElementById('p2Score'),
      p1Type: document.getElementById('p1Type'),
      p2Type: document.getElementById('p2Type'),
      p1Indicator: document.getElementById('p1Indicator'),
      p2Indicator: document.getElementById('p2Indicator'),
      p1Pocketed: document.getElementById('p1Pocketed'),
      p2Pocketed: document.getElementById('p2Pocketed'),
      turnMessage: document.getElementById('turnMessage'),
      foulMessage: document.getElementById('foulMessage'),
      gameOverPanel: document.getElementById('gameOverPanel'),
      gameOverText: document.getElementById('gameOverText'),
      gameOverReason: document.getElementById('gameOverReason'),
      newGameBtn: document.getElementById('newGameBtn'),
      spinControl: document.getElementById('spinControl'),
      spinDot: document.getElementById('spinDot'),
      spinCanvas: document.getElementById('spinCanvas'),
      resetSpinBtn: document.getElementById('resetSpinBtn'),
      musicToggle: document.getElementById('musicToggle'),
      musicTrack: document.getElementById('musicTrack'),
      musicPrev: document.getElementById('musicPrev'),
      musicNext: document.getElementById('musicNext'),
      volumeSlider: document.getElementById('volumeSlider'),
      sfxVolumeSlider: document.getElementById('sfxVolumeSlider'),
      helpToggle: document.getElementById('helpToggle'),
      helpPanel: document.getElementById('helpPanel'),
      fpsDisplay: document.getElementById('fpsDisplay'),
      p1Input: document.getElementById('p1Input'),
      p2Input: document.getElementById('p2Input')
    };
  }

  function wireInput() {
    // Aim handler
    input.onAim = (x, y, dragDist) => {
      if (game.state === 'placing') {
        game.handlePlacement(x, y);
      } else if (game.state === 'aiming' || game.state === 'powering') {
        game.handleAim(x, y);
        if (dragDist > 0) {
          game.handlePowerDrag(dragDist);
        }
      }
    };

    // Shoot handler
    input.onShoot = (x, y, dragDist) => {
      if (game.state === 'placing') {
        game.confirmPlacement();
      } else if (game.state === 'aiming' || game.state === 'powering') {
        game.handleShoot(x, y, dragDist);
      }
    };

    // Click handler
    input.onClick = (x, y, button) => {
      if (game.state === 'placing') {
        game.handlePlacement(x, y);
      }
    };
  }

  function setupUIEvents() {
    // Start button
    if (uiElements.startBtn) {
      uiElements.startBtn.addEventListener('click', () => {
        // Get player names
        const p1 = uiElements.p1Input ? uiElements.p1Input.value.trim() : '';
        const p2 = uiElements.p2Input ? uiElements.p2Input.value.trim() : '';

        if (p1) game.players[0].name = p1.toUpperCase();
        if (p2) game.players[1].name = p2.toUpperCase();

        game.startGame();
        hideMenu();
        showHUD();

        // Start music on first interaction
        game.music.play();

        game.sfx.uiClick();
      });
    }

    // New game button
    if (uiElements.newGameBtn) {
      uiElements.newGameBtn.addEventListener('click', () => {
        game.newGame();
        if (uiElements.gameOverPanel) {
          uiElements.gameOverPanel.classList.remove('visible');
        }
        game.sfx.uiClick();
      });
    }

    // Spin control
    setupSpinControl();

    // Music controls
    setupMusicControls();

    // Help toggle
    if (uiElements.helpToggle) {
      uiElements.helpToggle.addEventListener('click', () => {
        if (uiElements.helpPanel) {
          uiElements.helpPanel.classList.toggle('visible');
        }
        game.sfx.uiClick();
      });
    }

    // Close help on click outside
    document.addEventListener('click', (e) => {
      if (uiElements.helpPanel && uiElements.helpPanel.classList.contains('visible')) {
        if (!uiElements.helpPanel.contains(e.target) && e.target !== uiElements.helpToggle) {
          uiElements.helpPanel.classList.remove('visible');
        }
      }
    });
  }

  function setupSpinControl() {
    const spinCanvas = uiElements.spinCanvas;
    if (!spinCanvas) return;

    const spinCtx = spinCanvas.getContext('2d');
    spinCanvas.width = 80;
    spinCanvas.height = 80;

    let isDraggingSpin = false;

    function updateSpinVisual() {
      const w = spinCanvas.width;
      const h = spinCanvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const r = 30;

      spinCtx.clearRect(0, 0, w, h);

      // Ball outline
      spinCtx.strokeStyle = '#00FFFF';
      spinCtx.lineWidth = 1.5;
      spinCtx.globalAlpha = 0.5;
      spinCtx.beginPath();
      spinCtx.arc(cx, cy, r, 0, Math.PI * 2);
      spinCtx.stroke();

      // Crosshair
      spinCtx.globalAlpha = 0.2;
      spinCtx.beginPath();
      spinCtx.moveTo(cx - r, cy);
      spinCtx.lineTo(cx + r, cy);
      spinCtx.moveTo(cx, cy - r);
      spinCtx.lineTo(cx, cy + r);
      spinCtx.stroke();

      // Spin dot
      const dotX = cx + game.spin.x * r;
      const dotY = cy + game.spin.y * r;

      spinCtx.globalAlpha = 1;
      spinCtx.fillStyle = '#FF00FF';
      spinCtx.shadowColor = '#FF00FF';
      spinCtx.shadowBlur = 8;
      spinCtx.beginPath();
      spinCtx.arc(dotX, dotY, 5, 0, Math.PI * 2);
      spinCtx.fill();
      spinCtx.shadowBlur = 0;

      // Label
      spinCtx.fillStyle = '#00FFFF';
      spinCtx.font = "8px 'Orbitron', monospace";
      spinCtx.textAlign = 'center';
      spinCtx.globalAlpha = 0.5;
      spinCtx.fillText('SPIN', cx, h - 2);
    }

    spinCanvas.addEventListener('mousedown', (e) => {
      isDraggingSpin = true;
      updateSpin(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (isDraggingSpin) {
        updateSpin(e);
      }
    });

    window.addEventListener('mouseup', () => {
      isDraggingSpin = false;
    });

    function updateSpin(e) {
      const rect = spinCanvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width * 2 - 1;
      const y = (e.clientY - rect.top) / rect.height * 2 - 1;

      // Clamp to circle
      const len = Math.sqrt(x * x + y * y);
      if (len > 1) {
        game.setSpin(x / len, y / len);
      } else {
        game.setSpin(x, y);
      }
    }

    if (uiElements.resetSpinBtn) {
      uiElements.resetSpinBtn.addEventListener('click', () => {
        game.resetSpin();
        game.sfx.uiClick();
      });
    }

    // Update spin visual every frame
    setInterval(updateSpinVisual, 50);
  }

  function setupMusicControls() {
    // Music track name callback
    game.music.onTrackChange = (name) => {
      if (uiElements.musicTrack) {
        uiElements.musicTrack.textContent = name;
        uiElements.musicTrack.classList.add('glow');
        setTimeout(() => uiElements.musicTrack.classList.remove('glow'), 1000);
      }
    };

    if (uiElements.musicToggle) {
      uiElements.musicToggle.addEventListener('click', () => {
        game.music.togglePlay();
        uiElements.musicToggle.textContent = game.music.isPlaying ? '⏸' : '▶';
        game.sfx.uiClick();
      });
    }

    if (uiElements.musicPrev) {
      uiElements.musicPrev.addEventListener('click', () => {
        game.music.prev();
        game.sfx.uiClick();
      });
    }

    if (uiElements.musicNext) {
      uiElements.musicNext.addEventListener('click', () => {
        game.music.next();
        game.sfx.uiClick();
      });
    }

    if (uiElements.volumeSlider) {
      uiElements.volumeSlider.addEventListener('input', (e) => {
        game.music.setVolume(parseFloat(e.target.value));
      });
    }

    if (uiElements.sfxVolumeSlider) {
      uiElements.sfxVolumeSlider.addEventListener('input', (e) => {
        game.sfx.setVolume(parseFloat(e.target.value));
      });
    }
  }

  function showMenu() {
    if (uiElements.menu) uiElements.menu.classList.add('visible');
    if (uiElements.hud) uiElements.hud.classList.remove('visible');
    if (uiElements.gameOverPanel) uiElements.gameOverPanel.classList.remove('visible');
  }

  function hideMenu() {
    if (uiElements.menu) uiElements.menu.classList.remove('visible');
  }

  function showHUD() {
    if (uiElements.hud) uiElements.hud.classList.add('visible');
  }

  function updateHUD() {
    const info = game.getGameInfo();

    // Player names and indicators
    if (uiElements.p1Name) uiElements.p1Name.textContent = game.players[0].name;
    if (uiElements.p2Name) uiElements.p2Name.textContent = game.players[1].name;

    // Active player indicator
    if (uiElements.p1Indicator) {
      uiElements.p1Indicator.classList.toggle('active', game.currentPlayer === 0);
    }
    if (uiElements.p2Indicator) {
      uiElements.p2Indicator.classList.toggle('active', game.currentPlayer === 1);
    }

    // Player types
    if (uiElements.p1Type) {
      uiElements.p1Type.textContent = game.players[0].type ?
        (game.players[0].type === 'solids' ? 'SOLIDS' : 'STRIPES') : 'OPEN';
    }
    if (uiElements.p2Type) {
      uiElements.p2Type.textContent = game.players[1].type ?
        (game.players[1].type === 'solids' ? 'SOLIDS' : 'STRIPES') : 'OPEN';
    }

    // Pocketed balls display
    updatePocketedBalls(uiElements.p1Pocketed, game.player1Pocketed);
    updatePocketedBalls(uiElements.p2Pocketed, game.player2Pocketed);

    // Score
    if (uiElements.p1Score) uiElements.p1Score.textContent = game.players[0].score;
    if (uiElements.p2Score) uiElements.p2Score.textContent = game.players[1].score;

    // Messages
    if (uiElements.turnMessage) {
      uiElements.turnMessage.textContent = info.turnMessage;
      uiElements.turnMessage.classList.toggle('visible', info.turnMessage !== '');
    }

    if (uiElements.foulMessage) {
      uiElements.foulMessage.textContent = info.foulMessage;
      uiElements.foulMessage.classList.toggle('visible', info.foulMessage !== '');
    }

    // Game over
    if (game.state === 'game_over') {
      if (uiElements.gameOverPanel) {
        uiElements.gameOverPanel.classList.add('visible');
      }
      if (uiElements.gameOverText) {
        uiElements.gameOverText.textContent = info.gameMessage;
      }
      if (uiElements.gameOverReason) {
        uiElements.gameOverReason.textContent = info.turnMessage;
      }
    }

    // State indicator
    const stateEl = document.getElementById('stateIndicator');
    if (stateEl) {
      let stateText = '';
      switch (game.state) {
        case 'aiming': stateText = 'AIM & DRAG TO SHOOT'; break;
        case 'powering': stateText = 'RELEASE TO SHOOT'; break;
        case 'simulating': stateText = 'SIMULATING...'; break;
        case 'placing': stateText = 'CLICK TO PLACE CUE BALL'; break;
        case 'turn_end': stateText = ''; break;
        case 'starting': stateText = 'GET READY'; break;
        default: stateText = '';
      }
      stateEl.textContent = stateText;
    }
  }

  function updatePocketedBalls(container, balls) {
    if (!container) return;
    container.innerHTML = '';
    for (const ball of balls) {
      const dot = document.createElement('div');
      dot.className = 'pocketed-ball';
      dot.style.backgroundColor = ball.color;
      if (ball.isStripe) {
        dot.classList.add('stripe');
      }
      dot.title = ball.number.toString();
      container.appendChild(dot);
    }
  }

  // FPS tracking
  let fpsFrames = 0;
  let fpsTime = 0;
  let currentFPS = 60;

  function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // Cap at 50ms
    lastTime = timestamp;

    // FPS counter
    fpsFrames++;
    fpsTime += dt;
    if (fpsTime >= 1) {
      currentFPS = Math.round(fpsFrames / fpsTime);
      fpsFrames = 0;
      fpsTime = 0;
      if (uiElements.fpsDisplay) {
        uiElements.fpsDisplay.textContent = currentFPS + ' FPS';
      }
    }

    // Update game
    game.update(dt);

    // Render
    renderer.render(game, dt);

    // Update HUD
    if (game.state !== 'menu') {
      updateHUD();
    }

    requestAnimationFrame(gameLoop);
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
