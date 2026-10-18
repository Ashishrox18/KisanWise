import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const client = new SNSClient({ region: process.env.AWS_REGION });

export class SNSService {
  async sendNotification(message: string, subject: string, phoneNumber?: string) {
    if (phoneNumber) {
      // Send SMS
      const command = new PublishCommand({
        Message: message,
        PhoneNumber: phoneNumber,
      });
      return await client.send(command);
    } else {
      // Publish to topic
      const command = new PublishCommand({
        TopicArn: process.env.SNS_NOTIFICATIONS_TOPIC_ARN,
        Message: message,
        Subject: subject,
      });
      return await client.send(command);
    }
  }

  async sendOTP(phoneNumber: string, otp: string) {
    const message = `Your Krishi Era verification code is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;
    const command = new PublishCommand({
      Message: message,
      PhoneNumber: phoneNumber,
    });
    return await client.send(command);
  }

  async sendHarvestAlert(farmerId: string, cropName: string, message: string, phoneNumber: string) {
    const smsMessage = `Krishi Era Alert: ${cropName} - ${message}`;
    return await this.sendNotification(smsMessage, 'Harvest Alert', phoneNumber);
  }

  async sendPriceAlert(userId: string, product: string, price: number, phoneNumber: string) {
    const smsMessage = `Krishi Era: ${product} price update - ₹${price}/ton`;
    return await this.sendNotification(smsMessage, 'Price Alert', phoneNumber);
  }

  async sendOrderNotification(orderId: string, status: string, phoneNumber: string) {
    const smsMessage = `Order ${orderId} status: ${status}`;
    return await this.sendNotification(smsMessage, 'Order Update', phoneNumber);
  }
}

export const snsService = new SNSService();
