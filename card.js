// 추천 종목 카드(스파크라인/손절가/재무스냅샷/트랙레코드) 공통 렌더링 — index.html, owner.html 공용.
export const fmtWon = n => (n < 0 ? "-" : "") + "₩" + Math.abs(Math.round(n)).toLocaleString("ko-KR");
export const fmtPct = n => (n > 0 ? "+" : "") + n.toFixed(2) + "%";
export const fmtPP = n => (n > 0 ? "+" : "") + n.toFixed(1) + "%p";

const svgns = "http://www.w3.org/2000/svg";
function el(tag, attrs) { const e = document.createElementNS(svgns, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }

function drawSpark(svg, prices) {
  const W = 380, H = 46, padX = 2, padY = 4;
  const min = Math.min(...prices), max = Math.max(...prices);
  const x = i => padX + (i / (prices.length - 1)) * (W - padX * 2);
  const y = v => padY + (1 - ((v - min) / ((max - min) || 1))) * (H - padY * 2);
  let d = "M" + x(0) + "," + y(prices[0]);
  prices.forEach((v, i) => { if (i > 0) d += " L" + x(i) + "," + y(v); });
  const up = prices[prices.length - 1] >= prices[0];
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  svg.appendChild(el("path", { d, fill: "none", stroke: up ? "var(--accent)" : "var(--down)", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }));
}

function drawFinBars(svg, years, vals) {
  const W = 380, H = 74, padL = 6, padR = 6, padT = 6, padB = 14;
  const max = Math.max(...vals, 0), min = Math.min(...vals, 0);
  const range = (max - min) || 1;
  const zeroY = padT + (max / range) * (H - padT - padB);
  const bw = (W - padL - padR) / years.length;
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  svg.innerHTML = "";
  svg.appendChild(el("line", { x1: padL, x2: W - padR, y1: zeroY, y2: zeroY, stroke: "var(--border)", "stroke-width": 1 }));
  vals.forEach((v, i) => {
    const barH = Math.abs(v) / range * (H - padT - padB);
    const x = padL + i * bw + bw * 0.22, w = bw * 0.56;
    const y = v >= 0 ? zeroY - barH : zeroY;
    svg.appendChild(el("rect", { x, y, width: w, height: Math.max(barH, 1.5), rx: 3, fill: v < 0 ? "var(--down)" : "var(--accent)" }));
    const lt = el("text", { x: x + w / 2, y: v >= 0 ? y - 3 : y + barH + 10, "text-anchor": "middle", "font-size": 8.5, fill: "var(--ink)", "font-weight": 600 });
    lt.textContent = v.toFixed(1) + "%"; svg.appendChild(lt);
    const yt = el("text", { x: x + w / 2, y: H - 3, "text-anchor": "middle", "font-size": 8, fill: "var(--ink-faint)" });
    yt.textContent = "'" + String(years[i]).slice(-2); svg.appendChild(yt);
  });
}

function finTile(label, val, delta, cls) {
  return `<div class="fin-tile"><div class="label">${label}</div><div class="val mono">${val}</div><div class="delta ${cls}">${delta}</div></div>`;
}

/**
 * signals 행(sig: {name, ticker, scan_date, reason, details})을 받아 상세 카드 DOM을 만든다.
 * details 안의 어떤 필드가 없어도(포지션/매매내역에서 조회해온 signal은 필드가 없을 수 있음) 안전하게 생략한다.
 */
export function buildSignalCard(sig, opts = {}) {
  const showReason = opts.showReason !== false;
  const expandFin = !!opts.expandFin;
  const d = sig.details || {};
  const chg = typeof d.chg_pct === "number" ? d.chg_pct : null;
  const chgClass = chg == null ? "" : (chg >= 0 ? "up" : "down");

  const fin = d.fundamentals || null;
  let finHtml = "";
  if (fin) {
    const epsTile = fin.eps_note
      ? finTile("EPS", fin.eps_note, "적자 상태", "down")
      : finTile("EPS", fin.eps.toLocaleString("ko-KR") + "원", fin.eps_delta_pct != null ? fmtPct(fin.eps_delta_pct) + " 전년比" : "", fin.eps_delta_pct >= 0 ? "up" : "down");
    const bpsTile = finTile("BPS", fin.bps.toLocaleString("ko-KR") + "원", fin.bps_delta_pct != null ? fmtPct(fin.bps_delta_pct) + " 전년比" : "", fin.bps_delta_pct >= 0 ? "up" : "down");
    const roeTile = finTile("ROE", fin.roe.toFixed(1) + "%", fin.roe_delta_pp != null ? fmtPP(fin.roe_delta_pp) + " 전년比" : "", fin.roe_delta_pp >= 0 ? "up" : "down");
    const perTile = fin.per != null
      ? finTile("PER", fin.per.toFixed(1) + "배", "현재 주가 기준", "flat")
      : finTile("PER", "산출불가", "당기순손실 상태", "flat");
    const toggleHtml = expandFin
      ? `<div class="fin-label">재무 스냅샷 (영업이익률·EPS·BPS·ROE·PER)</div>`
      : `<button class="fin-toggle" data-role="fintoggle" aria-expanded="false">
          <span data-role="fintext">재무 스냅샷 보기 (영업이익률·EPS·BPS·ROE·PER)</span>
          <i class="chev" aria-hidden="true">⌄</i>
        </button>`;
    finHtml = `
      ${toggleHtml}
      <div class="fin-body" data-role="finbody" ${expandFin ? "" : "hidden"}>
        <svg data-role="finchart"></svg>
        <div class="fin-grid">${epsTile}${bpsTile}${roeTile}${perTile}</div>
        <div class="fin-note">DART 공시 기준 · 지배주주 귀속분 · ${fin.years[0]}~${fin.years[fin.years.length - 1]}</div>
      </div>`;
  }

  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div class="row1">
      <div>
        <span class="name">${sig.name}</span>
        <span class="code mono">${sig.ticker}</span>
      </div>
      ${d.price != null ? `
      <div>
        <div class="price mono">${fmtWon(d.price)}</div>
        ${chg != null ? `<div class="chg ${chgClass} mono">${fmtPct(chg)}</div>` : ""}
      </div>` : ""}
    </div>
    ${d.spark && d.spark.length > 1 ? `<div class="spark"><svg data-role="spark"></svg><div class="spark-legend"><span>최근 ${d.spark.length}거래일</span>${d.proximity != null ? `<span>52주고가대비 ${(d.proximity * 100).toFixed(0)}%</span>` : ""}</div></div>` : ""}
    ${showReason && sig.reason ? `<div class="why">${sig.reason}</div>` : ""}
    ${d.caution ? `<div class="caution">${d.caution}</div>` : ""}
    ${d.stop_price != null || d.max_loss_pct != null ? `
    <div class="risk-grid">
      ${d.stop_price != null ? `<div class="risk"><div class="label">손절가</div><div class="val mono down">${fmtWon(d.stop_price)}</div></div>` : ""}
      ${d.max_loss_pct != null ? `<div class="risk"><div class="label">예상 최대손실률</div><div class="val mono down">${d.max_loss_pct}%</div></div>` : ""}
    </div>` : ""}
    ${finHtml}
    ${d.track_record ? `<div class="track">${d.track_record}</div>` : ""}
    <div class="scandate">${sig.scan_date} 스캔 기준 추천 정보</div>
  `;

  if (d.spark && d.spark.length > 1) {
    drawSpark(card.querySelector('[data-role="spark"]'), d.spark);
  }
  if (fin) {
    if (expandFin) {
      drawFinBars(card.querySelector('[data-role="finchart"]'), fin.years, fin.op_margin);
    } else {
      const toggle = card.querySelector('[data-role="fintoggle"]');
      const body = card.querySelector('[data-role="finbody"]');
      let drawn = false;
      toggle.addEventListener("click", () => {
        const open = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!open));
        body.hidden = open;
        card.querySelector('[data-role="fintext"]').textContent = open
          ? "재무 스냅샷 보기 (영업이익률·EPS·BPS·ROE·PER)" : "재무 스냅샷 접기";
        if (!open && !drawn) { drawn = true; drawFinBars(card.querySelector('[data-role="finchart"]'), fin.years, fin.op_margin); }
      });
    }
  }
  return card;
}
