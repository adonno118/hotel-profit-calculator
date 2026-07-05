import { ESTIMATION_CONFIG as C } from './config/estimation-config.js';
import { SCENARIO_PROFILES } from './config/scenarios.js';
import { number, sum } from './utils.js';

export function estimateSimple(input) {
  const rooms = number(input.rooms), area = number(input.area), perRoom = number(input.revenuePerRoom);
  const revenue = rooms * perRoom;
  const payroll = number(input.employees) * number(input.salaryPerEmployee);
  const profile = C.operationProfiles[input.operationType] || C.operationProfiles.lodging;
  const details = {
    rent: number(input.rent), payroll,
    payrollBurden: payroll * C.payroll.employerBurdenRate,
    electricity: area * C.utilities.electricityPerSqm,
    water: area * C.utilities.waterPerSqm,
    gas: area * C.utilities.gasPerSqm,
    platform: revenue * C.platform.revenueRate * profile.platformMultiplier,
    pmsCms: C.fixed.pmsCms, communications: C.fixed.communications, insurance: C.fixed.insurance,
    accounting: C.fixed.accounting,
    maintenance: C.maintenance.baseAmount + revenue * C.maintenance.revenueRate,
    amenities: revenue * C.revenueLinked.amenitiesRate * profile.turnoverMultiplier,
    laundry: revenue * C.revenueLinked.laundryRate * profile.turnoverMultiplier,
    supplies: revenue * C.revenueLinked.suppliesRate * profile.turnoverMultiplier,
    other: C.fixed.other
  };
  const expense = sum(Object.values(details));
  return metrics({ revenue, expense, fixed: details.rent + payroll + details.payrollBurden + details.pmsCms + details.communications + details.insurance + details.accounting, investment: number(input.deposit) + number(input.premium), rooms, details });
}

export function expenseAmount(expense, totalRevenue) {
  return expense.method === 'rate' ? totalRevenue * number(expense.rate, { max: 100 }) / 100 : number(expense.amount);
}

export function calculateDetailed(detailed) {
  const revenue = sum(detailed.revenues, (x) => x.amount);
  const fixed = sum(detailed.expenses.filter((x) => x.category === 'fixed'), (x) => expenseAmount(x, revenue));
  const variable = sum(detailed.expenses.filter((x) => x.category === 'variable'), (x) => expenseAmount(x, revenue));
  return metrics({ revenue, expense: fixed + variable, fixed, variable, investment: sum(detailed.investments, (x) => x.amount), rooms: number(detailed.rooms) });
}

export function metrics({ revenue, expense, fixed = 0, variable = 0, investment, rooms, details }) {
  const monthlyProfit = revenue - expense;
  const annualProfit = monthlyProfit * 12;
  return {
    revenue, expense, monthlyProfit, annualProfit, fixed, variable: variable || Math.max(0, expense - fixed), investment, details,
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
  return Object.entries(SCENARIO_PROFILES).map(([key, profile]) => {
    let revenueFactor = profile.revenueMultiplier;
    let variableFactor = profile.variableCostMultiplier;
    if (key === 'hybrid' && number(detailed.rooms) > 0) {
      const lodgingShare = Math.min(1, number(detailed.hybrid.lodgingRooms) / number(detailed.rooms));
      const monthlyShare = Math.min(1 - lodgingShare, number(detailed.hybrid.monthlyRooms) / number(detailed.rooms));
      const allocated = lodgingShare + monthlyShare;
      if (allocated > 0) {
        revenueFactor = (lodgingShare + monthlyShare * SCENARIO_PROFILES.monthly.revenueMultiplier) / allocated;
        variableFactor = (lodgingShare + monthlyShare * SCENARIO_PROFILES.monthly.variableCostMultiplier) / allocated;
      }
    }
    return { key, label: profile.label, ...metrics({ revenue: base.revenue * revenueFactor, expense: base.fixed + base.variable * variableFactor, fixed: base.fixed, variable: base.variable * variableFactor, investment: base.investment, rooms: number(detailed.rooms) }) };
  });
}
