// 아래 값은 업계 평균이 아닌 서비스 동작을 위한 "예시 추정 계수"입니다.
export const ESTIMATION_CONFIG = {
  version: 1,
  utilities: { electricityPerSqm: 1750, waterPerSqm: 520, gasPerSqm: 380 },
  payroll: { employerBurdenRate: 0.105 },
  platform: { revenueRate: 0.09 },
  revenueLinked: { amenitiesRate: 0.018, laundryRate: 0.022, suppliesRate: 0.01 },
  fixed: { pmsCms: 250000, communications: 350000, insurance: 250000, accounting: 220000, other: 300000 },
  maintenance: { baseAmount: 300000, revenueRate: 0.012 },
  quickRevenuePerRoom: [1500000, 1800000, 2000000, 2500000],
  operationProfiles: {
    lodging: { label: '숙박 중심', platformMultiplier: 1, turnoverMultiplier: 1 },
    monthly: { label: '달방 중심', platformMultiplier: 0.35, turnoverMultiplier: 0.45 },
    hybrid: { label: '숙박 + 달방', platformMultiplier: 0.7, turnoverMultiplier: 0.72 }
  }
};
