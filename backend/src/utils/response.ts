export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code?: string;
    details?: unknown;
  };
}

export const successResponse = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  ...(message ? { message } : {}),
  data,
});

export const errorResponse = (
  message: string,
  code?: string,
  details?: unknown,
): ApiResponse<never> => ({
  success: false,
  message,
  ...(code || details ? { error: { code, details } } : {}),
});
