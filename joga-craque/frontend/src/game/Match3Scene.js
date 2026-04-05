import Phaser from 'phaser'

const COLS = 7
const ROWS = 7
const PAD = 4
const NUM_TYPES = 5
const CANDY_KEYS = ['candy1', 'candy2', 'candy3', 'candy4', 'candy5']
const CANDY_COLORS = [0x2ecc71, 0x3498db, 0xf1c40f, 0xe74c3c, 0x9b59b6]

export default class Match3Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'Match3Scene' })
    this.board = []
    this.gems = []
    this.canMove = true
    this.score = 0
    this.moves = 25
    this.combo = 0
    this.onUpdate = null
    this.onGameOver = null
  }

  preload() {
    for (let i = 1; i <= 6; i++) {
      this.load.image(`candy${i}`, `/game/candy${i}.png`)
    }
    this.load.image('bg', '/game/bg.jpg')
  }

  create() {
    const W = this.cameras.main.width
    const H = this.cameras.main.height

    // Calcula cell size baseado no espaço disponível
    const maxBoardW = W - 24
    const maxBoardH = H - 24
    const cellFromW = Math.floor((maxBoardW + PAD) / COLS) - PAD
    const cellFromH = Math.floor((maxBoardH + PAD) / ROWS) - PAD
    this.CELL = Math.min(cellFromW, cellFromH, 64) // max 64px no desktop

    const totalW = COLS * (this.CELL + PAD) - PAD
    const totalH = ROWS * (this.CELL + PAD) - PAD
    this.offsetX = (W - totalW) / 2
    this.offsetY = (H - totalH) / 2 + 5

    // Background image
    const bgImg = this.add.image(W / 2, H / 2, 'bg').setDisplaySize(W, H).setAlpha(0.4)

    // Overlay escuro
    const overlay = this.add.graphics()
    overlay.fillStyle(0x0a0e20, 0.6)
    overlay.fillRect(0, 0, W, H)

    // Partículas flutuantes no fundo
    for (let i = 0; i < 15; i++) {
      const px = Phaser.Math.Between(0, W)
      const py = Phaser.Math.Between(0, H)
      const bubble = this.add.circle(px, py, Phaser.Math.Between(3, 8), 0xffffff, Phaser.Math.FloatBetween(0.02, 0.08))
      this.tweens.add({
        targets: bubble, y: py - Phaser.Math.Between(30, 80), alpha: 0,
        duration: Phaser.Math.Between(3000, 6000), repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
        onRepeat: () => { bubble.x = Phaser.Math.Between(0, W); bubble.y = py; bubble.alpha = 0.06 }
      })
    }

    // Board frame com glow
    const frame = this.add.graphics()
    // Glow externo
    frame.fillStyle(0x8844ff, 0.06)
    frame.fillRoundedRect(this.offsetX - 20, this.offsetY - 20, totalW + 40, totalH + 40, 22)
    // Frame principal
    frame.fillStyle(0x1a1030, 0.85)
    frame.fillRoundedRect(this.offsetX - 10, this.offsetY - 10, totalW + 20, totalH + 20, 16)
    frame.lineStyle(3, 0x6633cc, 0.5)
    frame.strokeRoundedRect(this.offsetX - 10, this.offsetY - 10, totalW + 20, totalH + 20, 16)

    // Brilho no topo do board
    frame.fillStyle(0xaa66ff, 0.04)
    frame.fillEllipse(W / 2, this.offsetY + 10, totalW * 0.8, 30)

    this.initBoard()
    this.renderBoard(true)

    this.input.on('pointerdown', this.onPointerDown, this)
    this.input.on('pointermove', this.onPointerMove, this)
    this.input.on('pointerup', this.onPointerUp, this)
    this.dragStart = null
    this.dragGem = null
  }

  initBoard() {
    this.board = []
    for (let r = 0; r < ROWS; r++) {
      const row = []
      for (let c = 0; c < COLS; c++) {
        let t
        do { t = Phaser.Math.Between(0, NUM_TYPES - 1) }
        while (
          (c >= 2 && row[c - 1] === t && row[c - 2] === t) ||
          (r >= 2 && this.board[r - 1]?.[c] === t && this.board[r - 2]?.[c] === t)
        )
        row.push(t)
      }
      this.board.push(row)
    }
  }

  pos(r, c) {
    return { x: this.offsetX + c * (this.CELL + PAD) + this.CELL / 2, y: this.offsetY + r * (this.CELL + PAD) + this.CELL / 2 }
  }

  renderBoard(animate) {
    this.gems.forEach(row => row.forEach(g => { if (g) g.destroy() }))
    this.gems = []
    for (let r = 0; r < ROWS; r++) {
      const row = []
      for (let c = 0; c < COLS; c++) {
        const gem = this.createGem(r, c, this.board[r][c])
        if (animate) {
          const fy = gem.y
          gem.y = -60 - Phaser.Math.Between(0, 200)
          gem.alpha = 0; gem.scaleX = 0.3; gem.scaleY = 0.3
          this.tweens.add({
            targets: gem, y: fy, alpha: 1, scaleX: 1, scaleY: 1,
            duration: 700, delay: (r * COLS + c) * 18,
            ease: 'Bounce.easeOut'
          })
        }
        row.push(gem)
      }
      this.gems.push(row)
    }
  }

  createGem(r, c, type) {
    const { x, y } = this.pos(r, c)
    const container = this.add.container(x, y)

    // Slot background
    const slot = this.add.graphics()
    slot.fillStyle(0x1a1030, 0.5)
    slot.fillRoundedRect(-this.CELL / 2, -this.CELL / 2, this.CELL, this.CELL, 10)
    slot.lineStyle(1, 0x4422aa, 0.2)
    slot.strokeRoundedRect(-this.CELL / 2, -this.CELL / 2, this.CELL, this.CELL, 10)

    // Candy image
    const candy = this.add.image(0, 0, CANDY_KEYS[type])
    candy.setDisplaySize(this.CELL - 8, this.CELL - 8)

    // Shine overlay
    const shine = this.add.graphics()
    shine.fillStyle(0xffffff, 0.12)
    shine.fillEllipse(-4, -10, this.CELL * 0.5, this.CELL * 0.25)

    container.add([slot, candy, shine])
    container.setSize(this.CELL, this.CELL)
    container.setData('type', type)

    // Subtle idle animation
    this.tweens.add({
      targets: candy, y: -2, scaleX: 1.03, scaleY: 0.97,
      duration: Phaser.Math.Between(1800, 2800), yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut', delay: Phaser.Math.Between(0, 1500)
    })

    return container
  }

  getRC(px, py) {
    const c = Math.floor((px - this.offsetX) / (this.CELL + PAD))
    const r = Math.floor((py - this.offsetY) / (this.CELL + PAD))
    return (r >= 0 && r < ROWS && c >= 0 && c < COLS) ? { r, c } : null
  }

  onPointerDown(ptr) {
    if (!this.canMove) return
    const p = this.getRC(ptr.x, ptr.y)
    if (!p) return
    this.dragStart = p
    this.dragGem = this.gems[p.r]?.[p.c]
    if (this.dragGem) {
      this.tweens.add({ targets: this.dragGem, scaleX: 1.15, scaleY: 1.15, duration: 80 })
    }
  }

  onPointerMove(ptr) {
    if (!this.dragStart || !this.canMove) return
    const cp = this.pos(this.dragStart.r, this.dragStart.c)
    const dx = ptr.x - cp.x, dy = ptr.y - cp.y
    if (Math.abs(dx) > this.CELL * 0.32 || Math.abs(dy) > this.CELL * 0.32) {
      let tr = this.dragStart.r, tc = this.dragStart.c
      if (Math.abs(dx) > Math.abs(dy)) tc += dx > 0 ? 1 : -1
      else tr += dy > 0 ? 1 : -1
      if (tr >= 0 && tr < ROWS && tc >= 0 && tc < COLS) this.trySwap(this.dragStart.r, this.dragStart.c, tr, tc)
      this.endDrag()
    }
  }

  onPointerUp() { this.endDrag() }

  endDrag() {
    if (this.dragGem) this.tweens.add({ targets: this.dragGem, scaleX: 1, scaleY: 1, duration: 80 })
    this.dragStart = null; this.dragGem = null
  }

  trySwap(r1, c1, r2, c2) {
    if (!this.canMove) return
    this.canMove = false
    const tmp = this.board[r1][c1]
    this.board[r1][c1] = this.board[r2][c2]; this.board[r2][c2] = tmp

    if (this.findMatches().size === 0) {
      this.board[r2][c2] = this.board[r1][c1]; this.board[r1][c1] = tmp
      const g1 = this.gems[r1][c1], g2 = this.gems[r2][c2]
      if (g1) this.tweens.add({ targets: g1, x: g1.x + (c2-c1)*16, y: g1.y + (r2-r1)*16, duration: 60, yoyo: true })
      if (g2) this.tweens.add({ targets: g2, x: g2.x - (c2-c1)*16, y: g2.y - (r2-r1)*16, duration: 60, yoyo: true })
      this.time.delayedCall(180, () => { this.canMove = true })
      return
    }

    const g1 = this.gems[r1][c1], g2 = this.gems[r2][c2]
    this.gems[r1][c1] = g2; this.gems[r2][c2] = g1
    const p1 = this.pos(r1, c1), p2 = this.pos(r2, c2)
    if (g1) this.tweens.add({ targets: g1, x: p2.x, y: p2.y, duration: 160, ease: 'Back.easeOut' })
    if (g2) this.tweens.add({ targets: g2, x: p1.x, y: p1.y, duration: 160, ease: 'Back.easeOut' })

    this.moves--; this.combo = 0; this.emitUpdate()
    this.time.delayedCall(200, () => this.processMatches())
  }

  findMatches() {
    const m = new Set()
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS - 2; c++) {
      const p = this.board[r][c]
      if (p !== null && p === this.board[r][c+1] && p === this.board[r][c+2]) {
        let k = c; while (k < COLS && this.board[r][k] === p) { m.add(`${r},${k}`); k++ }
      }
    }
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS - 2; r++) {
      const p = this.board[r][c]
      if (p !== null && p === this.board[r+1][c] && p === this.board[r+2][c]) {
        let k = r; while (k < ROWS && this.board[k][c] === p) { m.add(`${k},${c}`); k++ }
      }
    }
    return m
  }

  processMatches() {
    const matches = this.findMatches()
    if (matches.size === 0) {
      this.canMove = true; this.combo = 0
      if (this.moves <= 0 && this.onGameOver) this.time.delayedCall(500, () => this.onGameOver(this.score))
      return
    }

    this.combo++
    const pts = matches.size * 10 * this.combo
    this.score += pts
    this.emitUpdate()

    let ax = 0, ay = 0, n = 0
    matches.forEach(key => {
      const [r, c] = key.split(',').map(Number)
      const gem = this.gems[r]?.[c]
      if (!gem) return
      const gx = gem.x, gy = gem.y
      ax += gx; ay += gy; n++
      const type = this.board[r][c]

      // === EXPLOSÃO ÉPICA ===

      // 1. Shockwave ring
      const ring = this.add.circle(gx, gy, 8, CANDY_COLORS[type], 0.7)
      this.tweens.add({ targets: ring, scaleX: 5, scaleY: 5, alpha: 0, duration: 450, onComplete: () => ring.destroy() })

      // 2. White flash
      const flash = this.add.circle(gx, gy, this.CELL / 2, 0xffffff, 0.7)
      this.tweens.add({ targets: flash, alpha: 0, scaleX: 2, scaleY: 2, duration: 200, onComplete: () => flash.destroy() })

      // 3. Radial sparkles (8 directions)
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i + Math.random() * 0.3
        const dist = Phaser.Math.Between(30, 70)
        const size = Phaser.Math.Between(2, 6)
        const spark = this.add.circle(gx, gy, size, CANDY_COLORS[type], 1)
        this.tweens.add({
          targets: spark,
          x: gx + Math.cos(angle) * dist, y: gy + Math.sin(angle) * dist,
          alpha: 0, scaleX: 0, scaleY: 0,
          duration: Phaser.Math.Between(200, 450),
          onComplete: () => spark.destroy()
        })
      }

      // 4. Mini candy fragments flying
      for (let i = 0; i < 3; i++) {
        const frag = this.add.image(gx, gy, CANDY_KEYS[type]).setDisplaySize(16, 16).setAlpha(0.8)
        this.tweens.add({
          targets: frag,
          x: gx + Phaser.Math.Between(-50, 50), y: gy + Phaser.Math.Between(-60, -20),
          alpha: 0, angle: Phaser.Math.Between(-180, 180), scaleX: 0, scaleY: 0,
          duration: Phaser.Math.Between(350, 550), onComplete: () => frag.destroy()
        })
      }

      // 5. Gem pump + explode
      this.tweens.add({
        targets: gem, scaleX: 1.4, scaleY: 1.4, duration: 80,
        onComplete: () => {
          this.tweens.add({ targets: gem, scaleX: 0, scaleY: 0, alpha: 0, angle: Phaser.Math.Between(-45, 45),
            duration: 180, onComplete: () => gem.destroy() })
        }
      })

      this.board[r][c] = null
    })

    // Score popup
    if (n > 0) {
      ax /= n; ay /= n
      const col = this.combo >= 3 ? '#ffd700' : this.combo >= 2 ? '#ff6600' : '#ffffff'
      const fs = Math.min(36, 20 + this.combo * 4)
      const pop = this.add.text(ax, ay, `+${pts}`, {
        fontSize: fs + 'px', fontFamily: 'Bangers', color: col, stroke: '#000', strokeThickness: 4
      }).setOrigin(0.5)
      this.tweens.add({
        targets: pop, y: ay - 55, alpha: 0, scaleX: 1.5, scaleY: 1.5,
        duration: 800, onComplete: () => pop.destroy()
      })
    }

    // Combo banner
    if (this.combo > 1) {
      const cx = this.cameras.main.width / 2
      const fs = Math.min(44, 24 + this.combo * 5)
      const txt = this.combo >= 4 ? '💥 MEGA COMBO' : this.combo >= 3 ? '🔥 SUPER COMBO' : '✨ COMBO'
      const ct = this.add.text(cx, this.offsetY - 25, `${txt} x${this.combo}!`, {
        fontSize: fs + 'px', fontFamily: 'Bangers', color: '#ffd700', stroke: '#000', strokeThickness: 5
      }).setOrigin(0.5).setScale(0)
      this.tweens.add({
        targets: ct, scaleX: 1, scaleY: 1, duration: 300, ease: 'Back.easeOut',
        onComplete: () => this.tweens.add({
          targets: ct, y: ct.y - 40, alpha: 0, duration: 700, delay: 500, onComplete: () => ct.destroy()
        })
      })
      // Screen shake
      if (this.combo >= 3) this.cameras.main.shake(150, 0.003 + this.combo * 0.002)
      // Flash screen on mega combo
      if (this.combo >= 4) this.cameras.main.flash(200, 255, 200, 0, true)
    }

    this.time.delayedCall(380, () => {
      this.applyGravity()
      this.time.delayedCall(400, () => this.processMatches())
    })
  }

  applyGravity() {
    for (let c = 0; c < COLS; c++) {
      let w = ROWS - 1
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.board[r][c] !== null) {
          if (w !== r) { this.board[w][c] = this.board[r][c]; this.board[r][c] = null }
          w--
        }
      }
      for (let r = w; r >= 0; r--) this.board[r][c] = Phaser.Math.Between(0, NUM_TYPES - 1)
    }

    this.gems.forEach(row => row.forEach(g => { if (g) g.destroy() }))
    this.gems = []
    for (let r = 0; r < ROWS; r++) {
      const row = []
      for (let c = 0; c < COLS; c++) {
        const gem = this.createGem(r, c, this.board[r][c])
        const fy = gem.y
        gem.y = fy - (ROWS - r) * 20 - 50; gem.alpha = 0.1
        this.tweens.add({
          targets: gem, y: fy, alpha: 1,
          duration: 320, delay: c * 15 + (ROWS - r) * 10,
          ease: 'Bounce.easeOut'
        })
        row.push(gem)
      }
      this.gems.push(row)
    }
  }

  emitUpdate() {
    if (this.onUpdate) this.onUpdate({ score: this.score, moves: this.moves, combo: this.combo })
  }
}
