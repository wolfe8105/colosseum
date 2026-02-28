// ============================================================
// COLOSSEUM SHARE CARD GENERATOR (Items 16.5.2, 16.5.3)
// Generates ESPN-style debate result cards as shareable images.
// Every output carries "Powered by The Colosseum" watermark.
// 
// Usage:
//   const blob = await ColosseumCards.generateResultCard({
//     topic: 'Is Mahomes better than Allen?',
//     category: 'SPORTS',
//     yesPct: 67,
//     totalVotes: 3241,
//     winner: 'yes', // or 'no' or null for ongoing
//     userSide: 'yes', // what the sharer voted
//   });
//   // blob is a PNG Blob — download or share
//
// Sizes:
//   'og'      → 1200x630  (Open Graph / link previews)
//   'story'   → 1080x1920 (Instagram/TikTok Stories)
//   'twitter'  → 1200x675  (X/Twitter)
//   'square'  → 1080x1080 (Instagram feed)
// ============================================================

window.ColosseumCards = (() => {

  const SIZES = {
    og:      { w: 1200, h: 630 },
    story:   { w: 1080, h: 1920 },
    twitter: { w: 1200, h: 675 },
    square:  { w: 1080, h: 1080 },
  };

  // Brand colors
  const C = {
    navy:    '#0a1628',
    navyMid: '#1a2d4a',
    blue:    '#2d5a8e',
    skyBlue: '#5b8abf',
    red:     '#cc2936',
    gold:    '#d4a843',
    white:   '#f0f0f0',
    dimWhite:'#a0a8b8',
    yesSide: '#3b82f6',
    noSide:  '#ef4444',
  };

  // Draw rounded rect helper
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // Generate the card
  async function generateResultCard(opts = {}, size = 'og') {
    const {
      topic = 'Debate Topic',
      category = 'TRENDING',
      yesPct = 50,
      totalVotes = 0,
      winner = null,
      userSide = null,
    } = opts;

    const dim = SIZES[size] || SIZES.og;
    const canvas = document.createElement('canvas');
    canvas.width = dim.w;
    canvas.height = dim.h;
    const ctx = canvas.getContext('2d');
    const isVertical = dim.h > dim.w;
    const scale = dim.w / 1200; // relative to OG size

    // ── Background gradient ──
    const grad = ctx.createLinearGradient(0, 0, dim.w, dim.h);
    grad.addColorStop(0, C.navy);
    grad.addColorStop(0.3, C.navyMid);
    grad.addColorStop(0.6, C.blue);
    grad.addColorStop(0.85, C.skyBlue);
    grad.addColorStop(1, '#3d5a80');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, dim.w, dim.h);

    // ── Subtle noise texture ──
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * dim.w;
      const y = Math.random() * dim.h;
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
      ctx.fillRect(x, y, 1, 1);
    }

    // ── Gold accent line at top ──
    const goldGrad = ctx.createLinearGradient(0, 0, dim.w, 0);
    goldGrad.addColorStop(0, C.gold);
    goldGrad.addColorStop(0.5, C.red);
    goldGrad.addColorStop(1, C.gold);
    ctx.fillStyle = goldGrad;
    ctx.fillRect(0, 0, dim.w, 4 * scale);

    // ── Main card area ──
    const cardPad = 60 * scale;
    const cardY = isVertical ? dim.h * 0.2 : 50 * scale;
    const cardH = isVertical ? dim.h * 0.55 : dim.h - 100 * scale;
    const cardW = dim.w - cardPad * 2;

    // Glass card background
    roundRect(ctx, cardPad, cardY, cardW, cardH, 24 * scale);
    ctx.fillStyle = 'rgba(10, 17, 40, 0.65)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();

    // ── Category tag ──
    const catY = cardY + 40 * scale;
    ctx.font = `bold ${14 * scale}px sans-serif`;
    ctx.fillStyle = C.gold;
    ctx.textAlign = 'center';
    ctx.letterSpacing = `${3 * scale}px`;
    ctx.fillText(category.toUpperCase(), dim.w / 2, catY);

    // ── Topic text ──
    const topicY = catY + 36 * scale;
    const topicFontSize = Math.min(36 * scale, (cardW - 80 * scale) / (topic.length * 0.45));
    ctx.font = `900 ${Math.max(topicFontSize, 20 * scale)}px serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';

    // Word wrap
    const maxWidth = cardW - 60 * scale;
    const words = topic.split(' ');
    let lines = [];
    let currentLine = '';
    words.forEach(word => {
      const test = currentLine + (currentLine ? ' ' : '') + word;
      if (ctx.measureText(test).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = test;
      }
    });
    if (currentLine) lines.push(currentLine);

    const lineHeight = Math.max(topicFontSize, 20 * scale) * 1.2;
    lines.forEach((line, i) => {
      ctx.fillText(line, dim.w / 2, topicY + i * lineHeight);
    });

    // ── Vote bar ──
    const noPct = 100 - yesPct;
    const barY = topicY + lines.length * lineHeight + 30 * scale;
    const barX = cardPad + 30 * scale;
    const barW = cardW - 60 * scale;
    const barH = 16 * scale;

    // Labels
    ctx.font = `bold ${18 * scale}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = C.yesSide;
    ctx.fillText(`YES ${yesPct}%`, barX, barY - 8 * scale);
    ctx.textAlign = 'right';
    ctx.fillStyle = C.noSide;
    ctx.fillText(`NO ${noPct}%`, barX + barW, barY - 8 * scale);

    // Track
    roundRect(ctx, barX, barY, barW, barH, barH / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fill();

    // Yes fill
    if (yesPct > 0) {
      const yesW = (yesPct / 100) * barW;
      roundRect(ctx, barX, barY, Math.max(yesW, barH), barH, barH / 2);
      const yesGrad = ctx.createLinearGradient(barX, 0, barX + yesW, 0);
      yesGrad.addColorStop(0, '#2563eb');
      yesGrad.addColorStop(1, '#3b82f6');
      ctx.fillStyle = yesGrad;
      ctx.fill();
    }

    // No fill
    if (noPct > 0) {
      const noW = (noPct / 100) * barW;
      const noX = barX + barW - noW;
      roundRect(ctx, Math.min(noX, barX + barW - barH), barY, Math.max(noW, barH), barH, barH / 2);
      const noGrad = ctx.createLinearGradient(noX, 0, barX + barW, 0);
      noGrad.addColorStop(0, '#ef4444');
      noGrad.addColorStop(1, '#dc2626');
      ctx.fillStyle = noGrad;
      ctx.fill();
    }

    // Vote count
    ctx.font = `500 ${13 * scale}px sans-serif`;
    ctx.fillStyle = C.dimWhite;
    ctx.textAlign = 'center';
    ctx.fillText(totalVotes.toLocaleString() + ' votes', dim.w / 2, barY + barH + 22 * scale);

    // ── Winner/user badge ──
    if (winner || userSide) {
      const badgeY = barY + barH + 44 * scale;
      const badgeText = winner
        ? (userSide === winner ? '🏆 YOU CALLED IT' : '⚔️ FINAL RESULT')
        : (userSide ? `YOU VOTED ${userSide.toUpperCase()}` : '');

      if (badgeText) {
        ctx.font = `bold ${14 * scale}px sans-serif`;
        const badgeW = ctx.measureText(badgeText).width + 28 * scale;
        roundRect(ctx, dim.w / 2 - badgeW / 2, badgeY - 14 * scale, badgeW, 28 * scale, 14 * scale);
        ctx.fillStyle = winner && userSide === winner ? 'rgba(212,168,67,0.25)' : 'rgba(255,255,255,0.08)';
        ctx.fill();
        ctx.strokeStyle = winner && userSide === winner ? C.gold : 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1 * scale;
        ctx.stroke();

        ctx.fillStyle = winner && userSide === winner ? C.gold : C.dimWhite;
        ctx.textAlign = 'center';
        ctx.fillText(badgeText, dim.w / 2, badgeY + 4 * scale);
      }
    }

    // ── Watermark (Item 16.5.2) — ALWAYS present ──
    const wmY = isVertical ? dim.h - 80 * scale : dim.h - 24 * scale;
    ctx.font = `600 ${13 * scale}px sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'center';
    ctx.fillText('⚔️  Settle YOUR debate → thecolosseum.app', dim.w / 2, wmY);

    // ── Colosseum logo/name ──
    if (isVertical) {
      // Top branding for stories
      ctx.font = `900 ${28 * scale}px serif`;
      ctx.fillStyle = C.gold;
      ctx.textAlign = 'center';
      ctx.fillText('THE COLOSSEUM', dim.w / 2, dim.h * 0.1);
      ctx.font = `500 ${14 * scale}px sans-serif`;
      ctx.fillStyle = C.dimWhite;
      ctx.fillText('Where opinions fight.', dim.w / 2, dim.h * 0.1 + 26 * scale);
    } else {
      // Corner branding for landscape
      ctx.font = `900 ${20 * scale}px serif`;
      ctx.fillStyle = C.gold;
      ctx.textAlign = 'left';
      ctx.fillText('THE COLOSSEUM', cardPad + 4, dim.h - 20 * scale);
    }

    // Convert to blob
    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), 'image/png');
    });
  }

  // Download card
  async function downloadCard(opts, size = 'og', filename) {
    const blob = await generateResultCard(opts, size);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `colosseum-${opts.topic?.replace(/\s+/g,'-').toLowerCase() || 'debate'}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Share card via Web Share API
  async function shareCard(opts, size = 'og') {
    const blob = await generateResultCard(opts, size);
    const file = new File([blob], 'colosseum-debate.png', { type: 'image/png' });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: opts.topic + ' | The Colosseum',
          text: `${opts.yesPct}% say YES — Cast your vote ⚔️`,
          url: 'https://colosseum-six.vercel.app/debate?topic=' + (opts.slug || ''),
          files: [file],
        });
        return true;
      } catch(e) { /* user cancelled */ }
    }

    // Fallback: download
    await downloadCard(opts, size);
    return false;
  }

  // Generate default OG card (for static deployment)
  async function generateDefaultOG() {
    return generateResultCard({
      topic: 'Where Opinions Fight.',
      category: 'THE COLOSSEUM',
      yesPct: 50,
      totalVotes: 0,
      winner: null,
      userSide: null,
    }, 'og');
  }

  return {
    generateResultCard,
    downloadCard,
    shareCard,
    generateDefaultOG,
    SIZES,
  };

})();
