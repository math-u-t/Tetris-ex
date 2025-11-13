// キャンバスとコンテキスト
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

// ゲーム設定
const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;
const INITIAL_SPEED = 800;

// ゲーム状態
let board = [];
let score = 0;
let lines = 0;
let level = 1;
let gameRunning = false;
let gameLoop = null;
let dropTime = 0;
let lastTime = 0;
let dropSpeed = INITIAL_SPEED;
let softDropping = false;

// 現在のミノと次のミノ
let currentPiece = null;
let nextPiece = null;

// テトリミノの形状定義
const TETROMINOS = {
  'I': {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: '#00f0f0'
  },
  'O': {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#f0f000'
  },
  'T': {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#a000f0'
  },
  'S': {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    color: '#00f000'
  },
  'Z': {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    color: '#f00000'
  },
  'J': {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#0000f0'
  },
  'L': {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#f0a000'
  }
};

// ボードの初期化
function initBoard() {
  board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
}

// ランダムなテトリミノを生成
function randomTetromino() {
  const keys = Object.keys(TETROMINOS);
  const key = keys[Math.floor(Math.random() * keys.length)];
  const tetromino = TETROMINOS[key];

  return {
    shape: tetromino.shape,
    color: tetromino.color,
    x: Math.floor(COLS / 2) - Math.floor(tetromino.shape[0].length / 2),
    y: 0
  };
}

// ボードの描画
function drawBoard() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // グリッド線
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      ctx.strokeRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

      if (board[row][col]) {
        ctx.fillStyle = board[row][col];
        ctx.fillRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
      }
    }
  }
}

// テトリミノの描画
function drawPiece(piece) {
  if (!piece) return;

  ctx.fillStyle = piece.color;

  for (let row = 0; row < piece.shape.length; row++) {
    for (let col = 0; col < piece.shape[row].length; col++) {
      if (piece.shape[row][col]) {
        const x = (piece.x + col) * BLOCK_SIZE;
        const y = (piece.y + row) * BLOCK_SIZE;

        ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
      }
    }
  }
}

// ゴーストピースの描画（落下予測位置）
function drawGhost(piece) {
  if (!piece) return;

  let ghostY = piece.y;
  while (!checkCollision(piece.shape, piece.x, ghostY + 1)) {
    ghostY++;
  }

  ctx.fillStyle = piece.color + '40'; // 透明度を追加
  ctx.strokeStyle = piece.color + '80';

  for (let row = 0; row < piece.shape.length; row++) {
    for (let col = 0; col < piece.shape[row].length; col++) {
      if (piece.shape[row][col]) {
        const x = (piece.x + col) * BLOCK_SIZE;
        const y = (ghostY + row) * BLOCK_SIZE;

        ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
      }
    }
  }
}

// 次のミノの描画
function drawNextPiece() {
  nextCtx.fillStyle = '#fff';
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  if (!nextPiece) return;

  const offsetX = (nextCanvas.width - nextPiece.shape[0].length * 20) / 2;
  const offsetY = (nextCanvas.height - nextPiece.shape.length * 20) / 2;

  nextCtx.fillStyle = nextPiece.color;

  for (let row = 0; row < nextPiece.shape.length; row++) {
    for (let col = 0; col < nextPiece.shape[row].length; col++) {
      if (nextPiece.shape[row][col]) {
        nextCtx.fillRect(
          offsetX + col * 20,
          offsetY + row * 20,
          20,
          20
        );
        nextCtx.strokeStyle = '#000';
        nextCtx.lineWidth = 1;
        nextCtx.strokeRect(
          offsetX + col * 20,
          offsetY + row * 20,
          20,
          20
        );
      }
    }
  }
}

// 衝突判定
function checkCollision(shape, x, y) {
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        const newX = x + col;
        const newY = y + row;

        // 壁との衝突
        if (newX < 0 || newX >= COLS || newY >= ROWS) {
          return true;
        }

        // 既存のブロックとの衝突
        if (newY >= 0 && board[newY][newX]) {
          return true;
        }
      }
    }
  }
  return false;
}

// ミノの固定
function lockPiece() {
  for (let row = 0; row < currentPiece.shape.length; row++) {
    for (let col = 0; col < currentPiece.shape[row].length; col++) {
      if (currentPiece.shape[row][col]) {
        const y = currentPiece.y + row;
        const x = currentPiece.x + col;

        if (y >= 0) {
          board[y][x] = currentPiece.color;
        }
      }
    }
  }
}

// ラインのクリア
function clearLines() {
  let linesCleared = 0;

  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row].every(cell => cell !== 0)) {
      board.splice(row, 1);
      board.unshift(Array(COLS).fill(0));
      linesCleared++;
      row++; // 同じ行をもう一度チェック
    }
  }

  if (linesCleared > 0) {
    lines += linesCleared;

    // スコア計算
    const lineScores = [0, 100, 300, 500, 800];
    score += lineScores[linesCleared] * level;

    // レベルアップ
    level = Math.floor(lines / 10) + 1;
    dropSpeed = Math.max(100, INITIAL_SPEED - (level - 1) * 50);

    updateScore();
  }
}

// ミノの回転
function rotate(shape, clockwise = true) {
  const N = shape.length;
  const rotated = Array(N).fill().map(() => Array(N).fill(0));

  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      if (clockwise) {
        rotated[col][N - 1 - row] = shape[row][col];
      } else {
        rotated[N - 1 - col][row] = shape[row][col];
      }
    }
  }

  return rotated;
}

// ミノの移動
function movePiece(dx, dy) {
  if (!currentPiece) return false;

  const newX = currentPiece.x + dx;
  const newY = currentPiece.y + dy;

  if (!checkCollision(currentPiece.shape, newX, newY)) {
    currentPiece.x = newX;
    currentPiece.y = newY;
    return true;
  }

  return false;
}

// ミノの回転（壁蹴り対応）
function rotatePiece(clockwise = true) {
  if (!currentPiece) return;

  const rotated = rotate(currentPiece.shape, clockwise);
  const originalX = currentPiece.x;

  // 回転後の位置調整（壁蹴り）
  const kicks = [0, 1, -1, 2, -2];

  for (let kick of kicks) {
    if (!checkCollision(rotated, currentPiece.x + kick, currentPiece.y)) {
      currentPiece.shape = rotated;
      currentPiece.x += kick;
      return;
    }
  }
}

// ハードドロップ
function hardDrop() {
  if (!currentPiece) return;

  let dropDistance = 0;
  while (!checkCollision(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
    currentPiece.y++;
    dropDistance++;
  }

  score += dropDistance * 2;
  updateScore();
  lockPiece();
  clearLines();
  spawnNewPiece();
}

// 新しいミノの生成
function spawnNewPiece() {
  currentPiece = nextPiece || randomTetromino();
  nextPiece = randomTetromino();

  drawNextPiece();

  if (checkCollision(currentPiece.shape, currentPiece.x, currentPiece.y)) {
    gameOver();
  }
}

// スコア更新
function updateScore() {
  document.getElementById('score').textContent = score;
  document.getElementById('lines').textContent = lines;
  document.getElementById('level').textContent = level;
}

// ゲームループ
function update(time = 0) {
  if (!gameRunning) return;

  const deltaTime = time - lastTime;
  lastTime = time;

  dropTime += deltaTime;

  const currentDropSpeed = softDropping ? Math.max(50, dropSpeed / 10) : dropSpeed;

  if (dropTime > currentDropSpeed) {
    if (!movePiece(0, 1)) {
      lockPiece();
      clearLines();
      spawnNewPiece();
    }
    dropTime = 0;
  }

  draw();
  gameLoop = requestAnimationFrame(update);
}

// 描画
function draw() {
  drawBoard();
  drawGhost(currentPiece);
  drawPiece(currentPiece);
}

// ゲーム開始
function startGame() {
  initBoard();
  score = 0;
  lines = 0;
  level = 1;
  dropSpeed = INITIAL_SPEED;
  dropTime = 0;
  lastTime = 0;
  softDropping = false;

  updateScore();

  nextPiece = randomTetromino();
  spawnNewPiece();

  gameRunning = true;
  document.getElementById('gameOver').classList.add('hidden');
  document.getElementById('startButton').textContent = 'ゲーム中...';
  document.getElementById('startButton').disabled = true;

  gameLoop = requestAnimationFrame(update);
}

// ゲームオーバー
function gameOver() {
  gameRunning = false;
  if (gameLoop) {
    cancelAnimationFrame(gameLoop);
  }

  document.getElementById('finalScore').textContent = score;
  document.getElementById('gameOver').classList.remove('hidden');
  document.getElementById('startButton').textContent = 'ゲーム開始';
  document.getElementById('startButton').disabled = false;
}

// キーボード入力
const keys = {};

document.addEventListener('keydown', (e) => {
  if (!gameRunning) return;

  // 同じキーの連続入力を防ぐ
  if (keys[e.key]) return;
  keys[e.key] = true;

  switch(e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      movePiece(-1, 0);
      break;
    case 'ArrowRight':
      e.preventDefault();
      movePiece(1, 0);
      break;
    case 'ArrowUp':
      e.preventDefault();
      rotatePiece(true);
      break;
    case 'ArrowDown':
      e.preventDefault();
      softDropping = true;
      break;
    case 'z':
    case 'Z':
      e.preventDefault();
      rotatePiece(false);
      break;
    case ' ':
      e.preventDefault();
      hardDrop();
      break;
  }

  draw();
});

document.addEventListener('keyup', (e) => {
  keys[e.key] = false;

  if (e.key === 'ArrowDown') {
    softDropping = false;
  }
});

// ボタンのイベントリスナー
document.getElementById('startButton').addEventListener('click', startGame);
document.getElementById('restartButton').addEventListener('click', startGame);

// 初期描画
drawBoard();
drawNextPiece();
