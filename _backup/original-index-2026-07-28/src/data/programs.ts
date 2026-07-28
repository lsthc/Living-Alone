/**
 * Chapter 5 에 나오는 제도 정보.
 *
 * ★ 규칙: 여기 적힌 모든 문장은 아래 `url` 의 **공식 사이트에서 직접 확인한 것만** 넣는다.
 *   블로그·뉴스 요약에만 나오고 공식 문서에서 확인하지 못한 것은 적지 않는다.
 *   실제로 그렇게 해서 뺀 것들:
 *     - 노인맞춤돌봄서비스 콜센터 1661-2129 → 공식 페이지가 열리지 않아 확인 실패. 뺐다.
 *     - 응급안전안심서비스 중앙모니터링센터 1566-3232 → 복지로 페이지가 열리지 않아 확인 실패. 뺐다.
 *     - 부산 구·군별 안부살핌 사업(부산진구·북구 등) → 연도마다 바뀌고 공식 안내를 확인하지 못해 뺐다.
 *   대신 두 서비스 모두 공식 문서에서 확인된 창구(읍·면·동 행정복지센터, 129)만 적었다.
 *
 * 제도는 바뀐다. `verifiedOn` 이 오래됐으면 발표 전에 다시 확인할 것.
 */

export interface Program {
  id: string;
  name: string;
  org: string;
  /** 무엇을 해주는 제도인가 */
  what: string;
  /** 누가 대상인가 */
  who: string;
  /** 어떻게 신청하나 */
  how: string;
  /** 이 제도에서 가장 중요한 한 줄 (없으면 생략) */
  highlight?: string;
  cost?: string;
  url: string;
  urlLabel: string;
  /** 공식 사이트에서 확인한 날 (YYYY-MM-DD) */
  verifiedOn: string;
}

export const PROGRAMS: Program[] = [
  {
    id: 'care',
    name: '노인맞춤돌봄서비스',
    org: '보건복지부',
    what: '안부확인과 생활안전점검, 사회참여 활동, 생활교육, 이동동행·식사관리·청소 같은 일상생활 지원을 제공합니다. 우울·고독사·자살 등 정서적 위험이 높은 노인에게는 사례관리를 하는 특화서비스가 따로 있습니다.',
    who: '65세 이상 기초생활수급자·차상위계층 또는 기초연금수급자 가운데 독거·조손가구 등 돌봄이 필요한 노인.',
    how: '주민등록 주소지의 읍·면·동 행정복지센터에 신청서를 제출합니다.',
    highlight:
      '본인과 가족뿐 아니라 친족이 아닌 이웃(이해관계인)도 신청할 수 있습니다. 읍·면·동 공무원이 직권으로 신청할 수도 있습니다.',
    cost: '이용료 무료',
    url: 'https://www.mohw.go.kr/menu.es?mid=a10712010400',
    urlLabel: '보건복지부 노인맞춤돌봄서비스 안내',
    verifiedOn: '2026-07-25',
  },
  {
    id: 'emergency',
    name: '독거노인·장애인 응급안전안심서비스',
    org: '보건복지부',
    what: '집 안에 화재감지기, 활동량 감지기, 응급호출기 같은 정보통신기술(ICT) 장비를 설치해 화재·응급호출·장시간 쓰러짐을 감지하고 신고합니다.',
    who: '독거노인, 노인 2인 가구, 조손가구, 장애인 가정.',
    how: '가까운 읍·면·동 행정복지센터나 노인복지관 등에 본인 또는 가족이 방문하거나 전화로 신청합니다.',
    highlight: '2024년부터 독거노인은 소득 기준이 폐지되어, 혼자 사는 노인이면 소득과 관계없이 신청할 수 있습니다.',
    url: 'https://www.mohw.go.kr/board.es?mid=a10503010100&bid=0027&act=view&list_no=1480948',
    urlLabel: '보건복지부 보도자료 (2024. 4. 4.)',
    verifiedOn: '2026-07-25',
  },
];

export interface Hotline {
  id: string;
  number: string;
  name: string;
  when: string;
  what: string;
  url: string;
  verifiedOn: string;
}

export const HOTLINES: Hotline[] = [
  {
    id: '129',
    number: '129',
    name: '보건복지상담센터',
    when: '평일 09:00~18:00 · 긴급복지지원, 복지사각지대, 노인·아동학대, 정신건강 상담은 24시간',
    what: '어떤 제도를 신청해야 할지 모를 때 물어보는 번호입니다. 도움이 필요해 보이는 이웃을 알릴 수도 있습니다.',
    url: 'https://www.129.go.kr/counsel/counsel01.do',
    verifiedOn: '2026-07-25',
  },
  {
    id: '109',
    number: '109',
    name: '자살예방 상담전화',
    when: '24시간',
    what: '2024년 1월 1일부터 흩어져 있던 자살예방 상담전화가 109 하나로 통합됐습니다.',
    url: 'https://www.mohw.go.kr/board.es?mid=a10503010100&bid=0027&act=view&list_no=1479607',
    verifiedOn: '2026-07-25',
  },
];

/** 이웃으로서 실제로 할 수 있는 일 — 전부 위 제도 문서에 근거가 있는 것만 적었다. */
export interface NeighborAction {
  id: string;
  text: string;
  /** 이 행동의 근거가 되는 제도 id */
  basis: string;
}

export const NEIGHBOR_ACTIONS: NeighborAction[] = [
  {
    id: 'a1',
    text: '혼자 사는 이웃 어르신이 걱정되면, 가족이 아니어도 내가 노인맞춤돌봄서비스를 신청할 수 있습니다. 읍·면·동 행정복지센터로 가면 됩니다.',
    basis: '노인맞춤돌봄서비스 — 이해관계인(친족을 제외한 이웃 등) 신청권',
  },
  {
    id: 'a2',
    text: '혼자 사는 노인이면 소득과 상관없이 응급안전안심서비스를 신청할 수 있다는 사실을 알려 드립니다. 전화로도 신청됩니다.',
    basis: '응급안전안심서비스 — 2024년 독거노인 소득기준 폐지',
  },
  {
    id: 'a3',
    text: '어디에 연락해야 할지 모르겠으면 129에 먼저 겁니다. 복지사각지대 상담은 밤에도 받습니다.',
    basis: '보건복지상담센터 129 — 복지사각지대 24시간 상담',
  },
  {
    id: 'a4',
    text: '당장 위험해 보이면 109에 겁니다. 24시간 받습니다.',
    basis: '자살예방 상담전화 109 — 24시간 운영',
  },
];
