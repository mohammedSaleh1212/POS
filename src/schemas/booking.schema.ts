import { z } from "zod";

export const BookingSchema = z.object({
  name: z.string().describe("User's full name."),
  email: z.string().email().describe("User's email address."),
  meetingDate: z.string().describe("Format YYYY-MM-DD."),
  meetingTime: z.string().describe("Format HH:MM."),
  hasEnoughInfo: z.boolean().describe("True ONLY if name, email, date, and time are completely filled."),
  missingFieldsQuestion: z.string().describe("Polite clarification question if hasEnoughInfo is false.")
});

export type BookingPayload = z.infer<typeof BookingSchema>;
export type ChatMessage = { role: "user" | "assistant" | "system"; content: string };