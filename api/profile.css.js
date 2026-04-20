// ============================================================
// THE MODERATOR — Profile Page CSS
// Split from api/profile.html.js (Session refactor)
//
// Exports: getProfileCSS
// ============================================================

export function getProfileCSS() {
  return `
:root {
  --bg-1:#000000;--bg-2:#0a0a10;--bg-3:#161c26;--bg-4:#1c2230;--bg-5:#0e0e14;
  --navy:#000000;--navy-light:#161c26;--navy-mid:#0a0a10;
  --card-bg:rgba(22,28,38,0.78);--card-border:rgba(255,255,255,0.22);--card-border-hover:rgba(255,255,255,0.4);
  --red:#ff1a75;--red-hover:#ff3d8e;--gold:#d4a843;--gold-dim:#b8922e;
  --cyan:#00ffee;--magenta:#ff1a75;
  --white:#e8eaf0;--white-dim:#7a8298;--success:#2ecc71;--error:#e74c3c;
  --font-display:'Cinzel',serif;--font-body:'Barlow Condensed',sans-serif;
  --safe-top:env(safe-area-inset-top,0px);--safe-bottom:env(safe-area-inset-bottom,0px);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{
  font-family:var(--font-body);color:var(--white);min-height:100dvh;
  background:var(--bg-1);overflow-y:auto;
  -webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;
  display:flex;flex-direction:column;align-items:center;
  padding:0 0 calc(40px + var(--safe-bottom));
}
body::before{content:'';position:fixed;inset:0;background:linear-gradient(135deg,#000000 0%,#0a0a10 25%,#161c26 50%,#0e0e14 70%,#000000 100%);z-index:-2}
body::after{content:'';position:fixed;inset:0;background:radial-gradient(ellipse at 30% 20%,rgba(0,255,238,0.03) 0%,transparent 50%),radial-gradient(ellipse at 70% 80%,rgba(255,26,117,0.03) 0%,transparent 50%);z-index:-1}

/* TOP BAR */
.top-bar{
  width:100%;padding:calc(12px + var(--safe-top)) 16px 12px;
  background:rgba(10,17,40,0.5);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border-bottom:1px solid rgba(255,255,255,0.08);
  display:flex;align-items:center;justify-content:space-between;
  position:sticky;top:0;z-index:100;
}
.logo{font-family:var(--font-display);font-size:16px;font-weight:700;letter-spacing:3px;color:var(--gold);text-transform:uppercase;text-decoration:none}
.logo .the{font-weight:400;color:var(--white-dim);font-size:11px;letter-spacing:4px;display:block;line-height:1;margin-bottom:-2px}
.join-btn{
  padding:8px 18px;border-radius:20px;border:1px solid var(--gold-dim);
  background:rgba(212,168,67,0.1);color:var(--gold);
  font-family:var(--font-body);font-size:14px;font-weight:600;letter-spacing:1px;
  cursor:pointer;transition:all 0.2s;text-decoration:none;
}
.join-btn:active{background:rgba(212,168,67,0.2);transform:scale(0.96)}

/* CONTAINER */
.container{width:100%;max-width:520px;padding:0 16px;display:flex;flex-direction:column;gap:16px;margin-top:24px}

/* PROFILE HEADER */
.profile-header{
  display:flex;flex-direction:column;align-items:center;gap:12px;
  padding:28px 20px 24px;
  background:var(--card-bg);border:1px solid var(--card-border);
  border-radius:16px;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
}
.avatar{
  width:80px;height:80px;border-radius:50%;
  background:linear-gradient(135deg,var(--gold-dim),var(--gold));
  display:flex;align-items:center;justify-content:center;
  font-family:var(--font-display);font-size:32px;font-weight:700;color:var(--navy);
  border:3px solid rgba(212,168,67,0.4);
}
.avatar img{width:100%;height:100%;border-radius:50%;object-fit:cover}
.profile-name{font-family:var(--font-display);font-size:22px;font-weight:700;letter-spacing:2px;text-align:center;color:var(--white)}
.profile-username{font-size:15px;color:var(--white-dim);letter-spacing:1px;margin-top:-6px}
.profile-bio{font-size:15px;color:var(--white-dim);text-align:center;line-height:1.4;max-width:360px;word-break:break-word}

/* RANK BADGE */
.rank-badge{
  display:inline-flex;align-items:center;gap:6px;
  padding:6px 16px;border-radius:20px;
  font-size:13px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;
}
.rank-badge.legendary{background:rgba(212,168,67,0.15);border:1px solid rgba(212,168,67,0.3);color:#d4a843}
.rank-badge.champion{background:rgba(212,168,67,0.12);border:1px solid rgba(212,168,67,0.25);color:#d4a843}
.rank-badge.contender{background:rgba(122,163,212,0.12);border:1px solid rgba(122,163,212,0.25);color:#7aa3d4}
.rank-badge.gladiator{background:rgba(91,138,191,0.12);border:1px solid rgba(91,138,191,0.25);color:#5b8abf}
.rank-badge.rookie{background:rgba(160,168,184,0.1);border:1px solid rgba(160,168,184,0.2);color:#a0a8b8}

/* ELO + RECORD */
.elo-display{
  font-family:var(--font-display);font-size:42px;font-weight:900;
  letter-spacing:3px;text-align:center;
}

/* STAT CARDS */
.stat-grid{
  display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;
}
.stat-card{
  background:var(--card-bg);border:1px solid var(--card-border);
  border-radius:12px;padding:14px 8px;text-align:center;
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
}
.stat-value{font-family:var(--font-display);font-size:22px;font-weight:700;letter-spacing:1px}
.stat-label{font-size:11px;color:var(--white-dim);letter-spacing:1.5px;text-transform:uppercase;margin-top:4px}

/* WIDE STAT ROW */
.stat-row{
  display:grid;grid-template-columns:1fr 1fr;gap:10px;
}

/* RECORD BAR */
.record-section{
  background:var(--card-bg);border:1px solid var(--card-border);
  border-radius:12px;padding:16px;
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
}
.record-header{font-size:12px;color:var(--white-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:12px}
.record-bar{
  display:flex;height:28px;border-radius:8px;overflow:hidden;
  background:rgba(255,255,255,0.05);
}
.record-bar .wins-seg{background:var(--success);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;letter-spacing:1px}
.record-bar .losses-seg{background:var(--red);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;letter-spacing:1px}
.record-bar .draws-seg{background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;letter-spacing:1px;color:var(--white-dim)}
.record-numbers{display:flex;justify-content:space-between;margin-top:10px;font-size:14px;font-weight:500}
.record-numbers .w{color:var(--success)}
.record-numbers .l{color:var(--red)}
.record-numbers .d{color:var(--white-dim)}

/* CTA BUTTONS */
.cta-row{display:flex;gap:10px}
.cta-btn{
  flex:1;padding:14px;border-radius:12px;text-align:center;
  font-family:var(--font-body);font-size:15px;font-weight:600;letter-spacing:1.5px;
  text-transform:uppercase;cursor:pointer;transition:all 0.2s;
  text-decoration:none;display:flex;align-items:center;justify-content:center;gap:8px;
}
.cta-btn:active{transform:scale(0.97)}
.cta-primary{background:var(--red);color:var(--white);border:none}
.cta-primary:hover{background:var(--red-hover)}
.cta-secondary{background:transparent;color:var(--gold);border:1px solid var(--gold-dim)}
.cta-secondary:hover{background:rgba(212,168,67,0.1)}

/* FOOTER */
.profile-footer{
  text-align:center;padding:20px 0 8px;
  font-size:12px;color:rgba(160,168,184,0.5);letter-spacing:1px;
}
.profile-footer a{color:var(--gold-dim);text-decoration:none}

/* MEMBER SINCE + LEVEL ROW */
.meta-row{
  display:flex;justify-content:center;gap:16px;
  font-size:13px;color:var(--white-dim);letter-spacing:0.5px;
}
.meta-row span{display:flex;align-items:center;gap:4px}
`;
}
