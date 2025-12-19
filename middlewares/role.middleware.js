import { User } from '../models/user.models.js';

const rolesAdmin = (roles = []) => {
  return async (req, res, next) => {

    //La variable req.userId viene desde auth.middleware, donde a sido creada

    const user = await User.findOne({ _id: req.userId });
    if (!user) return res.status(401).send('Usuario no encontrado');

    // console.log("Roles Verificado:", roles)
    // console.log("Codigo User :", req.userId)
    // console.log("Roles User :", user.role)

    if (!roles.includes(user.role)) {
      console.log("Acceso denegado")
      return res.status(403).send('Acceso denegado');
    }

    console.log("Acceso Aceptado")
    next();
  };
};
export default rolesAdmin