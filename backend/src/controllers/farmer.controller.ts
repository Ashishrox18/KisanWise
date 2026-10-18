import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { dynamoDBService } from '../services/firestore.service';
import { groqService } from '../services/ai/groq.service';
import { geminiService } from '../services/ai/gemini.service';
import { v4 as uuidv4 } from 'uuid';
import { NotificationsController } from './notifications.controller';

export class FarmerController {
  async getDashboard(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;

      // Get farmer's crops
      const crops = await dynamoDBService.query(
        'listings',
        'userId = :userId',
        { ':userId': userId }
      );

      // Get active listings
      const listings = await dynamoDBService.query(
        'procurementRequests',
        'farmerId = :farmerId AND #status = :status',
        { ':farmerId': userId, ':status': 'active' }
      );

      // Calculate stats
      const totalLand = crops.reduce((sum: number, crop: any) => sum + crop.area, 0);
      const expectedYield = crops.reduce((sum: number, crop: any) => sum + crop.expectedYield, 0);
      const expectedRevenue = crops.reduce((sum: number, crop: any) => sum + crop.expectedRevenue, 0);

      res.json({
        stats: {
          totalLand,
          activeCrops: crops.length,
          expectedYield,
          expectedRevenue,
        },
        crops: crops.slice(0, 5),
        recentListings: listings.slice(0, 5),
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  }

  async getCropRecommendations(req: AuthRequest, res: Response) {
    try {
      const { soilType, landSize, location, waterAvailability, budget, season } = req.body;

      let recommendations;
      if (geminiService.isEnabled()) {
        console.log('🤖 Using Gemini AI for crop recommendations');
        recommendations = await geminiService.getCropRecommendations({
          soilType,
          landSize: Number(landSize) || 1,
          location: location || 'India',
          waterAvailability,
          budget: Number(budget) || 10000,
          season,
        });
      } else {
        console.log('Using Groq AI fallback for crop recommendations');
        recommendations = await groqService.getCropRecommendations({
          soilType,
          landSize,
          location,
          waterAvailability,
          budget,
          season,
        });
      }

      res.json(recommendations);
    } catch (error) {
      console.error('Crop recommendations error:', error);
      res.status(500).json({ error: 'Failed to generate recommendations' });
    }
  }

  async getCrops(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      console.log('📋 Getting crops for user:', userId);
      
      // Use scan with filter since userId is not the primary key
      const allCrops = await dynamoDBService.scan(
        'listings',
        'userId = :userId',
        { ':userId': userId }
      );

      console.log('✅ Found crops:', allCrops.length);
      if (allCrops.length > 0) {
        console.log('📦 Sample crop data:', JSON.stringify(allCrops[0], null, 2));
      }
      res.json({ crops: allCrops });
    } catch (error) {
      console.error('❌ Get crops error:', error);
      res.status(500).json({ error: 'Failed to fetch crops' });
    }
  }

  async createCrop(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const cropData = {
        id: uuidv4(),
        userId,
        ...req.body,
        createdAt: new Date().toISOString(),
        status: 'planted',
      };

      await dynamoDBService.put('listings', cropData);

      res.status(201).json({ crop: cropData });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create crop' });
    }
  }

  async updateCrop(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const updateData = req.body;

      // Build dynamic update expression
      const updateExpressions: string[] = [];
      const expressionAttributeValues: any = {
        ':updatedAt': new Date().toISOString()
      };
      const expressionAttributeNames: any = {};

      // Add fields to update if they exist in the request
      if (updateData.name !== undefined) {
        updateExpressions.push('#name = :name');
        expressionAttributeValues[':name'] = updateData.name;
        expressionAttributeNames['#name'] = 'name';
      }
      if (updateData.area !== undefined) {
        updateExpressions.push('area = :area');
        expressionAttributeValues[':area'] = updateData.area;
      }
      if (updateData.status !== undefined) {
        updateExpressions.push('#status = :status');
        expressionAttributeValues[':status'] = updateData.status;
        expressionAttributeNames['#status'] = 'status';
      }
      if (updateData.actualYield !== undefined) {
        updateExpressions.push('actualYield = :actualYield');
        expressionAttributeValues[':actualYield'] = updateData.actualYield;
      }
      if (updateData.yieldUnit !== undefined) {
        updateExpressions.push('yieldUnit = :yieldUnit');
        expressionAttributeValues[':yieldUnit'] = updateData.yieldUnit;
      }
      if (updateData.variety !== undefined) {
        updateExpressions.push('variety = :variety');
        expressionAttributeValues[':variety'] = updateData.variety;
      }
      if (updateData.qualityGrade !== undefined) {
        updateExpressions.push('qualityGrade = :qualityGrade');
        expressionAttributeValues[':qualityGrade'] = updateData.qualityGrade;
      }
      if (updateData.harvestDate !== undefined) {
        updateExpressions.push('harvestDate = :harvestDate');
        expressionAttributeValues[':harvestDate'] = updateData.harvestDate;
      }
      if (updateData.storageLocation !== undefined) {
        updateExpressions.push('storageLocation = :storageLocation');
        expressionAttributeValues[':storageLocation'] = updateData.storageLocation;
      }
      if (updateData.notes !== undefined) {
        updateExpressions.push('notes = :notes');
        expressionAttributeValues[':notes'] = updateData.notes;
      }

      // Always update the updatedAt timestamp
      updateExpressions.push('updatedAt = :updatedAt');

      const updateExpression = 'SET ' + updateExpressions.join(', ');

      const updated = await dynamoDBService.update(
        'listings',
        { id, userId },
        updateExpression,
        expressionAttributeValues,
        Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined
      );

      res.json({ crop: updated });
    } catch (error) {
      console.error('Update crop error:', error);
      res.status(500).json({ error: 'Failed to update crop' });
    }
  }

  async deleteCrop(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      console.log(`🗑️ Delete crop request - ID: ${id}, UserID: ${userId}`);

      const result = await dynamoDBService.delete('listings', { id, userId });
      
      console.log(`✅ Crop deleted from database:`, result);

      res.json({ message: 'Crop deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete crop' });
    }
  }

  async getHarvests(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const crops = await dynamoDBService.query(
        'listings',
        'userId = :userId',
        { ':userId': userId }
      );

      // Filter crops ready for harvest or upcoming
      const harvests = crops.map((crop: any) => {
        const plantingDate = new Date(crop.plantingDate);
        const harvestDate = new Date(plantingDate);
        harvestDate.setDate(harvestDate.getDate() + crop.duration);
        
        const daysRemaining = Math.ceil(
          (harvestDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        // Use status from database if it exists, otherwise calculate it
        const status = crop.status || (daysRemaining <= 0 ? 'ready' : daysRemaining <= 30 ? 'upcoming' : 'growing');

        return {
          ...crop,
          harvestDate: harvestDate.toISOString(),
          daysRemaining,
          status,
        };
      });

      res.json({ harvests });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch harvests' });
    }
  }

  async getHarvestTiming(req: AuthRequest, res: Response) {
    try {
      const { cropId } = req.params;
      const userId = req.user!.id;

      const crop = await dynamoDBService.get('listings', {
        id: cropId,
        userId,
      });

      if (!crop) {
        return res.status(404).json({ error: 'Crop not found' });
      }

      // Get weather and market data (mock for now)
      const currentConditions = { temperature: 28, humidity: 65, rainfall: 0 };
      const marketPrices = { current: 22000, trend: 'rising' };

      const recommendation = await groqService.getSellingStrategy({
        cropType: crop.name,
        expectedYield: crop.expectedYield || 100,
        yieldUnit: crop.yieldUnit || 'kg',
        harvestMonth: new Date().toLocaleString('default', { month: 'long' }),
        storageAvailable: false,
      });

      res.json({ recommendation });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate harvest timing' });
    }
  }

  async listForSale(req: AuthRequest, res: Response) {
    try {
      const { cropId } = req.params;
      const userId = req.user!.id;
      const {
        quantity,
        quantityUnit = 'kg',
        minimumPrice,
        pickupLocation,
        description,
        availableFrom,
        availableTill
      } = req.body;

      // Get crop details
      const crop = await dynamoDBService.get('listings', { id: cropId });
      if (!crop) {
        return res.status(404).json({ error: 'Crop not found' });
      }

      const purchaseRequest = {
        id: uuidv4(),
        farmerId: userId,
        cropId,
        cropType: crop.name || 'Unknown Crop',
        variety: crop.variety || '',
        quantity: parseFloat(quantity),
        quantityUnit,
        qualityGrade: 'A', // Default grade
        minimumPrice: parseFloat(minimumPrice),
        expectedPrice: parseFloat(minimumPrice) * 1.1, // 10% higher than minimum
        pickupLocation,
        availableFrom: availableFrom || new Date().toISOString(),
        availableTill,
        description: description || '',
        status: 'released',
        currentBestOffer: 0,
        quotesCount: 0,
        type: 'farmer_listing', // Add type for filtering
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: availableTill || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      await dynamoDBService.put('procurementRequests', purchaseRequest);

      // Send notification to all buyers
      try {
        await NotificationsController.sendNotificationToRole('buyer', {
          title: 'New Produce Listed',
          message: `${quantity} ${quantityUnit} of ${purchaseRequest.cropType} available at ₹${minimumPrice}/${quantityUnit} from ${pickupLocation}`,
          type: 'farmer_listing',
          relatedId: purchaseRequest.id,
          link: `/buyer/procurement`
        });
      } catch (notificationError) {
        console.error('Failed to send notifications:', notificationError);
        // Don't fail the request if notifications fail
      }

      res.status(201).json({ purchaseRequest });
    } catch (error) {
      console.error('List for sale error:', error);
      res.status(500).json({ error: 'Failed to list for sale' });
    }
  }

  async getWeather(req: AuthRequest, res: Response) {
    try {
      const { latitude, longitude, city } = req.query;

      let weatherData;

      if (latitude && longitude) {
        // Use provided coordinates
        const { weatherService } = await import('../services/weather.service');
        weatherData = await weatherService.getWeather(
          parseFloat(latitude as string),
          parseFloat(longitude as string)
        );
      } else if (city) {
        // Use city name
        const { weatherService } = await import('../services/weather.service');
        weatherData = await weatherService.getWeatherByCity(city as string);
      } else {
        // Use default location (New Delhi, India)
        const { weatherService } = await import('../services/weather.service');
        weatherData = await weatherService.getDefaultWeather();
      }

      res.json(weatherData);
    } catch (error) {
      console.error('Weather fetch error:', error);
      
      // Fallback to mock data if API fails
      const fallbackData = {
        current: {
          temperature: 28,
          humidity: 65,
          windSpeed: 12,
          conditions: 'Partly Cloudy',
          weatherCode: 2,
        },
        forecast: [
          { day: 'Mon', temp: 28, rainfall: 0, weatherCode: 0 },
          { day: 'Tue', temp: 30, rainfall: 5, weatherCode: 61 },
          { day: 'Wed', temp: 29, rainfall: 12, weatherCode: 63 },
          { day: 'Thu', temp: 27, rainfall: 8, weatherCode: 61 },
          { day: 'Fri', temp: 28, rainfall: 0, weatherCode: 1 },
          { day: 'Sat', temp: 31, rainfall: 0, weatherCode: 0 },
          { day: 'Sun', temp: 32, rainfall: 0, weatherCode: 0 },
        ],
        location: {
          latitude: 28.6139,
          longitude: 77.2090,
          city: 'Default Location',
        },
      };
      
      res.json(fallbackData);
    }
  }

  async getMarketPrices(req: AuthRequest, res: Response) {
    try {
      const { product, state } = req.query;
      const { marketPriceService } = await import('../services/market-price.service');

      console.log(`📊 Market price request - Product: ${product || 'all'}, State: ${state || 'all'}`);
      console.log(`🔍 Request query params:`, req.query);

      if (product) {
        // Get specific crop price
        console.log(`🌾 Fetching price for specific crop: ${product}`);
        const priceData = await marketPriceService.getAveragePrice(product as string, state as string);
        
        console.log(`✅ Price data received:`, priceData);
        
        // Use lowercase key for consistency
        const cropKey = (product as string).toLowerCase();
        
        const responseData = {
          prices: {
            [cropKey]: {
              current: priceData.average,
              min: priceData.min,
              max: priceData.max,
              trend: priceData.trend,
              change: `${priceData.change > 0 ? '+' : ''}${priceData.change}%`,
              unit: priceData.unit
            }
          }
        };
        
        console.log(`📤 Sending response with key "${cropKey}":`, JSON.stringify(responseData, null, 2));
        return res.status(200).json(responseData);
      } else {
        // Get prices for common crops
        console.log(`🌾 Fetching prices for multiple crops`);
        const crops = ['Wheat', 'Rice', 'Cotton', 'Maize', 'Potato', 'Onion'];
        const pricesPromises = crops.map(crop => 
          marketPriceService.getAveragePrice(crop, state as string)
        );
        
        const pricesData = await Promise.all(pricesPromises);
        
        const prices: any = {};
        crops.forEach((crop, index) => {
          const data = pricesData[index];
          prices[crop.toLowerCase()] = {
            current: data.average,
            min: data.min,
            max: data.max,
            trend: data.trend,
            change: `${data.change > 0 ? '+' : ''}${data.change}%`,
            unit: data.unit
          };
        });

        const responseData = { prices };
        console.log(`📤 Sending response for ${crops.length} crops:`, JSON.stringify(responseData, null, 2));
        return res.status(200).json(responseData);
      }
    } catch (error) {
      console.error('❌ Market prices error:', error);
      return res.status(500).json({ error: 'Failed to fetch market prices' });
    }
  }

  async createPurchaseRequest(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const {
        cropType,
        variety,
        quantity,
        quantityUnit,
        qualityGrade,
        minimumPrice,
        expectedPrice,
        pickupLocation,
        availableFrom,
        availableTill,
        description,
        cropId // Accept cropId from request
      } = req.body;

      const purchaseRequest = {
        id: uuidv4(),
        farmerId: userId,
        cropType,
        variety: variety || '',
        quantity,
        quantityUnit,
        qualityGrade,
        minimumPrice,
        expectedPrice: expectedPrice || minimumPrice,
        pickupLocation,
        availableFrom,
        availableTill: availableTill || '',
        description: description || '',
        cropId: cropId || undefined, // Store cropId if provided
        status: 'released',
        currentBestOffer: 0,
        quotesCount: 0,
        type: 'farmer_listing', // Add type for filtering
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: availableTill || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      await dynamoDBService.put('procurementRequests', purchaseRequest);

      // Send notification to all buyers
      try {
        await NotificationsController.sendNotificationToRole('buyer', {
          title: 'New Produce Listed',
          message: `${quantity} ${quantityUnit} of ${cropType} available at ₹${minimumPrice}/${quantityUnit} from ${pickupLocation}`,
          type: 'farmer_listing',
          relatedId: purchaseRequest.id,
          link: `/buyer/procurement`
        });
      } catch (notificationError) {
        console.error('Failed to send notifications:', notificationError);
        // Don't fail the request if notifications fail
      }

      res.status(201).json({ purchaseRequest });
    } catch (error) {
      console.error('Create purchase request error:', error);
      res.status(500).json({ error: 'Failed to create purchase request' });
    }
  }

  async getPurchaseRequests(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      
      console.log(`🌾 Fetching farmer listings for user: ${userId}`);
      
      // Get all items from orders table
      const allItems = await dynamoDBService.scan('procurementRequests');
      
      console.log(`📦 Total items in orders table: ${allItems.length}`);
      
      // Get accepted/finalized offers for this farmer (these represent sold items)
      const acceptedOffers = allItems.filter((item: any) => 
        item.farmerId === userId && 
        item.type === 'offer' && 
        (item.status === 'accepted' || item.status === 'awarded')
      );

      // Get cancelled offers for this farmer
      const cancelledOffers = allItems.filter((item: any) => 
        item.farmerId === userId && 
        item.type === 'offer' && 
        item.status === 'cancelled'
      );

      // Get the listing IDs that have been sold (to exclude from active listings)
      const soldListingIds = new Set(acceptedOffers.map((offer: any) => offer.listingId));

      // Filter for farmer's own listings (have farmerId matching current user AND type is farmer_listing)
      // Exclude listings that have been sold
      const listings = allItems.filter((item: any) => 
        item.farmerId === userId && 
        item.type === 'farmer_listing' &&
        !soldListingIds.has(item.id) // Exclude sold listings
      );

      console.log(`✅ Found ${listings.length} active farmer listings`);
      console.log(`✅ Found ${acceptedOffers.length} finalized sales (accepted offers)`);
      console.log(`✅ Found ${cancelledOffers.length} cancelled sales`);
      console.log(`🚫 Excluded ${soldListingIds.size} sold listings from active list`);

      // Convert accepted offers to listing format for display
      const finalizedListings = acceptedOffers.map((offer: any) => {
        // Try to find the original listing to get crop details
        const originalListing = allItems.find((item: any) => 
          item.id === offer.listingId && item.type === 'farmer_listing'
        );

        const finalizedListing = {
          id: offer.listingId || offer.id, // Use listingId if available, otherwise offer id
          offerId: offer.id, // IMPORTANT: This is the offer ID needed for deletion
          farmerId: offer.farmerId,
          cropType: originalListing?.cropType || offer.cropType || 'Sold Item',
          variety: originalListing?.variety || offer.variety || '',
          quantity: offer.quantity,
          quantityUnit: offer.quantityUnit,
          qualityGrade: originalListing?.qualityGrade || offer.qualityGrade || 'A',
          minimumPrice: offer.pricePerUnit,
          finalPrice: offer.pricePerUnit,
          currentBestOffer: offer.pricePerUnit,
          pickupLocation: originalListing?.pickupLocation || offer.pickupLocation || 'N/A',
          availableFrom: originalListing?.availableFrom || offer.createdAt,
          description: originalListing?.description || offer.message || '',
          status: 'awarded', // Mark as awarded/finalized
          awardedBuyerName: offer.buyerName,
          awardedAt: offer.acceptedAt || offer.updatedAt,
          quotesCount: 0,
          type: 'farmer_listing',
          createdAt: originalListing?.createdAt || offer.createdAt,
          updatedAt: offer.updatedAt
        };

        console.log(`📦 Finalized listing created:`, { 
          id: finalizedListing.id, 
          offerId: finalizedListing.offerId,
          cropType: finalizedListing.cropType,
          status: finalizedListing.status
        });

        return finalizedListing;
      });

      // Convert cancelled offers to listing format for display
      const cancelledListings = cancelledOffers.map((offer: any) => {
        // Try to find the original listing to get crop details
        const originalListing = allItems.find((item: any) => 
          item.id === offer.listingId && item.type === 'farmer_listing'
        );

        const cancelledListing = {
          id: offer.listingId || offer.id,
          offerId: offer.id,
          farmerId: offer.farmerId,
          cropType: originalListing?.cropType || offer.cropType || 'Cancelled Item',
          variety: originalListing?.variety || offer.variety || '',
          quantity: offer.quantity,
          quantityUnit: offer.quantityUnit,
          qualityGrade: originalListing?.qualityGrade || offer.qualityGrade || 'A',
          minimumPrice: offer.pricePerUnit,
          finalPrice: offer.pricePerUnit,
          currentBestOffer: offer.pricePerUnit,
          pickupLocation: originalListing?.pickupLocation || offer.pickupLocation || 'N/A',
          availableFrom: originalListing?.availableFrom || offer.createdAt,
          description: originalListing?.description || offer.message || '',
          status: 'cancelled',
          awardedBuyerName: offer.buyerName,
          awardedBuyerId: offer.buyerId,
          cancelledBy: offer.cancelledBy,
          cancelledAt: offer.cancelledAt,
          quotesCount: 0,
          type: 'farmer_listing',
          createdAt: originalListing?.createdAt || offer.createdAt,
          updatedAt: offer.updatedAt
        };

        console.log(`📦 Cancelled listing created:`, { 
          id: cancelledListing.id, 
          offerId: cancelledListing.offerId,
          cropType: cancelledListing.cropType,
          status: cancelledListing.status,
          cancelledBy: cancelledListing.cancelledBy
        });

        return cancelledListing;
      });

      // Combine active listings, finalized sales, and cancelled sales
      const allRequests = [...listings, ...finalizedListings, ...cancelledListings];

      console.log(`📋 Total listings (active + finalized + cancelled): ${allRequests.length}`);
      
      res.json({ requests: allRequests });
    } catch (error) {
      console.error('Get purchase requests error:', error);
      res.status(500).json({ error: 'Failed to fetch purchase requests' });
    }
  }

  async getPurchaseRequest(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const request = await dynamoDBService.get('procurementRequests', { id });

      if (!request) {
        return res.status(404).json({ error: 'Purchase request not found' });
      }

      // If it's a farmer's listing (has farmerId), check ownership
      // If it's a buyer's procurement request (has buyerId), allow any farmer to view
      if (request.farmerId && request.farmerId !== req.user!.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      res.json({ request });
    } catch (error) {
      console.error('Get purchase request error:', error);
      res.status(500).json({ error: 'Failed to fetch purchase request' });
    }
  }

  async updatePurchaseRequest(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const request = await dynamoDBService.get('procurementRequests', { id });

      if (!request || request.farmerId !== userId) {
        return res.status(404).json({ error: 'Purchase request not found' });
      }

      const updated = {
        ...request,
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      await dynamoDBService.put('procurementRequests', updated);

      res.json({ request: updated });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update purchase request' });
    }
  }

  async deletePurchaseRequest(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const request = await dynamoDBService.get('procurementRequests', { id });

      if (!request || request.farmerId !== userId) {
        return res.status(404).json({ error: 'Purchase request not found' });
      }

      await dynamoDBService.delete('procurementRequests', { id });

      res.json({ message: 'Purchase request deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete purchase request' });
    }
  }

  async getOffersForListing(req: AuthRequest, res: Response) {
    try {
      const { listingId } = req.params;
      const userId = req.user!.id;

      console.log(`📋 Fetching offers for listing: ${listingId}`);

      // Try to get the listing
      const listing = await dynamoDBService.get('procurementRequests', { id: listingId });
      
      // Get all items to find offers
      const allItems = await dynamoDBService.scan('procurementRequests');
      
      // Get all offers for this listing
      const offers = allItems.filter((item: any) => 
        item.listingId === listingId && item.type === 'offer'
      );

      // Return offers for this listing
      // Sort by price (highest first) and date
      offers.sort((a: any, b: any) => {
        if (b.pricePerUnit !== a.pricePerUnit) {
          return b.pricePerUnit - a.pricePerUnit;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      console.log(`✅ Found ${offers.length} offers for listing ${listingId}`);

      res.json({ offers });
    } catch (error) {
      console.error('Get offers error:', error);
      res.status(500).json({ error: 'Failed to fetch offers' });
    }
  }

  async getBuyerProcurementRequests(req: AuthRequest, res: Response) {
    try {
      // Get all procurement requests from buyers (items with buyerId and status open, released, in_progress, or negotiating)
      const allItems = await dynamoDBService.scan('procurementRequests');
      const requests = allItems.filter((item: any) => 
        item.buyerId && (item.status === 'open' || item.status === 'released' || item.status === 'in_progress' || item.status === 'negotiating')
      );

      // Sort by creation date (newest first)
      requests.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      res.json({ requests });
    } catch (error) {
      console.error('Get buyer procurement requests error:', error);
      res.status(500).json({ error: 'Failed to fetch buyer procurement requests' });
    }
  }

  async getListing(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      console.log(`📋 Fetching listing: ${id} for user: ${userId}`);
      
      let listing = await dynamoDBService.get('procurementRequests', { id });
      
      // If listing direct get returned null, try scanning all items in procurementRequests
      if (!listing) {
        console.log(`⚠️ Listing not found via direct key, scanning collection...`);
        const allItems = await dynamoDBService.scan('procurementRequests');
        
        // 1. Direct id match across all items
        listing = allItems.find((item: any) => item.id === id);

        // 2. If still not found, check if an offer references this listingId or matches id
        if (!listing) {
          const relatedOffer = allItems.find((item: any) => 
            (item.listingId === id || item.id === id) && item.type === 'offer'
          );
          
          if (relatedOffer && relatedOffer.listingId) {
            listing = allItems.find((item: any) => item.id === relatedOffer.listingId);
          }

          // 3. If listing still not found, reconstruct listing from offer
          if (!listing && relatedOffer) {
            console.log(`✅ Reconstructing listing from offer ${relatedOffer.id}`);
            listing = {
              id: relatedOffer.listingId || relatedOffer.id,
              farmerId: relatedOffer.farmerId,
              cropType: relatedOffer.cropType || 'Produce Item',
              variety: relatedOffer.variety || '',
              quantity: relatedOffer.quantity,
              quantityUnit: relatedOffer.quantityUnit,
              qualityGrade: relatedOffer.qualityGrade || 'A',
              minimumPrice: relatedOffer.pricePerUnit,
              finalPrice: relatedOffer.pricePerUnit,
              currentBestOffer: relatedOffer.pricePerUnit,
              pickupLocation: relatedOffer.pickupLocation || 'N/A',
              availableFrom: relatedOffer.createdAt,
              description: relatedOffer.message || '',
              status: relatedOffer.status === 'accepted' ? 'awarded' : (relatedOffer.status || 'in_progress'),
              awardedBuyerName: relatedOffer.buyerName,
              awardedBuyerId: relatedOffer.buyerId,
              awardedAt: relatedOffer.acceptedAt || relatedOffer.updatedAt,
              type: 'farmer_listing',
              createdAt: relatedOffer.createdAt,
              updatedAt: relatedOffer.updatedAt
            };
          }
        }
      }

      if (!listing) {
        console.log(`❌ No listing or related offer found for ID: ${id}`);
        return res.status(404).json({ error: 'Listing not found' });
      }

      res.json({ listing });
    } catch (error) {
      console.error('Get listing error:', error);
      res.status(500).json({ error: 'Failed to fetch listing' });
    }
  }

  async updateListingStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const listing = await dynamoDBService.get('procurementRequests', { id });
      
      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      const updated = {
        ...listing,
        status,
        updatedAt: new Date().toISOString()
      };

      await dynamoDBService.put('procurementRequests', updated);

      res.json({ listing: updated });
    } catch (error) {
      console.error('Update listing status error:', error);
      res.status(500).json({ error: 'Failed to update listing status' });
    }
  }

  async negotiateListing(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const updates = req.body;

      const listing = await dynamoDBService.get('procurementRequests', { id });
      
      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      // Verify ownership
      if (listing.farmerId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Get user details
      const user = await dynamoDBService.get('users', { id: userId });
      const userName = user?.name || 'Farmer';

      // Initialize negotiation history if it doesn't exist
      const negotiationHistory = listing.negotiationHistory || [];
      
      // Add new negotiation entry
      negotiationHistory.push({
        id: uuidv4(),
        user: 'farmer',
        userId: userId,
        userName: userName,
        price: updates.minimumPrice || listing.minimumPrice,
        quantity: updates.quantity || listing.quantity,
        message: updates.negotiationNotes || 'Updated listing terms',
        timestamp: new Date().toISOString(),
        type: 'counter_offer'
      });

      const updated = {
        ...listing,
        ...updates,
        status: 'negotiating',
        negotiationHistory,
        updatedAt: new Date().toISOString()
      };

      await dynamoDBService.put('procurementRequests', updated);

      // Send notification to all buyers who have made offers or shown interest
      try {
        await NotificationsController.sendNotificationToRole('buyer', {
          title: 'Listing Updated',
          message: `${listing.cropType} listing has been updated by farmer. New price: ₹${updates.minimumPrice || listing.minimumPrice}/${listing.quantityUnit}`,
          type: 'farmer_listing',
          relatedId: id,
          link: `/buyer/farmer-listing/${id}`
        });
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Don't fail the request if notifications fail
      }

      res.json({ success: true, listing: updated });
    } catch (error) {
      console.error('Negotiate listing error:', error);
      res.status(500).json({ error: 'Failed to negotiate listing' });
    }
  }
}
