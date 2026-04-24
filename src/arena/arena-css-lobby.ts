/**
 * Arena CSS — lobby section (hero, stats, cards, challenge CTA, empty state)
 */

export function injectLobbyCSS(): void {
  const style = document.createElement('style');
  style.textContent = `
    /* LOBBY */
    .arena-lobby { padding: var(--mod-space-lg); padding-bottom: 80px; }
    .arena-hero { padding: var(--mod-space-xl) var(--mod-space-lg) var(--mod-space-lg); }
    .arena-hero-title { font-family: var(--mod-font-ui); font-size: 11px; font-weight: 600; letter-spacing: 3px; color: var(--mod-text-muted); text-transform: uppercase; margin-bottom: var(--mod-space-xs); }
    .arena-hero-sub { font-size: 13px; color: var(--mod-text-body); margin-bottom: var(--mod-space-lg); line-height: 1.5; }
    .arena-stat-row { display: flex; gap: var(--mod-space-sm); margin-bottom: var(--mod-space-lg); }
    .arena-stat { flex: 1; background: var(--mod-stat-bg); border: 1px solid var(--mod-stat-border); border-radius: var(--mod-radius-md); padding: var(--mod-space-md); text-align: center; }
    .arena-stat-value { font-family: var(--mod-font-ui); font-size: var(--mod-font-stat-size); font-weight: var(--mod-font-stat-weight); color: var(--mod-stat-value); }
    .arena-stat-label { font-size: var(--mod-font-stat-label-size); font-weight: var(--mod-font-stat-label-weight); letter-spacing: var(--mod-font-stat-label-spacing); color: var(--mod-stat-label); text-transform: uppercase; margin-top: 2px; }
    .arena-stat.accent { background: var(--mod-stat-accent-bg); border-color: var(--mod-stat-accent-border); }
    .arena-stat.accent .arena-stat-value { color: var(--mod-stat-accent-value); }
    .arena-stat.accent .arena-stat-label { color: var(--mod-stat-accent-label); }
    .arena-enter-btn { display: flex; align-items: center; justify-content: center; width: 100%; padding: 14px; border-radius: var(--mod-radius-pill); border: none; background: var(--mod-bar-accent); background-image: var(--mod-gloss); color: var(--mod-text-on-accent); font-family: var(--mod-font-ui); font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; cursor: pointer; min-height: var(--mod-touch-min); -webkit-tap-highlight-color: transparent; transition: background-color 0.1s; }
    .arena-enter-btn:active { background-color: var(--mod-accent-hover); }
    .arena-enter-btn .btn-pulse { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.6); animation: livePulse 1.5s ease-in-out infinite; margin-right: 8px; }
    .arena-btn-row { display: flex; gap: var(--mod-space-sm); margin-top: var(--mod-space-sm); }
    .arena-secondary-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px; border-radius: var(--mod-radius-pill); border: 1px solid var(--mod-border-primary); background: var(--mod-bg-card); color: var(--mod-text-body); font-family: var(--mod-font-ui); font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; min-height: var(--mod-touch-min); -webkit-tap-highlight-color: transparent; }
    .arena-secondary-btn:active { background: var(--mod-bg-card-active); }

    /* SECTION HEADERS */
    .arena-section { margin-top: var(--mod-space-xl); }
    .arena-section-title { font-family: var(--mod-font-ui); font-size: 7px; font-weight: 600; letter-spacing: 1px; color: var(--mod-text-muted); text-transform: uppercase; margin-bottom: var(--mod-space-sm); display: flex; align-items: center; gap: 6px; }
    .arena-section-title .section-dot { width: 5px; height: 5px; border-radius: 50%; }
    .arena-section-title .live-dot { background: var(--mod-status-live); animation: livePulse 1.5s ease-in-out infinite; }
    .arena-section-title .gold-dot { background: var(--mod-bar-secondary); }

    /* DEBATE CARDS (lobby) */
    .arena-card { background: var(--mod-bg-card); border: 1px solid var(--mod-border-primary); border-left: var(--mod-card-bar-width) solid var(--mod-bar-secondary); border-radius: var(--mod-radius-md); padding: var(--mod-space-md) var(--mod-space-lg); margin-bottom: var(--mod-space-sm); cursor: pointer; transition: background var(--mod-transition-fast); -webkit-tap-highlight-color: transparent; }
    .arena-card:active { background: var(--mod-bg-card-hover); }
    .arena-card.card-live { border-left-color: var(--mod-status-live); }
    .arena-card.card-ai { border-left-color: var(--mod-status-open); }
    .arena-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .arena-card-badge { font-family: var(--mod-font-ui); font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; padding: 2px 8px; border-radius: var(--mod-radius-pill); }
    .arena-card-badge.live { background: var(--mod-status-live-bg); color: var(--mod-status-live); border: 1px solid var(--mod-accent-border); }
    .arena-card-badge.verdict { background: var(--mod-status-waiting-bg); color: var(--mod-text-sub); border: 1px solid var(--mod-border-secondary); }
    .arena-card-badge.ai { background: var(--mod-status-open-bg); color: var(--mod-status-open); border: 1px solid rgba(93,202,165,0.2); }
    .arena-card-badge.text { background: var(--mod-status-waiting-bg); color: var(--mod-text-sub); border: 1px solid var(--mod-border-secondary); }
    .arena-card-meta { font-size: 10px; color: var(--mod-text-muted); }
    .arena-card-topic { font-family: var(--mod-font-ui); font-size: var(--mod-font-card-title-size); font-weight: var(--mod-font-card-title-weight); color: var(--mod-text-primary); letter-spacing: var(--mod-font-card-title-spacing); line-height: 1.35; margin-bottom: 6px; }
    .arena-card-vs { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--mod-text-muted); }
    .arena-card-vs .vs { color: var(--mod-accent); font-family: var(--mod-font-ui); font-weight: 700; letter-spacing: 1px; font-size: 10px; }
    .arena-card-score { font-family: var(--mod-font-ui); font-weight: 700; color: var(--mod-text-sub); }
    .arena-card-action { display: flex; justify-content: flex-end; margin-top: var(--mod-space-sm); }
    .arena-card-btn { padding: 6px 14px; border-radius: var(--mod-radius-pill); border: 1px solid var(--mod-border-accent); background: var(--mod-accent-muted); color: var(--mod-accent-text); font-family: var(--mod-font-ui); font-size: 10px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; }
    .arena-card-btn:active { background: rgba(231,68,42,0.2); }

    /* F-77 REDESIGN: HERO IMAGE (full bleed, top of card) */
    .feed-card-hero-link { display: block; text-decoration: none; margin: calc(-1 * var(--mod-space-md)) calc(-1 * var(--mod-space-lg)) var(--mod-space-sm); overflow: hidden; border-radius: var(--mod-radius-md) var(--mod-radius-md) 0 0; position: relative; }
    .feed-card-hero-img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
    .feed-card-hero-domain { position: absolute; bottom: 6px; left: 10px; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); color: rgba(255,255,255,0.85); font-family: var(--mod-font-ui); font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; padding: 2px 7px; border-radius: 4px; }

    /* BADGE ROW — replaces arena-card-top */
    .feed-card-badges { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; }

    /* FOOTER — avatars + action button */
    .feed-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: var(--mod-space-sm); }
    .feed-card-avatars { display: flex; align-items: center; gap: 6px; min-width: 0; flex: 1; overflow: hidden; }
    .feed-card-avatar { width: 26px; height: 26px; border-radius: 50%; background: var(--mod-bg-inset); border: 2px solid var(--mod-border-primary); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--mod-text-muted); flex-shrink: 0; text-transform: uppercase; }
    .feed-card-avatar-name { font-size: 12px; font-weight: 600; color: var(--mod-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80px; }
    .feed-card-vs-pill { font-family: var(--mod-font-ui); font-size: 9px; font-weight: 700; letter-spacing: 1px; color: var(--mod-accent); flex-shrink: 0; }

    /* F-62: LINK CARD PREVIEW (legacy — kept for arena lobby cards) */
    .arena-card-link-preview { display: block; text-decoration: none; border: 1px solid var(--mod-border-subtle); border-radius: var(--mod-radius-sm); overflow: hidden; margin-bottom: 8px; background: var(--mod-bg-inset); transition: border-color var(--mod-transition-fast); }
    .arena-card-link-preview:active { border-color: var(--mod-accent); }
    .arena-card-link-img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
    .arena-card-link-meta { padding: 6px 10px; }
    .arena-card-link-domain { font-family: var(--mod-font-ui); font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--mod-text-muted); }
    .arena-card-link-title { font-size: 12px; color: var(--mod-text-body); line-height: 1.3; margin-top: 2px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

    /* F-62: Mode-select link input preview */
    .arena-link-card-preview { border: 1px solid var(--mod-border-subtle); border-radius: var(--mod-radius-sm); overflow: hidden; margin-top: 6px; background: var(--mod-bg-inset); }
    .arena-link-card-img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
    .arena-link-card-meta { padding: 6px 10px; }
    .arena-link-card-domain { font-family: var(--mod-font-ui); font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--mod-text-muted); }
    .arena-link-card-title { font-size: 12px; color: var(--mod-text-body); line-height: 1.3; margin-top: 2px; }

    /* CHALLENGE FLOW */
    .arena-challenge-cta { background: var(--mod-bg-card); border: 1px solid var(--mod-border-primary); border-left: var(--mod-card-bar-width) solid var(--mod-bar-accent); border-radius: var(--mod-radius-md); padding: var(--mod-space-lg); text-align: center; cursor: pointer; transition: background var(--mod-transition-fast); }
    .arena-challenge-cta:active { background: var(--mod-bg-card-hover); }
    .arena-challenge-icon { font-size: 24px; margin-bottom: 4px; }
    .arena-challenge-text { font-family: var(--mod-font-ui); font-size: 11px; font-weight: 600; letter-spacing: 2px; color: var(--mod-accent-text); text-transform: uppercase; }
    .arena-challenge-sub { font-size: 11px; color: var(--mod-text-muted); margin-top: 4px; }

    /* EMPTY STATE */
    .arena-empty { text-align: center; padding: var(--mod-space-2xl) var(--mod-space-lg); color: var(--mod-text-muted); font-size: 13px; }
    .arena-empty .empty-icon { font-size: 32px; margin-bottom: var(--mod-space-sm); display: block; opacity: 0.5; }

    @keyframes livePulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }
  `;
  document.head.appendChild(style);
}
