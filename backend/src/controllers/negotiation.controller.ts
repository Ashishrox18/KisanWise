import { Request, Response } from 'express';
import { dynamoDBService } from '../services/firestore.service';
import { v4 as uuidv4 } from 'uuid';
import { NotificationsController } from './notifications.controller';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
}

const ORDERS_TABLE = 'procurementRequests';

export class NegotiationController {
  // Start negotiation on a listing (buyer initiates)
  async negotiateListing(req: AuthRequest, res: Response) {
    try {
      const { listingId } = req.params;
      const { pricePerUnit, quantity, message } = req.body;
      const buyerId = req.user!.id;
      const buyerName = req.user!.name;

      // Get the listing
      const listing = await dynamoDBService.get(ORDERS_TABLE, { id: listingId });
      if (!listing || !listing.farmerId) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      // Initialize negotiation history if it doesn't exist
      const negotiationHistory = listing.negotiationHistory || [];
      
      // Add new negotiation entry
      negotiationHistory.push({
        id: uuidv4(),
        user: 'buyer',
        userId: buyerId,
        userName: buyerName,
        price: pricePerUnit,
        quantity: quantity || listing.quantity,
        message: message || '',
        timestamp: new Date().toISOString(),
        type: 'counter_offer'
      });

      // Update listing status and negotiation history
      const updatedListing = {
        ...listing,
        status: 'negotiating',
        negotiationHistory,
        lastNegotiationBy: 'buyer',
        lastNegotiationAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dynamoDBService.put(ORDERS_TABLE, updatedListing);

      // Notify farmer
      try {
        await NotificationsController.createNotification({
          userId: listing.farmerId,
          title: 'New Negotiation Offer',
          message: `${buyerName} offered ₹${pricePerUnit}/${listing.quantityUnit} for your ${listing.cropType}`,
          type: 'offer',
          relatedId: listingId,
          link: `/farmer/listing/${listingId}`
        });
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
      }

      res.json({ success: true, listing: updatedListing });
    } catch (error) {
      console.error('Negotiate listing error:', error);
      res.status(500).json({ error: 'Failed to negotiate listing' });
    }
  }

  // Farmer responds to negotiation
  async respondToListingNegotiation(req: AuthRequest, res: Response) {
    try {
      const { listingId } = req.params;
      const { pricePerUnit, quantity, message, action } = req.body; // action: 'counter' | 'accept' | 'reject'
      const farmerId = req.user!.id;
      const farmerName = req.user!.name;

      // Get the listing
      const listing = await dynamoDBService.get(ORDERS_TABLE, { id: listingId });
      if (!listing || listing.farmerId !== farmerId) {
        return res.status(404).json({ error: 'Listing not found or unauthorized' });
      }

      const negotiationHistory = listing.negotiationHistory || [];

      if (action === 'accept') {
        // Accept the last buyer offer
        const lastBuyerOffer = negotiationHistory.filter((n: any) => n.user === 'buyer').pop();
        if (!lastBuyerOffer) {
          return res.status(400).json({ error: 'No buyer offer to accept' });
        }

        negotiationHistory.push({
          id: uuidv4(),
          user: 'farmer',
          userId: farmerId,
          userName: farmerName,
          price: lastBuyerOffer.price,
          quantity: lastBuyerOffer.quantity,
          message: message || 'Offer accepted',
          timestamp: new Date().toISOString(),
          type: 'accept'
        });

        const updatedListing = {
          ...listing,
          status: 'awarded',
          finalPrice: lastBuyerOffer.price,
          finalQuantity: lastBuyerOffer.quantity,
          awardedToBuyerId: negotiationHistory.find((n: any) => n.user === 'buyer')?.userId,
          negotiationHistory,
          awardedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await dynamoDBService.put(ORDERS_TABLE, updatedListing);

        // Notify buyer of acceptance
        try {
          await NotificationsController.createNotification({
            userId: negotiationHistory.find((n: any) => n.user === 'buyer')?.userId!,
            title: 'Offer Accepted!',
            message: `${farmerName} accepted your offer of ₹${lastBuyerOffer.price}/${listing.quantityUnit}`,
            type: 'award',
            relatedId: listingId,
            link: `/buyer/farmer-listing/${listingId}`
          });
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
        }

        res.json({ success: true, listing: updatedListing, awarded: true });

      } else if (action === 'counter') {
        // Counter offer
        negotiationHistory.push({
          id: uuidv4(),
          user: 'farmer',
          userId: farmerId,
          userName: farmerName,
          price: pricePerUnit,
          quantity: quantity || listing.quantity,
          message: message || '',
          timestamp: new Date().toISOString(),
          type: 'counter_offer'
        });

        const updatedListing = {
          ...listing,
          status: 'negotiating',
          negotiationHistory,
          lastNegotiationBy: 'farmer',
          lastNegotiationAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await dynamoDBService.put(ORDERS_TABLE, updatedListing);

        // Notify buyer of counter offer
        try {
          const lastBuyerUserId = negotiationHistory.filter((n: any) => n.user === 'buyer').pop()?.userId;
          if (lastBuyerUserId) {
            await NotificationsController.createNotification({
              userId: lastBuyerUserId,
              title: 'Counter Offer Received',
              message: `${farmerName} countered with ₹${pricePerUnit}/${listing.quantityUnit}`,
              type: 'offer',
              relatedId: listingId,
              link: `/buyer/farmer-listing/${listingId}`
            });
          }
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
        }

        res.json({ success: true, listing: updatedListing });

      } else if (action === 'reject') {
        // Reject negotiation
        negotiationHistory.push({
          id: uuidv4(),
          user: 'farmer',
          userId: farmerId,
          userName: farmerName,
          price: 0,
          quantity: 0,
          message: message || 'Negotiation rejected',
          timestamp: new Date().toISOString(),
          type: 'reject'
        });

        const updatedListing = {
          ...listing,
          status: 'open', // Back to open status
          negotiationHistory,
          lastNegotiationBy: 'farmer',
          lastNegotiationAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await dynamoDBService.put(ORDERS_TABLE, updatedListing);

        res.json({ success: true, listing: updatedListing, rejected: true });
      }

    } catch (error) {
      console.error('Respond to listing negotiation error:', error);
      res.status(500).json({ error: 'Failed to respond to negotiation' });
    }
  }

  // Start negotiation on procurement request (farmer initiates)
  async negotiateProcurementRequest(req: AuthRequest, res: Response) {
    try {
      const { requestId } = req.params;
      const { pricePerUnit, quantity, message } = req.body;
      const farmerId = req.user!.id;
      const farmerName = req.user!.name;

      // Get the procurement request
      const request = await dynamoDBService.get(ORDERS_TABLE, { id: requestId });
      if (!request || !request.buyerId) {
        return res.status(404).json({ error: 'Procurement request not found' });
      }

      // Initialize negotiation history if it doesn't exist
      const negotiationHistory = request.negotiationHistory || [];
      
      // Add new negotiation entry
      negotiationHistory.push({
        id: uuidv4(),
        user: 'farmer',
        userId: farmerId,
        userName: farmerName,
        price: pricePerUnit,
        quantity: quantity || request.quantity,
        message: message || '',
        timestamp: new Date().toISOString(),
        type: 'quote'
      });

      // Update request status and negotiation history
      const updatedRequest = {
        ...request,
        status: 'negotiating',
        negotiationHistory,
        lastNegotiationBy: 'farmer',
        lastNegotiationAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dynamoDBService.put(ORDERS_TABLE, updatedRequest);

      // Notify buyer
      try {
        await NotificationsController.createNotification({
          userId: request.buyerId,
          title: 'New Quote Received',
          message: `${farmerName} quoted ₹${pricePerUnit}/${request.quantityUnit} for your ${request.cropType} request`,
          type: 'quote',
          relatedId: requestId,
          link: `/buyer/procurement-request/${requestId}`
        });
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
      }

      res.json({ success: true, request: updatedRequest });
    } catch (error) {
      console.error('Negotiate procurement request error:', error);
      res.status(500).json({ error: 'Failed to negotiate procurement request' });
    }
  }

  // Buyer responds to procurement negotiation
  async respondToProcurementNegotiation(req: AuthRequest, res: Response) {
    try {
      const { requestId } = req.params;
      const { pricePerUnit, quantity, message, action } = req.body; // action: 'counter' | 'accept' | 'reject'
      const buyerId = req.user!.id;
      const buyerName = req.user!.name;

      // Get the procurement request
      const request = await dynamoDBService.get(ORDERS_TABLE, { id: requestId });
      if (!request || request.buyerId !== buyerId) {
        return res.status(404).json({ error: 'Procurement request not found or unauthorized' });
      }

      const negotiationHistory = request.negotiationHistory || [];

      if (action === 'accept') {
        // Accept the last farmer quote
        const lastFarmerQuote = negotiationHistory.filter((n: any) => n.user === 'farmer').pop();
        if (!lastFarmerQuote) {
          return res.status(400).json({ error: 'No farmer quote to accept' });
        }

        negotiationHistory.push({
          id: uuidv4(),
          user: 'buyer',
          userId: buyerId,
          userName: buyerName,
          price: lastFarmerQuote.price,
          quantity: lastFarmerQuote.quantity,
          message: message || 'Quote accepted',
          timestamp: new Date().toISOString(),
          type: 'accept'
        });

        const updatedRequest = {
          ...request,
          status: 'awarded',
          finalPrice: lastFarmerQuote.price,
          finalQuantity: lastFarmerQuote.quantity,
          awardedToFarmerId: lastFarmerQuote.userId,
          negotiationHistory,
          awardedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await dynamoDBService.put(ORDERS_TABLE, updatedRequest);

        // Notify farmer of acceptance
        try {
          await NotificationsController.createNotification({
            userId: lastFarmerQuote.userId,
            title: 'Quote Accepted!',
            message: `${buyerName} accepted your quote of ₹${lastFarmerQuote.price}/${request.quantityUnit}`,
            type: 'award',
            relatedId: requestId,
            link: `/farmer/procurement-request/${requestId}`
          });
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
        }

        res.json({ success: true, request: updatedRequest, awarded: true });

      } else if (action === 'counter') {
        // Counter offer
        negotiationHistory.push({
          id: uuidv4(),
          user: 'buyer',
          userId: buyerId,
          userName: buyerName,
          price: pricePerUnit,
          quantity: quantity || request.quantity,
          message: message || '',
          timestamp: new Date().toISOString(),
          type: 'counter_offer'
        });

        const updatedRequest = {
          ...request,
          status: 'negotiating',
          negotiationHistory,
          lastNegotiationBy: 'buyer',
          lastNegotiationAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await dynamoDBService.put(ORDERS_TABLE, updatedRequest);

        // Notify farmer of counter offer
        try {
          const lastFarmerUserId = negotiationHistory.filter((n: any) => n.user === 'farmer').pop()?.userId;
          if (lastFarmerUserId) {
            await NotificationsController.createNotification({
              userId: lastFarmerUserId,
              title: 'Counter Offer Received',
              message: `${buyerName} countered with ₹${pricePerUnit}/${request.quantityUnit}`,
              type: 'quote',
              relatedId: requestId,
              link: `/farmer/procurement-request/${requestId}`
            });
          }
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
        }

        res.json({ success: true, request: updatedRequest });

      } else if (action === 'reject') {
        // Reject negotiation
        negotiationHistory.push({
          id: uuidv4(),
          user: 'buyer',
          userId: buyerId,
          userName: buyerName,
          price: 0,
          quantity: 0,
          message: message || 'Quote rejected',
          timestamp: new Date().toISOString(),
          type: 'reject'
        });

        const updatedRequest = {
          ...request,
          status: 'open', // Back to open status
          negotiationHistory,
          lastNegotiationBy: 'buyer',
          lastNegotiationAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await dynamoDBService.put(ORDERS_TABLE, updatedRequest);

        res.json({ success: true, request: updatedRequest, rejected: true });
      }

    } catch (error) {
      console.error('Respond to procurement negotiation error:', error);
      res.status(500).json({ error: 'Failed to respond to negotiation' });
    }
  }

  // Get negotiation history for a listing or request
  async getNegotiationHistory(req: AuthRequest, res: Response) {
    try {
      const { id, listingId } = req.params;
      const itemId = id || listingId;
      const { type } = req.query; // 'listing' or 'procurement'

      const item = await dynamoDBService.get('procurementRequests', { id: itemId });
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Check authorization
      const userId = req.user!.id;
      const hasAccess = item.farmerId === userId || item.buyerId === userId;
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      res.json({ 
        success: true, 
        negotiationHistory: item.negotiationHistory || [],
        status: item.status,
        lastNegotiationBy: item.lastNegotiationBy,
        lastNegotiationAt: item.lastNegotiationAt
      });
    } catch (error) {
      console.error('Get negotiation history error:', error);
      res.status(500).json({ error: 'Failed to get negotiation history' });
    }
  }
}