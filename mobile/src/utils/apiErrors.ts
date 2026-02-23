type ApiErrorLike = {
  response?: {
    data?: {
      error?: string;
      message?: string;
      details?: Array<{ message?: string }>;
    };
  };
  message?: string;
};

export function getApiErrorMessage(error: ApiErrorLike, fallback: string): string {
  const data = error?.response?.data;
  const detailedMessage = data?.details?.find((item) => item?.message)?.message;
  if (detailedMessage) return detailedMessage;
  if (typeof data?.error === 'string' && data.error.trim()) return data.error;
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  if (typeof error?.message === 'string' && error.message.trim()) return error.message;
  return fallback;
}

