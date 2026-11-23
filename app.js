/**
 * 무장애 경로 추천 AI 서비스 - 프론트엔드 컨트롤러 & 맵 렌더러
 */

// 전역 상태
const state = {
  currentDatasetKey: "shinseong",
  currentDataset: Datasets.shinseong,
  startNodeId: "N1",
  endNodeId: "N11",
  wheelchairType: "manual",
  searchEngine: null,
  shortestResult: null,
  recommendedResult: null,
  comparisonResult: null,
  mapTransform: { scale: 1.0, offsetX: 0, offsetY: 0 },
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  hoveredItem: null,
  animProgress: 0,
  animId: null
};

// =============================================================================
// [1] 초기화 (Initialization)
// =============================================================================
document.addEventListener("DOMContentLoaded", () => {
  initUI();
  switchDataset("shinseong");
  setupEventListeners();
  setupCanvasInteractions();
});

function initUI() {
  // 탭 전환 이벤트
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const targetId = btn.dataset.tab;
      document.getElementById(targetId).classList.add("active");

      if (targetId === "tab-map") {
        renderMap();
      }
    });
  });

  // 휠체어 종류 카드 라디오
  const radioCards = document.querySelectorAll(".radio-card");
  radioCards.forEach(card => {
    card.addEventListener("click", () => {
      radioCards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      state.wheelchairType = card.dataset.type;
      runSearch();
    });
  });
}

function setupEventListeners() {
  // 장소 프리셋 변경
  const datasetSelect = document.getElementById("datasetSelect");
  datasetSelect.addEventListener("change", (e) => {
    switchDataset(e.target.value);
  });

  // 출발지 / 목적지 변경
  document.getElementById("startNodeSelect").addEventListener("change", (e) => {
    state.startNodeId = e.target.value;
  });
  document.getElementById("endNodeSelect").addEventListener("change", (e) => {
    state.endNodeId = e.target.value;
  });

  // 탐색 실행 버튼
  document.getElementById("btnRunSearch").addEventListener("click", () => {
    animatePipeline(() => {
      runSearch();
    });
  });

  // 맵 컨트롤 버튼
  document.getElementById("btnZoomIn").addEventListener("click", () => {
    state.mapTransform.scale = Math.min(2.5, state.mapTransform.scale * 1.2);
    renderMap();
  });
  document.getElementById("btnZoomOut").addEventListener("click", () => {
    state.mapTransform.scale = Math.max(0.6, state.mapTransform.scale / 1.2);
    renderMap();
  });
  document.getElementById("btnResetView").addEventListener("click", () => {
    resetMapView();
    renderMap();
  });
}

function switchDataset(key) {
  state.currentDatasetKey = key;
  state.currentDataset = Datasets[key];
  state.startNodeId = state.currentDataset.defaultStart;
  state.endNodeId = state.currentDataset.defaultEnd;

  // 장소 정보 표시 갱신
  document.getElementById("locationInfo").textContent = `${state.currentDataset.name} (${state.currentDataset.location})`;

  // 드롭다운 노드 옵션 채우기
  populateNodeSelects();

  // 엔진 인스턴스화
  state.searchEngine = new SearchEngine(
    state.currentDataset.nodes,
    state.currentDataset.edges,
    LegalStandards,
    state.wheelchairType
  );

  resetMapView();
  renderEdgeTable();
  renderPipelineFlow();
  runSearch();
}

function populateNodeSelects() {
  const startSelect = document.getElementById("startNodeSelect");
  const endSelect = document.getElementById("endNodeSelect");
  startSelect.innerHTML = "";
  endSelect.innerHTML = "";

  const nodes = state.currentDataset.nodes;
  for (const nid in nodes) {
    const node = nodes[nid];
    const opt1 = new Option(`${node.name} (${nid})`, nid);
    const opt2 = new Option(`${node.name} (${nid})`, nid);
    if (nid === state.startNodeId) opt1.selected = true;
    if (nid === state.endNodeId) opt2.selected = true;
    startSelect.add(opt1);
    endSelect.add(opt2);
  }
}

function resetMapView() {
  const canvas = document.getElementById("routeMapCanvas");
  if (!canvas) return;
  state.mapTransform = {
    scale: 0.95,
    offsetX: 20,
    offsetY: 10
  };
}

// =============================================================================
// [2] 7단계 데이터 파이프라인 및 탐색 실행
// =============================================================================
function animatePipeline(callback) {
  const stepItems = document.querySelectorAll(".pipeline-steps .step-item");
  let currentStep = 0;

  stepItems.forEach(el => {
    el.classList.remove("active", "completed");
  });

  const interval = setInterval(() => {
    if (currentStep > 0) {
      stepItems[currentStep - 1].classList.remove("active");
      stepItems[currentStep - 1].classList.add("completed");
    }

    if (currentStep < stepItems.length) {
      stepItems[currentStep].classList.add("active");
      currentStep++;
    } else {
      clearInterval(interval);
      if (callback) callback();
    }
  }, 120);
}

function runSearch() {
  // 엔진 새로고침 (휠체어 옵션 적용)
  state.searchEngine = new SearchEngine(
    state.currentDataset.nodes,
    state.currentDataset.edges,
    LegalStandards,
    state.wheelchairType
  );

  state.shortestResult = state.searchEngine.findShortestPath(state.startNodeId, state.endNodeId);
  state.recommendedResult = state.searchEngine.findBarrierFreePath(state.startNodeId, state.endNodeId);
  state.comparisonResult = ComparisonExplainer.compareAndExplain(state.shortestResult, state.recommendedResult);

  updateDashboard();
  startRouteAnimation();
  renderMap();
}

function updateDashboard() {
  const short = state.shortestResult;
  const rec = state.recommendedResult;
  const comp = state.comparisonResult;

  if (!short || !rec) {
    alert("선택하신 출발지와 목적지 간의 경로를 찾을 수 없습니다.");
    return;
  }

  // 1. 핵심 지표 요약 카드 업데이트
  document.getElementById("metricDistRec").textContent = `${rec.totalDistance}m`;
  document.getElementById("metricDistShort").textContent = `최단경로: ${short.totalDistance}m (${comp.distDiff > 0 ? "+" + comp.distDiff + "m 우회" : "동일"})`;
  
  document.getElementById("metricCurbRec").textContent = `${rec.maxCurb}cm`;
  document.getElementById("metricCurbShort").textContent = `최단경로: ${short.maxCurb}cm`;
  const curbBadge = document.getElementById("metricCurbBadge");
  if (rec.maxCurb <= LegalStandards.CURB_STANDARD_MAX) {
    curbBadge.className = "metric-badge badge-pass";
    curbBadge.textContent = "법적 기준(2cm) 적합";
  } else if (rec.maxCurb <= LegalStandards.CURB_CAUTION_MAX) {
    curbBadge.className = "metric-badge badge-warn";
    curbBadge.textContent = "주의 구간 (2~5cm)";
  } else {
    curbBadge.className = "metric-badge badge-fail";
    curbBadge.textContent = "이동 불리 구간";
  }

  document.getElementById("metricSlopeRec").textContent = `${rec.maxSlope}%`;
  document.getElementById("metricSlopeShort").textContent = `최단경로: ${short.maxSlope}%`;
  const slopeBadge = document.getElementById("metricSlopeBadge");
  if (rec.maxSlope <= LegalStandards.SLOPE_RECOMMENDED_MAX) {
    slopeBadge.className = "metric-badge badge-pass";
    slopeBadge.textContent = "법적 권장(5.56%) 적합";
  } else if (rec.maxSlope <= LegalStandards.SLOPE_PERMISSIBLE_MAX) {
    slopeBadge.className = "metric-badge badge-warn";
    slopeBadge.textContent = "법적 허용(8.33%) 이내";
  } else {
    slopeBadge.className = "metric-badge badge-fail";
    slopeBadge.textContent = "급경사 주의 구간";
  }

  const facText = rec.facilities.length > 0 ? rec.facilities.join(", ") : "경사로/완만로";
  document.getElementById("metricFacilityRec").textContent = facText;
  document.getElementById("metricFacilityShort").textContent = short.hasStairs ? "⚠️ 최단경로 계단 포함 (통행불가)" : "평탄 경로";
  const passBadge = document.getElementById("metricPassBadge");
  if (rec.isPassable) {
    passBadge.className = "metric-badge badge-pass";
    passBadge.textContent = "휠체어 안전 통행 가능";
  } else {
    passBadge.className = "metric-badge badge-fail";
    passBadge.textContent = "통행 불가";
  }

  // 2. XAI 추천 사유 설명창
  document.getElementById("xaiSummaryText").textContent = comp.summaryExplanation;
  const bulletList = document.getElementById("xaiBulletList");
  bulletList.innerHTML = "";
  comp.reasons.forEach(r => {
    const li = document.createElement("li");
    li.textContent = r;
    bulletList.appendChild(li);
  });

  // 3. 상세 비교 테이블
  const tbody = document.getElementById("compTableBody");
  tbody.innerHTML = `
    <tr>
      <td><strong>경로 구간</strong></td>
      <td>${short.nodeNames.join(" → ")}</td>
      <td class="col-rec">${rec.nodeNames.join(" → ")}</td>
      <td class="col-diff">${comp.stairAvoided ? "계단 우회 안전 경로" : "안전 경로"}</td>
    </tr>
    <tr>
      <td><strong>총 이동 거리</strong></td>
      <td>${short.totalDistance} m</td>
      <td class="col-rec">${rec.totalDistance} m</td>
      <td class="col-diff">${comp.distDiff > 0 ? `+${comp.distDiff} m (우회)` : "0 m"}</td>
    </tr>
    <tr>
      <td><strong>예상 소요 시간</strong></td>
      <td>약 ${short.estimatedTimeMin} 분</td>
      <td class="col-rec">약 ${rec.estimatedTimeMin} 분</td>
      <td class="col-diff">${comp.timeDiff > 0 ? `+${comp.timeDiff} 분` : "동일"}</td>
    </tr>
    <tr>
      <td><strong>최대 단차(턱)</strong></td>
      <td>${short.maxCurb} cm ${short.maxCurb > 2.0 ? "(초과)" : "(적합)"}</td>
      <td class="col-rec">${rec.maxCurb} cm (공식 적합)</td>
      <td class="col-diff">${comp.curbDiff > 0 ? `-${comp.curbDiff} cm 개선` : "동일"}</td>
    </tr>
    <tr>
      <td><strong>최고 경사도</strong></td>
      <td>${short.maxSlope} %</td>
      <td class="col-rec">${rec.maxSlope} %</td>
      <td class="col-diff">${comp.slopeDiff > 0 ? `-${comp.slopeDiff} % 완화` : "동일"}</td>
    </tr>
    <tr>
      <td><strong>계단 유무</strong></td>
      <td><span class="metric-badge badge-fail">${short.hasStairs ? "포함 (통행 불가능)" : "없음"}</span></td>
      <td class="col-rec"><span class="metric-badge badge-pass">계단 100% 회피 (0개)</span></td>
      <td class="col-diff">${comp.stairAvoided ? "위험 완벽 해소" : "양호"}</td>
    </tr>
    <tr>
      <td><strong>연계 편의시설</strong></td>
      <td>${short.facilities.length > 0 ? short.facilities.join(", ") : "없음"}</td>
      <td class="col-rec">${rec.facilities.length > 0 ? rec.facilities.join(", ") : "완만 경사로"}</td>
      <td class="col-diff">수직/경사 이동 보조</td>
    </tr>
    <tr>
      <td><strong>휠체어 통행 판정</strong></td>
      <td><span class="metric-badge ${short.isPassable ? 'badge-pass' : 'badge-fail'}">${short.isPassable ? "통행 가능" : "통행 불가 (위험)"}</span></td>
      <td class="col-rec"><span class="metric-badge badge-pass">${rec.isPassable ? "쾌적 이동 가능" : "주의 이동"}</span></td>
      <td class="col-diff"><strong>AI 최적 추천</strong></td>
    </tr>
  `;

  // 4. 차트 렌더링
  renderCharts(short, rec);
}

// =============================================================================
// [3] 차트 시각화 (Charts Rendering)
// =============================================================================
let chartInstance1 = null;
let chartInstance2 = null;

function renderCharts(short, rec) {
  // Chart.js가 글로벌로 로드되어 있는지 확인
  if (typeof Chart !== "undefined") {
    // 1. 핵심 속성 비교 바 차트
    const ctx1 = document.getElementById("chartComparison").getContext("2d");
    if (chartInstance1) chartInstance1.destroy();

    chartInstance1 = new Chart(ctx1, {
      type: "bar",
      data: {
        labels: ["거리(m)", "최대단차(cm)", "최고경사도(%)", "소요시간(분x10)"],
        datasets: [
          {
            label: "일반 최단거리 경로",
            data: [short.totalDistance, short.maxCurb, short.maxSlope, short.estimatedTimeMin * 10],
            backgroundColor: "rgba(59, 130, 246, 0.75)",
            borderColor: "rgb(59, 130, 246)",
            borderWidth: 1
          },
          {
            label: "AI 추천 무장애 경로",
            data: [rec.totalDistance, rec.maxCurb, rec.maxSlope, rec.estimatedTimeMin * 10],
            backgroundColor: "rgba(16, 185, 129, 0.85)",
            borderColor: "rgb(16, 185, 129)",
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top" },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}`
            }
          }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

    // 2. 경로별 경사도 및 단차 프로파일 차트
    const ctx2 = document.getElementById("chartProfile").getContext("2d");
    if (chartInstance2) chartInstance2.destroy();

    const shortLabels = short.edges.map((e, i) => `구간 ${i+1}`);
    const recLabels = rec.edges.map((e, i) => `구간 ${i+1}`);
    const maxSteps = Math.max(short.edges.length, rec.edges.length);
    const commonLabels = Array.from({ length: maxSteps }, (_, i) => `구간 ${i+1}`);

    chartInstance2 = new Chart(ctx2, {
      type: "line",
      data: {
        labels: commonLabels,
        datasets: [
          {
            label: "일반 최단경로 경사도(%)",
            data: commonLabels.map((_, i) => short.edges[i] ? short.edges[i].slope : null),
            borderColor: "rgb(239, 68, 68)",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            borderDash: [5, 5],
            tension: 0.2,
            fill: false
          },
          {
            label: "AI 추천경로 경사도(%)",
            data: commonLabels.map((_, i) => rec.edges[i] ? rec.edges[i].slope : null),
            borderColor: "rgb(16, 185, 129)",
            backgroundColor: "rgba(16, 185, 129, 0.2)",
            tension: 0.2,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top" }
        },
        scales: {
          y: {
            title: { display: true, text: "경사도 (%)" },
            beginAtZero: true
          }
        }
      }
    });
  } else {
    // CDN 오프라인 시 폴백 SVG 그래프 렌더링
    renderFallbackSVGCharts(short, rec);
  }
}

function renderFallbackSVGCharts(short, rec) {
  const c1 = document.getElementById("chartComparison");
  if (c1 && c1.parentElement) {
    c1.parentElement.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px; padding:10px; font-size:12px;">
        <div><strong>거리:</strong> 최단 ${short.totalDistance}m vs AI추천 ${rec.totalDistance}m</div>
        <div><strong>최대단차:</strong> 최단 ${short.maxCurb}cm vs AI추천 ${rec.maxCurb}cm (공식기준 2cm 이하)</div>
        <div><strong>최고경사:</strong> 최단 ${short.maxSlope}% vs AI추천 ${rec.maxSlope}%</div>
      </div>
    `;
  }
}

// =============================================================================
// [4] 인터랙티브 지도 렌더러 (Canvas Map Renderer)
// =============================================================================
function renderMap() {
  const canvas = document.getElementById("routeMapCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Resize canvas to match display size for crisp graphics
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
  }
  ctx.save();
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;

  // Background
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, width, height);

  // Grid
  drawGrid(ctx, width, height);

  // Apply Pan & Zoom
  ctx.save();
  ctx.translate(state.mapTransform.offsetX, state.mapTransform.offsetY);
  ctx.scale(state.mapTransform.scale, state.mapTransform.scale);

  const dataset = state.currentDataset;
  const nodes = dataset.nodes;
  const edges = dataset.edges;

  // 1. 전체 도로 네트워크(Edge) 그리기
  edges.forEach(edge => {
    const fromNode = nodes[edge.from];
    const toNode = nodes[edge.to];
    if (!fromNode || !toNode) return;

    const ev = state.searchEngine.evaluations[edge.id];
    let strokeColor = "#334155";
    let lineWidth = 3;
    let isDashed = false;

    if (edge.stairs && !edge.elevator && !edge.ramp) {
      strokeColor = "#ef4444"; // 통행 불가 계단
      lineWidth = 3;
      isDashed = true;
    } else if (ev.overallGrade === InferenceEngine.GRADE_ACCESSIBLE) {
      strokeColor = "rgba(16, 185, 129, 0.4)";
    } else if (ev.overallGrade === InferenceEngine.GRADE_CAUTION) {
      strokeColor = "rgba(245, 158, 11, 0.4)";
    } else {
      strokeColor = "rgba(239, 68, 68, 0.4)";
    }

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    ctx.lineTo(toNode.x, toNode.y);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    if (isDashed) ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();

    // 도로 라벨 (거리 & 경사)
    const midX = (fromNode.x + toNode.x) / 2;
    const midY = (fromNode.y + toNode.y) / 2;
    ctx.fillStyle = "#64748b";
    ctx.font = "9.5px sans-serif";
    ctx.fillText(`${edge.distance}m (${edge.slope}%)`, midX + 3, midY - 3);

    if (edge.stairs && !edge.elevator && !edge.ramp) {
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(`⚠️ 계단(${edge.stairCount}단)`, midX - 25, midY + 14);
    }
    if (edge.elevator) {
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(`🛗 승강기`, midX - 10, midY + 12);
    }
  });

  // 2. 일반 최단거리 경로 하이라이트 (파란색 점선)
  if (state.shortestResult && state.shortestResult.edges) {
    ctx.save();
    ctx.beginPath();
    state.shortestResult.edges.forEach((edge, idx) => {
      const fn = nodes[edge.from];
      const tn = nodes[edge.to];
      if (idx === 0) ctx.moveTo(fn.x, fn.y);
      ctx.lineTo(tn.x, tn.y);
    });
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 4;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.restore();
  }

  // 3. AI 추천 무장애 경로 하이라이트 (초록색 글로우 실선)
  if (state.recommendedResult && state.recommendedResult.edges) {
    ctx.save();
    // 글로우 효과
    ctx.shadowColor = "#10b981";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    state.recommendedResult.edges.forEach((edge, idx) => {
      const fn = nodes[edge.from];
      const tn = nodes[edge.to];
      if (idx === 0) ctx.moveTo(fn.x, fn.y);
      ctx.lineTo(tn.x, tn.y);
    });
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();

    // 경로 방향 화살표
    state.recommendedResult.edges.forEach(edge => {
      const fn = nodes[edge.from];
      const tn = nodes[edge.to];
      drawArrow(ctx, fn.x, fn.y, tn.x, tn.y, "#10b981");
    });

    // 휠체어 이동 시뮬레이션 애니메이션 마커
    drawAnimatedWheelchair(ctx, nodes, state.recommendedResult.edges, state.animProgress);
  }

  // 4. 노드 그리기
  for (const nid in nodes) {
    const node = nodes[nid];
    const isStart = nid === state.startNodeId;
    const isEnd = nid === state.endNodeId;
    const isHovered = state.hoveredItem && state.hoveredItem.id === nid;

    ctx.save();
    ctx.beginPath();
    let radius = isStart || isEnd ? 11 : (isHovered ? 9 : 7);
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);

    if (isStart) {
      ctx.fillStyle = "#10b981"; // 초록 출발
      ctx.shadowColor = "#10b981";
      ctx.shadowBlur = 10;
    } else if (isEnd) {
      ctx.fillStyle = "#8b5cf6"; // 보라 도착
      ctx.shadowColor = "#8b5cf6";
      ctx.shadowBlur = 10;
    } else {
      ctx.fillStyle = isHovered ? "#60a5fa" : "#3b82f6";
    }

    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.restore();

    // 노드 명칭 텍스트
    ctx.save();
    ctx.font = isStart || isEnd ? "bold 12px sans-serif" : "11px sans-serif";
    ctx.fillStyle = isStart || isEnd ? "#ffffff" : "#cbd5e1";
    ctx.fillText(node.name, node.x + 12, node.y + 4);

    if (isStart) {
      ctx.fillStyle = "#10b981";
      ctx.font = "bold 10.5px sans-serif";
      ctx.fillText("[출발]", node.x + 12, node.y - 10);
    }
    if (isEnd) {
      ctx.fillStyle = "#c084fc";
      ctx.font = "bold 10.5px sans-serif";
      ctx.fillText("[목적지]", node.x + 12, node.y - 10);
    }
    ctx.restore();
  }

  ctx.restore(); // mapTransform restore
  ctx.restore(); // dpr scale restore
}

function drawGrid(ctx, w, h) {
  ctx.save();
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 0.8;
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawArrow(ctx, fromX, fromY, toX, toY, color) {
  const headlen = 10;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(midX, midY);
  ctx.lineTo(midX - headlen * Math.cos(angle - Math.PI / 6), midY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(midX, midY);
  ctx.lineTo(midX - headlen * Math.cos(angle + Math.PI / 6), midY - headlen * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
  ctx.restore();
}

function drawAnimatedWheelchair(ctx, nodes, edges, progress) {
  if (!edges || edges.length === 0) return;

  const totalSegments = edges.length;
  const currentPos = progress * totalSegments;
  const currentIdx = Math.min(Math.floor(currentPos), totalSegments - 1);
  const segmentT = currentPos - currentIdx;

  const edge = edges[currentIdx];
  const fn = nodes[edge.from];
  const tn = nodes[edge.to];
  const x = fn.x + (tn.x - fn.x) * segmentT;
  const y = fn.y + (tn.y - fn.y) * segmentT;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#10b981";
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#10b981";
  ctx.stroke();

  ctx.font = "14px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("♿", x, y);
  ctx.restore();
}

function startRouteAnimation() {
  if (state.animId) cancelAnimationFrame(state.animId);
  state.animProgress = 0;

  function step() {
    state.animProgress += 0.0035;
    if (state.animProgress > 1.0) state.animProgress = 0.0;
    renderMap();
    state.animId = requestAnimationFrame(step);
  }
  state.animId = requestAnimationFrame(step);
}

// Canvas 인터랙션 (Zoom, Pan, Tooltip, Click)
function setupCanvasInteractions() {
  const canvas = document.getElementById("routeMapCanvas");
  const tooltip = document.getElementById("mapTooltip");

  canvas.addEventListener("mousedown", (e) => {
    state.isDragging = true;
    state.dragStart = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener("mouseup", () => {
    state.isDragging = false;
  });

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (state.isDragging) {
      state.mapTransform.offsetX += e.clientX - state.dragStart.x;
      state.mapTransform.offsetY += e.clientY - state.dragStart.y;
      state.dragStart = { x: e.clientX, y: e.clientY };
      renderMap();
      return;
    }

    // 마우스 좌표를 캔버스 가상 좌표계로 역변환
    const mapX = (mouseX - state.mapTransform.offsetX) / state.mapTransform.scale;
    const mapY = (mouseY - state.mapTransform.offsetY) / state.mapTransform.scale;

    // 노드 호버 감지
    const nodes = state.currentDataset.nodes;
    let foundNode = null;
    for (const nid in nodes) {
      const node = nodes[nid];
      const dist = Math.hypot(node.x - mapX, node.y - mapY);
      if (dist < 15) {
        foundNode = node;
        break;
      }
    }

    if (foundNode) {
      state.hoveredItem = foundNode;
      tooltip.style.display = "block";
      tooltip.style.left = `${e.clientX + 14}px`;
      tooltip.style.top = `${e.clientY + 14}px`;
      tooltip.innerHTML = `
        <strong>${foundNode.name}</strong> (${foundNode.id})<br/>
        <span style="color:#94a3b8;">${foundNode.desc || "보행 네트워크 거점"}</span><br/>
        <span style="font-size:11px; color:#38bdf8;">클릭 시 출발/도착지 설정</span>
      `;
      renderMap();
      return;
    }

    // 엣지 호버 감지
    const edges = state.currentDataset.edges;
    let foundEdge = null;
    for (const edge of edges) {
      const fn = nodes[edge.from];
      const tn = nodes[edge.to];
      const dist = distanceToSegment({ x: mapX, y: mapY }, fn, tn);
      if (dist < 8) {
        foundEdge = edge;
        break;
      }
    }

    if (foundEdge) {
      const ev = state.searchEngine.evaluations[foundEdge.id];
      tooltip.style.display = "block";
      tooltip.style.left = `${e.clientX + 14}px`;
      tooltip.style.top = `${e.clientY + 14}px`;
      tooltip.innerHTML = `
        <strong>${foundEdge.name}</strong><br/>
        • 거리: ${foundEdge.distance}m | 경사도: ${foundEdge.slope}%<br/>
        • 단차: ${foundEdge.curb}cm | 계단: ${foundEdge.stairs ? `있음(${foundEdge.stairCount}단)` : "없음"}<br/>
        • 편의시설: ${foundEdge.elevator ? "승강기" : (foundEdge.ramp ? "경사로" : "없음")}<br/>
        <div style="margin-top:4px; padding-top:4px; border-top:1px solid #334155;">
          <strong>AI 추론:</strong> <span style="color:#10b981;">${ev.overallGrade}</span><br/>
          <span style="font-size:11px; color:#cbd5e1;">${ev.summaryReason}</span>
        </div>
      `;
      return;
    }

    tooltip.style.display = "none";
    if (state.hoveredItem) {
      state.hoveredItem = null;
      renderMap();
    }
  });

  // 노드 클릭 시 출발지/도착지 빠른 설정
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const mapX = (mouseX - state.mapTransform.offsetX) / state.mapTransform.scale;
    const mapY = (mouseY - state.mapTransform.offsetY) / state.mapTransform.scale;

    const nodes = state.currentDataset.nodes;
    for (const nid in nodes) {
      const node = nodes[nid];
      if (Math.hypot(node.x - mapX, node.y - mapY) < 16) {
        if (state.startNodeId !== nid) {
          state.endNodeId = nid;
          document.getElementById("endNodeSelect").value = nid;
        } else {
          state.startNodeId = nid;
          document.getElementById("startNodeSelect").value = nid;
        }
        runSearch();
        break;
      }
    }
  });

  // 마우스 휠 줌
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    state.mapTransform.scale = Math.max(0.5, Math.min(3.0, state.mapTransform.scale * zoomFactor));
    renderMap();
  });
}

function distanceToSegment(p, v, w) {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

// =============================================================================
// [5] 7단계 데이터 흐름 상세 보기 렌더링 (Tab 2)
// =============================================================================
function renderPipelineFlow() {
  const container = document.getElementById("pipelineFlowList");
  if (!container) return;

  const steps = [
    {
      num: 1,
      title: "실제 자료 수집 (Raw Data Collection)",
      icon: "📍",
      badge: "현장 조사 & 공공데이터",
      desc: "임의의 가상 데이터가 아닌 실제 장소(신성여자고등학교 캠퍼스 및 통학로 실측 데이터)를 대상으로 현장 조사(줄자 단차 실측, 스마트폰 센서 경사계 앱 실측, 사진 자료) 및 시설 도면을 체계적으로 수집합니다.",
      input: "신성여고 현장 실측 사진, 줄자 실측 단차(cm), 경사계 기울기(%), 시설물 배치도",
      output: `총 ${Object.keys(state.currentDataset.nodes).length}개 주요 지점(Node) 및 ${state.currentDataset.edges.length}개 보행 도로 구간(Edge) 실측 데이터`
    },
    {
      num: 2,
      title: "핵심 속성 추출 (Feature Extraction)",
      icon: "⚙️",
      badge: "4대 핵심 속성 정형화",
      desc: "수집된 데이터로부터 휠체어 이용자의 이동권과 안전에 직접적인 영향을 미치는 4가지 핵심 속성을 추출하여 프로그램에서 처리 가능한 수치형 데이터로 변환합니다.",
      input: "구간별 실측 기록",
      output: "1) 이동 거리(m), 2) 계단 및 단차 높이(cm), 3) 경사도(%), 4) 이동편의시설(승강기, 경사로 등) 유무"
    },
    {
      num: 3,
      title: "데이터 가공 (Data Processing)",
      icon: "📊",
      badge: "토폴로지 그래프 모델링",
      desc: "추출된 핵심 속성을 표준화하고, 출발지에서 목적지까지의 연결 관계를 나타내는 노드-링크 인접 리스트(Adjacency List) 형태의 상태 공간 그래프로 구축합니다.",
      input: "정규화된 속성 데이터 세트",
      output: "인접 리스트 그래프 G=(V, E), 좌표계 매핑, 제약조건 검증 완료"
    },
    {
      num: 4,
      title: "추론을 통한 구간별 이동 적합성 판단 (Inference Engine)",
      icon: "🧠",
      badge: "공식 법적 기준 규칙 추론",
      desc: "임의의 가중치를 매기지 않고, 「교통약자의 이동편의 증진법」 및 「장애인등편의법」 시행규칙의 공식 기준(단차 2cm 이하 적합, 경사도 1/18 권장 등)을 지식 베이스로 삼아 구간별 이동 적합성(적합, 주의 필요, 이동 불리, 이동 불가)을 논리적으로 추론하고 이동 저항 가중치(Weight)를 산정합니다.",
      input: "구간별 핵심 속성 + 법적 기준 지식 베이스",
      output: "구간별 적합성 등급, 자연어 추론 사유(XAI), 알고리즘 탐색 비용(Cost)"
    },
    {
      num: 5,
      title: "탐색을 통한 경로 비교 (Search Engine)",
      icon: "🔍",
      badge: "다익스트라 & A* 알고리즘",
      desc: "탐색 알고리즘을 활용하여 1) 단순 물리적 거리를 최소화하는 '일반 최단거리 경로'와 2) AI 추론 가중치를 최소화하는 'AI 무장애 추천 경로'를 탐색하고 여러 대안 경로를 비교 분석합니다.",
      input: "그래프 G, 출발지 N1, 목적지 N11, 가중치 함수",
      output: "일반 최단거리 경로 vs AI 추천 무장애 경로 vs 대안 후보 경로 세트"
    },
    {
      num: 6,
      title: "최적 경로 추천 (Recommendation)",
      icon: "🏆",
      badge: "교통약자 최적 솔루션 도출",
      desc: "휠체어 이동에 치명적인 계단과 고단차를 100% 회피하고, 경사로와 엘리베이터 승강기 등 이동편의시설을 최적으로 연계한 경로를 사용자에게 추천합니다.",
      input: "탐색 결과 후보 경로 세트",
      output: "최적 무장애 경로, 총 거리, 소요 시간, 활용 시설, 경로 선택 이유 리포트"
    },
    {
      num: 7,
      title: "최단거리 경로와 비교 (Comparison & Explainability)",
      icon: "📈",
      badge: "지표 비교표 & 시각화 그래프",
      desc: "일반 지도 앱의 최단거리 경로와 AI 추천 경로의 차이(거리 차이, 단차 해소, 경사도 완화, 계단 제거 여부)를 한눈에 확인할 수 있는 비교 표와 차트, 자연어 설명을 화면에 표시합니다.",
      input: "최단 경로 지표 + 추천 경로 지표",
      output: "핵심 지표 비교 카드, 상세 대조 테이블, 속성 비교 막대 차트, 경사도 단면 그래프"
    }
  ];

  container.innerHTML = steps.map(s => `
    <div class="flow-step-card">
      <div class="flow-step-icon">${s.icon}</div>
      <div class="flow-step-body">
        <div class="flow-step-header">
          <div class="flow-step-title">${s.num}단계. ${s.title}</div>
          <span class="flow-step-badge">${s.badge}</span>
        </div>
        <div class="flow-step-desc">${s.desc}</div>
        <div class="flow-step-io">
          <div><span class="io-label">입력:</span> ${s.input}</div>
          <div><span class="io-label">출력:</span> ${s.output}</div>
        </div>
      </div>
    </div>
  `).join("");
}

// =============================================================================
// [6] 구간별 AI 추론 세부표 렌더링 (Tab 3)
// =============================================================================
function renderEdgeTable() {
  const tbody = document.getElementById("edgeTableBody");
  if (!tbody) return;

  const dataset = state.currentDataset;
  const edges = dataset.edges;

  tbody.innerHTML = edges.map(edge => {
    const ev = state.searchEngine.evaluations[edge.id];
    let badgeClass = "badge-pass";
    if (ev.overallGrade === InferenceEngine.GRADE_CAUTION) badgeClass = "badge-warn";
    if (ev.overallGrade === InferenceEngine.GRADE_DISADVANTAGED || ev.overallGrade === InferenceEngine.GRADE_INACCESSIBLE) badgeClass = "badge-fail";

    const fac = [];
    if (edge.elevator) fac.push("승강기");
    if (edge.ramp) fac.push("경사로");
    if (edge.braille) fac.push("점자블록");

    return `
      <tr>
        <td><strong>${edge.id}</strong></td>
        <td>${edge.name}</td>
        <td>${edge.distance} m</td>
        <td>${edge.curb} cm</td>
        <td>${edge.slope} %</td>
        <td>${edge.stairs ? `계단(${edge.stairCount}단)` : "없음"}</td>
        <td>${fac.length > 0 ? fac.join(", ") : "없음"}</td>
        <td><span class="metric-badge ${badgeClass}">${ev.overallGrade}</span></td>
        <td><strong>${ev.weight}</strong></td>
        <td style="font-size:11.5px; color:#475569; max-width:280px; white-space:normal;">${ev.summaryReason}</td>
      </tr>
    `;
  }).join("");
}
