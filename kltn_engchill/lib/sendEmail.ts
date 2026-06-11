import nodemailer from "nodemailer";

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        console.log(`\n[DEV MODE] Email tới ${to}:\nSubject: ${subject}\n`);
        return;
    }

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
        from: `"EngChill" <${user}>`,
        to,
        subject,
        html,
    });
}
