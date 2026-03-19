// ============================================================
// THE COLOSSEUM — SERVER-SIDE CARD GENERATOR
// Ports colosseum-cards.js (browser) to Node.js for bot army.
// Uses `canvas` npm package (node-canvas) — same API as browser.
// Generates PNG buffers for Bluesky image posts.
// Session 77.
// ============================================================
const { createCanvas } = require('canvas');

// Colors matching design system (from colosseum-cards.js)
const COLORS = {
  bg1: '#1a2d4a',
  bg2: '#2d5a8e',
  bg3: '#0a1628',
  gold: '#d4a843',
  goldDim: '#b8922e',
  red: '#cc2936',
  green: '#2ecc71',
  white: '#f0f0f0',
  whiteDim: '#a0a8b8',
  cardBg: 'rgba(10, 17, 40, 0.85)',
};

// OG size is best for Bluesky feed display (1200x630)
const W = 1200;
const H = 630;
const scale = 1; // W/1200

function truncLabel(str, max) {
  const s = String(str ?? '');
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';

  words.forEach(word => {
    const test = line + (line ? ' ' : '') + word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);

  // Max 3 lines, truncate with ellipsis
  if (lines.length > 3) {
    lines.length = 3;
    lines[2] = lines[2].replace(/\s+\S*$/, '') + '…';
  }

  return lines;
}

/**
 * Generate a debate card as a PNG buffer.
 * @param {Object} opts
 * @param {string} opts.topic - Debate topic text
 * @param {string} opts.sideA - Side A label (default "For")
 * @param {string} opts.sideB - Side B label (default "Against")
 * @param {number} opts.scoreA - Score/votes for side A
 * @param {number} opts.scoreB - Score/votes for side B
 * @param {string} [opts.category] - Optional category label
 * @returns {Buffer} PNG image buffer (under 1MB for Bluesky)
 */
function generateCardBuffer(opts) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const sideA = truncLabel(opts.sideA || 'For', 30);
  const sideB = truncLabel(opts.sideB || 'Against', 30);

  // --- Background gradient ---
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#1a2d4a');
  grad.addColorStop(0.3, '#2d5a8e');
  grad.addColorStop(0.6, '#5b8abf');
  grad.addColorStop(0.85, '#3d5a80');
  grad.addColorStop(1, '#1a2d4a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // --- Subtle radial overlay ---
  const rGrad = ctx.createRadialGradient(W * 0.3, H * 0.3, 0, W * 0.3, H * 0.3, W * 0.7);
  rGrad.addColorStop(0, 'rgba(212, 168, 67, 0.06)');
  rGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = rGrad;
  ctx.fillRect(0, 0, W, H);

  // --- Glass card ---
  const pad = 40;
  const cardX = pad;
  const cardY = pad + 20;
  const cardW = W - pad * 2;
  const cardH = H - pad * 2 - 60;
  const radius = 24;

  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, cardH, radius);
  ctx.fillStyle = 'rgba(10, 17, 40, 0.7)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // --- Branding top ---
  const brandY = cardY + 36;
  ctx.fillStyle = COLORS.goldDim;
  ctx.font = '400 12px serif';
  ctx.textAlign = 'center';
  // node-canvas doesn't support letterSpacing — skip it
  ctx.fillText('T H E', W / 2, brandY);
  ctx.fillStyle = COLORS.gold;
  ctx.font = '700 22px serif';
  ctx.fillText('C O L O S S E U M', W / 2, brandY + 24);

  // --- Divider ---
  const divY = brandY + 42;
  ctx.strokeStyle = 'rgba(212, 168, 67, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + cardW * 0.2, divY);
  ctx.lineTo(cardX + cardW * 0.8, divY);
  ctx.stroke();

  // --- Category label (if provided) ---
  let topicStartY = divY + 32;
  if (opts.category) {
    ctx.fillStyle = COLORS.goldDim;
    ctx.font = '400 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(opts.category).toUpperCase(), W / 2, topicStartY);
    topicStartY += 24;
  }

  // --- Topic text (wrapped) ---
  ctx.fillStyle = COLORS.white;
  ctx.font = '700 28px serif';
  ctx.textAlign = 'center';
  const topicLines = wrapText(ctx, opts.topic || 'Debate Topic', cardW - 60);
  topicLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, topicStartY + i * 34);
  });

  // --- Vote bar ---
  const scoreA = Number(opts.scoreA) || 0;
  const scoreB = Number(opts.scoreB) || 0;
  const total = scoreA + scoreB;
  const aPct = total > 0 ? Math.round((scoreA / total) * 100) : 50;
  const bPct = 100 - aPct;

  const barY = topicStartY + topicLines.length * 34 + 30;
  const barH = 40;
  const barX = cardX + 30;
  const barW = cardW - 60;
  const barRadius = 8;

  // Bar background
  ctx.save();
  roundRect(ctx, barX, barY, barW, barH, barRadius);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fill();
  ctx.restore();

  // Side A fill (green)
  const aW = Math.max((barW * aPct) / 100, barRadius * 2);
  ctx.save();
  roundRect(ctx, barX, barY, aW, barH, barRadius);
  ctx.fillStyle = 'rgba(46, 204, 113, 0.3)';
  ctx.fill();
  ctx.restore();

  // Bar labels
  ctx.font = '700 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.green;
  ctx.fillText(`${aPct}%`, barX + 12, barY + barH / 2 + 6);

  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.red;
  ctx.fillText(`${bPct}%`, barX + barW - 12, barY + barH / 2 + 6);

  // --- Side labels ---
  const labelY = barY + barH + 24;
  ctx.font = '700 16px serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.white;
  ctx.fillText(sideA, barX, labelY);

  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.goldDim;
  ctx.font = '400 12px serif';
  ctx.fillText('VS', W / 2, labelY);

  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.white;
  ctx.font = '700 16px serif';
  ctx.fillText(sideB, barX + barW, labelY);

  // --- Vote count ---
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.whiteDim;
  ctx.font = '400 13px sans-serif';
  ctx.fillText(`${total.toLocaleString()} votes`, W / 2, labelY + 26);

  // --- Winner badge ---
  if (aPct !== bPct) {
    const winner = aPct > bPct ? sideA : sideB;
    const badgeY = labelY + 50;
    const badgeW = 220;
    const badgeH = 32;

    ctx.save();
    roundRect(ctx, W / 2 - badgeW / 2, badgeY, badgeW, badgeH, badgeH / 2);
    ctx.fillStyle = 'rgba(212, 168, 67, 0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(212, 168, 67, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = COLORS.gold;
    ctx.font = '700 14px serif';
    ctx.textAlign = 'center';
    ctx.fillText(`WINNER: ${winner}`, W / 2, badgeY + badgeH / 2 + 5);
  }

  // --- Watermark ---
  const wmY = H - 20;
  ctx.fillStyle = 'rgba(160, 168, 184, 0.5)';
  ctx.font = '400 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('thecolosseum.app — Cast YOUR vote', W / 2, wmY);

  // --- AI Debate label ---
  ctx.fillStyle = 'rgba(160, 168, 184, 0.35)';
  ctx.font = '400 10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('AI-Generated Debate', cardX + 16, H - 20);

  // Return PNG buffer
  return canvas.toBuffer('image/png');
}

module.exports = { generateCardBuffer };
