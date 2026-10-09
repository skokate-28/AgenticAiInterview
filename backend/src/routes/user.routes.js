import express from 'express';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Get current user's preferences
router.get('/preferences', auth, async (req, res) => {
  try{
    const user = await User.findById(req.userId).lean();
    if(!user) return res.status(404).json({ error: 'User not found' });
    res.json({ preferences: user.preferences || {} });
  }catch(err){
    console.error('Get preferences error', err);
    res.status(500).json({ error: err.message });
  }
});

// Update current user's preferences
router.post('/preferences', auth, async (req, res) => {
  try{
    const { preferredRoles, preferredType, preferredPay } = req.body;
    const update = {};
    if (preferredRoles !== undefined) update['preferences.preferredRoles'] = Array.isArray(preferredRoles) ? preferredRoles : (typeof preferredRoles === 'string' ? preferredRoles.split(',').map(s=>s.trim()).filter(Boolean) : []);
    if (preferredType) update['preferences.preferredType'] = preferredType;
    if (preferredPay !== undefined) update['preferences.preferredPay'] = Number(preferredPay) || 0;

    const user = await User.findByIdAndUpdate(req.userId, { $set: update }, { new: true }).lean();
    res.json({ preferences: user.preferences || {} });
  }catch(err){
    console.error('Update preferences error', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
