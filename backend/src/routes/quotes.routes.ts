import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { QuotesController } from '../controllers/quotes.controller';

const router = Router();
const controller = new QuotesController();

// Submit quote (farmer)
router.post('/', authenticate, controller.submitQuote);

// Get quotes for a request
router.get('/request/:requestId', authenticate, controller.getQuotesForRequest);

// Update quote (farmer)
router.put('/:quoteId', authenticate, controller.updateQuote);

// Accept quote (buyer awards contract)
router.post('/:quoteId/accept', authenticate, controller.acceptQuote);

// Counter offer (buyer)
router.post('/:quoteId/counter', authenticate, controller.counterOffer);

// Accept counter offer (farmer)
router.post('/:quoteId/accept-counter', authenticate, controller.acceptCounterOffer);

export default router;
