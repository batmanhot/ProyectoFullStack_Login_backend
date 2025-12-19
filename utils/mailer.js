// utils/mailer.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Servidor SMTP de Gmail (REAL ENVIO)
// const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST,
//     port: process.env.EMAIL_PORT,
//     secure: process.env.EMAIL_SECURE || true,
//     service: 'gmail',
//     auth: {
//         user: process.env.EMAIL_USER, // Reemplaza con tu dirección de Gmail
//         pass: process.env.EMAIL_PASS, // Reemplaza con la Contraseña de Aplicación generada
//     }
// });

const validaConexionEmail =  transporter.verify((error, success) => {
  if (error) {
    console.error('Error de conexión:', error);
  } else {
    console.log('Conexión exitosa:', success);
  }
});


export const sendVerificationEmail = async (to, token) => {
  try {
    const link = `http://localhost:5173/verify/${token}`;
    await transporter.sendMail({
      from: '"Falcon" <no-reply@falcon.com>',
      to,
      subject: 'Verifica tu cuenta',
      html: `<p>Haz clic para activar tu cuenta:</p><a href="${link}">${link}</a>`,
    });
  } catch (error) {
    console.error('Error al enviar el correo de verificación:', error);
  }
};

export const sendResetEmail = async (to, token, name) => {

  const link_recuperacion = `http://localhost:5173/nuevacontrasena/${token}`;
  const link_crear = `http://localhost:5173/verify/${token}`;

  await transporter.sendMail({
    from: '"Falcon" <no-reply@falcon.com>',
    to : to,
    subject: name === 'crear' ? `Bienvenido ${to} a Falcon` : 'Recuperación de Usuario y Contraseña',
    // html: `<div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
    //       <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    //         <h2 style="color: #333333;">🔐 Recuperación de contraseña</h2>
    //         <p style="font-size: 16px; color: #555555;">
    //           Hola <span style="font-weight: bold;">${to}</span>, hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo:
    //         </p>
    //         <a href="${link}" style="display: inline-block; margin-top: 20px; padding: 12px 20px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px;">
    //           Restablecer contraseña
    //         </a>
    //         <p style="font-size: 14px; color: #999999; margin-top: 30px;">
    //           Si no solicitaste este cambio, puedes ignorar este mensaje.
    //         </p>
    //       </div>
    //     </div>`,
    html: `<div style="font-family: 'Segoe UI', sans-serif; background-color: #f0f4f8; padding: 40px;">
            <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
              
              <!-- Encabezado con logo -->
              <div style="background-color: #003366; padding: 20px; text-align: center;">
               <img src="https://i.postimg.cc/JhT4tRSs/Login-PNG-Background.png" alt="Falcon Logo" style="max-width: 100px;">
              </div>

              <!-- Cuerpo del mensaje -->
              <div style="padding: 30px;">
                <h2 style="color: #003366;">🔐 
                ${name === 'crear' ? 'Activacion de usuario y contraseña' : 'Recuperacion de contraseña'}</h2>
                <p style="font-size: 16px; color: #333333;">
                  Hola, <span style="font-weight: bold;">${to}</span>, hemos recibido una solicitud para  ${name === 'crear' ? 'activar tu cuenta' : 'restablecer tu contraseña'}. Haz clic en el botón de abajo para continuar:
                </p>
                <div style="text-align: center; margin: 30px 0;">

                  <a href= ${name === 'crear' ? link_crear : link_recuperacion}
                     style="background-color: #007bff; color: #ffffff; padding: 14px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    ${name === 'crear' ? 'Activacion de usuario y contraseña' : 'Recuperacion de contraseña'}
                  </a>
                </div>
                <p style="font-size: 14px; color: #777777;">
                  Si no solicitaste este cambio, puedes ignorar este mensaje. Tu cuenta está segura.
                </p>
              </div>

              <!-- Pie de página -->
              <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #999999;">
                © 2025 Falcon Inc. Todos los derechos reservados.<br>
                <a href="https://falcon.com" style="color: #007bff; text-decoration: none;">Visita nuestro sitio web</a>
              </div>
            </div>
          </div>
        `,
  });
};