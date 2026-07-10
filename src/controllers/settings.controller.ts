import { z } from 'zod';

export const updateSettingsSchema = z.object({
  taxEnabled: z.boolean(),
  taxRate: z.number().min(0).max(100), // نسبة مئوية
  taxInclusive: z.boolean(),
  // يمكنك إضافة المزيد هنا مستقبلاً (مثل company_name)
}).partial();

export type UpdateSettingsPayload = z.infer<typeof updateSettingsSchema>;
import { Request, Response } from 'express';
import * as settingsService from '../services/settings.service';

export const updateSettings = async (req: Request, res: Response) => {
    const updatedSettings = await settingsService.upsertSettings(req.body);
    
    return res.status(200).json(updatedSettings);

};

export const getSettings = async (req: Request, res: Response) => {
    const settings = await settingsService.getSettings();
    
    return res.status(200).json(
   settings
    );

};