/**
 * sendOtpEmail — Gửi email chứa mã OTP qua Resend API
 *
 * Tại sao dùng Resend thay vì nodemailer?
 * → Gọi HTTP đơn giản, không cần native module (tương thích Vercel Edge/Serverless)
 * → Free 3,000 email/tháng, không cần thẻ ngân hàng
 * → Dashboard theo dõi delivery status
 *
 * Setup: Tạo account tại resend.com → Lấy API key → Thêm vào .env.local
 */
export async function sendOtpEmail(toEmail: string, toName: string, otp: string): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kltn-anhchill.vercel.app";

    if (!apiKey || apiKey.startsWith("re_xxx")) {
        // Dev mode: log OTP ra console thay vì gửi email thật
        console.log(`\n📧 [DEV MODE] OTP cho ${toEmail}: ${otp}\n`);
        return;
    }

    // Template email HTML đẹp
    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác thực Email - EngChill</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <a href="${appUrl}" style="text-decoration:none;">
                <span style="font-size:32px;font-weight:900;color:#ffffff;">Eng<span style="color:#60a5fa;">Chill</span></span>
              </a>
              <p style="color:#64748b;margin:4px 0 0;font-size:13px;">Học tiếng Anh thật chill 🎧</p>
            </td>
          </tr>

          <!-- Card chính -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid #1e3a5f;border-radius:24px;padding:40px 36px;">

              <!-- Icon + Tiêu đề -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <div style="width:64px;height:64px;background:linear-gradient(135deg,#3b82f6,#6366f1);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:28px;line-height:64px;text-align:center;">
                      ✉️
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:8px;">
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">Xác thực Email của bạn</h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <p style="margin:0;color:#94a3b8;font-size:15px;">Xin chào <strong style="color:#e2e8f0;">${toName}</strong>! Đây là mã xác thực tài khoản EngChill của bạn.</p>
                  </td>
                </tr>

                <!-- OTP Box -->
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <div style="background:#0f172a;border:2px solid #3b82f6;border-radius:16px;padding:24px 40px;display:inline-block;">
                      <p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Mã xác thực</p>
                      <div style="font-size:44px;font-weight:900;letter-spacing:12px;color:#60a5fa;font-family:'Courier New',monospace;">
                        ${otp}
                      </div>
                    </div>
                  </td>
                </tr>

                <!-- Warning -->
                <tr>
                  <td>
                    <div style="background:#451a03;border:1px solid #92400e;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
                      <p style="margin:0;color:#fbbf24;font-size:13px;text-align:center;">
                        ⏰ Mã này sẽ <strong>hết hạn sau 10 phút</strong>. Không chia sẻ mã này với ai.
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <a href="${appUrl}/register" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;">
                      Quay lại trang xác thực →
                    </a>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="border-top:1px solid #1e293b;padding-top:24px;">
                    <p style="margin:0;color:#475569;font-size:12px;text-align:center;">
                      Nếu bạn không tạo tài khoản EngChill, hãy bỏ qua email này.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
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

    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: "EngChill <onboarding@resend.dev>", // Domain mặc định của Resend (free tier)
            to: [toEmail],
            subject: `${otp} là mã xác thực EngChill của bạn`,
            html,
        }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Resend API lỗi: ${err.message || res.status}`);
    }
}
