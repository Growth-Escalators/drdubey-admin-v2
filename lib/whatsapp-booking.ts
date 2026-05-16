export const WHATSAPP_BOOKING_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_BOOKING_NUMBER || "918955373205";

export const WHATSAPP_BOOKING_MESSAGE = "Hi, I want to book an appointment.";

export function getWhatsAppBookingUrl(
  message: string = WHATSAPP_BOOKING_MESSAGE
): string {
  const number = WHATSAPP_BOOKING_NUMBER.replace(/\D/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
