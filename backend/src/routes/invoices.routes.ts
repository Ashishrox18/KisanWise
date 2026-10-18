import { Router } from 'express';
import { InvoicesController } from '../controllers/invoices.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new InvoicesController();

// Get invoices for current user
router.get('/', authenticate, controller.getInvoices);

// Get specific invoice
router.get('/:invoiceId', authenticate, controller.getInvoice);

// Update invoice status (payment, etc.)
router.put('/:invoiceId/status', authenticate, controller.updateInvoiceStatus);

export default router;