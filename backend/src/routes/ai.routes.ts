import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth';
import { AIController } from '../controllers/ai.controller';

const router = Router();
const controller = new AIController();

// Existing AI endpoints
router.post('/crop-recommendations',           optionalAuth, (req, res) => controller.getCropRecommendations(req as any, res));
router.post('/harvest-timing',                 authenticate, (req, res) => controller.getHarvestTiming(req as any, res));
router.post('/route-optimization',             authenticate, (req, res) => controller.optimizeRoute(req as any, res));
router.post('/price-analysis',                 authenticate, (req, res) => controller.analyzePrices(req as any, res));
router.post('/quality-assessment',             optionalAuth, (req, res) => controller.assessQuality(req as any, res));
router.post('/selling-strategy',               optionalAuth, (req, res) => controller.getSellingStrategy(req as any, res));

// New Trust Engine + Scenario Mapper endpoints
router.post('/crop-planning-scenarios',        optionalAuth, (req, res) => controller.getCropPlanningScenarios(req as any, res));
router.post('/resource-allocation-scenarios',  optionalAuth, (req, res) => controller.getResourceAllocationScenarios(req as any, res));

// Audit trail — "Why this answer?"
router.get('/audit/:decisionId',               optionalAuth, (req, res) => controller.getAuditRecord(req as any, res));
router.get('/audit',                           authenticate, (req, res) => controller.getUserAuditRecords(req as any, res));

// General-purpose AI Assistant (farming Q&A chat)
router.post('/assistant',                      optionalAuth, (req, res) => controller.askAssistant(req as any, res));

// News + Disaster insights for dashboard
router.get('/news-insights',                   optionalAuth, (req, res) => controller.getNewsInsights(req as any, res));

// Auto market price for a crop
router.get('/market-price/:crop',              optionalAuth, (req, res) => controller.getMarketPriceForCrop(req as any, res));
router.get('/market-price',                    optionalAuth, (req, res) => controller.getMarketPriceForCrop(req as any, res));

export default router;

