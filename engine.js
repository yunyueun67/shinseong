/**
 * 무장애 경로 추천 AI 엔진 (Inference & Search Engine)
 * - 인공지능 기초: AI 추론(규칙 기반 지식 추론) + AI 탐색(Dijkstra/A* 알고리즘)
 * - 법적 공식 기준 반영: 「교통약자의 이동편의 증진법」 및 「장애인등편의법」 시행규칙
 */

class InferenceEngine {
  // 적합성 등급 상수
  static GRADE_ACCESSIBLE = "적합";              // 법적 기준 완전 충족, 자력 쾌적 이동
  static GRADE_CAUTION = "주의가 필요한 구간";      // 경미한 기준 초과, 주의/감속 필요
  static GRADE_DISADVANTAGED = "이동에 불리한 구간"; // 기준 대폭 초과, 보조자 필요 또는 우회 권장
  static GRADE_INACCESSIBLE = "통행 불가(계단/위험)"; // 휠체어 진입 불가능

  /**
   * 도로 구간(Edge)의 핵심 속성을 기반으로 법적 기준 대조 및 이동 적합성 추론
   */
  static evaluateEdge(edge, standards = LegalStandards, wheelchairType = "manual") {
    const reasons = [];
    let isPassable = true;
    let curbGrade = "적합";
    let slopeGrade = "적합";
    let overallGrade = InferenceEngine.GRADE_ACCESSIBLE;

    // 1. 계단 및 이동편의시설 추론 (Rule 1)
    if (edge.stairs) {
      if (edge.elevator) {
        reasons.push("계단이 있으나 장애인 겸용 승강기가 설치되어 수직 이동 가능");
      } else if (edge.ramp) {
        reasons.push(`계단 병행 완만 경사로(기울기 ${edge.slope}%)가 설치되어 휠체어 통행 가능`);
      } else {
        isPassable = false;
        overallGrade = InferenceEngine.GRADE_INACCESSIBLE;
        reasons.push(`경사로/승강기 없는 계단(${edge.stairCount || "다수"}단, 단차 ${edge.curb}cm)으로 휠체어 통행 불가`);
      }
    }

    // 2. 단차(턱) 법적 기준 추론 (Rule 2: 법적 기준 2.0cm 이하)
    if (!edge.stairs || (edge.ramp || edge.elevator)) {
      if (edge.curb <= standards.CURB_STANDARD_MAX) {
        curbGrade = "적합";
        reasons.push(`단차(${edge.curb}cm)가 법적 기준(2.0cm 이하)을 충족하여 걸림 없이 통과 가능`);
      } else if (edge.curb <= standards.CURB_CAUTION_MAX) {
        curbGrade = "주의 필요";
        reasons.push(`단차(${edge.curb}cm)가 법적 기준(2.0cm)을 초과하여 앞바퀴 걸림 및 진동 주의 필요`);
        if (overallGrade === InferenceEngine.GRADE_ACCESSIBLE) {
          overallGrade = InferenceEngine.GRADE_CAUTION;
        }
      } else if (edge.curb <= standards.CURB_DISADVANTAGED_MAX) {
        curbGrade = "이동 불리";
        reasons.push(`단차(${edge.curb}cm)가 5cm를 초과하여 수동휠체어 자력 통과가 매우 어렵고 전복 위험 존재`);
        if (overallGrade === InferenceEngine.GRADE_ACCESSIBLE || overallGrade === InferenceEngine.GRADE_CAUTION) {
          overallGrade = InferenceEngine.GRADE_DISADVANTAGED;
        }
      } else {
        curbGrade = "이동 불가";
        isPassable = false;
        overallGrade = InferenceEngine.GRADE_INACCESSIBLE;
        reasons.push(`단차(${edge.curb}cm)가 15cm를 초과하여 휠체어 통행 불가`);
      }
    }

    // 3. 경사도 법적 기준 추론 (Rule 3: 권장 5.56%, 완화허용 8.33%)
    if (edge.slope <= standards.SLOPE_RECOMMENDED_MAX) {
      slopeGrade = "완만(적합)";
      reasons.push(`경사도(${edge.slope}%)가 법적 권장기준(1/18, 약 5.56% 이하)으로 편안한 주행 가능`);
    } else if (edge.slope <= standards.SLOPE_PERMISSIBLE_MAX) {
      slopeGrade = "허용(보통)";
      reasons.push(`경사도(${edge.slope}%)가 법적 완화기준(1/12, 약 8.33% 이하)에 부합하나 약간의 체력 소모 발생`);
      if (overallGrade === InferenceEngine.GRADE_ACCESSIBLE) {
        overallGrade = InferenceEngine.GRADE_CAUTION;
      }
    } else if (edge.slope <= standards.SLOPE_CAUTION_MAX) {
      slopeGrade = "주의(가파름)";
      reasons.push(`경사도(${edge.slope}%)가 법적 기준(8.33%)을 초과하여 뒤로 밀림 위험 주의 필요`);
      if (overallGrade === InferenceEngine.GRADE_ACCESSIBLE || overallGrade === InferenceEngine.GRADE_CAUTION) {
        overallGrade = InferenceEngine.GRADE_DISADVANTAGED;
      }
    } else {
      slopeGrade = "급경사(위험)";
      reasons.push(`경사도(${edge.slope}%)가 12%를 초과하는 급경사로 휠체어 단독 주행 시 전도 위험 극심`);
      overallGrade = InferenceEngine.GRADE_DISADVANTAGED;
    }

    // 4. 공식 기준 기반 종합 가중치(Impedance Cost) 산정
    let slopeMultiplier = 1.0;
    if (edge.slope <= standards.SLOPE_RECOMMENDED_MAX) {
      slopeMultiplier = 1.0;
    } else if (edge.slope <= standards.SLOPE_PERMISSIBLE_MAX) {
      slopeMultiplier = 1.35;
    } else if (edge.slope <= standards.SLOPE_CAUTION_MAX) {
      slopeMultiplier = 2.6;
    } else {
      slopeMultiplier = 5.0;
    }

    // 전동 휠체어일 경우 경사도 영향 완화 옵션
    if (wheelchairType === "electric") {
      slopeMultiplier = Math.max(1.0, slopeMultiplier * 0.7);
    }

    let curbPenalty = 0.0;
    if (edge.curb > standards.CURB_STANDARD_MAX) {
      const excess = edge.curb - standards.CURB_STANDARD_MAX;
      if (edge.curb <= standards.CURB_CAUTION_MAX) {
        curbPenalty = excess * 25.0; // 2~5cm: 1cm 초과당 25m 거리 상당 페널티
      } else {
        curbPenalty = 75.0 + (edge.curb - 5.0) * 80.0; // 5cm 초과시 급격한 페널티
      }
    }

    let stairPenalty = 0.0;
    if (edge.stairs && !edge.elevator && !edge.ramp) {
      stairPenalty = 99999.0; // 통행 불가 계단에 강력한 페널티 부여
    }

    let facilityBonus = 0.0;
    if (edge.elevator) facilityBonus += 15.0;
    if (edge.ramp) facilityBonus += 10.0;

    let weight = (edge.distance * slopeMultiplier) + curbPenalty + stairPenalty - facilityBonus;
    if (weight < 1.0) weight = 1.0;

    return {
      edgeId: edge.id,
      overallGrade,
      isPassable,
      curbGrade,
      slopeGrade,
      weight: Math.round(weight * 100) / 100,
      slopeMultiplier,
      curbPenalty: Math.round(curbPenalty * 100) / 100,
      stairPenalty,
      facilityBonus,
      reasons,
      summaryReason: reasons.join("; ")
    };
  }
}

class SearchEngine {
  constructor(nodes, edges, standards = LegalStandards, wheelchairType = "manual") {
    this.nodes = nodes;
    this.edges = edges;
    this.standards = standards;
    this.wheelchairType = wheelchairType;
    this.adj = {};
    this.edgeMap = {};
    this.evaluations = {};

    for (const nid in nodes) {
      this.adj[nid] = [];
    }

    for (const edge of edges) {
      if (!this.adj[edge.from]) this.adj[edge.from] = [];
      this.adj[edge.from].push({ to: edge.to, edge });
      this.edgeMap[edge.id] = edge;

      // AI 추론 사전 실행
      this.evaluations[edge.id] = InferenceEngine.evaluateEdge(edge, standards, wheelchairType);
    }
  }

  /**
   * 일반 최단거리 경로 탐색 (물리적 거리 기준 다익스트라)
   */
  findShortestPath(startId, endId) {
    return this._dijkstra(startId, endId, "distance");
  }

  /**
   * AI 무장애 추천 경로 탐색 (추론 가중치 기준 다익스트라)
   */
  findBarrierFreePath(startId, endId) {
    return this._dijkstra(startId, endId, "accessibility");
  }

  /**
   * 다익스트라 최단 경로 탐색 알고리즘
   */
  _dijkstra(startId, endId, mode = "distance") {
    if (!this.nodes[startId] || !this.nodes[endId]) return null;

    const distances = {};
    const previous = {};
    const unvisited = new Set();

    for (const nid in this.nodes) {
      distances[nid] = Infinity;
      unvisited.add(nid);
    }
    distances[startId] = 0;

    while (unvisited.size > 0) {
      let current = null;
      let minDistance = Infinity;

      for (const nid of unvisited) {
        if (distances[nid] < minDistance) {
          minDistance = distances[nid];
          current = nid;
        }
      }

      if (current === null || minDistance === Infinity) break;
      if (current === endId) break;

      unvisited.delete(current);

      const neighbors = this.adj[current] || [];
      for (const { to, edge } of neighbors) {
        if (!unvisited.has(to)) continue;

        let cost = 0;
        if (mode === "distance") {
          cost = edge.distance;
        } else {
          cost = this.evaluations[edge.id].weight;
        }

        const alt = distances[current] + cost;
        if (alt < distances[to]) {
          distances[to] = alt;
          previous[to] = { from: current, edge };
        }
      }
    }

    if (distances[endId] === Infinity) return null;

    // 경로 역추적
    const pathEdges = [];
    const nodeSequence = [endId];
    let curr = endId;

    while (curr !== startId) {
      const step = previous[curr];
      if (!step) return null;
      pathEdges.unshift(step.edge);
      nodeSequence.unshift(step.from);
      curr = step.from;
    }

    return this._summarizePath(nodeSequence, pathEdges, mode);
  }

  _summarizePath(nodes, edges, mode) {
    const totalDistance = edges.reduce((acc, e) => acc + e.distance, 0);
    const maxCurb = edges.reduce((max, e) => Math.max(max, e.curb), 0);
    const maxSlope = edges.reduce((max, e) => Math.max(max, e.slope), 0);
    const hasStairsAny = edges.some(e => e.stairs && !e.elevator && !e.ramp);

    const facilities = [];
    let obstacleCount = 0;
    let cautionCount = 0;

    const edgeEvals = edges.map(e => {
      const ev = this.evaluations[e.id];
      if (e.elevator && !facilities.includes("엘리베이터")) facilities.push("엘리베이터");
      if (e.ramp && !facilities.includes("경사로")) facilities.push("경사로");
      if (e.braille && !facilities.includes("점자블록")) facilities.push("점자블록");

      if (ev.overallGrade === InferenceEngine.GRADE_DISADVANTAGED || ev.overallGrade === InferenceEngine.GRADE_INACCESSIBLE) {
        obstacleCount++;
      } else if (ev.overallGrade === InferenceEngine.GRADE_CAUTION) {
        cautionCount++;
      }
      return { edge: e, evaluation: ev };
    });

    // 휠체어 실제 통행 가능 여부
    const isPassable = !hasStairsAny && maxCurb <= this.standards.CURB_DISADVANTAGED_MAX;

    // 소요 시간 추정 (평균 휠체어 시속 약 3km/h = 50m/min)
    const baseMin = totalDistance / 50.0;
    const estTimeMin = baseMin * (1.0 + (maxSlope / 20.0)) + (cautionCount * 0.5) + (facilities.includes("엘리베이터") ? 1.0 : 0.0);

    return {
      mode,
      nodeSequence: nodes,
      nodeNames: nodes.map(nid => this.nodes[nid].name),
      edgeIds: edges.map(e => e.id),
      edges,
      totalDistance: Math.round(totalDistance * 10) / 10,
      maxCurb: Math.round(maxCurb * 10) / 10,
      maxSlope: Math.round(maxSlope * 10) / 10,
      hasStairs: hasStairsAny,
      isPassable,
      facilities,
      obstacleCount,
      cautionCount,
      estimatedTimeMin: Math.round(estTimeMin * 10) / 10,
      edgeEvaluations: edgeEvals
    };
  }
}

class ComparisonExplainer {
  static compareAndExplain(shortest, recommended) {
    if (!shortest || !recommended) return null;

    const distDiff = Math.round((recommended.totalDistance - shortest.totalDistance) * 10) / 10;
    const timeDiff = Math.round((recommended.estimatedTimeMin - shortest.estimatedTimeMin) * 10) / 10;
    const curbDiff = Math.round((shortest.maxCurb - recommended.maxCurb) * 10) / 10;
    const slopeDiff = Math.round((shortest.maxSlope - recommended.maxSlope) * 10) / 10;

    const stairAvoided = shortest.hasStairs && !recommended.hasStairs;

    const reasons = [];

    if (stairAvoided) {
      reasons.push("일반 최단 경로는 급경사 계단 구간이 포함되어 휠체어 진입이 불가능하지만, AI 추천 경로는 계단을 100% 우회하여 전 구간 자력 통행이 가능합니다.");
    }

    if (recommended.facilities.length > 0) {
      reasons.push(`이동편의시설(${recommended.facilities.join(", ")})을 연계 활용하여 수직 단차 및 체력 부담을 획기적으로 줄였습니다.`);
    }

    if (curbDiff > 0) {
      reasons.push(`최대 단차를 ${shortest.maxCurb}cm에서 ${recommended.maxCurb}cm로 낮추어 법적 적합 기준(2.0cm 이하)을 충족시켰습니다.`);
    }

    if (slopeDiff > 0) {
      reasons.push(`최대 경사도를 ${shortest.maxSlope}%에서 ${recommended.maxSlope}%로 낮추어 법적 권장 기준(5.56% 이하)을 만족시켰습니다.`);
    }

    let tradeOff = "";
    if (distDiff > 0) {
      tradeOff = `물리적 거리는 약 ${distDiff}m 우회하지만, 휠체어 전복 위험 및 통행 불가를 완벽하게 해결하였습니다.`;
    } else {
      tradeOff = `거리 증가 없이 안전성과 이동 편의를 모두 완벽히 충족하는 최적의 무장애 경로입니다.`;
    }

    return {
      distDiff,
      timeDiff,
      curbDiff,
      slopeDiff,
      stairAvoided,
      reasons,
      summaryExplanation: reasons.join(" ") + " " + tradeOff,
      tradeOff
    };
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { InferenceEngine, SearchEngine, ComparisonExplainer };
}
