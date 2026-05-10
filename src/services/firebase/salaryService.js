import {
  calculateMonthlySalary,
  calculateSalaryRecord,
  getSalaryConfig,
  getSalaryRecords,
  lockSalaryRecord,
  settleMonthlySalary,
  upsertSalaryConfig
} from "./salary";

export const salaryService = {
  upsertConfig: upsertSalaryConfig,
  getConfig: getSalaryConfig,
  calculateMonthly: calculateMonthlySalary,
  settleMonthly: settleMonthlySalary,
  calculateRecord: calculateSalaryRecord,
  listRecords: getSalaryRecords,
  lockRecord: lockSalaryRecord
};

export default salaryService;
