import type { Deployment } from "../types";
import { getPreSections, getPostSections, totalItems, checkedCount } from "../data/checklists";
import type { ChecklistSection } from "../types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pct(done: number, total: number): number {
  return total ? Math.round((done / total) * 100) : 0;
}

function renderSection(
  section: ChecklistSection,
  checked: Record<string, boolean>,
  globalOffset: number
): string {
  const done = section.items.filter((i) => checked[i.id]).length;
  const total = section.items.length;
  const p = pct(done, total);

  const items = section.items
    .map((item, idx) => {
      const isChecked = checked[item.id] || false;
      const badges = [
        item.critical
          ? `<span class="badge badge-crit">Critical</span>`
          : "",
        item.devRequired
          ? `<span class="badge badge-dev">Dev required</span>`
          : "",
        item.clientVerify
          ? `<span class="badge badge-ver">Client to verify</span>`
          : "",
      ]
        .filter(Boolean)
        .join("");

      return `
      <div class="item ${isChecked ? "checked" : ""}">
        <div class="item-check">${isChecked ? "&#10003;" : ""}</div>
        <div class="item-body">
          <div class="item-title ${isChecked ? "done" : ""}">
            <span class="item-num">#${globalOffset + idx + 1}</span>
            ${item.title}
            ${badges}
          </div>
          <div class="item-desc">${item.description}</div>
        </div>
      </div>`;
    })
    .join("");

  return `
    <div class="section">
      <div class="section-header">
        <div class="section-dot" style="background:${section.color}"></div>
        <div class="section-title">${section.title}</div>
        <div class="section-stats">
          <div class="section-count">${done}/${total}</div>
          <div class="section-bar-bg">
            <div class="section-bar-fill" style="width:${p}%;background:${section.color}"></div>
          </div>
          <div class="section-pct">${p}%</div>
        </div>
      </div>
      <div class="section-items">${items}</div>
    </div>`;
}

export function generateDeploymentReport(deployment: Deployment): void {
  const preSections = getPreSections(deployment.product);
  const postSections = getPostSections(deployment.product);

  const preTotal = totalItems(preSections);
  const preDone = checkedCount(preSections, deployment.prePhase.checkedItems);
  const prePct = pct(preDone, preTotal);

  const postTotal = totalItems(postSections);
  const postDone = checkedCount(postSections, deployment.postPhase.checkedItems);
  const postPct = pct(postDone, postTotal);

  const allTotal = preTotal + postTotal;
  const allDone = preDone + postDone;
  const allPct = pct(allDone, allTotal);

  const statusLabel =
    deployment.status === "completed"
      ? "Completed"
      : deployment.status === "failed"
      ? "Failed"
      : "In Progress";

  const statusColor =
    deployment.status === "completed"
      ? "#16a34a"
      : deployment.status === "failed"
      ? "#dc2626"
      : "#2563eb";

  let preGlobalOffset = 0;
  let postGlobalOffset = preTotal;

  const preSectionsHtml = preSections
    .map((s) => {
      const html = renderSection(s, deployment.prePhase.checkedItems, preGlobalOffset);
      preGlobalOffset += s.items.length;
      return html;
    })
    .join("");

  const postSectionsHtml = postSections
    .map((s) => {
      const html = renderSection(s, deployment.postPhase.checkedItems, postGlobalOffset);
      postGlobalOffset += s.items.length;
      return html;
    })
    .join("");

  const completedAtBlock =
    deployment.postPhase.completedAt
      ? `<div class="meta-pill">Completed: ${formatDate(deployment.postPhase.completedAt)}</div>`
      : deployment.failedAt
      ? `<div class="meta-pill">Failed: ${formatDate(deployment.failedAt)}</div>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Deployment Report — ${deployment.name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  :root {
    --green: #16a34a; --green-bg: #f0fdf4; --green-light: #dcfce7;
    --red: #dc2626; --red-bg: #fef2f2; --red-light: #fee2e2;
    --blue: #2563eb; --blue-bg: #eff6ff; --blue-light: #dbeafe;
    --amber: #d97706; --amber-bg: #fffbeb; --amber-light: #fef3c7;
    --navy: #0f172a; --navy-mid: #1e293b; --navy-light: #334155;
    --border: #e2e8f0; --text: #0f172a; --muted: #64748b; --subtle: #94a3b8;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', system-ui, sans-serif;
    background: #f8fafc;
    color: var(--text);
    font-size: 13px;
    line-height: 1.5;
  }

  /* ── Cover strip ── */
  .cover {
    background: var(--navy);
    color: #e2e8f0;
    padding: 2rem 2.5rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 2rem;
  }
  .cover-left {}
  .cover-logo {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--subtle);
    margin-bottom: .75rem;
  }
  .cover-title {
    font-size: 22px;
    font-weight: 700;
    color: #f1f5f9;
    margin-bottom: .5rem;
    line-height: 1.25;
  }
  .cover-meta {
    display: flex;
    flex-wrap: wrap;
    gap: .5rem;
    margin-top: .75rem;
  }
  .meta-pill {
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 99px;
    background: rgba(255,255,255,.08);
    color: var(--subtle);
    border: 1px solid rgba(255,255,255,.1);
    white-space: nowrap;
  }
  .meta-pill.product {
    background: rgba(59,130,246,.2);
    color: #93c5fd;
    border-color: rgba(59,130,246,.3);
    text-transform: uppercase;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: .06em;
  }
  .meta-pill.status {
    font-weight: 700;
    color: #fff;
    background: ${statusColor}33;
    border-color: ${statusColor}66;
    color: ${statusColor === "#16a34a" ? "#4ade80" : statusColor === "#dc2626" ? "#f87171" : "#60a5fa"};
  }
  .cover-right {
    text-align: right;
    flex-shrink: 0;
  }
  .cover-id {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: var(--subtle);
    margin-bottom: .5rem;
  }

  /* ── Summary bar ── */
  .summary {
    background: #fff;
    border-bottom: 1px solid var(--border);
    padding: 1.25rem 2.5rem;
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
    align-items: center;
  }
  .stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .stat-label { font-size: 10px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--subtle); }
  .stat-value { font-size: 20px; font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; }
  .stat-sub   { font-size: 11px; color: var(--muted); }
  .sep { width: 1px; height: 36px; background: var(--border); }
  .overall-bar-wrap { flex: 1; min-width: 160px; }
  .overall-bar-label { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin-bottom: 5px; }
  .overall-bar-bg { height: 8px; background: #f1f5f9; border-radius: 99px; overflow: hidden; }
  .overall-bar-fill { height: 100%; background: var(--navy-mid); border-radius: 99px; }

  /* ── Phase heading ── */
  .phase-heading {
    max-width: 860px;
    margin: 1.5rem auto 0;
    padding: 0 2.5rem;
  }
  .phase-label {
    display: inline-flex;
    align-items: center;
    gap: .5rem;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--navy);
    padding: .35rem .85rem;
    border-radius: 4px;
    margin-bottom: .75rem;
  }
  .phase-label.pre  { background: #e0e7ff; color: #3730a3; }
  .phase-label.post { background: var(--green-light); color: var(--green); }
  .phase-bar-row { display: flex; align-items: center; gap: 1rem; margin-bottom: .25rem; }
  .phase-bar-bg { flex: 1; height: 6px; background: #f1f5f9; border-radius: 99px; overflow: hidden; }
  .phase-bar-fill { height: 100%; border-radius: 99px; }
  .phase-bar-pct { font-size: 12px; font-weight: 600; color: var(--text); min-width: 36px; text-align: right; }
  .phase-bar-detail { font-size: 11px; color: var(--muted); }

  /* ── Sections ── */
  .main { max-width: 860px; margin: 0 auto; padding: 1rem 2.5rem 3rem; }

  .section {
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-bottom: 10px;
    overflow: hidden;
    page-break-inside: avoid;
  }
  .section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 14px;
    background: #f8fafc;
    border-bottom: 1px solid var(--border);
  }
  .section-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .section-title { font-size: 13px; font-weight: 700; color: var(--text); flex: 1; }
  .section-stats { display: flex; align-items: center; gap: 8px; }
  .section-count { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--muted); min-width: 32px; text-align: right; }
  .section-bar-bg { width: 60px; height: 4px; background: #e2e8f0; border-radius: 99px; overflow: hidden; }
  .section-bar-fill { height: 100%; border-radius: 99px; }
  .section-pct { font-size: 11px; font-weight: 600; color: var(--muted); min-width: 30px; text-align: right; }

  /* ── Items ── */
  .section-items { }
  .item {
    display: flex;
    gap: 10px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    align-items: flex-start;
  }
  .item:last-child { border-bottom: none; }
  .item.checked { background: var(--green-bg); }
  .item-check {
    width: 15px;
    height: 15px;
    border-radius: 3px;
    border: 1.5px solid var(--border);
    flex-shrink: 0;
    margin-top: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    color: var(--green);
    background: #fff;
  }
  .item.checked .item-check { background: var(--green-light); border-color: var(--green); }
  .item-body { flex: 1; }
  .item-title {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.45;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
  }
  .item-title.done { text-decoration: line-through; color: var(--muted); }
  .item-num { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--subtle); margin-right: 2px; }
  .item-desc { font-size: 11.5px; color: var(--muted); line-height: 1.6; margin-top: 3px; }
  .item.checked .item-desc { color: var(--subtle); }

  /* ── Badges ── */
  .badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 99px; white-space: nowrap; letter-spacing: .04em; }
  .badge-crit { background: var(--red-light);   color: var(--red); }
  .badge-dev  { background: var(--blue-light);  color: var(--blue); }
  .badge-ver  { background: var(--amber-light); color: var(--amber); }

  /* ── Legend ── */
  .legend {
    max-width: 860px;
    margin: 0 auto;
    padding: .5rem 2.5rem 1rem;
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    align-items: center;
    border-bottom: 1px solid var(--border);
    margin-bottom: .5rem;
  }
  .legend-label { font-size: 10px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--subtle); }
  .legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--muted); }

  /* ── Footer ── */
  .footer {
    max-width: 860px;
    margin: 1rem auto 0;
    padding: 1.25rem 2.5rem;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: var(--subtle);
  }
  .footer-id { font-family: 'JetBrains Mono', monospace; }

  /* ── Print ── */
  @media print {
    body { background: #fff; }
    .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .summary { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .section { page-break-inside: avoid; }
    .phase-label { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .item.checked { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .section-bar-fill { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .overall-bar-fill { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .phase-bar-fill { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .section-dot { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .item-check { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { margin: 0.5in; size: A4 portrait; }
  }
</style>
</head>
<body>

<div class="cover">
  <div class="cover-left">
    <div class="cover-logo">DeployDash &mdash; Deployment Report</div>
    <div class="cover-title">${deployment.name}</div>
    <div class="cover-meta">
      <span class="meta-pill product">${deployment.product}</span>
      <span class="meta-pill status">${statusLabel}</span>
      <span class="meta-pill">Developer: ${deployment.developerName}</span>
      <span class="meta-pill">Started: ${formatDate(deployment.startedAt)}</span>
      ${completedAtBlock}
    </div>
  </div>
  <div class="cover-right">
    <div class="cover-id">ID: ${deployment.id}</div>
    <div class="cover-id">Report generated: ${formatDate(new Date().toISOString())}</div>
  </div>
</div>

<div class="summary">
  <div class="stat">
    <div class="stat-label">Overall</div>
    <div class="stat-value">${allPct}%</div>
    <div class="stat-sub">${allDone} of ${allTotal} items</div>
  </div>
  <div class="sep"></div>
  <div class="stat">
    <div class="stat-label">Pre-Deployment</div>
    <div class="stat-value">${prePct}%</div>
    <div class="stat-sub">${preDone}/${preTotal} &bull; ${deployment.prePhase.completed ? "Phase complete" : "In progress"}</div>
  </div>
  <div class="sep"></div>
  <div class="stat">
    <div class="stat-label">Post-Deployment</div>
    <div class="stat-value">${postPct}%</div>
    <div class="stat-sub">${postDone}/${postTotal} &bull; ${deployment.postPhase.completed ? "Phase complete" : "In progress"}</div>
  </div>
  <div class="sep"></div>
  <div class="overall-bar-wrap">
    <div class="overall-bar-label">
      <span>Overall completion</span>
      <span>${allDone}/${allTotal} checked</span>
    </div>
    <div class="overall-bar-bg">
      <div class="overall-bar-fill" style="width:${allPct}%"></div>
    </div>
  </div>
</div>

<div class="legend">
  <span class="legend-label">Badges:</span>
  <div class="legend-item"><span class="badge badge-crit">Critical</span> Must not be skipped</div>
  <div class="legend-item"><span class="badge badge-dev">Dev required</span> Developer action needed</div>
  <div class="legend-item"><span class="badge badge-ver">Client to verify</span> Client confirmation needed</div>
</div>

<div class="phase-heading">
  <div class="phase-label pre">Pre-Deployment &mdash; Sections 1&ndash;8</div>
  <div class="phase-bar-row">
    <div class="phase-bar-bg">
      <div class="phase-bar-fill" style="width:${prePct}%;background:#4f46e5"></div>
    </div>
    <div class="phase-bar-pct">${prePct}%</div>
  </div>
  <div class="phase-bar-detail">${preDone} of ${preTotal} items checked &bull; ${deployment.prePhase.completed ? `Marked complete ${deployment.prePhase.completedAt ? "on " + formatDate(deployment.prePhase.completedAt) : ""}` : "Not yet marked complete"}</div>
</div>

<div class="main">
  ${preSectionsHtml}
</div>

<div class="phase-heading">
  <div class="phase-label post">Post-Deployment &mdash; Sections 9&ndash;13</div>
  <div class="phase-bar-row">
    <div class="phase-bar-bg">
      <div class="phase-bar-fill" style="width:${postPct}%;background:#16a34a"></div>
    </div>
    <div class="phase-bar-pct">${postPct}%</div>
  </div>
  <div class="phase-bar-detail">${postDone} of ${postTotal} items checked &bull; ${deployment.postPhase.completed ? `Marked complete ${deployment.postPhase.completedAt ? "on " + formatDate(deployment.postPhase.completedAt) : ""}` : "Not yet marked complete"}</div>
</div>

<div class="main">
  ${postSectionsHtml}
</div>

<div class="footer">
  <span>DeployDash &mdash; Deployment Report</span>
  <span class="footer-id">${deployment.id}</span>
</div>

<script>
  window.onload = function() {
    // Auto-trigger print dialog after fonts load
    setTimeout(function() {
      window.print();
    }, 800);
  };
<\/script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.addEventListener("afterprint", () => URL.revokeObjectURL(url));
  }
}
