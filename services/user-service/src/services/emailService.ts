export default class EmailService {
  async sendWelcomeEmail(email: string, fullName: string, data: any) {
    // TODO: integrate real email sending via AWS SES or SMTP
    console.log(`Stub: sending welcome email to ${email}`);
  }
} 