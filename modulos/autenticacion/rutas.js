import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar } from '../../servidor/middleware/autenticar.js';
import { frenoIngreso, frenoRecuperacion } from '../../servidor/middleware/frecuencia.js';

export const rutasAutenticacion = Router();

rutasAutenticacion.get('/estado', controlador.estado);
rutasAutenticacion.get('/politica', controlador.politicaClave);
rutasAutenticacion.post('/primer-usuario', frenoIngreso, controlador.primerUsuario);
rutasAutenticacion.post('/ingresar', frenoIngreso, controlador.ingresar);
rutasAutenticacion.post('/verificar-codigo', frenoIngreso, controlador.verificarCodigo);
rutasAutenticacion.post('/codigo-alternativo', frenoIngreso, controlador.codigoAlternativo);

rutasAutenticacion.post('/recuperar', frenoRecuperacion, controlador.recuperar);
rutasAutenticacion.post('/restablecer', frenoRecuperacion, controlador.restablecer);
rutasAutenticacion.post('/cambiar-clave', autenticar, controlador.cambiarClave);
rutasAutenticacion.post('/metodo-2fa', autenticar, controlador.cambiarMetodo2fa);
rutasAutenticacion.post('/salir', autenticar, controlador.salir);
rutasAutenticacion.get('/perfil', autenticar, controlador.perfil);
rutasAutenticacion.get('/dispositivos', autenticar, controlador.dispositivos);
rutasAutenticacion.delete('/dispositivos/:id', autenticar, controlador.olvidarDispositivo);
rutasAutenticacion.put('/perfil', autenticar, controlador.actualizarPerfil);
