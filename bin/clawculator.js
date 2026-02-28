#!/usr/bin/env node
'use strict';

const { runAnalysis } = require('../src/analyzer');
const { generateTerminalReport } = require('../src/reporter');
const { generateMarkdownReport } = require('../src/mdReport');
const path = require('path');
const os = require('os');
const fs = require('fs');

const args = process.argv.slice(2);
const flags = {
  report: args.includes('--report'),
  json:   args.includes('--json'),
  md:     args.includes('--md'),
  live:   args.includes('--live'),
  web:    args.includes('--web'),
  help:   args.includes('--help') || args.includes('-h'),
  config: args.find(a => a.startsWith('--config='))?.split('=')[1],
  out:    args.find(a => a.startsWith('--out='))?.split('=')[1],
  port:   parseInt(args.find(a => a.startsWith('--port='))?.split('=')[1] || '3457'),
};

const BANNER = `
\x1b[36m
   ██████╗██╗      █████╗ ██╗    ██╗ ██████╗ █████╗ ██╗      ██████╗
  ██╔════╝██║     ██╔══██╗██║    ██║██╔════╝██╔══██╗██║     ██╔════╝
  ██║     ██║     ███████║██║ █╗ ██║██║     ███████║██║     ██║     
  ██║     ██║     ██╔══██║██║███╗██║██║     ██╔══██║██║     ██║     
  ╚██████╗███████╗██║  ██║╚███╔███╔╝╚██████╗██║  ██║███████╗╚██████╗
   ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝  ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝
\x1b[0m
  \x1b[33mYour friendly penny pincher.\x1b[0m
  \x1b[90m100% offline · Zero AI · Pure deterministic logic · Your data never leaves your machine\x1b[0m
`;

const HELP = `
Usage: clawculator [options]

Options:
  (no flags)        Full terminal analysis
  --live            Real-time cost dashboard in terminal (great for tmux)
  --web             Browser dashboard at localhost:3457 (pin the tab!)
  --report          Generate HTML report and open in browser
  --md              Save markdown report to ./clawculator-report.md
  --json            Output raw JSON
  --out=PATH        Custom output path for --md or --report
  --config=PATH     Path to openclaw.json (auto-detected by default)
  --help, -h        Show this help

Examples:
  npx clawculator                         # Terminal analysis
  npx clawculator --web                   # Browser dashboard (localhost:3457)
  npx clawculator --live                  # Real-time terminal dashboard
  npx clawculator --md                    # Markdown report (readable by your AI agent)
  npx clawculator --report                # Visual HTML dashboard
  npx clawculator --json                  # JSON for piping
  npx clawculator --md --out=~/cost.md    # Custom path
`;

async function main() {
  if (flags.help) {
    console.log(BANNER);
    console.log(HELP);
    process.exit(0);
  }

  console.log(BANNER);

  const openclawHome = process.env.OPENCLAW_HOME || path.join(os.homedir(), '.openclaw');

  if (flags.web) {
    const { startWebDashboard } = require('../src/webDashboard');
    startWebDashboard({ openclawHome, port: flags.port });
    return;
  }

  if (flags.live) {
    const D = '\x1b[90m', R = '\x1b[0m';
    console.log(`  ${D}💡 Tip: Run this in a tmux pane alongside your main session${R}`);
    console.log(`  ${D}   tmux split-window -h "npx clawculator --live"${R}\n`);
    const { startLiveDashboard } = require('../src/liveDashboard');
    startLiveDashboard({ openclawHome });
    return;
  }

  console.log('\x1b[90mScanning your setup...\x1b[0m\n');

  const configPath   = flags.config || path.join(openclawHome, 'openclaw.json');

  // Auto-discover sessions path: find first agent with a sessions.json
  let sessionsPath = path.join(openclawHome, 'agents', 'main', 'sessions', 'sessions.json');
  if (!fs.existsSync(sessionsPath)) {
    const agentsDir = path.join(openclawHome, 'agents');
    try {
      for (const agent of fs.readdirSync(agentsDir)) {
        const candidate = path.join(agentsDir, agent, 'sessions', 'sessions.json');
        if (fs.existsSync(candidate)) { sessionsPath = candidate; break; }
      }
    } catch { /* agents dir missing */ }
  }

  const logsDir      = '/tmp/openclaw';

  let analysis;
  try {
    analysis = await runAnalysis({ configPath, sessionsPath, logsDir });
  } catch (err) {
    console.error('\x1b[31mError:\x1b[0m', err.message);
    process.exit(1);
  }

  if (flags.json) {
    console.log(JSON.stringify(analysis, null, 2));
    process.exit(0);
  }

  if (flags.md) {
    const outPath = flags.out || path.join(process.cwd(), 'clawculator-report.md');
    fs.writeFileSync(outPath, generateMarkdownReport(analysis), 'utf8');
    console.log(`\x1b[32m✓ Markdown report saved:\x1b[0m ${outPath}`);
    generateTerminalReport(analysis);
    process.exit(0);
  }

  if (flags.report) {
    const outPath = flags.out || path.join(process.cwd(), `clawculator-report.html`);
    const { generateHTMLReport } = require('../src/htmlReport');
    await generateHTMLReport(analysis, outPath);
    const { exec } = require('child_process');
    exec(`open "${outPath}" 2>/dev/null || xdg-open "${outPath}" 2>/dev/null`);
    console.log(`\x1b[32m✓ HTML report saved:\x1b[0m ${outPath}`);
    generateTerminalReport(analysis);
    process.exit(0);
  }

  generateTerminalReport(analysis);
  console.log('\x1b[90m────────────────────────────────────────────────────\x1b[0m');
  console.log('\x1b[36mClawculator\x1b[0m · github.com/echoudhry/clawculator · Your friendly penny pincher.');
  console.log('\x1b[90mTip: --md saves a report your AI agent can read directly\x1b[0m');
  console.log('\x1b[90m────────────────────────────────────────────────────\x1b[0m\n');
}

main().catch(err => {
  console.error('\x1b[31mFatal:\x1b[0m', err.message);
  process.exit(1);
});
