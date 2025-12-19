import express from 'express'
import authMiddleware from '../middlewares/auth.js';
import roleMiddleware from '../middlewares/role.middleware.js';

import { body } from 'express-validator';

const router = express.Router();

import { login, logout, getUserAll, getAllUsers, createUser, updateUserbyId, deleteUserbyId, getUserById, getDashboard, requestPasswordReset, resetPassword, verifyEmail, getRoles, createRole, updateRole, deleteRole, updatePermissions, getAllAudit, getStats, getUserIdRole, getUserIdStatus, googleLogin }
  from '../controllers/auth.controllers.js'


router.get("/", (req, res) => {
  res.send("Raiz de la web")
})

router.get("/seguridad", (req, res) => {
  res.send("Desde el LOGIN API/SEGURIDAD")
})

router.get('/usuarios', getUserAll)

router.post('/login',
  body('email').isEmail(),
  body('password').notEmpty(),
  login)

router.post('/google-login', googleLogin);

router.post('/logout', authMiddleware, logout);

router.post('/register',
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Contraseña mínima de 6 caracteres'),
  body('telefono').optional().isMobilePhone().withMessage('Número de teléfono inválido'),
  createUser)

router.put('/actualiza/:id', updateUserbyId)
router.delete('/eliminar/:id', deleteUserbyId)
router.get('/usuarios/:id', getUserById)


router.get('/dashboard', authMiddleware, (req, res) => {
  console.log("UserID en dashboard:", req.userId);
  res.send(`Bienvenido usuario ${req.userId}`);
});

router.get('/reporte', authMiddleware, getDashboard)

router.get('/admin', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  res.send(`Bienvenido al panel de administrador, usuario ${req.userId}`);
});

router.post('/request-reset', requestPasswordReset);

router.post('/reset-password/:token',
  body('password').isLength({ min: 6 }),
  resetPassword);

router.get('/verify/:token', verifyEmail);


//const Role = require("../models/Role");


// Obtener todos los roles
router.get("/roles/getall", getRoles);

// Crear nuevo rol

router.post("/roles/create", createRole);

// router.post("/", async (req, res) => {
//   const { name, permissions } = req.body;
//   const role = new Role({ name, permissions });
//   await role.save();
//   res.json(role);
// });

// Actualizar rol

router.patch("/roles/:id", updateRole);

// router.patch("/:id", async (req, res) => {
//   const { name, permissions } = req.body;
//   const role = await Role.findByIdAndUpdate(
//     req.params.id,
//     { name, permissions },
//     { new: true }
//   );
//   res.json(role);
// });

// Eliminar rol
router.delete("/roles/:id", deleteRole);

// router.delete("/:id", async (req, res) => {
//   await Role.findByIdAndDelete(req.params.id);
//   res.json({ message: "Rol eliminado" });
// });


// Actualizar permisos de un rol
router.patch("/roles/:id/permissions", updatePermissions);

// router.patch("/:id/permissions", async (req, res) => {
//   const { permissions } = req.body;
//   const role = await Role.findByIdAndUpdate(
//     req.params.id,  { permissions }, { new: true }
//   );
//   res.json(role);
// });

// Endpoint de métricas
router.get("/roles/admin/stats", getStats);

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




//const User = require("../models/User");
//const AuditLog = require("../models/AuditLog");

// ADMIN
// -----
// Only admin should access these
router.get("/admin/users", authMiddleware, roleMiddleware(['admin']), getAllUsers)

router.patch("/admin/users/:id/role", authMiddleware, roleMiddleware(['admin']), getUserIdRole)

router.patch("/admin/users/:id/status", authMiddleware, roleMiddleware(['admin']), getUserIdStatus)
router.get("/admin/audit", authMiddleware, roleMiddleware(['admin']), getAllAudit)


export default router;

