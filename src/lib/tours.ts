// Step-by-step guided tours by user goal.
export type TourGoal = "new_company" | "existing_structure" | "employees_only" | "cycles_only";

export type AdvanceTrigger =
  | { type: "click" }
  | { type: "event"; name: string }
  | { type: "route"; pathname: string };

export interface TourStep {
  id: string;
  route: string;
  selector: string;
  titleKey: string;
  bodyKey: string;
  advanceOn?: AdvanceTrigger;
  cta?: { labelKey: string; route?: string };
}

export const TOURS: Record<TourGoal, TourStep[]> = {
  new_company: [
    { id: "structure-create", route: "/app/structures", selector: '[data-tour="create-structure"]', titleKey: "tour_step_create_structure", bodyKey: "tour_step_create_structure_body", advanceOn: { type: "click" } },
    { id: "structure-fields", route: "/app/structures", selector: '[data-tour="structure-fields"]', titleKey: "tour_step_structure_fields", bodyKey: "tour_step_structure_fields_body", advanceOn: { type: "event", name: "tour:structure-created" } },
    { id: "add-employees", route: "/app/employees", selector: '[data-tour="add-employee"]', titleKey: "tour_step_add_employees", bodyKey: "tour_step_add_employees_body", advanceOn: { type: "event", name: "tour:employee-added" } },
    { id: "import-template", route: "/app/employees", selector: '[data-tour="import-employees"]', titleKey: "tour_step_import", bodyKey: "tour_step_import_body", advanceOn: { type: "event", name: "tour:employees-imported" } },
    { id: "auto-link", route: "/app/employees", selector: '[data-tour="reassign-grades"]', titleKey: "tour_step_autolink", bodyKey: "tour_step_autolink_body", advanceOn: { type: "event", name: "tour:grades-linked" } },
    { id: "analytics", route: "/app/", selector: '[data-tour="kpis"]', titleKey: "tour_step_analytics", bodyKey: "tour_step_analytics_body" },
  ],
  existing_structure: [
    { id: "import-employees", route: "/app/employees", selector: '[data-tour="import-employees"]', titleKey: "tour_step_import", bodyKey: "tour_step_import_body", advanceOn: { type: "event", name: "tour:employees-imported" } },
    { id: "structure-create", route: "/app/structures", selector: '[data-tour="create-structure"]', titleKey: "tour_step_create_structure", bodyKey: "tour_step_create_structure_body", advanceOn: { type: "event", name: "tour:structure-created" } },
    { id: "auto-link", route: "/app/employees", selector: '[data-tour="reassign-grades"]', titleKey: "tour_step_autolink", bodyKey: "tour_step_autolink_body", advanceOn: { type: "event", name: "tour:grades-linked" } },
    { id: "analytics", route: "/app/", selector: '[data-tour="kpis"]', titleKey: "tour_step_analytics", bodyKey: "tour_step_analytics_body" },
  ],
  employees_only: [
    { id: "import-employees", route: "/app/employees", selector: '[data-tour="import-employees"]', titleKey: "tour_step_import", bodyKey: "tour_step_import_body", advanceOn: { type: "event", name: "tour:employees-imported" } },
    { id: "suggest-structure", route: "/app/structures", selector: '[data-tour="create-structure"]', titleKey: "tour_step_suggest_structure", bodyKey: "tour_step_suggest_structure_body", advanceOn: { type: "event", name: "tour:structure-created" } },
    { id: "auto-link", route: "/app/employees", selector: '[data-tour="reassign-grades"]', titleKey: "tour_step_autolink", bodyKey: "tour_step_autolink_body", advanceOn: { type: "event", name: "tour:grades-linked" } },
    { id: "analytics", route: "/app/", selector: '[data-tour="kpis"]', titleKey: "tour_step_analytics", bodyKey: "tour_step_analytics_body" },
  ],
  cycles_only: [
    { id: "merit", route: "/app/merit", selector: '[data-tour="merit-cycle"]', titleKey: "tour_step_merit", bodyKey: "tour_step_merit_body", advanceOn: { type: "event", name: "tour:merit-created" } },
    { id: "bonus", route: "/app/bonus", selector: '[data-tour="bonus-cycle"]', titleKey: "tour_step_bonus", bodyKey: "tour_step_bonus_body" },
  ],
};
