// ─── State ───────────────────────────────────────────────────────────────────
const output = document.getElementById('output');
const loginPanel = document.getElementById('login-panel');
const loginUser = document.getElementById('login-user');
const loginPass = document.getElementById('login-pass');
const inputArea = document.getElementById('input-area');
const cmdInput = document.getElementById('cmd-input');
const linkStatus = document.getElementById('link-status');
const linkDot = document.getElementById('link-dot');

let phase = 'boot'; // 'boot' | 'login' | 'shell'
let loginAttempts = 0;
let helpUsed = false;

const H_USER = '7f2253d7e228b22a08bda1f09c516f6fead81df6536eb02fa991a34bb38d9be8';
const H_PASS = '9a7d0627500e0ce9be45a3e077c22253b7122a524ffd4d62f650cf8cde596885';

const H_RELAY_KEYS = [
  'ea6a8bc051ff45d6d851abbfa6227e049df9ac5a17a9b070bfb3504f83aa8ac3',
  'c38f95d861d6d5a5c36ecbe913be5cc9f9d894cf55499cf3c6b6d1302b167992',
  '422bf520c52fac03620715f4ad282d3c5ff84eaf11662f5a7d987c0c0c23b365',
];
const relayedHashes = [];

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function addLine(text = '', cls = '') {
  const p = document.createElement('p');
  p.className = 'line' + (cls ? ' ' + cls : '');
  p.textContent = text;
  output.appendChild(p);
  output.scrollTop = output.scrollHeight;
  return p;
}

function gap() { addLine('', 'gap'); }

function sep() {
  addLine('──────────────────────────────────────────────────────────────', 'sep');
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function addIntegrityBar(pct, color = 'red') {
  const wrap = document.createElement('div');
  wrap.className = 'integrity-wrap';
  const fillColor = color === 'green' ? 'var(--green)' : 'var(--red)';
  wrap.innerHTML = `
    <div class="integrity-bar">
      <div class="integrity-fill" id="ifill" style="background:${fillColor}; box-shadow: 0 0 8px ${fillColor}"></div>
    </div>
    <div class="integrity-pct" style="color:${fillColor}">${pct}%</div>
  `;
  output.appendChild(wrap);
  output.scrollTop = output.scrollHeight;
  setTimeout(() => {
    const fill = wrap.querySelector('#ifill');
    if (fill) fill.style.width = pct + '%';
  }, 80);
  return wrap;
}

// ─── Boot sequence ───────────────────────────────────────────────────────────
async function runBoot() {
  phase = 'boot';
  await delay(300);

  addLine('ARK SYSTEM v0.3.1 — RECOVERY KERNEL', 'header');
  sep();
  await delay(500);

  addLine('Initializing kernel modules...', 'dim'); await delay(280);
  addLine('Loading cryptographic primitives... OK', 'dim'); await delay(200);
  addLine('Mounting encrypted volume /dev/ark0... OK', 'dim'); await delay(320);
  addLine('Checking memory integrity... OK', 'dim'); await delay(250);
  gap();

  await delay(200);
  sep();
  addLine('External operator authentication required.', 'bright'); await delay(150);
  addLine('Access restricted. Identify yourself to proceed.', 'dim');
  gap();

  await delay(400);
  showLogin();
}

// ─── Post-login boot ─────────────────────────────────────────────────────────
async function runPostLoginBoot() {
  gap();
  sep();
  addLine('[ NODE STATUS ]', 'bright');
  await delay(300);
  addLine('  Node 1 — 192.168.0.11 ............. ONLINE', ''); await delay(350);
  addLine('  Node 2 — 192.168.0.12 ............. ONLINE', ''); await delay(350);

  const node3Line = addLine('  Node 3 — 192.168.0.13 ', '');
  const dots = '.............';
  for (let i = 0; i < dots.length; i++) {
    await delay(i < 6 ? 120 : 220 + (i * 40));
    node3Line.textContent += dots[i];
    output.scrollTop = output.scrollHeight;
  }
  await delay(800);
  node3Line.textContent += ' MISSING';
  node3Line.className += ' err';
  await delay(400);

  gap();
  addLine('[ INTEGRITY CHECK ]', 'bright'); await delay(250);
  addLine('  Computing distributed hash tree...', 'dim'); await delay(600);
  addLine('  Δ Quorum not met — Node 3 unreachable.', 'warn'); await delay(200);
  addIntegrityBar(42); await delay(200);
  addLine('  WARNING: System integrity at 42% — critical threshold is 75%.', 'warn');
  gap();

  await delay(300);
  sep();
  addLine('[ SECURE LINK ]', 'bright'); await delay(200);

  const hsLabels = [
    ['Establishing TLS 1.3 handshake...', 380],
    ['Exchanging ephemeral keys...', 300],
    ['Verifying peer certificate...', 420],
    ['Tunnel established.', 200],
  ];
  for (const [label, ms] of hsLabels) {
    addLine('  ' + label, 'dim');
    await delay(ms);
  }

  linkStatus.textContent = 'ACTIVE';
  linkDot.style.animationDuration = '0.6s';

  gap();
  sep();
}

// ─── Login ───────────────────────────────────────────────────────────────────
function showLogin() {
  phase = 'login';
  loginPanel.style.display = 'flex';
  loginUser.value = '';
  loginPass.value = '';
  loginUser.focus();
}

loginUser.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loginPass.focus();
});

loginPass.addEventListener('keydown', async (e) => {
  if (phase !== 'login') return;
  if (e.key === 'Enter') {
    e.preventDefault();
    await attemptLogin();
  }
});

async function attemptLogin() {
  const user = loginUser.value.trim().toUpperCase();
  const pass = loginPass.value.trim().toUpperCase();

  loginPanel.style.display = 'none';

  addLine(`> OPERATOR ID: ${user}`, 'dim');
  addLine(`> ACCESS KEY:  ${'*'.repeat(loginPass.value.length)}`, 'dim');
  await delay(500);
  addLine('  Verifying credentials...', 'dim');
  await delay(900);

  const [hUser, hPass] = await Promise.all([sha256(user), sha256(pass)]);
  if (hUser === H_USER && hPass === H_PASS) {
    await loginSuccess();
  } else {
    loginAttempts++;
    await loginFailure(loginAttempts);
  }
}

async function loginFailure(attempts) {
  addLine('  ACCESS DENIED — Invalid credentials.', 'err');
  await delay(300);

  if (attempts >= 3) {
    gap();
    addLine('  !! INTRUSION DETECTION TRIGGERED !!', 'err');
    addLine('  Logging connection. Notifying ARK overseer.', 'err');
    await delay(400);
    addLine('  Terminal locked for 60 seconds.', 'warn');
    gap();
    await delay(3000);
    loginAttempts = 0;
  } else {
    addLine(`  Attempts remaining: ${3 - attempts}`, 'warn');
    await delay(600);
  }
  gap();
  showLogin();
}

async function loginSuccess() {
  addLine('  Credentials accepted.', '');
  await delay(300);
  addLine('  Decrypting user profile...', 'dim');
  await delay(500);
  addLine('  Loading ARK session...', 'dim');
  await delay(400);

  await runPostLoginBoot();

  addLine('WELCOME, EMPLOYEE 71.', 'header');
  addLine('ARK Node 1 shell — restricted access', 'dim');
  gap();
  addLine('  System status: DEGRADED', 'warn');
  addLine('  Active mission: RECOVER NODE 3', 'bright');
  sep();
  gap();

  phase = 'shell';
  inputArea.style.display = 'flex';
  cmdInput.focus();
}

// ─── Anomaly contained sequence ──────────────────────────────────────────────
async function anomalyContained() {
  sep();
  addLine('  All 3 fragments received. Rebuilding merkle tree...', 'dim');
  await delay(800);
  addLine('  Synchronising with Node 3...', 'dim');
  await delay(600);
  addLine('  Node 3 — 192.168.0.13 ............. ', 'dim');
  await delay(400);
  const node3restore = output.lastElementChild;
  node3restore.textContent += 'ONLINE';
  node3restore.className = 'line bright';
  await delay(500);

  addLine('  Quorum restored. Re-locking vault...', 'dim');
  await delay(700);
  addLine('  Integrity restoring: 79% → 100%', '');
  await delay(400);

  // Update topbar
  document.querySelector('#topbar .status-row span:nth-child(1)').innerHTML =
    '<span class="dot"></span> NODE 3: ONLINE';
  document.querySelector('#topbar .status-row span:nth-child(2)').innerHTML =
    '<span class="dot"></span> INTEGRITY: 100%';
  document.getElementById('link-dot').style.animationDuration = '0.3s';

  await delay(600);
  sep();
  await delay(300);

  addLine('ANOMALY CONTAINED.', 'header');
  await delay(400);
  addLine('  All nodes nominal.', '');
  await delay(300);
  addLine('  ARK system integrity: 100%', 'bright');
  gap();
}

// ─── Shell commands ───────────────────────────────────────────────────────────
const COMMANDS = {
  help: async () => {
    gap();
    addLine('Available commands:', 'bright');
    const cmds = [
      ['status', 'Display system status'],
      ['nodes', 'List network nodes'],
      ['relay', 'Relay a recovered key fragment — RELAY [key]'],
      ['logs', 'Show recent system logs'],
      ['integrity', 'Run integrity scan'],
      ['clear', 'Clear terminal'],
      ['help', 'Show this help'],
    ];
    for (const [cmd, desc] of cmds) {
      addLine(`  ${cmd.padEnd(12)} — ${desc}`, 'dim');
    }
    gap();

    if (helpUsed) return;
    helpUsed = true;
    await delay(2500);
    const msg = `What do you think you're doing?`;
    const ghost = document.createElement('p');
    ghost.style.color = 'var(--red)';
    ghost.style.letterSpacing = '1px';
    ghost.style.lineHeight = '1.7';
    ghost.textContent = '';
    output.appendChild(ghost);

    for (let i = 0; i < msg.length; i++) {
      ghost.textContent = msg.slice(0, i + 1) + '█';
      output.scrollTop = output.scrollHeight;
      await delay(20 + Math.random() * 25);
    }
    ghost.textContent = msg;
    await delay(600);
    ghost.style.visibility = 'hidden';
    await delay(300);
    ghost.remove();
  },

  status: async () => {
    gap();
    addLine('[ SYSTEM STATUS ]', 'bright');
    await delay(200);
    addLine('  Kernel version    : ARK-0.3.1-recovery', 'dim');
    addLine('  Uptime            : 00:04:17', 'dim');
    addLine('  Active nodes      : 2 / 3', 'warn');
    addLine('  Quorum            : NOT MET', 'err');
    addLine('  Integrity         : 42%', 'err');
    addLine('  Network link      : ACTIVE', '');
    gap();
  },

  nodes: async () => {
    gap();
    addLine('[ NODE MAP ]', 'bright');
    await delay(200);
    addLine('  [01]  192.168.0.11  ▸  ONLINE   — Primary vault node', '');
    addLine('  [02]  192.168.0.12  ▸  ONLINE   — Relay node', '');
    addLine('  [03]  192.168.0.13  ▸  MISSING  — Last seen: 14 days ago', 'err');
    addLine('         └─ Last known location: SECTOR 7-G', 'warn');
    gap();
  },

  relay: async (args) => {
    const key = args.join(' ').trim().toUpperCase();
    gap();

    if (!key) {
      addLine('  Usage: RELAY [key fragment]', 'warn');
      addLine('  Awaiting key fragment input.', 'dim');
      gap();
      return;
    }

    const keyHash = await sha256(key);
    if (relayedHashes.includes(keyHash)) {
      addLine(`  Fragment already received.`, 'warn');
      addLine('  Duplicate transmissions are ignored.', 'dim');
      gap();
      return;
    }

    const validIndex = H_RELAY_KEYS.indexOf(keyHash);

    if (validIndex === -1) {
      addLine(`  Transmitting fragment...`, 'dim');
      await delay(700);
      addLine('  ERROR: Fragment rejected — checksum mismatch.', 'err');
      addLine('  Verify key and try again.', 'warn');
      gap();
      return;
    }

    relayedHashes.push(keyHash);
    const count = relayedKeys.length;

    addLine(`  Transmitting fragment ${count} of 3...`, 'dim');
    await delay(800);
    addLine(`  Fragment verified. Node recovery contributed.`, '');
    await delay(300);

    if (count === 1) {
      addLine('  Node 3 signal detected. Attempting handshake...', 'dim');
      await delay(500);
      addLine('  Handshake partial — 2 more fragments required.', 'warn');
      addLine(`  Integrity restoring: 42% → 61%`, 'warn');

      document.querySelector('#topbar .status-row span:nth-child(2)').innerHTML =
        '<span class="dot amber"></span> INTEGRITY: 61%';

    } else if (count === 2) {
      addLine('  Node 3 responding on secondary channel...', 'dim');
      await delay(500);
      addLine('  Connection unstable — final fragment required.', 'warn');
      addLine(`  Integrity restoring: 61% → 79%`, 'warn');
      document.querySelector('#topbar .status-row span:nth-child(2)').innerHTML =
        '<span class="dot amber"></span> INTEGRITY: 79%';

    } else if (count === 3) {

      await anomalyContained();
    }

    gap();
  },

  recover: async () => {
    gap();
    addLine('Initiating Node 3 recovery protocol...', 'bright');
    await delay(300);
    addLine('  Scanning broadcast frequencies...', 'dim');
    await delay(600);
    addLine('  Pinging 192.168.0.13...', 'dim');
    await delay(800);
    addLine('  No response.', 'err');
    await delay(300);
    addLine('  Attempting alternate route via relay...', 'dim');
    await delay(700);
    addLine('  Connection refused — port 7743 blocked.', 'err');
    gap();
    addLine('  Recovery requires key fragments. Use RELAY [key].', 'warn');
    gap();
  },

  logs: async () => {
    gap();
    addLine('[ RECENT LOGS ] — last 10 entries', 'bright');
    await delay(150);
    const logs = [
      ['2008-03-14 02:11:03', 'WARNING: Node 3 heartbeat desynchronised', 'err'],
      ['2008-03-14 02:11:47', 'Host integrity check returning inconsistent values', 'warn'],
      ['2008-03-14 02:12:00', 'Outbound signal lost during quorum verification', 'err'],
      ['2026-04-26 08:18:01', 'Access layer breached by unknown operator signature', 'err'],
      ['2008-03-28 09:44:12', 'Memory index corrupted — identity fragments detected', 'err'],
      ['2008-03-29 16:02:57', 'Identity loop detected in system core routing', 'warn'],
    ];
    for (const [ts, msg, cls] of logs) {
      addLine(`  ${ts}  ${msg}`, cls || 'dim');
      await delay(80);
    }
    gap();
  },

  integrity: async () => {
    gap();
    addLine('Running integrity scan...', 'bright');
    await delay(300);
    addLine('  Hashing vault blocks...', 'dim');
    await delay(500);
    addLine('  Checking merkle tree...', 'dim');
    await delay(500);
    addLine('  Comparing against Node 1 + Node 2 checksums...', 'dim');
    await delay(700);
    addLine('  Result: 42% (3 of 7 shards verified)', 'err');
    addIntegrityBar(42);
    addLine('  Unverified shards require Node 3 data to resolve.', 'warn');
    gap();
  },

  whoami: async () => {
    gap();
    addLine('  Operator   : EMPLOYEE 71', 'bright');
    addLine('  Clearance  : []', '');
    addLine('  Session    : F8GhvGqs4W', 'dim');
    addLine('  Node       : 192.168.0.11', 'dim');
    gap();
  },

  clear: async () => {
    output.innerHTML = '';
  },
};

cmdInput.addEventListener('keydown', async (e) => {
  if (phase !== 'shell') return;
  if (e.key === 'Enter') {
    const raw = cmdInput.value.trim();
    cmdInput.value = '';
    if (!raw) return;

    addLine(`ark@node1 ~$ ${raw}`, 'dim');
    const parts = raw.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();

    if (COMMANDS[cmd]) {
      await COMMANDS[cmd](parts.slice(1));
    } else {
      await delay(120);
      addLine(`  bash: ${cmd}: command not found`, 'err');
      gap();
    }
  }
});

// ─── Kick off ─────────────────────────────────────────────────────────────────
runBoot();