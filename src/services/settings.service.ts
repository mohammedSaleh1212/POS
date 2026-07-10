import { UpdateSettingsPayload } from "../controllers/settings.controller";
import { prisma } from "../db/prisma";

const DEFAULT_SETTINGS = {
  taxEnabled: false,
  taxRate: 0,
  taxInclusive: false,
};
export const upsertSettings = async (data: UpdateSettingsPayload) => {
 const operations = Object.entries(data).map(([key, value]) => {
    const stringValue = String(value);
    
    return prisma.generalSetting.upsert({
      where: { key },
      update: { value: stringValue },
      create: {
        key,
        value: stringValue,
        description: `System setting for ${key}`
      }
    });
  });

  await prisma.$transaction(operations);

  return getSettings();
};

export const getSettings = async () => {
  const settings = await prisma.generalSetting.findMany();
  const dbSettings: Record<string, any> = {};

  settings.forEach((setting) => {
    if (setting.value === 'true' || setting.value === 'false') {
      dbSettings[setting.key] = setting.value === 'true';
    } else if (!isNaN(Number(setting.value))) {
      dbSettings[setting.key] = Number(setting.value);
    } else {
      dbSettings[setting.key] = setting.value;
    }
  });

 
  return { ...DEFAULT_SETTINGS, ...dbSettings };
};