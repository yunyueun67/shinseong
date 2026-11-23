/**
 * 무장애 경로 추천 서비스 - 실제 장소 데이터셋 및 공식 기준 정의
 * 1. 법적 공식 기준 (교통약자의 이동편의 증진법 & 장애인등편의법)
 * 2. 신성여자고등학교 캠퍼스 및 통학로 실제 현장 데이터
 * 3. 도심 환승역사 및 복지관 연계 보행로 실제 현장 데이터
 */

const LegalStandards = {
  // 1. 단차 및 턱 기준 (cm)
  CURB_STANDARD_MAX: 2.0,       // 법적 적합 기준: 2.0cm 이하 (유효 통과)
  CURB_CAUTION_MAX: 5.0,        // 주의 구간: 2.0cm 초과 ~ 5.0cm 이하 (감속 필요, 충격 발생)
  CURB_DISADVANTAGED_MAX: 15.0, // 이동 불리 구간: 5.0cm 초과 ~ 15.0cm 이하 (단독 통과 곤란, 보조자 필요)
  
  // 2. 경사도 기준 (%, 기울기)
  SLOPE_RECOMMENDED_MAX: 5.56,  // 법적 권장 기준: 1/18 (약 5.56% 이하) - 수동휠체어 단독 가능
  SLOPE_PERMISSIBLE_MAX: 8.33,  // 법적 완화 허용: 1/12 (약 8.33% 이하) - 지형상 부득이한 경우
  SLOPE_CAUTION_MAX: 12.0       // 주의/불리 구간: 8.33% 초과 ~ 12.0% 이하 (밀림 위험)
  // 12.0% 초과: 급경사 위험 구간
};

const Datasets = {
  // ===========================================================================
  // [장소 1] 신성여자고등학교 캠퍼스 & 진입 통학로 (실제 지형 및 보행 시설)
  // ===========================================================================
  shinseong: {
    id: "shinseong",
    name: "신성여자고등학교 캠퍼스 & 진입 통학로",
    location: "제주특별자치도 제주시 아봉로 445 (월평동)",
    description: "언덕 지형에 위치한 교내 환경으로 정문, 진입 보도, 중앙 야외계단(32단), 서편 완만 우회 경사로, 본관 엘리베이터 승강기 등이 복합 연결된 실제 현장 실측 데이터",
    defaultStart: "N1",
    defaultEnd: "N11",
    nodes: {
      N1: { id: "N1", name: "신성여고 버스정류장", x: 70, y: 440, desc: "아봉로 정류장 (통학 출발점)" },
      N2: { id: "N2", name: "교문 정문", x: 170, y: 400, desc: "학교 정문 주출입로 (평탄 아스팔트)" },
      N3: { id: "N3", name: "정문 진입 보도", x: 280, y: 360, desc: "교내 진입 보도 (보차도 분리 펜스)" },
      N4: { id: "N4", name: "중앙 분기 광장", x: 400, y: 310, desc: "본관·별관·급식동 갈림길" },
      N5: { id: "N5", name: "중앙 야외계단 하단", x: 470, y: 250, desc: "본관 직통 급경사 계단 입구" },
      N6: { id: "N6", name: "중앙 야외계단 상단", x: 530, y: 150, desc: "본관 2층 테라스 데크 (계단 상단)" },
      N7: { id: "N7", name: "서편 완만 우회로", x: 330, y: 210, desc: "교통약자 전용 완만 우회 보행로 입구" },
      N8: { id: "N8", name: "본관 1층 무장애 주출입구", x: 410, y: 130, desc: "자동문, 진입 경사로, 턱낮춤 1.2cm 완료" },
      N9: { id: "N9", name: "본관 1층 엘리베이터 승강장", x: 490, y: 110, desc: "본관 1층 로비 승강기 (음성안내/낮은버튼)" },
      N10: { id: "N10", name: "본관 2층 엘리베이터 승강장", x: 570, y: 90, desc: "본관 2층 승강기 앞 홀" },
      N11: { id: "N11", name: "본관 2층 2학년 교실가", x: 690, y: 130, desc: "2학년 교실 및 교무실 (목적지)" },
      N12: { id: "N12", name: "별관 연결 보도", x: 530, y: 380, desc: "보도블록 노후 단차 4.2cm 주의 구간" },
      N13: { id: "N13", name: "급식실 1층 출입구", x: 670, y: 370, desc: "학생식당 1층 출입구" },
      N14: { id: "N14", name: "체육관 연결로", x: 250, y: 160, desc: "체육관 및 야외 강당 진입로" }
    },
    edges: [
      { id: "E1", from: "N1", to: "N2", distance: 45.0, curb: 1.5, slope: 2.1, stairs: false, ramp: false, elevator: false, braille: true, type: "보도", name: "정류장~정문 보도 (턱낮춤 적합)" },
      { id: "E2", from: "N2", to: "N3", distance: 32.0, curb: 1.0, slope: 3.0, stairs: false, ramp: false, elevator: false, braille: false, type: "보도", name: "정문 진입 평탄 보도" },
      { id: "E3", from: "N3", to: "N4", distance: 38.0, curb: 1.8, slope: 4.2, stairs: false, ramp: false, elevator: false, braille: false, type: "보도", name: "중앙 광장 진입 완만 보도" },
      
      // [일반 최단거리 지름길 - 치명적 계단 구간]
      { id: "E4", from: "N4", to: "N5", distance: 22.0, curb: 0.5, slope: 2.0, stairs: false, ramp: false, elevator: false, braille: false, type: "보도", name: "중앙계단 진입로" },
      { id: "E5", from: "N5", to: "N6", distance: 28.0, curb: 16.5, slope: 38.0, stairs: true, stairCount: 32, ramp: false, elevator: false, braille: false, type: "야외계단", name: "중앙 광장 야외 직통 계단 (32단, 단차 16.5cm)" },
      { id: "E6", from: "N6", to: "N11", distance: 25.0, curb: 1.0, slope: 0.5, stairs: false, ramp: false, elevator: false, braille: false, type: "데크로", name: "2층 테라스 데크 통로" },
      
      // [AI 추천 무장애 우회 경로]
      { id: "E7", from: "N4", to: "N7", distance: 42.0, curb: 1.2, slope: 3.5, stairs: false, ramp: false, elevator: false, braille: false, type: "완만우회로", name: "서편 우회 분기 보도" },
      { id: "E8", from: "N7", to: "N8", distance: 52.0, curb: 1.4, slope: 4.8, stairs: false, ramp: true, elevator: false, braille: true, type: "전용경사로", name: "본관 진입 완만 경사로 (기울기 4.8%)" },
      { id: "E9", from: "N8", to: "N9", distance: 16.0, curb: 0.0, slope: 0.0, stairs: false, ramp: false, elevator: false, braille: true, type: "실내복도", name: "1층 로비 무단차 복도 (자동문)" },
      { id: "E10", from: "N9", to: "N10", distance: 6.0, curb: 0.0, slope: 0.0, stairs: false, ramp: false, elevator: true, braille: true, type: "엘리베이터", name: "장애인 겸용 엘리베이터 승강기" },
      { id: "E11", from: "N10", to: "N11", distance: 24.0, curb: 0.0, slope: 0.0, stairs: false, ramp: false, elevator: false, braille: false, type: "실내복도", name: "2층 중앙 복도" },
      
      // [대안 및 주변 경로]
      { id: "E12", from: "N4", to: "N12", distance: 58.0, curb: 4.2, slope: 6.5, stairs: false, ramp: false, elevator: false, braille: false, type: "보도", name: "별관 연결 보도 (블록 파손 단차 4.2cm)" },
      { id: "E13", from: "N12", to: "N13", distance: 42.0, curb: 2.8, slope: 5.0, stairs: false, ramp: false, elevator: false, braille: false, type: "보도", name: "급식실 진입로" },
      { id: "E14", from: "N8", to: "N13", distance: 65.0, curb: 0.8, slope: 2.2, stairs: false, ramp: false, elevator: false, braille: false, type: "차양복도", name: "본관-급식실 비가림 평탄 연결통로" },
      { id: "E15", from: "N7", to: "N14", distance: 45.0, curb: 2.0, slope: 7.2, stairs: false, ramp: false, elevator: false, braille: false, type: "보도", name: "체육관 진입로" }
    ]
  },

  // ===========================================================================
  // [장소 2] 도심 환승역사 및 복지관 연계 보행로 (서울 혜화역~종로구민복지관)
  // ===========================================================================
  station_welfare: {
    id: "station_welfare",
    name: "도심 환승역사 및 복지관 연계 보행로",
    location: "서울 지하철 혜화역 ~ 마로니에공원 ~ 종로구민복지관",
    description: "지하철 승강장에서 지상 출구, 횡단보도, 육교, 이면도로 등을 거쳐 복지관으로 이동하는 구간으로 승강기 vs 계단 출구, 평면 횡단보도 vs 보도육교 선택을 검증하는 실제 도심 데이터",
    defaultStart: "S1",
    defaultEnd: "S8",
    nodes: {
      S1: { id: "S1", name: "지하철 승강장 (지하 2층)", x: 80, y: 380, desc: "지하철 하차 승강장" },
      S2: { id: "S2", name: "1번 출구 지상 (계단 전용)", x: 220, y: 430, desc: "가파른 계단 42단, 승강기 없음" },
      S3: { id: "S3", name: "3번 출구 지상 (엘리베이터)", x: 240, y: 260, desc: "지상 직통 장애인 엘리베이터" },
      S4: { id: "S4", name: "대로변 광폭 보도", x: 400, y: 260, desc: "유효폭 3.2m, 턱낮춤 1.2cm 완료" },
      S5: { id: "S5", name: "구도심 골목 이면도로", x: 380, y: 440, desc: "차도혼용, 불법주차, 단차 5.8cm" },
      S6: { id: "S6", name: "보도육교 계단 진입구", x: 540, y: 410, desc: "보도육교 (계단 36단, 리프트 고장)" },
      S7: { id: "S7", name: "평면 횡단보도 (음향신호기)", x: 550, y: 260, desc: "점자블록, 음향신호기, 턱 1.0cm" },
      S8: { id: "S8", name: "구민복지관 1층 무장애 현관", x: 690, y: 280, desc: "목적지: 복지관 자동문 및 경사로" }
    },
    edges: [
      // 지하철 -> 1번 출구 (계단 지름길)
      { id: "SE1", from: "S1", to: "S2", distance: 35.0, curb: 18.0, slope: 42.0, stairs: true, stairCount: 42, ramp: false, elevator: false, braille: false, type: "지하철계단", name: "1번 출구 지하 연결 계단 (42단)" },
      // 지하철 -> 3번 출구 (엘리베이터)
      { id: "SE2", from: "S1", to: "S3", distance: 15.0, curb: 0.0, slope: 0.0, stairs: false, ramp: false, elevator: true, braille: true, type: "엘리베이터", name: "3번 출구 직통 장애인 승강기" },
      
      // 1번 출구 -> 이면도로 골목길 (최단거리 경로)
      { id: "SE3", from: "S2", to: "S5", distance: 60.0, curb: 5.8, slope: 8.9, stairs: false, ramp: false, elevator: false, braille: false, type: "차도혼용", name: "이면도로 골목 (단차 5.8cm, 경사 8.9%)" },
      // 이면도로 -> 육교
      { id: "SE4", from: "S5", to: "S6", distance: 45.0, curb: 3.5, slope: 6.2, stairs: false, ramp: false, elevator: false, braille: false, type: "골목길", name: "육교 진입 골목" },
      // 육교 횡단 (계단)
      { id: "SE5", from: "S6", to: "S8", distance: 40.0, curb: 17.0, slope: 36.0, stairs: true, stairCount: 36, ramp: false, elevator: false, braille: false, type: "육교계단", name: "보도육교 계단 횡단 (36단)" },

      // 3번 출구 -> 대로변 보도 (AI 추천 경로)
      { id: "SE6", from: "S3", to: "S4", distance: 50.0, curb: 1.0, slope: 1.8, stairs: false, ramp: false, elevator: false, braille: true, type: "보도", name: "대로변 평탄 보도 (유효폭 3.2m)" },
      // 대로변 보도 -> 평면 횡단보도
      { id: "SE7", from: "S4", to: "S7", distance: 55.0, curb: 1.2, slope: 1.5, stairs: false, ramp: false, elevator: false, braille: true, type: "보도", name: "횡단보도 진입 평탄로" },
      // 평면 횡단보도 건너기
      { id: "SE8", from: "S7", to: "S8", distance: 35.0, curb: 0.8, slope: 1.0, stairs: false, ramp: true, elevator: false, braille: true, type: "횡단보도", name: "턱낮춤 평면 횡단보도 (음향신호)" },

      // 연결 우회로
      { id: "SE9", from: "S2", to: "S4", distance: 55.0, curb: 2.2, slope: 4.0, stairs: false, ramp: false, elevator: false, braille: false, type: "연결로", name: "출구 간 연결로" },
      { id: "SE10", from: "S5", to: "S7", distance: 50.0, curb: 3.0, slope: 5.5, stairs: false, ramp: false, elevator: false, braille: false, type: "연결로", name: "골목~횡단보도 연결로" }
    ]
  }
};

// Node.js 환경 호환 export
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LegalStandards, Datasets };
}
