import sgMail from "@sendgrid/mail";

const configured = !!process.env.SENDGRID_API_KEY && !!process.env.SENDGRID_FROM_EMAIL;

if (configured) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
}

interface BookingEmailData {
  taskId: string;
  orderId?: string | null;
  service?: string | null;
  address?: string | null;
  description?: string | null;
  timeSlot?: string | null;
  bookingDate?: Date | string | null;
  paymentMethod?: string | null;
  createdBy?: string | null;
  client: { name: string; phone?: string | null; email?: string | null };
  nurse: { name: string };
}

function row(label: string, value?: string | null) {
  if (!value) return "";
  return `
    <tr>
      <td style="padding:8px 12px;border:1px solid #e5e5e5;background:#f7f7f7;font-weight:600;color:#333;width:160px;">${label}</td>
      <td style="padding:8px 12px;border:1px solid #e5e5e5;color:#111;">${value}</td>
    </tr>`;
}

function buildBookingTable(booking: BookingEmailData) {
  const dateStr = booking.bookingDate
    ? new Date(booking.bookingDate).toLocaleDateString("en-GB")
    : undefined;

  return `
    <table style="border-collapse:collapse;width:100%;max-width:560px;font-family:Arial,sans-serif;font-size:14px;">
      ${row("Task ID", booking.taskId)}
      ${row("Order ID", booking.orderId)}
      ${row("Client Name", booking.client.name)}
      ${row("Client Phone", booking.client.phone)}
      ${row("Client Email", booking.client.email)}
      ${row("Service", booking.service)}
      ${row("Date", dateStr)}
      ${row("Time Slot", booking.timeSlot)}
      ${row("Address", booking.address)}
      ${row("Payment Method", booking.paymentMethod)}
      ${row("Notes", booking.description)}
      ${row("Assigned Nurse", booking.nurse.name)}
      ${row("Created By", booking.createdBy)}
    </table>`;
}

export async function sendBookingAssignedEmail(to: string, booking: BookingEmailData) {
  if (!configured) return;
  const html = `
    <div style="font-family:Arial,sans-serif;">
      <h2 style="color:#1b4332;">New Booking Assigned</h2>
      <p>Hi ${booking.nurse.name}, a new booking has been assigned to you:</p>
      ${buildBookingTable(booking)}
    </div>`;

  try {
    await sgMail.send({
      to,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: `New Booking Assigned — ${booking.taskId}`,
      html,
    });
  } catch (err) {
    console.error("email send failed:", (err as Error).message);
  }
}
