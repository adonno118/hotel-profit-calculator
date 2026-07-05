import { CLEANING_CONFIG, ESTIMATION_CONFIG as C, LAUNDRY_CONFIG, PMS_CMS_CONFIG } from './config/estimation-config.js';
import { SCENARIO_PROFILES } from './config/scenarios.js';
import { number, sum } from './utils.js';

export function estimatePmsCmsCost(roomCount) {
  const rooms = number(roomCount);
  if (rooms === 0) return 0;
  const [start, end] = PMS_CMS_CONFIG.anchors;
  if (rooms <= start.rooms) return rooms * (start.monthlyCost / start.rooms);
  const slope = (end.monthlyCost - start.monthlyCost) / (end.rooms - start.rooms);
  return start.monthlyCost + (rooms - start.rooms) * slope;
}

export function estimateLodgingCleaningCost(roomCount) {
  const rooms = number(roomCount);
  const config = CLEANING_CONFIG.lodging;
  const fullTimeCleaners = Math.floor(rooms / config.roomsPerFullTime);
  const remainingRooms = rooms % config.roomsPerFullTime;
  const partTimeBlocks = remainingRooms > 0 ? Math.ceil(remainingRooms / config.remainingRoomsPerBlock) : 0;
  return fullTimeCleaners * config.fullTimeMonthlyCost + partTimeBlocks * config.partTimeMonthlyCost;
}

export function estimateMonthlyStayCleaningCost(roomCount) {
  const rooms = number(roomCount);
  if (rooms === 0) return 0;
  return Math.ceil(rooms / CLEANING_CONFIG.monthly.roomsPerBlock) * CLEANING_CONFIG.monthly.monthlyCostPerBlock;
}

export function estimateHybridCleaningCost(lodgingRoomCount) {
  const rooms = number(lodgingRoomCount);
  return Math.floor(rooms / CLEANING_CONFIG.hybrid.lodgingRoomsPerFullTime) * CLEANING_CONFIG.hybrid.fullTimeMonthlyCost;
}

export function estimateCleaningCost({ mode, totalRooms, lodgingRooms = 0 }) {
  if (mode === 'monthly') {
    const cost = estimateMonthlyStayCleaningCost(totalRooms);
    return { cost };
  }
  if (mode === 'hybrid') {
    const cost = estimateHybridCleaningCost(Math.min(number(totalRooms), number(lodgingRooms)));
    return { cost };
  }
  const rooms = number(totalRooms);
  const cost = estimateLodgingCleaningCost(rooms);
  return { cost };
}

export const estimateCommunicationCost = (roomCount) => number(roomCount) * C.communicationPerRoom;
export const estimateAmenityCost = (roomCount) => number(roomCount) * C.amenityPerRoom;
export const estimateLaundryCost = (roomCount) => number(roomCount) * (LAUNDRY_CONFIG.referenceMonthlyCost / LAUNDRY_CONFIG.referenceRooms);
export const estimatePlatformCost = (lodgingRevenue, rate = C.platform.revenueRate) => number(lodgingRevenue) * number(rate, { max: 1 });

export function validateHybridRoomAllocation(totalRooms, lodgingRoomCount, monthlyStayRoomCount) {
  const total = number(totalRooms);
  const requestedLodging = number(lodgingRoomCount);
  const requestedMonthly = number(monthlyStayRoomCount);
  const lodgingRooms = Math.min(total, requestedLodging);
  const monthlyRooms = Math.min(Math.max(0, total - lodgingRooms), requestedMonthly);
  return {
    totalRooms: total,
    requestedLodging,
    requestedMonthly,
    lodgingRooms,
    monthlyRooms,
    exceedsTotal: requestedLodging + requestedMonthly > total
  };
}

export function estimateSimple(input) {
  const rooms = number(input.rooms);
  const area = number(input.area);
  const mode = ['lodging', 'monthly', 'hybrid'].includes(input.operationType) ? input.operationType : 'lodging';
  const allocation = validateHybridRoomAllocation(rooms, input.lodgingRooms, input.monthlyRooms);
  const lodgingRooms = mode === 'lodging' ? rooms : mode === 'hybrid' ? allocation.lodgingRooms : 0;
  const monthlyRooms = mode === 'monthly' ? rooms : mode === 'hybrid' ? allocation.monthlyRooms : 0;
  const lodgingRevenue = lodgingRooms * number(input.lodgingRevenuePerRoom);
  const monthlyStayRevenue = monthlyRooms * number(input.monthlyStayRevenuePerRoom);
  const revenue = lodgingRevenue + monthlyStayRevenue;
  const cleaning = estimateCleaningCost({ mode, totalRooms: rooms, lodgingRooms });
  const employerBurdenRate = C.payroll.employerBurdenRates[mode];
  const details = {
    rent: number(input.rent),
    cleaningLabor: cleaning.cost,
    payrollBurden: cleaning.cost * employerBurdenRate,
    electricity: area * C.utilities.electricityPerSqm,
    water: area * C.utilities.waterPerSqm,
    gas: area * C.utilities.gasPerSqm,
    platform: estimatePlatformCost(lodgingRevenue),
    pmsCms: mode === 'monthly' ? 0 : estimatePmsCmsCost(rooms),
    communications: estimateCommunicationCost(rooms),
    insurance: C.fixed.insurance,
    accounting: C.fixed.accounting,
    amenities: estimateAmenityCost(rooms),
    laundry: mode === 'monthly' ? 0 : estimateLaundryCost(rooms)
  };
  const expense = sum(Object.values(details));
  const fixed = details.rent + details.cleaningLabor + details.payrollBurden + details.pmsCms + details.communications + details.insurance + details.accounting;
  return metrics({ revenue, expense, fixed, investment: number(input.deposit) + number(input.premium), rooms, details, lodgingRevenue, monthlyStayRevenue });
}

export const isPlatformExpense = (expense) => expense?.basis === 'lodgingRevenue' || String(expense?.name || '').includes('플랫폼');

export function expenseAmount(expense, totalRevenue, lodgingRevenue = totalRevenue) {
  if (isPlatformExpense(expense) && number(lodgingRevenue) === 0) return 0;
  if (expense.method !== 'rate') return number(expense.amount);
  const basis = isPlatformExpense(expense) ? lodgingRevenue : totalRevenue;
  return basis * number(expense.rate, { max: 100 }) / 100;
}

function detailedRevenue(detailed) {
  const revenue = sum(detailed.revenues, (item) => item.amount);
  const lodgingRevenue = sum(detailed.revenues.filter((item) => item.type === 'lodging'), (item) => item.amount);
  return { revenue, lodgingRevenue };
}

export function calculateDetailed(detailed) {
  const { revenue, lodgingRevenue } = detailedRevenue(detailed);
  const fixed = sum(detailed.expenses.filter((item) => item.category === 'fixed'), (item) => expenseAmount(item, revenue, lodgingRevenue));
  const variable = sum(detailed.expenses.filter((item) => item.category === 'variable'), (item) => expenseAmount(item, revenue, lodgingRevenue));
  return metrics({ revenue, expense: fixed + variable, fixed, variable, investment: sum(detailed.investments, (item) => item.amount), rooms: number(detailed.rooms), lodgingRevenue });
}

export function metrics({ revenue, expense, fixed = 0, variable = 0, investment, rooms, details, lodgingRevenue = 0, monthlyStayRevenue = 0 }) {
  const monthlyProfit = revenue - expense;
  const annualProfit = monthlyProfit * 12;
  return {
    revenue, expense, monthlyProfit, annualProfit, fixed, variable: variable || Math.max(0, expense - fixed), investment, details, lodgingRevenue, monthlyStayRevenue,
    margin: revenue > 0 ? monthlyProfit / revenue * 100 : null,
    revenuePerRoom: rooms > 0 ? revenue / rooms : null,
    profitPerRoom: rooms > 0 ? monthlyProfit / rooms : null,
    monthlyPerHundredM: investment > 0 ? monthlyProfit / investment * 100000000 : null,
    annualPerHundredM: investment > 0 ? annualProfit / investment * 100000000 : null,
    roi: investment > 0 ? annualProfit / investment * 100 : null,
    paybackYears: investment > 0 && annualProfit > 0 ? investment / annualProfit : null
  };
}

export function compareScenarios(detailed) {
  const base = calculateDetailed(detailed);
  const rooms = number(detailed.rooms);
  return Object.entries(SCENARIO_PROFILES).map(([key, profile]) => {
    let revenueFactor = profile.revenueMultiplier;
    let variableFactor = profile.variableCostMultiplier;
    let lodgingShare = key === 'lodging' ? 1 : 0;
    if (key === 'hybrid' && rooms > 0) {
      lodgingShare = Math.min(1, number(detailed.hybrid.lodgingRooms) / rooms);
      const monthlyShare = Math.min(1 - lodgingShare, number(detailed.hybrid.monthlyRooms) / rooms);
      const allocated = lodgingShare + monthlyShare;
      if (allocated > 0) {
        revenueFactor = (lodgingShare + monthlyShare * SCENARIO_PROFILES.monthly.revenueMultiplier) / allocated;
        variableFactor = (lodgingShare + monthlyShare * SCENARIO_PROFILES.monthly.variableCostMultiplier) / allocated;
      }
    }
    const revenue = base.revenue * revenueFactor;
    const lodgingRevenue = revenue * lodgingShare;
    const fixed = sum(detailed.expenses.filter((item) => item.category === 'fixed'), (item) => expenseAmount(item, revenue, lodgingRevenue));
    const variableItems = detailed.expenses.filter((item) => item.category === 'variable');
    const platform = sum(variableItems.filter(isPlatformExpense), (item) => expenseAmount(item, revenue, lodgingRevenue));
    const otherVariable = sum(variableItems.filter((item) => !isPlatformExpense(item)), (item) => expenseAmount(item, revenue, lodgingRevenue)) * variableFactor;
    return { key, label: profile.label, ...metrics({ revenue, expense: fixed + platform + otherVariable, fixed, variable: platform + otherVariable, investment: base.investment, rooms, lodgingRevenue }) };
  });
}
