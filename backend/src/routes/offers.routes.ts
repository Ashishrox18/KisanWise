import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { OffersController } from '../controllers/offers.controller';

const router = Router();
const controller = new OffersController();

// Submit offer (buyer)
router.post('/', authenticate, controller.submitOffer);

// Get buyer's own offers
router.get('/my-offers', authenticate, controller.getMyOffers);

// Get offers for listing
router.get('/listing/:listingId', authenticate, controller.getOffersForListing);

// Update offer (buyer)
router.put('/:offerId', authenticate, controller.updateOffer);

// Buyer proposes award/purchase (sends to farmer for approval)
router.post('/:offerId/propose-award', authenticate, controller.proposeAward);

// Farmer accepts the award proposal (finalizes deal)
router.post('/:offerId/accept-award', authenticate, controller.acceptAward);

// Buyer confirms the farmer's acceptance (finalizes deal)
router.post('/:offerId/confirm-acceptance', authenticate, controller.confirmAcceptedOffer);

// Counter offer (farmer)
router.post('/:offerId/counter', authenticate, controller.counterOffer);

// Delete offer (for cancelling sales)
router.delete('/:offerId', authenticate, controller.deleteOffer);

export default router;
