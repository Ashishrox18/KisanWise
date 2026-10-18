import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { dynamoDBService } from '../services/firestore.service';
import { geminiService } from '../services/ai/gemini.service';
import { v4 as uuidv4 } from 'uuid';
import { NotificationsController } from './notifications.controller';

export class BuyerController { 
  async getDashboard(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;

      const orders = await dynamoDBService.query(
        'procurementRequests',
        'buyerId = :buyerId',
        { ':buyerId': userId }
      );

      const activeOrders = orders.filter((o: any) => ['pending', 'in_transit'].includes(o.status));
      const thisMonthOrders = orders.filter((o: any) => {
        const orderDate = new Date(o.createdAt);
        const now = new Date();
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      });

      const totalVolume = thisMonthOrders.reduce((sum: number, o: any) => sum + o.quantity, 0);
      const totalValue = thisMonthOrders.reduce((sum: number, o: any) => sum + (o.quantity * o.price), 0);

      res.json({
        stats: {
          activeOrders: activeOrders.length,
          monthlyValue: totalValue,
          totalVolume,
          avgDeliveryTime: 3.2,
        },
        recentOrders: orders.slice(0, 5),
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  }

  async getAvailableProduce(req: AuthRequest, res: Response) {
    try {
      const { product, location, minQuantity, maxPrice } = req.query;

      // Get all items from orders table
      const allItems = await dynamoDBService.scan(
        'procurementRequests'
      );

      console.log(`Total items in database: ${allItems.length}`);
      
      // Log items with farmerId
      const itemsWithFarmerId = allItems.filter((item: any) => item.farmerId);
      console.log(`Items with farmerId: ${itemsWithFarmerId.length}`);
      
      // Log status distribution
      const statusCounts: any = {};
      itemsWithFarmerId.forEach((item: any) => {
        statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
      });
      console.log('Status distribution for farmer items:', statusCounts);

      // Filter for farmer listings (have farmerId and status is open or released)
      let listings = allItems.filter((item: any) => 
        item.farmerId && 
        (item.status === 'open' || item.status === 'released' || item.status === 'in_progress' || item.status === 'negotiating') &&
        item.cropType // Ensure cropType exists
      );

      console.log(`Filtered farmer listings: ${listings.length}`);

      // Apply additional filters
      if (product) {
        listings = listings.filter((l: any) => 
          l.cropType?.toLowerCase().includes((product as string).toLowerCase())
        );
      }
      if (location) {
        listings = listings.filter((l: any) => 
          l.pickupLocation?.toLowerCase().includes((location as string).toLowerCase())
        );
      }
      if (minQuantity) {
        listings = listings.filter((l: any) => l.quantity >= Number(minQuantity));
      }
      if (maxPrice) {
        listings = listings.filter((l: any) => l.minimumPrice <= Number(maxPrice));
      }

      console.log(`Found ${listings.length} farmer listings`);
      res.json({ listings });
    } catch (error) {
      console.error('Get available produce error:', error);
      res.status(500).json({ error: 'Failed to fetch available produce' });
    }
  }

  async createProcurementRequest(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const {
        cropType,
        variety,
        quantity,
        quantityUnit,
        qualityGrade,
        maxPricePerUnit,
        deliveryLocation,
        requiredBy,
        description
      } = req.body;

      const procurementRequest = {
        id: uuidv4(),
        buyerId: userId,
        cropType,
        variety: variety || '',
        quantity,
        quantityUnit,
        qualityGrade,
        maxPricePerUnit,
        deliveryLocation,
        requiredBy,
        description: description || '',
        status: 'released',
        quotesCount: 0,
        currentBestQuote: 0,
        type: 'procurement_request', // Add type for filtering
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: requiredBy
      };

      await dynamoDBService.put('procurementRequests', procurementRequest);

      // Send notification to all farmers
      try {
        await NotificationsController.sendNotificationToRole('farmer', {
          title: 'New Procurement Request',
          message: `New request for ${quantity} ${quantityUnit} of ${cropType} at ₹${maxPricePerUnit}/${quantityUnit}`,
          type: 'procurement_request',
          relatedId: procurementRequest.id,
          link: `/farmer/browse-procurement-requests`
        });
      } catch (notificationError) {
        console.error('Failed to send notifications:', notificationError);
        // Don't fail the request if notifications fail
      }

      res.status(201).json({ procurementRequest });
    } catch (error) {
      console.error('Create procurement request error:', error);
      res.status(500).json({ error: 'Failed to create procurement request' });
    }
  }

  async getMyProcurementRequests(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      
      console.log(`🛒 Fetching procurement requests for buyer: ${userId}`);
      
      // Get all items from orders table
      const allItems = await dynamoDBService.scan('procurementRequests');
      
      console.log(`📦 Total items in orders table: ${allItems.length}`);
      
      // Filter for buyer's own procurement requests (have buyerId matching current user AND type is procurement_request)
      const requests = allItems.filter((item: any) => 
        item.buyerId === userId && item.type === 'procurement_request'
      );

      console.log(`✅ Found ${requests.length} procurement requests for buyer ${userId}`);
      console.log(`📋 Requests:`, requests.map((r: any) => ({ id: r.id, cropType: r.cropType, status: r.status })));
      
      res.json({ requests });
    } catch (error) {
      console.error('Get procurement requests error:', error);
      res.status(500).json({ error: 'Failed to fetch procurement requests' });
    }
  }

  async getProcurementRequest(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const request = await dynamoDBService.get('procurementRequests', { id });

      if (!request) {
        return res.status(404).json({ error: 'Procurement request not found' });
      }

      // Verify this is a buyer's procurement request and belongs to this buyer
      if (!request.buyerId || request.buyerId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      res.json({ request });
    } catch (error) {
      console.error('Get procurement request error:', error);
      res.status(500).json({ error: 'Failed to fetch procurement request' });
    }
  }

  async submitOffer(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const {
        listingId,
        farmerId,
        pricePerUnit,
        quantity,
        quantityUnit,
        message
      } = req.body;

      console.log('📝 Submitting offer:', { listingId, buyerId: userId, pricePerUnit, quantity });

      // Get the listing to verify it exists
      const listing = await dynamoDBService.get('procurementRequests', { id: listingId });
      
      if (!listing) {
        console.error('❌ Listing not found:', listingId);
        return res.status(404).json({ error: 'Listing not found' });
      }

      console.log('📋 Listing status:', listing.status);

      // Allow offers on listings that are open, released, in_progress, or negotiating
      const acceptableStatuses = ['open', 'released', 'in_progress', 'negotiating'];
      if (!acceptableStatuses.includes(listing.status)) {
        console.error('❌ Listing not accepting offers. Status:', listing.status);
        return res.status(400).json({ error: 'This listing is no longer accepting offers' });
      }

      const offer = {
        id: uuidv4(),
        listingId,
        farmerId,
        buyerId: userId,
        buyerName: (req as any).user.name || 'Buyer',
        cropType: listing.cropType, // Store crop details
        variety: listing.variety,
        qualityGrade: listing.qualityGrade,
        pickupLocation: listing.pickupLocation,
        pricePerUnit,
        quantity,
        quantityUnit,
        totalAmount: pricePerUnit * quantity,
        message: message || '',
        status: 'pending',
        type: 'offer', // Add type to distinguish from other records
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Store offer in database
      await dynamoDBService.put('procurementRequests', offer);

      console.log('✅ Offer submitted successfully:', offer.id);

      // Send notification to farmer
      try {
        const { NotificationsController } = await import('./notifications.controller');
        await NotificationsController.createNotification({
          userId: listing.farmerId,
          title: 'New Offer Received',
          message: `${offer.buyerName} offered ₹${pricePerUnit}/${quantityUnit} for your ${listing.cropType}`,
          type: 'offer',
          relatedId: listingId,
          link: `/farmer/listing/${listingId}`
        });
        console.log('✅ Notification sent to farmer:', listing.farmerId);
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Don't fail the request if notifications fail
      }

      // Update listing's quote count and advance status to in_progress
      const currentQuotesCount = listing.quotesCount || 0;
      const currentBestOffer = listing.currentBestOffer || 0;
      const newBestOffer = pricePerUnit > currentBestOffer ? pricePerUnit : currentBestOffer;
      const nextStatus = (listing.status === 'released' || listing.status === 'open' || !listing.status) ? 'in_progress' : listing.status;

      await dynamoDBService.put('procurementRequests', {
        ...listing,
        quotesCount: currentQuotesCount + 1,
        currentBestOffer: newBestOffer,
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });

      res.status(201).json({ offer });
    } catch (error) {
      console.error('Submit offer error:', error);
      res.status(500).json({ error: 'Failed to submit offer' });
    }
  }

  async createOrder(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { listingId, quantity, deliveryAddress, deliveryDate } = req.body;

      const listing = await dynamoDBService.get('procurementRequests', { id: listingId });

      if (!listing || listing.status !== 'active') {
        return res.status(404).json({ error: 'Listing not found or not available' });
      }

      const order = {
        id: uuidv4(),
        buyerId: userId,
        farmerId: listing.farmerId,
        listingId,
        product: listing.product,
        quantity,
        price: listing.price,
        totalAmount: quantity * listing.price,
        deliveryAddress,
        deliveryDate,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await dynamoDBService.put('procurementRequests', order);

      // Send notification to farmer via Firestore
      try {
        await dynamoDBService.put('notifications', {
          id: `notif-${uuidv4()}`,
          userId: listing.farmerId,
          type: 'notification',
          title: 'New Order Received',
          message: `New purchase order #${order.id} received.`,
          orderId: order.id,
          read: false,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Order notification save error:', err);
      }

      res.status(201).json({ order });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create order' });
    }
  }

  async getOrders(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const orders = await dynamoDBService.query(
        'procurementRequests',
        'buyerId = :buyerId',
        { ':buyerId': userId }
      );

      res.json({ orders });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }

  async getOrderDetails(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const order = await dynamoDBService.get('procurementRequests', { id });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      res.json({ order });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch order details' });
    }
  }

  async updateOrderStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const updated = await dynamoDBService.update(
        'procurementRequests',
        { id },
        'SET #status = :status, updatedAt = :updatedAt',
        { ':status': status, ':updatedAt': new Date().toISOString() }
      );

      res.json({ order: updated });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update order status' });
    }
  }

  async getInspections(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      
      // Get buyer's orders that need inspection
      const orders = await dynamoDBService.query(
        'procurementRequests',
        'buyerId = :buyerId',
        { ':buyerId': userId }
      );

      const inspections = orders.filter((o: any) => 
        ['delivered', 'inspection_pending'].includes(o.status)
      );

      res.json({ inspections });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch inspections' });
    }
  }

  async createInspection(req: AuthRequest, res: Response) {
    try {
      const { orderId, parameters } = req.body;

      const inspection = {
        id: uuidv4(),
        orderId,
        parameters,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await dynamoDBService.put('procurementRequests', inspection);

      res.status(201).json({ inspection });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create inspection' });
    }
  }

  async updateInspection(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { parameters, status, score } = req.body;

      const updated = await dynamoDBService.update(
        'procurementRequests',
        { id },
        'SET parameters = :parameters, #status = :status, score = :score, updatedAt = :updatedAt',
        {
          ':parameters': parameters,
          ':status': status,
          ':score': score,
          ':updatedAt': new Date().toISOString(),
        }
      );

      res.json({ inspection: updated });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update inspection' });
    }
  }

  async analyzeQuality(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { imageBase64, mimeType, cropType } = req.body;

      // Analyze with Gemini Multimodal Vision (crop-aware grading)
      const analysis = imageBase64
        ? await geminiService.analyseImageQuality(imageBase64, mimeType || 'image/jpeg', cropType)
        : { ...geminiService.getDefaultQualityAssessment(cropType), note: 'Standard produce inspection' };

      // Update inspection with results
      await dynamoDBService.update(
        'procurementRequests',
        { id },
        'SET analysis = :analysis, #status = :status, updatedAt = :updatedAt',
        {
          ':analysis': analysis,
          ':status': 'analyzed',
          ':updatedAt': new Date().toISOString(),
        },
        { '#status': 'status' }
      );

      res.json({ analysis });
    } catch (error) {
      res.status(500).json({ error: 'Failed to analyze quality' });
    }
  }

  async getMarketInsights(req: AuthRequest, res: Response) {
    try {
      // Mock market insights
      const insights = {
        averagePrice: { rice: 22500, wheat: 25000, cotton: 75000 },
        availableSupply: { rice: 245, wheat: 180, cotton: 95 },
        demandForecast: { rice: 'high', wheat: 'very_high', cotton: 'medium' },
        priceChange: { rice: '+5%', wheat: '+2%', cotton: '+8%' },
      };

      res.json({ insights });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch market insights' });
    }
  }

  async getPriceTrends(req: AuthRequest, res: Response) {
    try {
      const { product } = req.query;

      // Mock historical data
      const historicalPrices = [
        { month: 'Jan', rice: 22000, wheat: 24000 },
        { month: 'Feb', rice: 23000, wheat: 25000 },
        { month: 'Mar', rice: 21500, wheat: 24500 },
        { month: 'Apr', rice: 22500, wheat: 26000 },
        { month: 'May', rice: 24000, wheat: 27000 },
        { month: 'Jun', rice: 23500, wheat: 25500 },
      ];

      res.json({ trends: historicalPrices });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch price trends' });
    }
  }

  async updateProcurementStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user!.id;

      console.log('📝 Updating procurement status:', { id, status, userId });

      const request = await dynamoDBService.get('procurementRequests', { id });
      
      if (!request) {
        console.error('❌ Procurement request not found:', id);
        return res.status(404).json({ error: 'Procurement request not found' });
      }

      // Verify buyer owns this request
      if (request.buyerId !== userId) {
        console.error('❌ Unauthorized: User does not own this request');
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const updated = {
        ...request,
        status,
        updatedAt: new Date().toISOString()
      };

      await dynamoDBService.put('procurementRequests', updated);

      console.log('✅ Procurement status updated successfully');
      res.json({ request: updated });
    } catch (error) {
      console.error('Update procurement status error:', error);
      res.status(500).json({ error: 'Failed to update procurement status' });
    }
  }

  async deleteProcurementRequest(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      console.log('🗑️ Deleting procurement request:', { id, userId });

      const request = await dynamoDBService.get('procurementRequests', { id });
      
      if (!request) {
        console.error('❌ Procurement request not found:', id);
        return res.status(404).json({ error: 'Procurement request not found' });
      }

      // Verify buyer owns this request
      if (request.buyerId !== userId) {
        console.error('❌ Unauthorized: User does not own this request');
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Delete the request
      await dynamoDBService.delete('procurementRequests', { id });

      console.log('✅ Procurement request deleted successfully');
      res.json({ success: true, message: 'Procurement request deleted successfully' });
    } catch (error) {
      console.error('Delete procurement request error:', error);
      res.status(500).json({ error: 'Failed to delete procurement request' });
    }
  }

  async negotiateProcurement(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const updates = req.body;

      const request = await dynamoDBService.get('procurementRequests', { id });
      
      if (!request) {
        return res.status(404).json({ error: 'Procurement request not found' });
      }

      // Verify ownership
      if (request.buyerId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Get user details
      const user = await dynamoDBService.get('users', { id: userId });
      const userName = user?.name || 'Buyer';

      // Initialize negotiation history if it doesn't exist
      const negotiationHistory = request.negotiationHistory || [];
      
      // Add new negotiation entry
      negotiationHistory.push({
        id: uuidv4(),
        user: 'buyer',
        userId: userId,
        userName: userName,
        price: updates.maxPricePerUnit || request.maxPricePerUnit,
        quantity: updates.quantity || request.quantity,
        message: updates.negotiationNotes || 'Updated procurement terms',
        timestamp: new Date().toISOString(),
        type: 'counter_offer'
      });

      const updated = {
        ...request,
        ...updates,
        status: 'negotiating',
        negotiationHistory,
        updatedAt: new Date().toISOString()
      };

      await dynamoDBService.put('procurementRequests', updated);

      // Send notification to all farmers
      try {
        await NotificationsController.sendNotificationToRole('farmer', {
          title: 'Procurement Request Updated',
          message: `${request.cropType} procurement request has been updated by buyer. New max price: ₹${updates.maxPricePerUnit || request.maxPricePerUnit}/${request.quantityUnit}`,
          type: 'procurement_request',
          relatedId: id,
          link: `/farmer/procurement-request/${id}`
        });
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Don't fail the request if notifications fail
      }

      res.json({ success: true, request: updated });
    } catch (error) {
      console.error('Negotiate procurement error:', error);
      res.status(500).json({ error: 'Failed to negotiate procurement' });
    }
  }
}
