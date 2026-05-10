export const CREDIT_TX_TYPE = {
  RECHARGE: 'recharge',
  CONSUME: 'consume',
  REFUND: 'refund',
  ADMIN_ADJUST: 'admin_adjust',
  GIFT: 'gift',
  FREEZE: 'freeze',
  UNFREEZE: 'unfreeze',
} as const;
export type CreditTxType = (typeof CREDIT_TX_TYPE)[keyof typeof CREDIT_TX_TYPE];

export const ORDER_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  CLOSED: 'closed',
  REFUNDED: 'refunded',
  FAILED: 'failed',
} as const;
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const PAYMENT_STATUS = {
  CREATED: 'created',
  SUCCESS: 'success',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_METHOD = {
  MOCK: 'mock',
  WECHAT: 'wechat',
  ALIPAY: 'alipay',
} as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export const USER_STATUS = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
  PENDING: 'pending',
} as const;
export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;
export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  USER_READ: 'user.read',
  USER_UPDATE: 'user.update',
  USER_DISABLE: 'user.disable',
  ORDER_READ: 'order.read',
  CREDIT_ADJUST: 'credit.adjust',
  PRODUCT_MANAGE: 'product.manage',
  AI_PROVIDER_MANAGE: 'ai.provider.manage',
  AI_LOG_READ: 'ai.log.read',
  SYSTEM_SETTING_MANAGE: 'system.setting.manage',
  API_KEY_READ: 'api_key.read',
} as const;
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const AI_USAGE_STATUS = {
  SUCCESS: 'success',
  FAILED: 'failed',
  TIMEOUT: 'timeout',
} as const;
export type AiUsageStatus = (typeof AI_USAGE_STATUS)[keyof typeof AI_USAGE_STATUS];

export const SYSTEM_SETTING_KEYS = {
  SITE_NAME: 'site.name',
  SITE_LOGO: 'site.logo',
  REGISTER_ENABLED: 'auth.register_enabled',
  DEFAULT_REGISTER_CREDITS: 'auth.default_register_credits',
  PAYMENT_ENABLED: 'payment.enabled',
  AI_DEFAULT_MODEL: 'ai.default_model',
  MAINTENANCE: 'system.maintenance',
} as const;

export const API_RESPONSE_OK = 200;
export const API_RESPONSE_BAD_REQUEST = 400;
export const API_RESPONSE_UNAUTHORIZED = 401;
export const API_RESPONSE_FORBIDDEN = 403;
export const API_RESPONSE_NOT_FOUND = 404;
export const API_RESPONSE_CONFLICT = 409;
export const API_RESPONSE_UNPROCESSABLE = 422;
export const API_RESPONSE_INSUFFICIENT_CREDITS = 402;
export const API_RESPONSE_TOO_MANY = 429;
export const API_RESPONSE_INTERNAL = 500;
