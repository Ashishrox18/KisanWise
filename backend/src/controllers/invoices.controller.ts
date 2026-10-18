import { Request, Response } from 'express';
import { dynamoDBService } from '../services/firestore.service';
import { v4 as uuidv4 } from 'uuid';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
}

const INVOICES_TABLE = 'procurementRequests'; // Using orders table for invoices

export class InvoicesController {
  // Get invoices for current user
  async getInvoices(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;

      let filterExpression = '';
      let expressionAttributeValues: any = {};

      // Filter based on user role
      if (userRole === 'buyer') {
        filterExpression = 'buyerId = :userId AND #type = :type';
        expressionAttributeValues = { ':userId': userId, ':type': 'invoice' };
      } else if (userRole === 'farmer') {
        filterExpression = 'farmerId = :userId AND #type = :type';
        expressionAttributeValues = { ':userId': userId, ':type': 'invoice' };
      } else {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const invoices = await dynamoDBService.scan(
        INVOICES_TABLE,
        filterExpression,
        expressionAttributeValues,
        { '#type': 'type' }
      );

      // Sort by creation date (newest first)
      invoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({ invoices });
    } catch (error) {
      console.error('Get invoices error:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  }

  // Get invoice by ID
  async getInvoice(req: AuthRequest, res: Response) {
    try {
      const { invoiceId } = req.params;
      const userId = req.user!.id;

      const invoice = await dynamoDBService.get(INVOICES_TABLE, { id: invoiceId });

      if (!invoice || invoice.type !== 'invoice') {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Check if user has access to this invoice
      const hasAccess = invoice.buyerId === userId || 
                       invoice.farmerId === userId;

      if (!hasAccess) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      res.json({ invoice });
    } catch (error) {
      console.error('Get invoice error:', error);
      res.status(500).json({ error: 'Failed to fetch invoice' });
    }
  }

  // Create invoice (internal method)
  static async createInvoice(data: {
    type: 'procurement' | 'listing' | 'transport' | 'storage';
    relatedId: string;
    buyerId?: string;
    farmerId?: string;
    transporterId?: string;
    storageProviderId?: string;
    items: Array<{
      description: string;
      quantity: number;
      unit: string;
      pricePerUnit: number;
      totalAmount: number;
    }>;
    subtotal: number;
    tax?: number;
    totalAmount: number;
    dueDate: string;
    terms?: string;
  }) {
    try {
      const invoice = {
        id: uuidv4(),
        invoiceNumber: `INV-${Date.now()}`,
        type: 'invoice',
        invoiceType: data.type,
        relatedId: data.relatedId,
        buyerId: data.buyerId,
        farmerId: data.farmerId,
        transporterId: data.transporterId,
        storageProviderId: data.storageProviderId,
        items: data.items,
        subtotal: data.subtotal,
        tax: data.tax || 0,
        totalAmount: data.totalAmount,
        status: 'pending',
        dueDate: data.dueDate,
        terms: data.terms || 'Payment due within 30 days',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dynamoDBService.put(INVOICES_TABLE, invoice);
      return invoice;
    } catch (error) {
      console.error('Create invoice error:', error);
      throw error;
    }
  }

  // Update invoice status
  async updateInvoiceStatus(req: AuthRequest, res: Response) {
    try {
      const { invoiceId } = req.params;
      const { status, paymentDate, paymentMethod, transactionId } = req.body;
      const userId = req.user!.id;

      const invoice = await dynamoDBService.get(INVOICES_TABLE, { id: invoiceId });

      if (!invoice || invoice.type !== 'invoice') {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Check if user has access to update this invoice
      const hasAccess = invoice.buyerId === userId || 
                       invoice.farmerId === userId;

      if (!hasAccess) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const updatedInvoice = {
        ...invoice,
        status,
        ...(paymentDate && { paymentDate }),
        ...(paymentMethod && { paymentMethod }),
        ...(transactionId && { transactionId }),
        updatedAt: new Date().toISOString()
      };

      await dynamoDBService.put(INVOICES_TABLE, updatedInvoice);

      res.json({ invoice: updatedInvoice });
    } catch (error) {
      console.error('Update invoice status error:', error);
      res.status(500).json({ error: 'Failed to update invoice status' });
    }
  }

  // Generate invoice for awarded contract
  static async generateInvoiceForAward(awardData: {
    type: 'procurement' | 'listing';
    relatedId: string;
    buyerId: string;
    farmerId: string;
    cropType: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
    totalAmount: number;
  }) {
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // 30 days from now

      const invoice = await InvoicesController.createInvoice({
        type: awardData.type,
        relatedId: awardData.relatedId,
        buyerId: awardData.buyerId,
        farmerId: awardData.farmerId,
        items: [{
          description: `${awardData.cropType} - ${awardData.quantity} ${awardData.unit}`,
          quantity: awardData.quantity,
          unit: awardData.unit,
          pricePerUnit: awardData.pricePerUnit,
          totalAmount: awardData.totalAmount
        }],
        subtotal: awardData.totalAmount,
        tax: awardData.totalAmount * 0.05, // 5% tax
        totalAmount: awardData.totalAmount * 1.05,
        dueDate: dueDate.toISOString(),
        terms: 'Payment due within 30 days of delivery confirmation'
      });

      return invoice;
    } catch (error) {
      console.error('Generate invoice for award error:', error);
      throw error;
    }
  }

  // Generate invoice for booking
  static async generateInvoiceForBooking(bookingData: {
    type: 'transport' | 'storage';
    relatedId: string;
    buyerId?: string;
    farmerId?: string;
    transporterId?: string;
    storageProviderId?: string;
    description: string;
    amount: number;
  }) {
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // 7 days from now

      const invoice = await InvoicesController.createInvoice({
        type: bookingData.type,
        relatedId: bookingData.relatedId,
        buyerId: bookingData.buyerId,
        farmerId: bookingData.farmerId,
        transporterId: bookingData.transporterId,
        storageProviderId: bookingData.storageProviderId,
        items: [{
          description: bookingData.description,
          quantity: 1,
          unit: 'service',
          pricePerUnit: bookingData.amount,
          totalAmount: bookingData.amount
        }],
        subtotal: bookingData.amount,
        tax: bookingData.amount * 0.18, // 18% GST
        totalAmount: bookingData.amount * 1.18,
        dueDate: dueDate.toISOString(),
        terms: 'Payment due within 7 days of service completion'
      });

      return invoice;
    } catch (error) {
      console.error('Generate invoice for booking error:', error);
      throw error;
    }
  }
}