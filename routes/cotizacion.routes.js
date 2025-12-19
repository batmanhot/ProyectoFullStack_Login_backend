import { Router } from 'express';
import { createCotizacion, getCotizaciones, updateCotizacion, deleteCotizacion } from '../controllers/cotizacion.controllers.js';

const router = Router();

router.post('/cotizaciones', createCotizacion);
router.get('/cotizaciones', getCotizaciones);
router.put('/cotizaciones/:id', updateCotizacion);
router.delete('/cotizaciones/:id', deleteCotizacion);

export default router;
