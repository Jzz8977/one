# 微信支付（Native 扫码）接入指南

本模板内置了**微信支付 v3 + 新公钥模式**的 Native 扫码支付。代码在：

- `apps/api/src/modules/payments/wechat-pay.service.ts` — 签名 / 验签 / AES-GCM 解密
- `apps/api/src/modules/payments/payments.controller.ts` — `/wechat/notify` 真实回调
- `apps/api/src/modules/orders/orders.service.ts` — `paymentMethod=wechat` 时调下单
- `apps/web/src/pages/Billing.tsx` — 二维码弹窗 + 轮询

## 你需要准备 4 样东西

| 项 | 在哪里拿 | 配到 .env |
|---|---|---|
| **AppID + 商户号** | 公众号/小程序后台 + 商户平台首页 | `WECHAT_APP_ID` `WECHAT_MCH_ID` |
| **商户公钥 ID** `PUB_KEY_ID_xxx` | 商户平台 → 账户中心 → API 安全 → API v3 公钥模式 → 你上传公钥后微信会给你这个 ID | `WECHAT_PUB_KEY_ID` |
| **商户私钥** `apiclient_key.pem` | 上传公钥时你本地用 openssl 生成的私钥（**自己保管，不上传**） | `WECHAT_PRIVATE_KEY_PATH=./apiclient_key.pem` |
| **微信平台公钥** `wechatpay_pub_key.pem` | 商户平台 → API 安全 → 平台公钥下载（用于验签微信发来的通知） | `WECHAT_PLATFORM_PUB_KEY_PATH=./wechatpay_pub_key.pem` |
| **APIv3 密钥**（32 字符） | 商户平台 → 账户中心 → API 安全 → APIv3 密钥（自己设置，记下来） | `WECHAT_API_V3_KEY=` |
| **回调 URL** | 公网 HTTPS 地址，本地用 ngrok | `WECHAT_NOTIFY_URL=https://xxx.ngrok-free.app/api/payments/wechat/notify` |

> 没生成过密钥对？商户平台「API 安全」页有完整指引，命令大致是：
> ```bash
> openssl genrsa -out apiclient_key.pem 2048
> openssl rsa -in apiclient_key.pem -pubout -out apiclient_pub.pem
> # 把 apiclient_pub.pem 内容粘贴到商户平台
> ```

## 本地测试步骤

### 1. 启动 ngrok（让微信能回调到你 Mac）

```bash
brew install ngrok
ngrok http 4000
```

拿到形如 `https://abcd-1234.ngrok-free.app`，回调 URL 就是：

```
https://abcd-1234.ngrok-free.app/api/payments/wechat/notify
```

> 商户平台**不需要**预先配置回调地址——v3 Native 是下单时把 `notify_url` 传给微信，所以改 `.env` 即可。

### 2. 把 `apiclient_key.pem` 和 `wechatpay_pub_key.pem` 放到仓库根目录

（已在 `.gitignore`，不会提交）

### 3. 填 `.env`

```env
WECHAT_APP_ID=wx3b84f60568eca8cd
WECHAT_MCH_ID=1706085394
WECHAT_PUB_KEY_ID=PUB_KEY_ID_0117060853942026051100181599003200
WECHAT_PRIVATE_KEY_PATH=./apiclient_key.pem
WECHAT_PLATFORM_PUB_KEY_PATH=./wechatpay_pub_key.pem
WECHAT_API_V3_KEY=填你设置的32字符密钥
WECHAT_NOTIFY_URL=https://abcd-1234.ngrok-free.app/api/payments/wechat/notify
```

### 4. 重启 API

```bash
pnpm dev:api
```

### 5. 检查配置

```bash
curl -s http://localhost:4000/api/payments/wechat/status \
  -H "Authorization: Bearer $(curl -s -X POST http://localhost:4000/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"user@example.com","password":"User@12345"}' \
    | sed 's/.*"accessToken":"\([^"]*\)".*/\1/')"
```

应返回 `{ ok: true, missing: [] }`。如果还有 `missing`，按提示补。

### 6. 走完整流程

1. 浏览器打开 http://localhost:5173 → 登录普通用户
2. 进「充值套餐」→ 点任意套餐的「微信支付」按钮
3. 弹出二维码 → 用微信扫
4. 微信完成支付 → notify 回到 ngrok → API 验签解密 → markPaid → 加积分
5. 前端轮询发现订单 paid → 弹窗变成「✓ 支付成功」→ 自动关闭，积分更新

## 排错

| 现象 | 原因 |
|---|---|
| 「微信下单失败: ... AppID and mch_id not match」 | AppID/MchID 对不上 |
| 「微信下单失败: ... sign verify failed」| 私钥文件错误，或 PUB_KEY_ID 没在商户平台开通公钥模式 |
| 回调一直没来 | ngrok 没起 / NOTIFY_URL 不是 https / 微信 IP 不在白名单 |
| 回调 401「签名校验失败」 | 平台公钥文件不对，或下载的是过期的 |
| 回调 400「解密失败」 | APIv3 密钥不对（32 字符精确） |
| 已支付但积分没加 | 看 `apps/api` 终端，搜 `markPaid 失败` 的具体原因 |
| 弹窗一直转圈 | 看浏览器 Network → `GET /api/orders/:id` 是不是返回 `status: "pending"`，是的话说明回调还没到 |

## 安全要点（已内置，仅供参考）

- ✅ 私钥 `KeyObject` 仅在内存中加载一次
- ✅ 验签用平台公钥（不用拉 `/v3/certificates`）
- ✅ AES-256-GCM 解密带 authTag 校验
- ✅ markPaid 严格幂等（同 outTradeNo 重复回调不会重复加积分）
- ✅ raw body 通过 `express.json({ verify })` 完整保留，验签准确

## 到生产

把 `WECHAT_NOTIFY_URL` 换成你真实域名的 HTTPS 地址。其余流程一致。
