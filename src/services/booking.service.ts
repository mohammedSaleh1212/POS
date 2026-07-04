// import { BookingRepository } from '../repositories/booking.repository';
// import { BookingData, SlotAvailability } from '../interfaces/booking.interface';

// export class BookingService {
//   private repository: BookingRepository;
//   private timeOffset: string;
//   private timezone: string;
//   private definedHours: string[];

//   constructor(repository: BookingRepository, timeOffset = '+04:00', timezone = 'Asia/Dubai') {
//     this.repository = repository;
//     this.timeOffset = timeOffset;
//     this.timezone = timezone;
//     this.definedHours = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
//   }

//   async getAvailableSlots(targetDate: string): Promise<SlotAvailability> {
//     console.log('ai called get available slots for date:', targetDate);
//     const allPotentialSlots = this.definedHours.map(hour => 
//       new Date(`${targetDate}T${hour}:00${this.timeOffset}`).toISOString()
//     );

//     const startOfDay = new Date(`${targetDate}T00:00:00${this.timeOffset}`).toISOString();
//     const endOfDay = new Date(`${targetDate}T23:59:59${this.timeOffset}`).toISOString();

//     const bookedSlots = await this.repository.getBookingsBetweenDates(startOfDay, endOfDay);
//     const availableSlots = allPotentialSlots.filter(slot => !bookedSlots.includes(slot));
  

//     return {
//       dateChecked: targetDate,
//       timezone: this.timezone,
//       availableSlots,
//     };
//   }

//   async bookAppointment(bookingData: BookingData) {
//     const eventStart = new Date(bookingData.appointmentDateTime).toISOString();

//     try {
//       const result = await this.repository.createBooking(bookingData, eventStart);
      
//       return {
//         status: "success",
//         message: "Appointment successfully committed.",
//         referenceId: `REF-${result.id}`,
//         confirmedTime: result.appointment_date_time,
//       };
//     } catch (error: any) {
//       if (error.code === '23505') { 
//         return {
//           status: "error",
//           reason: "slot_taken",
//           message: "The requested time slot was reserved by another user during checkout."
//         };
//       }
//       throw error;
//     }
//   }
// }