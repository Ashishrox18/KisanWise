import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { BuyerController } from '../controllers/buyer.controller';

const router = Router();
const controller = new BuyerController();

// Dashboard
router.get('/dashboard', authenticate, controller.getDashboard);

// Procurement
router.get('/available-produce', authenticate, controller.getAvailableProduce);
router.post('/procurement-requests', authenticate, controller.createProcurementRequest);
router.get('/procurement-requests', authenticate, controller.getMyProcurementRequests);
router.get('/procurement-requests/:id', authenticate, controller.getProcurementRequest);
router.post('/offers', authenticate, controller.submitOffer);
router.post('/orders', authenticate, controller.createOrder);
router.get('/orders', authenticate, controller.getOrders);
router.get('/orders/:id', authenticate, controller.getOrderDetails);
router.put('/orders/:id/status', authenticate, controller.updateOrderStatus);

// Quality Inspection
router.get('/inspections', authenticate, controller.getInspections);
router.post('/inspections', authenticate, controller.createInspection);
router.put('/inspections/:id', authenticate, controller.updateInspection);
router.post('/inspections/:id/analyze', authenticate, controller.analyzeQuality);

// Market Intelligence
router.get('/market-insights', authenticate, controller.getMarketInsights);
router.get('/price-trends', authenticate, controller.getPriceTrends);

// Procurement status and negotiation
router.put('/procurement-requests/:id/status', authenticate, controller.updateProcurementStatus);
router.delete('/procurement-requests/:id', authenticate, controller.deleteProcurementRequest);
router.put('/procurement-requests/:id/negotiate', authenticate, controller.negotiateProcurement);

export default router;
