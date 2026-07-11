import express from 'express';
import { joinWaitlist, getWaitlistCount } from '../controllers/waitlistController.js';
import { waitlistLimiter } from '../middlewares/rateLimiter.js';
import validate from '../middlewares/validate.js';
import { waitlistSchema } from '../schemas/authSchemas.js';

const router = express.Router();

router.post('/', waitlistLimiter, validate(waitlistSchema), joinWaitlist);
router.get('/count', getWaitlistCount);

export default router;
