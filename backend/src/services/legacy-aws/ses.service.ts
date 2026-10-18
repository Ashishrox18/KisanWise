import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

class SESService {
  private client: SESClient | null = null;
  private enabled: boolean = false;
  private fromEmail: string = process.env.SES_FROM_EMAIL || 'noreply@krishiera.com';

  initialize() {
    if (this.client) return;

    const region = process.env.AWS_REGION || 'us-east-1';
    const useSES = process.env.USE_SES === 'true';

    if (!useSES) {
      console.log('⚠️  AWS SES is disabled. Email OTPs will be logged to console only.');
      console.log('💡 To enable email delivery:');
      console.log('   1. Set USE_SES=true in backend/.env');
      console.log('   2. Verify your email in AWS SES Console');
      console.log('   3. See OTP_EMAIL_TROUBLESHOOTING.md for setup guide');
      this.enabled = false;
      return;
    }

    try {
      this.client = new SESClient({ region });
      this.enabled = true;
      console.log('✅ AWS SES service initialized successfully!');
      console.log(`📧 Sending emails from: ${this.fromEmail}`);
    } catch (error) {
      console.error('❌ Failed to initialize AWS SES:', error);
      console.log('💡 Check AWS credentials in backend/.env');
      this.enabled = false;
    }
  }

  async sendOTP(email: string, otp: string): Promise<void> {
    this.initialize();

    const subject = 'Your Krishi Era Verification Code';
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px solid #10b981; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; color: #10b981; letter-spacing: 8px; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌾 Krishi Era AI</h1>
              <p>Agricultural Intelligence Platform</p>
            </div>
            <div class="content">
              <h2>Email Verification</h2>
              <p>Thank you for registering with Krishi Era! Please use the following OTP to verify your email address:</p>
              
              <div class="otp-box">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Your Verification Code</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px;">Valid for 10 minutes</p>
              </div>

              <div class="warning">
                <strong>⚠️ Security Notice:</strong> Never share this code with anyone. Krishi Era will never ask for your OTP via phone or email.
              </div>

              <p>If you didn't request this code, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2026 Krishi Era AI. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textBody = `
Your Krishi Era Verification Code

OTP: ${otp}

This code is valid for 10 minutes.

Never share this code with anyone. Krishi Era will never ask for your OTP via phone or email.

If you didn't request this code, please ignore this email.

© 2026 Krishi Era AI
    `;

    if (!this.enabled || !this.client) {
      // Fallback: Log to console in development
      console.log('\n' + '='.repeat(60));
      console.log('📧 EMAIL OTP (Development Mode - SES Not Configured)');
      console.log('='.repeat(60));
      console.log(`📬 To: ${email}`);
      console.log(`🔢 OTP: ${otp}`);
      console.log(`⏰ Expires in: 10 minutes`);
      console.log('='.repeat(60) + '\n');
      return;
    }

    try {
      const command = new SendEmailCommand({
        Source: this.fromEmail,
        Destination: {
          ToAddresses: [email],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8',
            },
            Text: {
              Data: textBody,
              Charset: 'UTF-8',
            },
          },
        },
      });

      await this.client.send(command);
      console.log(`✅ OTP email sent successfully to ${email}`);
    } catch (error) {
      console.error('❌ Failed to send OTP email via SES:', error);
      // Fallback to console logging
      console.log('\n' + '='.repeat(60));
      console.log('📧 EMAIL OTP (SES Failed - Using Console)');
      console.log('='.repeat(60));
      console.log(`📬 To: ${email}`);
      console.log(`🔢 OTP: ${otp}`);
      console.log(`⏰ Expires in: 10 minutes`);
      console.log('='.repeat(60) + '\n');
    }
  }
}

export const sesService = new SESService();
