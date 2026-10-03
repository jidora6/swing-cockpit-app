// 추천 종목 카드(스파크라인/손절가/재무스냅샷/트랙레코드) 공통 렌더링 — index.html, owner.html 공용.
export const fmtWon = n => (n < 0 ? "-" : "") + "₩" + Math.abs(Math.round(n)).toLocaleString("ko-KR");
export const fmtPct = n => (n > 0 ? "+" : "") + n.toFixed(2) + "%";
export const fmtPP = n => (n > 0 ? "+" : "") + n.toFixed(1) + "%p";

const svgns = "http://www.w3.org/2000/svg";
function el(tag, attrs) { const e = document.createElementNS(svgns, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }

// 기간 길이에 맞춰 눈금 간격을 자동으로 고른다(길수록 월 단위, 짧을수록 주/일 단위) —
// 다만 카드 그래프가 작아서(가로 ~300px) 눈금이 4~5개를 넘으면 라벨이 겹치므로 상한을 둔다.
const TICK_UNIT_CANDIDATES_DAYS = [7, 14, 30, 90, 180, 365];
const MAX_TICKS = 4;

function pickTickUnitDays(spanDays) {
  for (const days of TICK_UNIT_CANDIDATES_DAYS) {
    if (spanDays / days <= MAX_TICKS) return days;
  }
  return TICK_UNIT_CANDIDATES_DAYS[TICK_UNIT_CANDIDATES_DAYS.length - 1];
}

function fmtTickLabel(dateStr, unitDays) {
  const d = new Date(dateStr + "T00:00:00");
  if (unitDays >= 180) return d.getFullYear() + "." + (d.getMonth() + 1);
  if (unitDays >= 30) return (d.getMonth() + 1) + "월";
  return (d.getMonth() + 1) + "/" + d.getDate();
}

function nearestDateIndex(dates, targetMs) {
  let best = 0, bestDiff = Infinity;
  dates.forEach((ds, i) => {
    const diff = Math.abs(new Date(ds + "T00:00:00").getTime() - targetMs);
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  });
  return best;
}

function drawSpark(svg, prices, dates) {
  const hasTicks = Array.isArray(dates) && dates.length === prices.length && prices.length > 1;
  const W = 380, H = hasTicks ? 58 : 46, padX = 2, padY = 4, padBottom = hasTicks ? 16 : padY;
  const min = Math.min(...prices), max = Math.max(...prices);
  const x = i => padX + (i / (prices.length - 1)) * (W - padX * 2);
  const y = v => padY + (1 - ((v - min) / ((max - min) || 1))) * (H - padY - padBottom);
  let d = "M" + x(0) + "," + y(prices[0]);
  prices.forEach((v, i) => { if (i > 0) d += " L" + x(i) + "," + y(v); });
  const up = prices[prices.length - 1] >= prices[0];
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  svg.innerHTML = "";
  svg.appendChild(el("path", { d, fill: "none", stroke: up ? "var(--accent)" : "var(--down)", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }));

  if (!hasTicks) return;
  const firstMs = new Date(dates[0] + "T00:00:00").getTime();
  const lastMs = new Date(dates[dates.length - 1] + "T00:00:00").getTime();
  const spanDays = (lastMs - firstMs) / 86400000;
  const unitDays = pickTickUnitDays(spanDays || 1);
  const axisY = H - padBottom;

  const seen = new Set();
  for (let t = firstMs; t <= lastMs; t += unitDays * 86400000) {
    const idx = nearestDateIndex(dates, t);
    if (seen.has(idx)) continue;
    seen.add(idx);
    const gx = x(idx);
    svg.appendChild(el("line", { x1: gx, x2: gx, y1: padY, y2: axisY, stroke: "var(--border)", "stroke-width": 1, "stroke-dasharray": "2,2" }));
    const lbl = el("text", { x: gx, y: axisY + 10, "text-anchor": "middle", "font-size": 7.5, fill: "var(--ink-faint)" });
    lbl.textContent = fmtTickLabel(dates[idx], unitDays);
    svg.appendChild(lbl);
  }
}

function drawFinBars(svg, years, vals, fmtVal) {
  fmtVal = fmtVal || (v => v.toFixed(1) + "%");
  // null(산출불가) 연도는 건너뛰되 x축 자리는 유지 — years/vals 길이를 맞춰서 넘겨받는다.
  const present = vals.filter(v => v != null);
  const W = 380, H = 80, padL = 6, padR = 6, padT = 16, padB = 14;
  const max = Math.max(...present, 0), min = Math.min(...present, 0);
  const range = (max - min) || 1;
  const zeroY = padT + (max / range) * (H - padT - padB);
  const bw = (W - padL - padR) / years.length;
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  svg.innerHTML = "";
  svg.appendChild(el("line", { x1: padL, x2: W - padR, y1: zeroY, y2: zeroY, stroke: "var(--border)", "stroke-width": 1 }));
  vals.forEach((v, i) => {
    const x = padL + i * bw + bw * 0.22, w = bw * 0.56;
    if (v != null) {
      const barH = Math.abs(v) / range * (H - padT - padB);
      const y = v >= 0 ? zeroY - barH : zeroY;
      svg.appendChild(el("rect", { x, y, width: w, height: Math.max(barH, 1.5), rx: 3, fill: v < 0 ? "var(--down)" : "var(--accent)" }));
      const lt = el("text", { x: x + w / 2, y: v >= 0 ? y - 3 : y + barH + 10, "text-anchor": "middle", "font-size": 8.5, fill: "var(--ink)", "font-weight": 600 });
      lt.textContent = fmtVal(v); svg.appendChild(lt);
    }
    const yt = el("text", { x: x + w / 2, y: H - 3, "text-anchor": "middle", "font-size": 8, fill: "var(--ink-faint)" });
    yt.textContent = "'" + String(years[i]).slice(-2); svg.appendChild(yt);
  });
}

function finTile(metric, label, val, delta, cls) {
  return `<button type="button" class="fin-tile" data-role="fintile" data-metric="${metric}"><div class="label">${label}</div><div class="val mono">${val}</div><div class="delta ${cls}">${delta}</div></button>`;
}

const FIN5_METRICS = {
  op_margin: { label: "영업이익률", fmt: v => v.toFixed(1) + "%" },
  eps: { label: "EPS", fmt: v => v.toLocaleString("ko-KR") + "원" },
  bps: { label: "BPS", fmt: v => v.toLocaleString("ko-KR") + "원" },
  roe: { label: "ROE", fmt: v => v.toFixed(1) + "%" },
  per: { label: "PER", fmt: v => v.toFixed(1) + "배" },
};

function fin5Values(fin, metric) {
  if (metric === "op_margin") return fin.op_margin;
  if (metric === "eps") return fin.eps_history;
  if (metric === "bps") return fin.bps_history;
  if (metric === "roe") return fin.roe_history;
  if (metric === "per") return fin.per_history;
  return null;
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

  const recommendedStop = d.stop_price;
  const stopBufferPct = (d.price != null && recommendedStop != null && d.price > 0)
    ? (d.price - recommendedStop) / d.price * 100 : null;

  const fin = d.fundamentals || null;
  let finHtml = "";
  if (fin) {
    const opLatest = fin.op_margin[fin.op_margin.length - 1];
    const opPrior = fin.op_margin.length >= 2 ? fin.op_margin[fin.op_margin.length - 2] : null;
    const opDelta = opPrior != null ? opLatest - opPrior : null;
    const opMarginTile = finTile("op_margin", "영업이익률", opLatest.toFixed(1) + "%", opDelta != null ? fmtPP(opDelta) + " 전년比" : "", opDelta != null && opDelta >= 0 ? "up" : "down");
    const epsTile = fin.eps_note
      ? finTile("eps", "EPS", fin.eps_note, "적자 상태", "down")
      : finTile("eps", "EPS", fin.eps.toLocaleString("ko-KR") + "원", fin.eps_delta_pct != null ? fmtPct(fin.eps_delta_pct) + " 전년比" : "", fin.eps_delta_pct >= 0 ? "up" : "down");
    const bpsTile = finTile("bps", "BPS", fin.bps.toLocaleString("ko-KR") + "원", fin.bps_delta_pct != null ? fmtPct(fin.bps_delta_pct) + " 전년比" : "", fin.bps_delta_pct >= 0 ? "up" : "down");
    const roeTile = finTile("roe", "ROE", fin.roe.toFixed(1) + "%", fin.roe_delta_pp != null ? fmtPP(fin.roe_delta_pp) + " 전년比" : "", fin.roe_delta_pp >= 0 ? "up" : "down");
    const perTile = fin.per != null
      ? finTile("per", "PER", fin.per.toFixed(1) + "배", "현재 주가 기준", "flat")
      : finTile("per", "PER", "산출불가", "당기순손실 상태", "flat");
    const toggleHtml = expandFin
      ? `<div class="fin-label">재무 스냅샷 (영업이익률·EPS·BPS·ROE·PER)</div>`
      : `<button class="fin-toggle" data-role="fintoggle" aria-expanded="false">
          <span data-role="fintext">재무 스냅샷 보기 (영업이익률·EPS·BPS·ROE·PER)</span>
          <i class="chev" aria-hidden="true">⌄</i>
        </button>`;
    const has5y = Array.isArray(fin.eps_history) && fin.eps_history.length > 1;
    finHtml = `
      ${toggleHtml}
      <div class="fin-body" data-role="finbody" ${expandFin ? "" : "hidden"}>
        <div class="fin-chart-caption" data-role="finchartcaption">영업이익률 5년 추이</div>
        <svg data-role="finchart"></svg>
        ${has5y ? `<div class="fin-hint">지표를 탭하면 5년 추이로 볼 수 있습니다</div>` : ""}
        <div class="fin-grid">${opMarginTile}${epsTile}${bpsTile}${roeTile}${perTile}</div>
        <div class="fin-note" data-role="finnote">DART 공시 기준 · 지배주주 귀속분 · ${fin.years[0]}~${fin.years[fin.years.length - 1]}</div>
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
    ${d.spark && d.spark.length > 1 ? `<div class="spark"><svg data-role="spark"></svg><div class="spark-legend"><span>${d.spark_start && sig.scan_date ? `${d.spark_start} ~ ${sig.scan_date}` : `최근 ${d.spark.length}거래일`}</span>${d.proximity != null ? `<span>52주고가대비 ${(d.proximity * 100).toFixed(0)}%</span>` : ""}</div>
    ${stopBufferPct != null || d.track_record ? `
    <div class="spark-status">
      ${stopBufferPct != null ? `<span class="buffer${stopBufferPct <= 5 ? " warn" : ""}">손절가까지 ${stopBufferPct.toFixed(1)}% 여유</span>` : "<span></span>"}
      ${d.track_record ? `<span class="badge normal">오늘의 추천 조건 충족</span>` : ""}
    </div>` : ""}</div>` : ""}
    ${showReason && sig.reason ? `<div class="why">${sig.reason}</div>` : ""}
    ${d.caution ? `<div class="caution">${d.caution}</div>` : ""}
    ${entryPlanHtml(d.entry_plan, d.stop_price)}
    ${finHtml}
    ${d.track_record ? `<div class="track">${d.track_record}</div>` : ""}
    <div class="scandate">${sig.scan_date || d.entry_plan?.as_of || "최신 데이터"} 스캔 기준 추천 정보</div>
  `;

  if (d.spark && d.spark.length > 1) {
    drawSpark(card.querySelector('[data-role="spark"]'), d.spark, d.spark_dates);
  }
  if (fin) {
    let currentMetric = "op_margin";
    const drawMetric = (metric) => {
      currentMetric = metric;
      const info = FIN5_METRICS[metric];
      const vals = fin5Values(fin, metric);
      const caption = card.querySelector('[data-role="finchartcaption"]');
      if (caption) caption.textContent = `${info.label} 5년 추이`;
      drawFinBars(card.querySelector('[data-role="finchart"]'), fin.years, vals, info.fmt);
      card.querySelectorAll('[data-role="fintile"]').forEach(t => t.classList.toggle("active", t.dataset.metric === metric));
    };

    const wireTiles = () => {
      card.querySelectorAll('[data-role="fintile"]').forEach(tile => {
        tile.addEventListener("click", () => {
          const metric = tile.dataset.metric;
          const vals = fin5Values(fin, metric);
          if (!vals || vals.every(v => v == null)) {
            // 5년치 데이터가 아직 없는 종목(예: 이 기능 추가 전에 캐시된 재무 스냅샷) —
            // 아무 반응 없이 넘어가면 고장난 것처럼 보이므로 명확히 안내한다.
            const info = FIN5_METRICS[metric];
            const caption = card.querySelector('[data-role="finchartcaption"]');
            if (caption) caption.textContent = `${info.label} 5년치 데이터 없음`;
            card.querySelector('[data-role="finchart"]').innerHTML = "";
            card.querySelectorAll('[data-role="fintile"]').forEach(t => t.classList.toggle("active", t === tile));
            return;
          }
          drawMetric(metric);
        });
      });
    };

    if (expandFin) {
      wireTiles();
      drawMetric("op_margin");
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
        if (!open && !drawn) {
          drawn = true;
          wireTiles();
          drawMetric("op_margin");
        }
      });
    }
  }
  return card;
}


function entryPlanHtml(plan, fallbackStopPrice = null) {
  if (!plan || !plan.recommended_mode) return "";
  const labels = { support: "지지 확인형", breakout: "돌파 확인형", wait: "관망형" };
  const summaries = {
    support: "지지대 확인 후 종가 회복",
    breakout: "저항대 돌파·거래량 확인",
    wait: "확인 신호 전 신규 진입 보류",
  };
  // 과거 검증(2020~2026, 신호 1,331건)에서 3가지 방식이 즉시매수보다 낫다는 근거가 없어
  // '추천'으로 표시하지 않고, 현재 위치 설명과 실제 운영 손절 기준만 보여준다.
  const statusText = {
    support: "현재 위치: 거래량 지지 구간이 비교적 가깝습니다.",
    breakout: "현재 위치: 저항 매물대가 가깝고 거래량이 늘어난 상태입니다.",
    wait: "현재 위치: 지지·돌파 조건이 뚜렷하지 않습니다.",
  }[plan.recommended_mode];
  const stopPrice = fallbackStopPrice;
  const stopBasis = "진입가에서 14일 ATR(평균 변동폭)의 2배를 뺀 값 · 고정 비율이 아님";
  // "257,653~261,680원" / "281,813원 상향 돌파" 같은 문구를 금액(크게)과 보조 문구(작게)로 나눈다.
  const splitPrice = (txt) => {
    const t = String(txt || "").trim();
    let m = t.match(/^([\d,]+)~([\d,]+)(원.*)$/);
    if (m) return { big: m[1], sub: "~ " + m[2] + m[3] };
    m = t.match(/^([\d,]+원)\s*(.*)$/);
    if (m) return { big: m[1], sub: m[2] };
    return { big: "", sub: t };
  };
  const methods = ["support", "breakout", "wait"].map(mode => {
    const item = plan[mode] || {};
    const pr = splitPrice(item.entry || "진입 보류");
    return `<div class="entry-method" title="${summaries[mode]}">
      <div class="entry-method-title">${labels[mode]}</div>
      <div class="entry-method-price mono">${pr.big || `<span class="entry-method-text">${pr.sub}</span>`}</div>
      ${pr.big && pr.sub ? `<div class="entry-method-sub mono">${pr.sub}</div>` : ""}
      <div class="entry-method-meta">${item.invalid ? `<b>무효화</b> ${item.invalid}` : "조건 확인 필요"}${item.secondary ? `<br><b>다음</b> ${item.secondary}` : ""}</div>
    </div>`;
  }).join("");
  return `<div class="entry-plan">
    <div class="entry-plan-head"><span>진입 계획</span><strong>참고용</strong></div>
    ${statusText ? `<div class="entry-plan-reason">${statusText}</div>` : ""}
    <div class="entry-plan-stop"><span>운영 손절 기준</span><b class="mono">${stopPrice != null ? fmtWon(stopPrice) : "없음"}</b><small>${stopBasis}</small></div>
    <div class="entry-methods">${methods}</div>
    <div class="entry-plan-note">거래량 매물대로 계산한 참고 가격대입니다. 과거 검증(2020~2026, 신호 1,331건)에서 세 방식 모두 즉시매수보다 나은 결과가 확인되지 않아 추천으로 표시하지 않습니다.</div>
  </div>`;
}
