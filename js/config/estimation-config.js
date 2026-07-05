// 아래 값은 매물 1차 검토를 위한 참고 추정 계수이며 확정 견적이나 업계 평균이 아닙니다.
export const PMS_CMS_CONFIG = {
  vendor: '웨일집ON',
  referenceDate: '2026-03',
  anchors: [
    { rooms: 10, monthlyCost: 130000 },
    { rooms: 32, monthlyCost: 390000 }
  ]
};

export const LAUNDRY_CONFIG = {
  referenceRooms: 35,
  referenceMonthlyCost: 4000000
};

export const CLEANING_CONFIG = {
  lodging: { roomsPerFullTime: 15, fullTimeMonthlyCost: 3500000, remainingRoomsPerBlock: 5, partTimeMonthlyCost: 1000000 },
  monthly: { roomsPerBlock: 20, monthlyCostPerBlock: 500000 },
  hybrid: { lodgingRoomsPerFullTime: 15, fullTimeMonthlyCost: 3500000 }
};

export const LODGING_REVENUE_PRESETS = [800000, 1000000, 1200000, 1500000, 1800000, 2000000, 2500000];
export const MONTHLY_STAY_REVENUE_PRESETS = [500000, 600000, 700000, 800000, 1000000, 1200000];

export const ESTIMATION_CONFIG = {
  version: 2,
  utilities: { electricityPerSqm: 1750, waterPerSqm: 520, gasPerSqm: 380 },
  payroll: { employerBurdenRate: 0.105 },
  platform: { revenueRate: 0.09 },
  communicationPerRoom: 15000,
  amenityPerRoom: 50000,
  fixed: { insurance: 50000, accounting: 100000 }
};
