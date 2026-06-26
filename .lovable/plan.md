# خطة حذف البيانات التجريبية

سأحذف فقط البيانات التشغيلية (موظفين، رواتب، بونص، إلخ) من جميع المؤسسات الحالية، مع **الإبقاء التام** على:
- الحسابات (`profiles`, `auth.users`)
- المؤسسات (`organizations`) وأدوار المستخدمين (`user_roles`)
- الاشتراكات والطلبات/الفواتير (`subscriptions`, `orders`)
- بيانات النظام (الخطط، إعدادات الأدمن، المدونة، القوالب، التذاكر، الإشعارات، الدعوات، إلخ)

## الجداول التي ستُفرَّغ (TRUNCATE ... CASCADE)

| الجدول | السجلات الحالية |
|---|---|
| employees | 415 |
| salary_structures | 13 |
| salary_grades | 161 |
| salary_history | 0 |
| bonus_cycles | 5 |
| bonus_results | 90 |
| merit_cycles | 6 |
| merit_results | 70 |
| employee_allowances | 3 |
| employee_custom_allowances | 0 |
| employee_custom_field_values | 0 |
| compensation_snapshots | 0 |
| equity_review_flags | 0 |
| merit_matrix_rules | 0 |
| approval_requests | 8 |
| approval_step_decisions | 8 |
| audit_logs | 128 |

## جداول لن تُمَس
`organizations`, `profiles`, `user_roles`, `subscriptions`, `orders`, `plans`, `admin_settings`, `platform_admins`, `blog_*`, `email_*`, `support_tickets`, `ticket_messages`, `contact_messages`, `announcements`, `pending_invitations`, `approval_chains`, `approval_chain_steps`, `allowance_policies`, `org_custom_field_defs`, `fx_rates`, `error_logs`.

> ملاحظة: `approval_chains` و`approval_chain_steps` و`allowance_policies` و`org_custom_field_defs` تُعتبر إعدادات على مستوى المؤسسة وليست بيانات تجريبية — سأبقيها. إن أردت حذفها أيضاً أخبرني.

## التنفيذ
أمر SQL واحد عبر أداة الـ migration:
```sql
TRUNCATE TABLE
  public.bonus_results, public.merit_results,
  public.bonus_cycles, public.merit_cycles,
  public.approval_step_decisions, public.approval_requests,
  public.employee_allowances, public.employee_custom_allowances,
  public.employee_custom_field_values,
  public.compensation_snapshots, public.equity_review_flags,
  public.salary_history, public.employees,
  public.salary_grades, public.salary_structures,
  public.merit_matrix_rules,
  public.audit_logs
RESTART IDENTITY CASCADE;
```

`CASCADE` لضمان عدم فشل الحذف بسبب أي مفاتيح أجنبية متبقية.
