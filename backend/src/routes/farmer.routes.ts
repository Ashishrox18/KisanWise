import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { FarmerController } from '../controllers/farmer.controller';

const router = Router();
const controller = new FarmerController();

// Dashboard
router.get('/dashboard', authenticate, controller.getDashboard);

// Crop Planning
router.post('/crop-recommendations', authenticate, controller.getCropRecommendations);
router.get('/crops', authenticate, controller.getCrops);
router.post('/crops', authenticate, controller.createCrop);
router.put('/crops/:id', authenticate, controller.updateCrop);
router.delete('/crops/:id', authenticate, controller.deleteCrop);

// Harvest Management
router.get('/harvests', authenticate, controller.getHarvests);
router.post('/harvests/:cropId/timing', authenticate, controller.getHarvestTiming);
router.post('/harvests/:cropId/list', authenticate, controller.listForSale);

// Weather
router.get('/weather', authenticate, controller.getWeather);

// Market Prices
router.get('/market-prices', authenticate, controller.getMarketPrices);

// Purchase Requests (List Produce)
router.post('/purchase-requests', authenticate, controller.createPurchaseRequest);
router.get('/purchase-requests', authenticate, controller.getPurchaseRequests);
router.get('/purchase-requests/:id', authenticate, controller.getPurchaseRequest);
router.put('/purchase-requests/:id', authenticate, controller.updatePurchaseRequest);
router.delete('/purchase-requests/:id', authenticate, controller.deletePurchaseRequest);

// Listings (for buyers to view)
router.get('/listings/:id', authenticate, controller.getListing);
router.get('/listings/:listingId/offers', authenticate, controller.getOffersForListing);
router.put('/listings/:id/status', authenticate, controller.updateListingStatus);
router.put('/listings/:id/negotiate', authenticate, controller.negotiateListing);

// Browse Buyer Procurement Requests
router.get('/buyer-procurement-requests', authenticate, controller.getBuyerProcurementRequests);

export default router;
