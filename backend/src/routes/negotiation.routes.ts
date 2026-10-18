import { Router } from 'express';
import { NegotiationController } from '../controllers/negotiation.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new NegotiationController();

// Listing negotiation routes
router.post('/listing/:listingId/negotiate', authenticate, controller.negotiateListing);
router.post('/listing/:listingId/respond', authenticate, controller.respondToListingNegotiation);

// Procurement request negotiation routes
router.post('/procurement/:requestId/negotiate', authenticate, controller.negotiateProcurementRequest);
router.post('/procurement/:requestId/respond', authenticate, controller.respondToProcurementNegotiation);

// Get negotiation history
router.get('/history/:id', authenticate, controller.getNegotiationHistory);
router.get('/listing/:listingId/history', authenticate, controller.getNegotiationHistory);

export default router;