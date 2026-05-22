// Demo seed data + constants for the employees route. Extracted to keep
// app.employees.tsx focused on UI logic.

export const EMPLOYEE_SAMPLE = [
  { first_name: "Sara", last_name: "Khan", department: "Engineering", job_title: "Senior Engineer", location: "Dubai", base_salary: 95000, target_bonus_percent: 15, performance_rating: "Exceeds" },
  { first_name: "Ahmed", last_name: "Hassan", department: "Engineering", job_title: "Engineering Manager", location: "Dubai", base_salary: 135000, target_bonus_percent: 20, performance_rating: "Outstanding" },
  { first_name: "Maya", last_name: "Patel", department: "Product", job_title: "Product Manager", location: "Cairo", base_salary: 78000, target_bonus_percent: 12, performance_rating: "Meets" },
  { first_name: "Omar", last_name: "Ali", department: "Sales", job_title: "Account Executive", location: "Riyadh", base_salary: 62000, target_bonus_percent: 25, performance_rating: "Exceeds" },
  { first_name: "Layla", last_name: "Mahmoud", department: "Finance", job_title: "Financial Analyst", location: "Cairo", base_salary: 55000, target_bonus_percent: 10, performance_rating: "Meets" },
  { first_name: "Daniel", last_name: "Lee", department: "Engineering", job_title: "Junior Engineer", location: "Remote", base_salary: 48000, target_bonus_percent: 8, performance_rating: "Meets" },
  { first_name: "Noura", last_name: "Saleh", department: "Marketing", job_title: "Marketing Lead", location: "Dubai", base_salary: 82000, target_bonus_percent: 15, performance_rating: "Outstanding" },
  { first_name: "Hassan", last_name: "Mostafa", department: "Operations", job_title: "Operations Director", location: "Riyadh", base_salary: 145000, target_bonus_percent: 25, performance_rating: "Meets" },
  { first_name: "Fatima", last_name: "Zaidi", department: "HR", job_title: "HR Business Partner", location: "Dubai", base_salary: 72000, target_bonus_percent: 12, performance_rating: "Exceeds" },
  { first_name: "Karim", last_name: "Adel", department: "Sales", job_title: "Sales Manager", location: "Cairo", base_salary: 98000, target_bonus_percent: 22, performance_rating: "Below" },
];

export const EMPLOYEE_PAGE_SIZE = 25;

export const EMPLOYEE_KNOWN_CSV_KEYS = new Set<string>([
  "employee_code","first_name","last_name","email","phone_number","date_of_birth","nationality","gender",
  "department","job_title","job_family","location","cost_center","business_unit","employment_type","employment_status",
  "hire_date","contract_start_date","contract_end_date","manager_name",
  "company_grade","mapped_grade","grade_code","base_salary","currency","salary_effective_date","target_bonus_percent",
  "company_rating","mapped_rating","performance_rating",
  "housing_allowance","transportation_allowance","mobile_allowance","food_allowance","shift_allowance","hardship_allowance",
]);
