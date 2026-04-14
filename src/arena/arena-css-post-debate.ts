/**
 * Arena CSS — post-debate screen (verdict, scores, actions) + AI judging + scorecard
 */

export function injectPostDebateCSS(): void {
  const style = document.createElement('style');
  style.textContent = `
    /* POST-DEBATE */
    .arena-post { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 32px 20px; text-align: center; }
    .arena-post-verdict { font-size: 48px; margin-bottom: 12px; }
    .arena-post-title { font-family: var(--mod-font-ui); font-size: 11px; font-weight: 600; letter-spacing: 3px; color: var(--mod-text-muted); text-transform: uppercase; margin-bottom: 8px; }
    .arena-post-topic { font-size: 14px; color: var(--mod-text-body); margin-bottom: 20px; }
    .arena-post-score { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .arena-post-side { text-align: center; }
    .arena-post-side-label { font-size: 11px; color: var(--mod-text-muted); letter-spacing: 1px; margin-bottom: 4px; }
    .arena-clickable-opp { color: var(--mod-accent); cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
    .arena-post-side-score { font-family: var(--mod-font-ui); font-size: 32px; font-weight: 700; }
    .arena-post-side-score.winner { color: var(--mod-accent); }
    .arena-post-side-score.loser { color: var(--mod-text-muted); }
    .arena-post-divider { font-family: var(--mod-font-ui); font-size: 14px; color: var(--mod-text-muted); letter-spacing: 1px; }
    .arena-post-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
    .arena-post-btn { padding: 12px 24px; border-radius: var(--mod-radius-pill); border: none; font-family: var(--mod-font-ui); font-size: 12px; font-weight: 600; letter-spacing: 1.5px; cursor: pointer; text-transform: uppercase; }
    .arena-post-btn.primary { background: var(--mod-bar-accent); background-image: var(--mod-gloss); color: var(--mod-text-on-accent); }
    .arena-post-btn.secondary { background: none; border: 1px solid var(--mod-border-primary); color: var(--mod-text-body); }
    .arena-post-btn:active { transform: scale(0.96); }

    /* AI JUDGING STATE */
    .arena-judging { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 40px 20px; text-align: center; }
    .arena-judging-icon { font-size: 56px; margin-bottom: 16px; animation: arenaJudgePulse 2s ease-in-out infinite; }
    .arena-judging-text { font-family: var(--mod-font-ui); font-size: 13px; font-weight: 600; letter-spacing: 3px; color: var(--mod-text-body); text-transform: uppercase; margin-bottom: 8px; }
    .arena-judging-sub { font-size: 12px; color: var(--mod-text-muted); margin-bottom: 20px; }
    @keyframes arenaJudgePulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } }

    /* AI SCORECARD */
    .ai-scorecard { width: 100%; max-width: 380px; margin: 0 auto 20px; text-align: left; }
    .ai-scorecard-header { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 16px; padding: 12px 16px; border-radius: var(--mod-radius-md); background: var(--mod-bg-card); border: 1px solid var(--mod-border-primary); }
    .ai-scorecard-side { text-align: center; min-width: 80px; }
    .ai-scorecard-name { font-size: 11px; color: var(--mod-text-muted); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
    .ai-scorecard-total { font-family: var(--mod-font-ui); font-size: 28px; font-weight: 700; }
    .ai-scorecard-total.winner { color: var(--mod-accent); }
    .ai-scorecard-total.loser { color: var(--mod-text-muted); }
    .ai-scorecard-vs { font-family: var(--mod-font-ui); font-size: 11px; color: var(--mod-text-muted); letter-spacing: 2px; }
    .ai-scorecard-breakdown { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
    .ai-score-criterion { padding: 10px 14px; border-radius: var(--mod-radius-md); background: var(--mod-bg-card); border: 1px solid var(--mod-border-primary); }
    .ai-score-criterion-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .ai-score-criterion-label { font-size: 12px; font-weight: 600; color: var(--mod-text-body); letter-spacing: 0.5px; }
    .ai-score-criterion-nums { font-family: var(--mod-font-ui); font-size: 13px; font-weight: 700; color: var(--mod-text-muted); }
    .ai-score-bars { display: flex; flex-direction: column; gap: 3px; margin-bottom: 6px; }
    .ai-score-bar { height: 6px; border-radius: 3px; min-width: 4px; transition: width 0.8s ease; }
    .ai-score-bar.mine { background: var(--mod-accent); }
    .ai-score-bar.theirs { background: var(--mod-bar-secondary); opacity: 0.5; }
    .ai-score-reason { font-size: 11px; color: var(--mod-text-muted); line-height: 1.4; font-style: italic; }
    .ai-scorecard-verdict { text-align: center; font-size: 13px; color: var(--mod-text-body); font-weight: 500; padding: 10px 16px; border-radius: var(--mod-radius-md); background: var(--mod-bg-card); border: 1px solid var(--mod-border-primary); line-height: 1.4; }
  `;
  document.head.appendChild(style);
}
