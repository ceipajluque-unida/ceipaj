// urls del módulo de autenticación
import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar } from '../../servidor/middleware/autenticar.js';
import { frenoIngreso, frenoRecuperacion } from '../../servidor/middleware/frecuencia.js';

export const rutasAutenticacion = Router();

// las rutas sin sesión llevan freno por ip: los de bloqueos.js son por correo y por
// usuario, así que no frenan a quien cambia el correo en cada intento
rutasAutenticacion.get('/estado', controlador.estado);
rutasAutenticacion.get('/politica', controlador.politicaClave);
rutasAutenticacion.post('/primer-usuario', frenoIngreso, controlador.primerUsuario);
rutasAutenticacion.post('/ingresar', frenoIngreso, controlador.ingresar);
rutasAutenticacion.post('/verificar-codigo', frenoIngreso, controlador.verificarCodigo);
rutasAutenticacion.post('/codigo-alternativo', frenoIngreso, controlador.codigoAlternativo); // 2fa por otro medio si no hay acceso a la app
// más angosto: cada llamada manda un correo de verdad y quema la cuota del smtp
rutasAutenticacion.post('/recuperar', frenoRecuperacion, controlador.recuperar); // olvidé mi contraseña
rutasAutenticacion.post('/restablecer', frenoRecuperacion, controlador.restablecer); // nueva contraseña con el token del enlace
rutasAutenticacion.post('/cambiar-clave', autenticar, controlador.cambiarClave);
rutasAutenticacion.post('/metodo-2fa', autenticar, controlador.cambiarMetodo2fa);
rutasAutenticacion.post('/salir', autenticar, controlador.salir); // invalida el token actual
rutasAutenticacion.get('/perfil', autenticar, controlador.perfil);
rutasAutenticacion.get('/dispositivos', autenticar, controlador.dispositivos);
rutasAutenticacion.delete('/dispositivos/:id', autenticar, controlador.olvidarDispositivo);
rutasAutenticacion.put('/perfil', autenticar, controlador.actualizarPerfil); // solo el admin puede editar sus datos
