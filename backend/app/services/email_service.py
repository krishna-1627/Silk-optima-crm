import os
import smtplib
from email.message import EmailMessage
from typing import Optional


def send_interview_invitation_email(
    to_email: str,
    candidate_name: str,
    job_role: Optional[str],
    scheduled_date: str,
    time_slot: str,
    turns_limit: int,
    duration_minutes: int,
    interview_url: str,
    expiry_formatted: str,
) -> bool:
    """Sends a professional, branded HTML email with the AI Interview invite."""
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587") or "587")
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("SMTP_FROM_EMAIL", "SilkOptima <no-reply@silkoptima.com>")

    subject = f"Invitation: SilkOptima AI Technical Interview - {job_role or 'Candidate'}"

    role_display = job_role if job_role else "Software Candidate"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }}
        .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }}
        .header {{ background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center; color: #ffffff; }}
        .header h1 {{ margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }}
        .header p {{ margin: 6px 0 0 0; color: #38bdf8; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; }}
        .content {{ padding: 32px 24px; }}
        .greeting {{ font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }}
        .intro {{ font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }}
        .details-box {{ background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 28px; }}
        .details-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #edf2f7; font-size: 14px; }}
        .details-row:last-child {{ border-bottom: none; }}
        .details-label {{ color: #64748b; font-weight: 500; }}
        .details-val {{ color: #0f172a; font-weight: 600; text-align: right; }}
        .cta-container {{ text-align: center; margin: 32px 0 24px 0; }}
        .cta-btn {{ display: inline-block; background: #0284c7; color: #ffffff !important; text-decoration: none; padding: 14px 32px; font-size: 15px; font-weight: 600; border-radius: 10px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35); }}
        .guidelines {{ background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 0 8px 8px 0; font-size: 13px; color: #92400e; line-height: 1.5; margin-bottom: 24px; }}
        .footer {{ background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>SilkOptima</h1>
          <p>AI Talent Assessment Portal</p>
        </div>
        <div class="content">
          <div class="greeting">Dear {candidate_name},</div>
          <div class="intro">
            We are pleased to invite you to take the SilkOptima Automated AI Interview for the position of <strong>{role_display}</strong>.
            Please review your scheduled details below and start your session within the active window.
          </div>

          <div class="details-box">
            <div class="details-row">
              <span class="details-label">Position / Role</span>
              <span class="details-val">{role_display}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Scheduled Date</span>
              <span class="details-val">{scheduled_date}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Assigned Time Slot</span>
              <span class="details-val">{time_slot}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Questions / Turns</span>
              <span class="details-val">{turns_limit} questions</span>
            </div>
            <div class="details-row">
              <span class="details-label">Est. Duration</span>
              <span class="details-val">~{duration_minutes} minutes</span>
            </div>
            <div class="details-row">
              <span class="details-label">Link Valid Until</span>
              <span class="details-val">{expiry_formatted}</span>
            </div>
          </div>

          <div class="guidelines">
            <strong>Important Instructions:</strong>
            <ul style="margin: 6px 0 0 0; padding-left: 18px;">
              <li>Use a working webcam, microphone, and a stable internet connection.</li>
              <li>Please use Google Chrome or Microsoft Edge on a desktop/laptop for the best experience.</li>
              <li>Ensure you are in a quiet, well-lit environment without background noise.</li>
            </ul>
          </div>

          <div class="cta-container">
            <a href="{interview_url}" target="_blank" class="cta-btn">Start AI Interview Now &rarr;</a>
          </div>

          <p style="font-size: 12px; color: #64748b; text-align: center; word-break: break-all;">
            If the button above does not work, copy and paste this link into your browser:<br>
            <a href="{interview_url}" style="color: #0284c7;">{interview_url}</a>
          </p>
        </div>

        <div class="footer">
          &copy; SilkOptima Recruitment Portal. All rights reserved.<br>
          This is an automated invitation. Please do not reply directly to this email.
        </div>
      </div>
    </body>
    </html>
    """

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = from_email
    message["To"] = to_email
    message.set_content(
        f"Dear {candidate_name},\n\nYou have been invited to an AI Interview for {role_display}.\n"
        f"Scheduled Date: {scheduled_date}\nTime Slot: {time_slot}\n"
        f"Link: {interview_url}\nValid until: {expiry_formatted}\n\nBest regards,\nSilkOptima Team"
    )
    message.add_alternative(html_content, subtype="html")

    if smtp_host:
        try:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=12) as smtp:
                if smtp_host.lower().endswith("gmail.com") or smtp_port == 587:
                    smtp.starttls()
                if smtp_username and smtp_password:
                    smtp.login(smtp_username, smtp_password)
                smtp.send_message(message)
            print(f"[AI INTERVIEW EMAIL] Successfully sent invitation to {to_email}")
            return True
        except Exception as exc:
            print(f"[AI INTERVIEW EMAIL] SMTP delivery failed to {to_email}: {exc}")
            return False

    print(f"[AI INTERVIEW EMAIL DEV MODE] To: {to_email} | URL: {interview_url}")
    return True
