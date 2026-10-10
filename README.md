# CEIPAJ · Sistema de Información Gerencial

Sistema de Información Gerencial con enfoque CRM educativo para el Centro
Educativo Integral para Adultos y Jóvenes (CEIPAJ) de Luque, Paraguay.
Registra a los interesados en inscribirse, acompaña su seguimiento, detecta
cuándo se matriculan y entrega indicadores a la dirección. Complementa al
sistema académico de la institución y se ofrece como servicio a otras
instituciones.

## Tecnologías

- Interfaz: React, Vite y Ant Design.
- Servidor: Node.js y Express (API REST).
- Base de datos: MySQL.
- Seguridad: JWT, bcrypt y verificación en dos pasos.

## Requisitos

- Node.js 22 o más nuevo.
- MySQL. En Windows, XAMPP ya lo incluye.
- Un navegador actualizado.

## Instalación

1. Instalar las dependencias del servidor y de la interfaz:

   ```
   npm install
   npm install --prefix interfaz
   ```

2. Crear el archivo `.env` en la raíz del proyecto a partir de la plantilla:

   ```
   copy configuracion\.env.ejemplo .env
   ```

   Completar `JWT_SECRETO` con un texto propio y aleatorio de 24 caracteres
   como mínimo. Sin ese dato el servidor no arranca. Los valores de la base
   de datos ya corresponden a XAMPP.

3. Iniciar MySQL.

4. Crear la base de datos y sus tablas:

   ```
   npm run migrar
   ```

## Ejecución

En dos terminales distintas:

```
npm run servidor
npm run interfaz
```

El servidor atiende en http://localhost:4000 y la interfaz en
http://localhost:5173.

## Primer uso

1. La primera pantalla crea la cuenta del proveedor del servicio. Hace falta
   una aplicación de autenticación (Google Authenticator o similar) para
   escanear el código QR.
2. Con esa cuenta se revisan los planes y se da de alta la institución con
   su administrador.
3. El administrador cambia su contraseña temporal, contrata el plan y crea
   los usuarios, los aliados y los interesados de su institución.

El correo, los SMS, el captcha y la pasarela de pagos son opcionales y se
configuran desde la pantalla de Configuración.

## Estructura

- `configuracion/`: valores por defecto, permisos y textos legales.
- `servidor/`: arranque, base de datos, sesión y controles de seguridad.
- `modulos/`: un módulo por carpeta, con sus rutas, su controlador y su servicio.
- `comun/`: utilidades compartidas.
- `interfaz/`: el frontend.

## Problemas frecuentes

| Qué ocurre | Causa habitual |
|---|---|
| El servidor no arranca | Falta un `JWT_SECRETO` propio en el `.env` |
| Error de conexión con la base de datos | MySQL no está iniciado |
| La interfaz no carga datos | El servidor no está en ejecución |

## Autoría

Tesis de grado de Sandra Britos, 2026.
