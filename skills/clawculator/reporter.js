'use strict';

const SEVERITY_CONFIG = {
  critical: { color: '\x1b[31m', icon: '🔴', label: 'CRITICAL' },
  high:     { color: '\x1b[33m', icon: '🟠', label: 'HIGH' },
  medium:   { color: '\x1b[33m', icon: '🟡', label: 'MEDIUM' },
  info:     { color: '\x1b[32m', icon: '✅', label: 'OK' },
};

const SOURCE_LABELS = {
  heartbeat:     '💓 Heartbeat',
  hooks:         '🪝 Hooks',
  whatsapp:      '📱 WhatsApp',
  subagents:     '🤖 Subagents',
  skills:        '🔧 Skills',
  memory:        '🧠 Memory',
  primary_model: '⚙️  Primary Model',
  sessions:      '💬 Sessions',
  workspace:     '📁 Workspace',
  context:       '📏 Context Pruning',
  vision:        '🖼️  Vision Tokens',
  fallbacks:     '🔀 Model Fallbacks',
  multi_agent:   '👥 Multi-Agent',
  cron:          '⏰ Cron Jobs',
  telegram:      '✈️  Telegram',
  discord:       '💬 Discord',
  signal:        '📡 Signal',
  config:        '📄 Config',
};

function formatCost(cost) {
  if (!cost) return '';
  if (cost === 0) return '\x1b[32m$0.00/mo\x1b[0m';
  if (cost < 1)  return `\x1b[33m$${cost.toFixed(4)}/mo\x1b[0m`;
  return `\x1b[31m$${cost.toFixed(2)}/mo\x1b[0m`;
}

function generateTerminalReport(analysis) {
  const { summary, findings, sessions } = analysis;
  const R = '\x1b[0m';
  const B = '\x1b[1m';
  const D = '\x1b[90m';
  const C = '\x1b[36m';
  const RED = '\x1b[31m';
  const GRN = '\x1b[32m';

  console.log(`${C}━━━ Scan Complete ━━━${R}`);
  console.log(`${D}${new Date(analysis.scannedAt).toLocaleString()}${R}`);
  if (analysis.primaryModel) console.log(`${D}Primary model: ${analysis.primaryModel}${R}`);
  console.log();

  const bleed = summary.estimatedMonthlyBleed;
  if (bleed > 0) {
    console.log(`${B}${RED}⚠️  Estimated monthly cost exposure: $${bleed.toFixed(2)}/month${R}\n`);
  }

  for (const severity of ['critical', 'high', 'medium', 'info']) {
    const group = findings.filter(f => f.severity === severity);
    if (!group.length) continue;

    const cfg = SEVERITY_CONFIG[severity];
    console.log(`${cfg.color}${B}${cfg.icon} ${cfg.label} (${group.length})${R}`);
    console.log(`${C}${'─'.repeat(60)}${R}`);

    for (const f of group) {
      console.log(`  ${B}${SOURCE_LABELS[f.source] || f.source}${R}`);
      console.log(`  ${f.message}`);
      if (f.detail)          console.log(`  ${D}${f.detail}${R}`);
      if (f.monthlyCost > 0) console.log(`  ${D}Cost: ${R}${formatCost(f.monthlyCost)}`);
      if (f.fix)             console.log(`  ${GRN}→ ${f.fix}${R}`);
      if (f.command)         console.log(`  ${D}  ${f.command}${R}`);
      console.log();
    }
  }

  // Session breakdown
  if (sessions?.length > 0) {
    console.log(`${C}━━━ Top Sessions by Token Usage ━━━${R}\n`);
    const sorted = [...sessions].sort((a, b) => (b.inputTokens + b.outputTokens) - (a.inputTokens + a.outputTokens)).slice(0, 8);
    console.log(`  ${D}${'Session'.padEnd(42)} ${'Model'.padEnd(22)} ${'Tokens'.padEnd(10)} Cost${R}`);
    console.log(`  ${D}${'─'.repeat(85)}${R}`);
    for (const s of sorted) {
      const tok = (s.inputTokens + s.outputTokens).toLocaleString();
      const flag = s.isOrphaned ? ' ⚠️' : '';
      const keyDisplay = s.key.length > 12 ? s.key.slice(0, 8) + '…' : s.key;
      console.log(`  ${(keyDisplay + flag).slice(0, 42).padEnd(42)} ${(s.modelLabel || s.model || 'unknown').slice(0, 22).padEnd(22)} ${tok.padEnd(10)} $${s.cost.toFixed(6)}`);
    }
    console.log();
  }

  // Summary
  console.log(`${C}━━━ Summary ━━━${R}`);
  console.log(`  🔴 ${RED}${summary.critical}${R} critical  🟠 ${summary.high} high  🟡 ${summary.medium} medium  ✅ ${summary.info} ok`);
  console.log(`  Sessions analyzed: ${summary.sessionsAnalyzed} · Tokens found: ${(summary.totalTokensFound||0).toLocaleString()}`);
  if (bleed > 0) {
    console.log(`  ${RED}${B}Monthly bleed: $${bleed.toFixed(2)}/month${R}`);
  } else {
    console.log(`  ${GRN}No significant cost bleed detected ✓${R}`);
  }
  console.log();

  // Quick wins
  const wins = findings.filter(f => f.fix && f.severity !== 'info');
  if (wins.length > 0) {
    console.log(`${C}━━━ Quick Wins ━━━${R}`);
    wins.slice(0, 5).forEach((f, i) => {
      console.log(`  ${i + 1}. ${GRN}${f.fix}${R}`);
      if (f.command) console.log(`     ${D}${f.command}${R}`);
    });
    console.log();
  }
}

module.exports = { generateTerminalReport };

// Source label additions for new sources
