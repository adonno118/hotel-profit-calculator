export const EXPENSE_TEMPLATES = [
  { name: '월세', category: 'fixed' }, { name: '급여', category: 'fixed' },
  { name: '4대보험', category: 'fixed', estimateKey: 'payrollBurden' },
  { name: '플랫폼 수수료', category: 'variable', method: 'rate', rate: 9, basis: 'lodgingRevenue' },
  { name: '무인관제', category: 'fixed' }, { name: 'PMS & CMS', category: 'fixed', estimateKey: 'pmsCms' },
  { name: '통신비', category: 'fixed', estimateKey: 'communications' }, { name: '보험료', category: 'fixed' },
  { name: '세무사 기장료', category: 'fixed' },
  { name: '전기요금', category: 'variable', estimateKey: 'electricity' },
  { name: '수도요금', category: 'variable', estimateKey: 'water' },
  { name: '가스요금', category: 'variable', estimateKey: 'gas' },
  { name: '시설보수비', category: 'variable' }, { name: '어매니티', category: 'variable' },
  { name: '세탁비', category: 'variable' }, { name: '소모품비', category: 'variable' },
  { name: '카드수수료', category: 'variable' }, { name: '기타 비용', category: 'variable' }
];
