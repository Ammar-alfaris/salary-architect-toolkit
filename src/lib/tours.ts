// Step-by-step guided tours by user goal.
export type TourGoal = "new_company" | "existing_structure" | "employees_only" | "cycles_only";

export interface TourStep {
  id: string;
  route: string;             // route to navigate to before showing this step
  selector: string;          // [data-tour="..."] target on that page
  titleKey: string;          // i18n key for title
  bodyKey: string;           // i18n key for body
  cta?: { labelKey: string; route?: string }; // optional jump
}

export const TOURS: Record<TourGoal, TourStep[]> = {
  new_company: [
    { id: "structure-create", route: "/app/structures", selector: '[data-tour="create-structure"]', titleKey: "tour_step_create_structure", bodyKey: "tour_step_create_structure_body" },
    { id: "structure-fields", route: "/app/structures", selector: '[data-tour="structure-fields"]', titleKey: "tour_step_structure_fields", bodyKey: "tour_step_structure_fields_body" },
    { id: "add-employees", route: "/app/employees", selector: '[data-tour="add-employee"]', titleKey: "tour_step_add_employees", bodyKey: "tour_step_add_employees_body" },
    { id: "import-template", route: "/app/employees", selector: '[data-tour="import-employees"]', titleKey: "tour_step_import", bodyKey: "tour_step_import_body" },
    { id: "auto-link", route: "/app/employees", selector: '[data-tour="reassign-grades"]', titleKey: "tour_step_autolink", bodyKey: "tour_step_autolink_body" },
    { id: "analytics", route: "/app/", selector: '[data-tour="kpis"]', titleKey: "tour_step_analytics", bodyKey: "tour_step_analytics_body" },
  ],
  existing_structure: [
    { id: "import-employees", route: "/app/employees", selector: '[data-tour="import-employees"]', titleKey: "tour_step_import", bodyKey: "tour_step_import_body" },
    { id: "structure-create", route: "/app/structures", selector: '[data-tour="create-structure"]', titleKey: "tour_step_create_structure", bodyKey: "tour_step_create_structure_body" },
    { id: "auto-link", route: "/app/employees", selector: '[data-tour="reassign-grades"]', titleKey: "tour_step_autolink", bodyKey: "tour_step_autolink_body" },
    { id: "analytics", route: "/app/", selector: '[data-tour="kpis"]', titleKey: "tour_step_analytics", bodyKey: "tour_step_analytics_body" },
  ],
  employees_only: [
    { id: "import-employees", route: "/app/employees", selector: '[data-tour="import-employees"]', titleKey: "tour_step_import", bodyKey: "tour_step_import_body" },
    { id: "suggest-structure", route: "/app/structures", selector: '[data-tour="create-structure"]', titleKey: "tour_step_suggest_structure", bodyKey: "tour_step_suggest_structure_body" },
    { id: "auto-link", route: "/app/employees", selector: '[data-tour="reassign-grades"]', titleKey: "tour_step_autolink", bodyKey: "tour_step_autolink_body" },
    { id: "analytics", route: "/app/", selector: '[data-tour="kpis"]', titleKey: "tour_step_analytics", bodyKey: "tour_step_analytics_body" },
  ],
  cycles_only: [
    { id: "merit", route: "/app/merit", selector: '[data-tour="merit-cycle"]', titleKey: "tour_step_merit", bodyKey: "tour_step_merit_body" },
    { id: "bonus", route: "/app/bonus", selector: '[data-tour="bonus-cycle"]', titleKey: "tour_step_bonus", bodyKey: "tour_step_bonus_body" },
  ],
};
