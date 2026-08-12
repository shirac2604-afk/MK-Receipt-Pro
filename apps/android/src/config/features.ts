export const WINDOWS_PARITY_FEATURES = [
  "dashboard","issue_receipt","receipt_history","cancel_receipt","customers",
  "expenses","expense_attachments","receipt_templates","reports","reporting_center",
  "open_format_export","tax_simulator_package","tax_registration_dossier",
  "backup_restore","google_drive_sync","business_settings","security_pin",
  "health_checks","diagnostics","qa_center"
] as const;
export type FeatureKey = typeof WINDOWS_PARITY_FEATURES[number];
