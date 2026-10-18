import { Request, Response } from 'express';
import { dynamoDBService } from '../services/firestore.service';
import { v4 as uuidv4 } from 'uuid';
import { NotificationsController } from './notifications.controller';
import { InvoicesController } from './invoices.controller';

// Use the singleton instance and proper table names
const QUOTES_TABLE = 'procurementRequests'; // Using orders table for quotes
const ORDERS_TABLE = 'procurementRequests';

export class QuotesController {
  // Submit a quote for a procurement request
  async submitQuote(req: Request, res: Response) {
    try {
      const { requestId, pricePerUnit, quantity, quantityUnit, message } = req.body;
      const farmerId = (req as any).user.id;

      const quote = {
        id: uuidv4(),
        requestId,
        farmerId,
        farmerName: (req as any).user.name,
        pricePerUnit,
        quantity,
        quantityUnit,
        message,
        status: 'pending',
        negotiationHistory: [],
        type: 'quote', // Add type to distinguish from other records
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dynamoDBService.put(QUOTES_TABLE, quote);

      // Get the procurement request to notify the buyer
      try {
        const request = await dynamoDBService.get(ORDERS_TABLE, { id: requestId });
        if (request && request.buyerId) {
          await NotificationsController.createNotification({
            userId: request.buyerId,
            title: 'New Quote Received',
            message: `${(req as any).user.name} submitted a quote of ₹${pricePerUnit}/${quantityUnit} for your ${request.cropType} request`,
            type: 'quote',
            relatedId: requestId,
            link: `/buyer/procurement-requests/${requestId}`
          });
        }
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Don't fail the request if notifications fail
      }

      res.json({ success: true, quote });
    } catch (error) {
      console.error('Error submitting quote:', error);
      res.status(500).json({ error: 'Failed to submit quote' });
    }
  }

  // Get all quotes for a procurement request
  async getQuotesForRequest(req: Request, res: Response) {
    try {
      const { requestId } = req.params;

      // Scan for quotes with the specific requestId and type
      const quotes = await dynamoDBService.scan(
        QUOTES_TABLE,
        'requestId = :requestId AND #type = :type',
        { ':requestId': requestId, ':type': 'quote' },
        { '#type': 'type' }
      );

      res.json({ success: true, quotes });
    } catch (error) {
      console.error('Error getting quotes:', error);
      res.status(500).json({ error: 'Failed to get quotes' });
    }
  }

  // Update a quote
  async updateQuote(req: Request, res: Response) {
    try {
      const { quoteId } = req.params;
      const { pricePerUnit, quantity, message } = req.body;
      const farmerId = (req as any).user.id;

      const quote = await dynamoDBService.get(QUOTES_TABLE, { id: quoteId });

      if (!quote || quote.farmerId !== farmerId) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      const updatedQuote = {
        ...quote,
        pricePerUnit,
        quantity,
        message,
        updatedAt: new Date().toISOString()
      };

      await dynamoDBService.put(QUOTES_TABLE, updatedQuote);

      res.json({ success: true, quote: updatedQuote });
    } catch (error) {
      console.error('Error updating quote:', error);
      res.status(500).json({ error: 'Failed to update quote' });
    }
  }

  // Buyer accepts a quote (awards the contract)
  async acceptQuote(req: Request, res: Response) {
    try {
      const { quoteId } = req.params;
      const buyerId = (req as any).user.id;

      const quote = await dynamoDBService.get(QUOTES_TABLE, { id: quoteId });

      if (!quote) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      // Get the procurement request to verify buyer ownership
      const request = await dynamoDBService.get(ORDERS_TABLE, { id: quote.requestId });
      if (!request || request.buyerId !== buyerId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Update quote status
      const updatedQuote = {
        ...quote,
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dynamoDBService.put(QUOTES_TABLE, updatedQuote);

      // Update procurement request status
      await dynamoDBService.put(ORDERS_TABLE, {
        ...request,
        status: 'awarded',
        awardedQuoteId: quoteId,
        updatedAt: new Date().toISOString()
      });

      // Generate invoice for the awarded contract
      try {
        const invoice = await InvoicesController.generateInvoiceForAward({
          type: 'procurement',
          relatedId: request.id,
          buyerId: request.buyerId,
          farmerId: quote.farmerId,
          cropType: request.cropType,
          quantity: quote.quantity,
          unit: quote.quantityUnit,
          pricePerUnit: quote.pricePerUnit,
          totalAmount: quote.quantity * quote.pricePerUnit
        });

        // Send notifications about the award and invoice
        await Promise.all([
          NotificationsController.createNotification({
            userId: quote.farmerId,
            title: 'Quote Awarded!',
            message: `Your quote for ${request.cropType} has been awarded. Invoice #${invoice.invoiceNumber} generated.`,
            type: 'award',
            relatedId: request.id,
            link: `/farmer/invoices/${invoice.id}`
          }),
          NotificationsController.createNotification({
            userId: request.buyerId,
            title: 'Contract Awarded',
            message: `Contract awarded to ${quote.farmerName}. Invoice #${invoice.invoiceNumber} created.`,
            type: 'award',
            relatedId: request.id,
            link: `/buyer/invoices/${invoice.id}`
          })
        ]);
      } catch (invoiceError) {
        console.error('Failed to generate invoice or send notifications:', invoiceError);
        // Don't fail the quote acceptance if invoice generation fails
      }

      res.json({ success: true, quote: updatedQuote });
    } catch (error) {
      console.error('Error accepting quote:', error);
      res.status(500).json({ error: 'Failed to accept quote' });
    }
  }

  // Buyer sends counter offer
  async counterOffer(req: Request, res: Response) {
    try {
      const { quoteId } = req.params;
      const { pricePerUnit, message } = req.body;
      const buyerId = (req as any).user.id;

      const quote = await dynamoDBService.get(QUOTES_TABLE, { id: quoteId });

      if (!quote) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      // Get the procurement request to verify buyer ownership
      const request = await dynamoDBService.get(ORDERS_TABLE, { id: quote.requestId });
      if (!request || request.buyerId !== buyerId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Add counter offer to negotiation history
      const negotiationHistory = quote.negotiationHistory || [];
      negotiationHistory.push({
        type: 'counter',
        by: 'buyer',
        price: pricePerUnit,
        message,
        timestamp: new Date().toISOString()
      });

      const updatedQuote = {
        ...quote,
        status: 'countered',
        negotiationHistory,
        updatedAt: new Date().toISOString()
      };

      await dynamoDBService.put(QUOTES_TABLE, updatedQuote);

      // Update procurement request status to negotiating
      await dynamoDBService.put(ORDERS_TABLE, {
        ...request,
        status: 'negotiating',
        updatedAt: new Date().toISOString()
      });

      res.json({ success: true, quote: updatedQuote });
    } catch (error) {
      console.error('Error sending counter offer:', error);
      res.status(500).json({ error: 'Failed to send counter offer' });
    }
  }

  // Farmer accepts buyer's counter offer
  async acceptCounterOffer(req: Request, res: Response) {
    try {
      const { quoteId } = req.params;
      const { pricePerUnit } = req.body;
      const farmerId = (req as any).user.id;

      const quote = await dynamoDBService.get(QUOTES_TABLE, { id: quoteId });

      if (!quote || quote.farmerId !== farmerId) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      // Update quote with accepted counter offer price
      const updatedQuote = {
        ...quote,
        pricePerUnit,
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dynamoDBService.put(QUOTES_TABLE, updatedQuote);

      // Update procurement request status to awarded
      const request = await dynamoDBService.get(ORDERS_TABLE, { id: quote.requestId });
      if (request) {
        await dynamoDBService.put(ORDERS_TABLE, {
          ...request,
          status: 'awarded',
          awardedQuoteId: quoteId,
          updatedAt: new Date().toISOString()
        });
      }

      res.json({ success: true, quote: updatedQuote });
    } catch (error) {
      console.error('Error accepting counter offer:', error);
      res.status(500).json({ error: 'Failed to accept counter offer' });
    }
  }
}
