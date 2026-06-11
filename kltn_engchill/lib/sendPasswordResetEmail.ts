import { sendEmail } from "./sendEmail";

export async function sendPasswordResetEmail(
    toEmail: string,
    toName: string,
    resetLink: string
): Promise<void> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dat lai mat khau - EngChill</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <a href="${appUrl}" style="text-decoration:none;">
                <span style="font-size:32px;font-weight:900;color:#ffffff;">Eng<span style="color:#60a5fa;">Chill</span></span>
              </a>
              <p style="color:#64748b;margin:4px 0 0;font-size:13px;">Hoc tieng Anh that chill</p>
            </td>
          </tr>
          <tr>
            <td style="background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid #1e3a5f;border-radius:24px;padding:40px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <div style="width:64px;height:64px;background:linear-gradient(135deg,#f59e0b,#ef4444);border-radius:50%;line-height:64px;text-align:center;font-size:28px;">
                      &#128274;
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:8px;">
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">Dat lai mat khau</h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <p style="margin:0;color:#94a3b8;font-size:15px;">Xin chao <strong style="color:#e2e8f0;">${toName}</strong>! Nhan vao nut ben duoi de dat lai mat khau tai khoan EngChill cua ban.</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div style="background:#451a03;border:1px solid #92400e;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
                      <p style="margin:0;color:#fbbf24;font-size:13px;text-align:center;">
                        Link nay se <strong>het han sau 1 gio</strong>. Khong chia se voi ai.
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:16px 40px;border-radius:12px;">
                      Dat lai mat khau &rarr;
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:24px;">
                    <div style="background:#0f172a;border:1px solid #1e3a5f;border-radius:12px;padding:16px 20px;">
                      <p style="margin:0 0 8px;color:#64748b;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Hoac copy link sau:</p>
                      <p style="margin:0;color:#60a5fa;font-size:12px;word-break:break-all;">${resetLink}</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="border-top:1px solid #1e293b;padding-top:24px;">
                    <p style="margin:0;color:#475569;font-size:12px;text-align:center;">
                      Neu ban khong yeu cau dat lai mat khau, hay bo qua email nay. Tai khoan van an toan.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;color:#334155;font-size:12px;">© 2025 EngChill · KLTN · TIU</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await sendEmail({
        to: toEmail,
        subject: "Dat lai mat khau tai khoan EngChill",
        html,
    });
}
