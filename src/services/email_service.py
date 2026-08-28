import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx

from src.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class EmailService:
    @staticmethod
    async def send_email(to_email: str, subject: str, body_html: str, body_text: str = ""):
        """Send email via Brevo REST API or SMTP if configured, else log to output for dev environment."""
        # Option 1: Brevo REST API (HTTPS Port 443 - Bypasses all cloud/firewall SMTP port blocks)
        if settings.brevo_api_key:
            try:
                url = "https://api.brevo.com/v3/smtp/email"
                headers = {
                    "accept": "application/json",
                    "api-key": settings.brevo_api_key,
                    "content-type": "application/json",
                }
                payload = {
                    "sender": {"name": settings.app_name, "email": settings.smtp_from},
                    "to": [{"email": to_email}],
                    "subject": subject,
                    "htmlContent": body_html,
                    "textContent": body_text or body_html,
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(url, headers=headers, json=payload)
                    if response.status_code in (200, 201, 202):
                        logger.info(f"Email sent successfully via Brevo REST API to {to_email}")
                        return True
                    else:
                        logger.error(f"Brevo API error ({response.status_code}): {response.text}")
                        return False
            except Exception as e:
                logger.error(f"Failed to send email via Brevo API to {to_email}: {e}")
                return False

        # Option 2: Standard SMTP
        if not settings.smtp_user or not settings.smtp_password:
            logger.info(
                f"[EMAIL DEV MODE] To: {to_email}\nSubject: {subject}\nBody: {body_text or body_html}\n"
            )
            print("\n======== [EMAIL NOTIFICATION] ========")
            print(f"TO: {to_email}")
            print(f"SUBJECT: {subject}")
            print(f"CONTENT:\n{body_text or body_html}")
            print("======================================")
            return True

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.smtp_from
            msg["To"] = to_email

            if body_text:
                msg.attach(MIMEText(body_text, "plain"))
            if body_html:
                msg.attach(MIMEText(body_html, "html"))

            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                if settings.smtp_tls:
                    server.starttls()
                server.login(settings.smtp_user, settings.smtp_password)
                server.sendmail(settings.smtp_from, [to_email], msg.as_string())

            logger.info(f"Email sent successfully to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    @staticmethod
    async def send_verification_email(
        to_email: str, full_name: str, code: str, verify_url: str = ""
    ):
        """Send email verification code / OTP to newly registered user."""
        subject = "Xác thực tài khoản - AI Learning Companion"
        html_content = f"""
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1e293b; background-color: #f8fafc; border-radius: 12px;">
            <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <h2 style="color: #4f46e5; margin-top: 0;">Mã xác thực email</h2>
                <p>Xin chào <strong>{full_name}</strong>,</p>
                <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>AI Learning Companion</strong>. Dưới đây là mã OTP 6 chữ số để hoàn tất đăng ký của bạn:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #4f46e5; background: #eef2ff; padding: 12px 24px; border-radius: 12px; border: 1px dashed #6366f1;">
                        {code}
                    </span>
                </div>
                <p style="font-size: 14px; color: #64748b;">Mã này có hiệu lực trong <strong>15 phút</strong>. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
                {f'<p style="text-align: center; margin-top: 20px;"><a href="{verify_url}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">Xác thực ngay</a></p>' if verify_url else ''}
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
                <p style="font-size: 12px; color: #94a3b8; text-align: center;">Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email này.</p>
            </div>
        </div>
        """
        text_content = f"Xin chào {full_name}!\nMã xác thực OTP 6 chữ số của bạn là: {code} (Hiệu lực 15 phút)."
        return await EmailService.send_email(to_email, subject, html_content, text_content)

    @staticmethod
    async def send_reset_password_email(to_email: str, code: str):
        """Send 6-digit OTP code for password reset."""
        subject = "Mã đặt lại mật khẩu - AI Learning Companion"
        html_content = f"""
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1e293b; background-color: #f8fafc; border-radius: 12px;">
            <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <h2 style="color: #ef4444; margin-top: 0;">Yêu cầu đặt lại mật khẩu</h2>
                <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>{to_email}</strong>.</p>
                <p>Nhập mã OTP 6 chữ số dưới đây trên màn hình đặt lại mật khẩu của bạn:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #ef4444; background: #fef2f2; padding: 12px 24px; border-radius: 12px; border: 1px dashed #f87171;">
                        {code}
                    </span>
                </div>
                <p style="font-size: 14px; color: #64748b;">Mã OTP có hiệu lực trong <strong>15 phút</strong>.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
                <p style="font-size: 12px; color: #94a3b8; text-align: center;">Nếu bạn không yêu cầu đặt lại mật khẩu, tài khoản của bạn vẫn an toàn và bạn có thể bỏ qua email này.</p>
            </div>
        </div>
        """
        text_content = f"Yêu cầu đặt lại mật khẩu cho {to_email}.\nMã OTP 6 chữ số của bạn là: {code} (Hiệu lực 15 phút)."
        return await EmailService.send_email(to_email, subject, html_content, text_content)
