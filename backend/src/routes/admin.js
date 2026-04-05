const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/hospitals', authenticate, authorize('super_admin'), upload.single('photo'), ctrl.createHospital);
router.put('/hospitals/:id', authenticate, authorize('super_admin'), upload.single('photo'), ctrl.updateHospital);
router.get('/hospitals', authenticate, authorize('super_admin', 'provider'), ctrl.getHospitals);

router.post('/kiosks', authenticate, authorize('super_admin'), ctrl.createKiosk);
router.put('/kiosks/:id', authenticate, authorize('super_admin'), ctrl.updateKiosk);
router.get('/kiosks', authenticate, authorize('super_admin'), ctrl.getKiosks);

router.post('/staff', authenticate, authorize('super_admin'), ctrl.createStaffAccount);
router.get('/staff', authenticate, authorize('super_admin'), ctrl.getStaffAccounts);

router.get('/stats', authenticate, authorize('super_admin'), ctrl.getDashboardStats);

module.exports = router;
