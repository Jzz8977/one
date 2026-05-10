import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const PERMISSIONS_SEED = [
  ['user.read', '查看用户'],
  ['user.update', '修改用户'],
  ['user.disable', '禁用用户'],
  ['order.read', '查看订单'],
  ['credit.adjust', '调整积分'],
  ['product.manage', '管理套餐'],
  ['ai.provider.manage', '管理 AI 供应商'],
  ['ai.log.read', '查看 AI 日志'],
  ['system.setting.manage', '管理系统配置'],
  ['api_key.read', '查看 API Key'],
] as const;

const SETTINGS_SEED: Array<[string, string]> = [
  ['site.name', 'AI SaaS Starter'],
  ['site.logo', ''],
  ['auth.register_enabled', 'true'],
  ['auth.default_register_credits', '1000'],
  ['payment.enabled', 'true'],
  ['ai.default_model', 'gpt-4o-mini'],
  ['system.maintenance', 'false'],
];

async function ensurePermissions() {
  for (const [code, description] of PERMISSIONS_SEED) {
    await prisma.permission.upsert({
      where: { code },
      update: { description },
      create: { code, description },
    });
  }
}

async function ensureRoles() {
  const all = await prisma.permission.findMany();
  const allIds = all.map((p) => p.id);
  const adminCodes: string[] = [
    'user.read',
    'user.update',
    'user.disable',
    'order.read',
    'credit.adjust',
    'product.manage',
    'ai.log.read',
    'api_key.read',
  ];
  const adminIds = all.filter((p) => adminCodes.includes(p.code)).map((p) => p.id);

  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: { name: 'user', description: '普通用户', isSystem: true },
  });
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin', description: '管理员', isSystem: true },
  });
  const superRole = await prisma.role.upsert({
    where: { name: 'super_admin' },
    update: {},
    create: { name: 'super_admin', description: '超级管理员', isSystem: true },
  });

  await syncRolePermissions(adminRole.id, adminIds);
  await syncRolePermissions(superRole.id, allIds);
  await syncRolePermissions(userRole.id, []);

  return { userRole, adminRole, superRole };
}

async function syncRolePermissions(roleId: string, permissionIds: string[]) {
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  if (permissionIds.length === 0) return;
  await prisma.rolePermission.createMany({
    data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
    skipDuplicates: true,
  });
}

async function ensureSettings() {
  for (const [key, value] of SETTINGS_SEED) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
}

async function ensureUsers(roles: Awaited<ReturnType<typeof ensureRoles>>) {
  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'Admin@12345';
  const adminHash = await argon2.hash(adminPassword);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      status: 'active',
      profile: { create: { nickname: 'Super Admin' } },
      creditAccount: { create: { balance: 0 } },
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: roles.superRole.id } },
    update: {},
    create: { userId: admin.id, roleId: roles.superRole.id },
  });

  const userHash = await argon2.hash('User@12345');
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      passwordHash: userHash,
      status: 'active',
      profile: { create: { nickname: 'Test User' } },
      creditAccount: { create: { balance: 1000 } },
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: roles.userRole.id } },
    update: {},
    create: { userId: user.id, roleId: roles.userRole.id },
  });
}

async function ensureProducts() {
  const products = [
    { name: '入门套餐', description: '1000 积分', price: 990, credits: 1000, sort: 1 },
    { name: '基础套餐', description: '5500 积分（赠 500）', price: 4990, credits: 5500, sort: 2 },
    { name: '进阶套餐', description: '12000 积分（赠 2000）', price: 9990, credits: 12000, sort: 3 },
    { name: '专业套餐', description: '60000 积分（赠 10000）', price: 49900, credits: 60000, sort: 4 },
  ];
  for (const p of products) {
    const exists = await prisma.product.findFirst({ where: { name: p.name } });
    if (!exists) await prisma.product.create({ data: p });
  }
}

async function ensureAiProviders() {
  const providers = [
    {
      code: 'openai',
      name: 'OpenAI',
      baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
      models: [
        { code: 'gpt-4o-mini', name: 'GPT-4o mini', input: 1, output: 4 },
        { code: 'gpt-4o', name: 'GPT-4o', input: 25, output: 100 },
      ],
    },
    {
      code: 'openrouter',
      name: 'OpenRouter',
      baseUrl: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
      models: [
        { code: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', input: 30, output: 150 },
      ],
    },
    {
      code: 'siliconflow',
      name: '硅基流动',
      baseUrl: process.env.SILICONFLOW_BASE_URL ?? 'https://api.siliconflow.cn/v1',
      models: [
        { code: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen2.5-7B', input: 1, output: 1 },
      ],
    },
  ];
  for (const p of providers) {
    const provider = await prisma.aiProvider.upsert({
      where: { code: p.code },
      update: { name: p.name, baseUrl: p.baseUrl },
      create: { code: p.code, name: p.name, baseUrl: p.baseUrl },
    });
    for (const m of p.models) {
      await prisma.aiModel.upsert({
        where: { providerId_code: { providerId: provider.id, code: m.code } },
        update: {
          name: m.name,
          inputPricePerKToken: m.input,
          outputPricePerKToken: m.output,
        },
        create: {
          providerId: provider.id,
          code: m.code,
          name: m.name,
          inputPricePerKToken: m.input,
          outputPricePerKToken: m.output,
        },
      });
    }
  }
}

async function main() {
  console.log('▶ Seeding database...');
  await ensurePermissions();
  const roles = await ensureRoles();
  await ensureSettings();
  await ensureUsers(roles);
  await ensureProducts();
  await ensureAiProviders();
  console.log('✓ Seed complete');
}

main()
  .catch((err) => {
    console.error('✗ Seed failed', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
