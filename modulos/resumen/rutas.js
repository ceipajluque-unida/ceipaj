// urls de los contadores del menú (badges)
import { Router } from 'express';
import { autenticar } from '../../servidor/middleware/autenticar.js';
import { contarBadges } from './servicio.js';

export const rutasResumen = Router();

rutasResumen.get('/badges', autenticar, async (req, res) => {
  res.json(await contarBadges(req.usuario.rol));
});
