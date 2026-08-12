export const IPC_API_VERSION = "1.0" as const;

export type AppErrorCode =
  | "INVALID_INPUT"
  | "UNTRUSTED_IPC_SENDER"
  | "DATABASE_NOT_READY"
  | "DATABASE_OPERATION_FAILED"
  | "PDF_WRITE_FAILED"
  | "OPERATION_TIMEOUT"
  | "RECEIPT_NOT_FOUND"
  | "CUSTOMER_NOT_FOUND"
  | "RECEIPT_ALREADY_CANCELLED"
  | "INVALID_CANCELLATION_REASON"
  | "PDF_NOT_FOUND"
  | "PDF_OPEN_FAILED"
  | "INVALID_BACKUP_FILE"
  | "RESTORE_SEQUENCE_ROLLBACK_BLOCKED"
  | "BACKUP_VERIFICATION_FAILED"
  | "RESTORE_POSTCHECK_FAILED"
  | "OPEN_FORMAT_ERROR"
  | "UNKNOWN_ERROR";

export interface AppErrorPayload {
  code: AppErrorCode;
  message: string;
  recoverable: boolean;
}

export type ApiResult<T> =
  | { success: true; data: T; apiVersion: typeof IPC_API_VERSION }
  | { success: false; error: AppErrorPayload; apiVersion: typeof IPC_API_VERSION };

export function apiSuccess<T>(data: T): ApiResult<T> {
  return { success: true, data, apiVersion: IPC_API_VERSION };
}

export function apiFailure(code: AppErrorCode, message: string, recoverable = true): ApiResult<never> {
  return { success: false, error: { code, message, recoverable }, apiVersion: IPC_API_VERSION };
}
