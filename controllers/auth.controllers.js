import { User, Role, AuditLog } from '../models/user.models.js';
import { sendResetEmail, sendVerificationEmail } from '../utils/mailer.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'
import { validationResult } from 'express-validator';
import { format, addDays } from 'date-fns'
import dotenv from 'dotenv';

dotenv.config();

const login = async (req, res) => {
  console.log("Body :", req.body)

  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Presenta campos con errores en el login 😑', error: errors.array() });

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).send({ message: 'Correo no encontrado !! 😑', error: 'Correo no encontrado' })

    // Valacion de estado Activo
    console.log(`Login attempt: ${user.email}, Role: ${user.role}, Active: ${user.active}`);

    if (!user.active && user.role !== 'admin') {
      return res.status(401).send({ message: 'Usuario inactivo. Contacte al administrador.', error: 'Usuario inactivo' });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) return res.status(401).send({ message: 'Contraseña incorrecta !! 😑', error: 'Contraseña incorrecta' });

    // Actualizar isOnline
    // user.isOnline = true;
    // user.lastLogin = new Date();
    // await user.save();

    // Usamos updateOne para evitar disparar el hook de pre-save que podria re-encriptar la contraseña
    await User.updateOne({ _id: user._id }, { $set: { isOnline: true, lastLogin: new Date() } });

    // Auditoria
    await AuditLog.create({
      userId: user._id,
      action: "LOGIN",
      details: "Usuario inició sesión",
      timestamp: new Date(),
      ip: req.ip
    });

    //const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.TIME_EXPIRE_TOKEN });

    res.status(200).json({
      token, user: {
        id: user._id,
        email: user.email,
        nombres: user.nombres,
        apellidos: user.apellidos,
        role: user.role
      }
    });
  }
  catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const logout = async (req, res) => {
  try {
    if (req.userId) {
      // Usamos updateOne para evitar problemas con el modelo
      await User.updateOne({ _id: req.userId }, { $set: { isOnline: false } });

      await AuditLog.create({
        userId: req.userId,
        action: "LOGOUT",
        details: "Usuario cerró sesión",
        timestamp: new Date(),
        ip: req.ip
      });
    }
    res.status(200).json({ message: 'Sesión cerrada correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// READ - Obtener todas los users 
const getUserAll = async (req, res) => {

  try {
    console.log("Obtener todos los users ...")
    const users = await User.find({}, 'email nombres apellidos telefono');

    if (!users) {
      return res.status(404).json({ message: 'User no encontrado' });
    }
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });

  }
};


// CREATE - CREA UN USER 👍

const createUser = async (req, res) => {

  const errors = validationResult(req);

  const { email, password, nombres, apellidos, telefono } = req.body;

  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) return res.status(400).json({ message: 'Presenta campos con errores en el registro 😑', error: errors.array() });

    const userValida = await User.findOne({ email });

    // Verifica si correo ya existe y si esta activo
    if (userValida) {
      console.log('correo ya existe')

      if (userValida.active) {
        if (!userValida.reset && userValida.resetTokenExpires > Date.now()) {
          //console.log('Esta reiniciando la contraseña del correo  ..')
          console.log('Reset Expires', format(userValida.resetTokenExpires, 'dd/MM/yyyy hh:mm:ss'))
          console.log('Ahora', format(Date.now(), 'dd/MM/yyyy hh:mm:ss'))
          return res.status(400).send({ message: 'El correo esta reiniciando la contraseña y esta dentro del plazo antes de la expiracion', error: 'El correo ya esta registrado' })
        }
        //console.log('El correo ya esta registrado y activo....')
        return res.status(400).send({ message: 'El correo ya esta registrado 😑', error: 'El correo ya esta registrado' })
      }

      if (!userValida.active && userValida.verificationExpires > Date.now()) {
        return res.status(400).send({ message: 'El correo ya esta registrado, aun no esta activo y esta dentro del plazo antes de la expiracion', error: 'El correo ya esta registrado' })
      }

      // Verifica que el correo ya existe y el token de verificacion o reset estan expirados 

      if (!userValida.verified && userValida.verificationExpires < Date.now()) {
        //console.log('Token de Verificacion expirado....', email)
        const validaUserDelete = await userValida.deleteOne({ email: email });
        //console.log('Usuario eliminado con Token expirado...', validaUserDelete.email)
        //return res.status(400).send({ message: 'El correo ya esta registrado y necesita ser eliminado', error: 'Necesita eliminarse' })
      }

      if (!userValida.reset && userValida.resetTokenExpires < Date.now()) {
        //console.log('Token de Reinicio de Password expirado....')
        const userEliminadoReset = await userValida.deleteOne({ email });
        //console.log('Usuario eliminado con Token expirado...')
        //return res.status(400).send({ message: 'El correo de reinicio de contraseña necesita ser eliminado', error: 'Necesita eliminarse' })
      }
    }

    const newUser = new User({
      email,
      password,
      nombres,
      apellidos,
      telefono
    });

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: process.env.TIME_EXPIRE_TOKEN });

    newUser.verificationToken = token;
    newUser.verificationExpires = Date.now() + 15 * 60 * 1000;  // 24 min de Expiracion el enlace
    newUser.passwordvalor = password

    await newUser.save();

    res.status(200).send({ message: 'Usuario creado correctamente', user: newUser, messageValid: 'Verifique su correo y active su cuenta 👌' });

    // Enviando correo de verificacion de usuario
    try {

      await sendResetEmail(email, token, 'crear')

    } catch (err) {
      console.error('Error al enviar el correo de verificación:', err);
      res.status(400).send({ message: 'Presenta errores en el envio de correo 😑', error: 'Presenta errores en el envio de correo' })
    }

  } catch (err) {

    //res.status(400).send('Error al registrar');
    res.status(400).send({ message: 'Presenta errores en el registro 😑', error: 'Presenta errores en el registro' })

  }
};


// ACTUALIZA - ACTUALIZA UN USER 👍

const updateUserbyId = async (req, res) => {

  console.log("Parametros :", req.params.id)
  console.log("Body :", req.body)

  try {

    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User no encontrado' });
    }
    res.status(200).json(user);

  } catch (err) {
    res.status(400).send('Error al actualizar');
  }
};

// DELETE - ELIMINA UN USER 👍
const deleteUserbyId = async (req, res) => {
  console.log("Parametros :", req.params.id)
  console.log("Body :", req.body)

  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User no encontrado' });
    }
    res.status(200).json({ message: 'User eliminado con éxito' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// READ - Obtener una tarea por ID 👍
const getUserById = async (req, res) => {
  console.log("Parametros :", req.params.id)

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User no encontrado' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDashboard = (req, res) => {
  try {
    console.log("Probando mi Reporte en el console log ...")
    res.status(200).send('Probando mi Reporte ... ')
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {

    const user = await User.findOne({ email });

    if (!user) return res.status(404).send('Usuario no encontrado');
    if (!user.active) return res.status(405).send('Para realizar esta operacion el usuario debe estar activo');

    // return res.status(401).send({ message:'Token no existe.... 😑',error: 'Token no existe'})|

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.TIME_EXPIRE_TOKEN });

    user.resetToken = token;
    user.resetTokenExpires = Date.now() + 15 * 60 * 1000;   //15 minutos de tiempo para activarlos

    //console.log("Token de restablecimiento generado:", token);
    await user.save();

    // console.log("RequestPaswordReset Backend")
    // console.log("email",email)
    // console.log("token",token)


    await sendResetEmail(email, token, 'reset').catch(console.error);

    res.status(200).send({ message: 'Correo de recuperación enviado', 'user': user, messageValid: 'Se envio el link para restablecer contraseña a tu correo' });

  } catch (error) {
    console.error("Error al solicitar el restablecimiento de contraseña:", error);
    res.status(500).send('Error al solicitar el restablecimiento de contraseña');
  }
};

export const resetPassword = async (req, res) => {
  const { password } = req.body;
  const { token } = req.params;

  const newPassword = password;

  try {
    // console.log("Reset Password Backend")
    // console.log("Password ..",password)
    // console.log("Token .....",token)

    const user = await User.findOne({ resetToken: token })

    if (!user) {
      console.log('Token no existe....')
      // return res.status(401).send({ message:'Token no existe.... 😑',error: 'Token no existe'});
      return res.status(401).send({ message: 'Enlace de verificacion NO existe 😢', errores: true });
    }

    if (user.resetTokenExpires < Date.now()) {
      console.log('Token expirado....')
      //  console.log('Dia y Hora Actual', format(Date.now(), 'dd/MM/yyyy hh:mm:ss'))
      //  console.log('Expiracion', format(user.resetTokenExpires, 'dd/MM/yyyy hh:mm:ss'))
      //  return res.status(402).send({ message:'Token expirado ....😢', error: 'Token expirado'});
      return res.status(402).send({ message: 'Enlace de verificacion ya expirado 😢', errores: true });
    }

    user.password = newPassword;
    user.reset = true;
    user.resetAt = Date.now();

    //user.resetToken = undefined;
    //user.resetTokenExpires = undefined;

    await user.save();

    const userdataEnviar = { email: user.email, nombres: user.nombres, apellidos: user.apellidos }

    //res.status(200).send('Contraseña actualizada correctamente');
    res.status(200).send({ message: 'Contraseña actualizada correctamente', user: userdataEnviar, messageValid: ' Cuenta activa ya puede iniciar sesion nuevamente 👌' });

  } catch (err) {
    console.log("Error al actualizar contraseña:", err.message);
    res.status(400).send({ message: 'Ha ocurrido un error al actualizar cuenta', error: err });
  }
};

export const verifyEmail = async (req, res) => {
  const { token } = req.params;

  //console.log("Token recibido para verificación :", token);

  try {

    // const userConfirmar = await User.findOneAndUpdate(
    //   { verificationToken: token },
    //   { verified: true, verifiedAt: Date.now(), active: true});

    const userValida = await User.findOne({ verificationToken: token }, { _id: 1, active: 1, verified: 1, verificationExpires: 1, email: 1, nombres: 1, apellidos: 1 });
    //const userValida = await User.findOne({ verificationToken: token });

    console.log(userValida)

    if (!userValida) {
      return res.status(400).send({ message: 'Enlace de verificación de usuario no encontrado 🤔', errores: true });
    }

    if (!userValida.verified) {
      if (userValida.verificationExpires < Date.now()) {
        // console.log('Dia y Hora Actual', format(Date.now(), 'dd/MM/yyyy hh:mm:ss'))
        // console.log('Expiracion', format(userConfirmar.verificationExpires, 'dd/MM/yyyy hh:mm:ss'))
        return res.status(400).send({ message: 'Enlace de verificacion ya expirado 😢', errores: true });
      }

      const userConfirmar = await User.findOneAndUpdate(
        { verificationToken: token },
        { verified: true, verifiedAt: Date.now(), active: true });

      res.status(200).send({ message: 'Cuenta verificada y activada correctamente', user: userValida, messageValid: 'Ya puede iniciar sesion con su cuenta 👌', errores: false });
    } else {

      res.status(200).send({ message: 'Cuenta ya esta activada y verificada anteriormente👌', user: userValida, messageValid: 'Ya puede iniciar sesion con su cuenta 👌', errores: false });
    }

    console.log('Usuario Confirmado ...')

  } catch (err) {
    console.log("Error al guardar o durante la verificación:", err);
    res.status(400).send({ message: 'Ha ocurrido un error al verificar la cuenta', errores: true });
  }
};

// TABLA ROLES ---------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------
export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find();
    res.status(200).json(roles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createRole = async (req, res) => {
  try {
    const { name, permissions } = req.body;
    const role = new Role({ name, permissions });
    await role.save();
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const updateRole = async (req, res) => {
  try {
    const { name, permissions } = req.body;
    const role = await Role.findByIdAndUpdate(req.params.id, { name, permissions }, { new: true });
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// router.patch("/:id", async (req, res) => {
//   const { name, permissions } = req.body;
//   const role = await Role.findByIdAndUpdate(
//     req.params.id,
//     { name, permissions },
//     { new: true }
//   );
//   res.json(role);
// });

export const deleteRole = async (req, res) => {
  try {
    const role = await Role.findByIdAndDelete(req.params.id);
    res.status(200).json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// router.delete("/:id", async (req, res) => {
//   await Role.findByIdAndDelete(req.params.id);
//   res.json({ message: "Rol eliminado" });
// });

export const updatePermissions = async (req, res) => {
  try {
    const { permissions } = req.body;
    const role = await Role.findByIdAndUpdate(req.params.id, { permissions }, { new: true });
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// router.patch("/:id/permissions", async (req, res) => {
//   const { permissions } = req.body;
//   const role = await Role.findByIdAndUpdate(
//     req.params.id,
//     { permissions },
//     { new: true }
//   );
//   res.json(role);
// });


export const getStats = async (req, res) => {
  try {
    const activeUsers = await User.countDocuments({ active: true });
    const onlineUsers = await User.countDocuments({ isOnline: true });

    // Aggregate users by role
    const usersByRoleRaw = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } }
    ]);

    // Convert to a cleaner object: { admin: 2, user: 5 }
    const usersByRole = {};
    usersByRoleRaw.forEach(item => {
      // Handle cases where role might be null or undefined
      const roleName = item._id || 'Sin Rol';
      usersByRole[roleName] = item.count;
    });

    res.json({
      activeUsers,
      onlineUsers,
      usersByRole
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo métricas" });
  }
};


// router.get("/roles/admin/stats", async (req, res) => {
//   try {
//     const activeUsers = await User.countDocuments({ status: "active" });
//     const onlineUsers = await User.countDocuments({ isOnline: true });
//     const rolesCount = await Role.countDocuments();

//     res.json({
//       activeUsers,
//       onlineUsers,
//       rolesCount
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Error obteniendo métricas" });
//   }
// });

// ADMIN ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------------
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo usuarios" });
  }
};


export const getUserIdRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { role: role } },
      { new: true }
    );

    // Registrar auditoría
    try {
      if (req.userId) {
        await AuditLog.create({
          userId: req.userId,
          action: "ROLE_CHANGE",
          details: `Rol cambiado a ${role} para usuario ${user.email}`,
          timestamp: new Date(),
          ip: req.ip
        });
      }
    } catch (e) { console.error("Error audit log", e) }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo usuarios" });
  }
};


export const getUserIdStatus = async (req, res) => {
  try {
    const { active } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { active: active } },
      { new: true }
    );

    // Registrar auditoría
    try {
      if (req.userId) {
        await AuditLog.create({
          userId: req.userId,
          action: "STATUS_CHANGE",
          details: `Estado activo cambiado a ${active} para usuario ${user.email}`,
          timestamp: new Date(),
          ip: req.ip
        });
      }
    } catch (e) { console.error("Error audit log", e) }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo usuarios" });
  }
};


export const getAllAudit = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate("userId", "username email")
      .sort({ timestamp: -1 })
      .limit(50); // últimos 50 registros
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo auditoría" });
  }
};



// router.get("/admin/audit", async (req, res) => {
//   try {
//     const logs = await AuditLog.find()
//       .populate("userId", "username email")
//       .sort({ timestamp: -1 })
//       .limit(50); // últimos 50 registros
//     res.json(logs);
//   } catch (error) {
//     res.status(500).json({ error: "Error obteniendo auditoría" });
//   }
// });

// router.patch("/admin/users/:id/role", async (req, res) => {
//   try {
//     const { role } = req.body;
//     const user = await User.findByIdAndUpdate(
//       req.params.id,
//       { $set: { roles: [role] } },
//       { new: true }
//     );


export { login, logout, getUserAll, createUser, updateUserbyId, deleteUserbyId, getUserById, getDashboard };

export const googleLogin = async (req, res) => {
  const { token } = req.body;
  try {
    const userInfoRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
    const userInfo = await userInfoRes.json();

    if (userInfo.error) return res.status(400).json({ message: "Invalid Token" });

    const { email, given_name, family_name } = userInfo;

    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-8);
      user = new User({
        email,
        nombres: given_name || '',
        apellidos: family_name || '',
        password: randomPassword,
        role: 'user',
        active: true,
        isOnline: true
      });
      await user.save();
    } else {
      if (!user.active && user.role !== 'admin') {
        return res.status(401).send({ message: 'Usuario inactivo.', error: 'Usuario inactivo' });
      }
      await User.updateOne({ _id: user._id }, { $set: { isOnline: true } });
    }

    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.TIME_EXPIRE_TOKEN });

    res.json({
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        nombres: user.nombres
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Google Login Failed" });
  }
}
