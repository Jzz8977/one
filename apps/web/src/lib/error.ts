interface ApiErrShape {
  response?: {
    data?: {
      message?: string;
      content?: Record<string, string[] | undefined> | null;
    };
  };
  message?: string;
}

/**
 * 把后端的统一错误响应转成可展示的字符串。
 * - 优先把 zod fieldErrors 拼出来：「password: 密码至少 8 位; email: 邮箱格式不正确」
 * - 否则用顶层 message
 * - 最后兜底
 */
export function formatApiError(err: unknown, fallback = '请求失败'): string {
  const e = err as ApiErrShape;
  const data = e?.response?.data;
  const fieldErrors = data?.content;
  if (fieldErrors && typeof fieldErrors === 'object') {
    const parts: string[] = [];
    for (const [field, msgs] of Object.entries(fieldErrors)) {
      if (Array.isArray(msgs) && msgs.length) {
        parts.push(`${field}: ${msgs.join(', ')}`);
      }
    }
    if (parts.length) return parts.join('; ');
  }
  return data?.message ?? e?.message ?? fallback;
}
