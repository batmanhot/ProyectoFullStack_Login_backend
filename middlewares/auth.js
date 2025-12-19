// middlewares/auth.js

// Crea un middleware en el backend para proteger rutas privadas:

import jwt from 'jsonwebtoken'

const auth = (req, res, next) => {
  
  const token = req.headers.authorization?.split(' ')[1];
  //console.log("Token :",token)
  
  if (!token) return res.status(401).send('Token requerido');
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //console.log("Decoded :",decoded)
    req.userId = decoded.id;  // Se crear variable publica en req.userId
    
    next();
  } catch (err) {
    res.status(403).send('Token inválido');
  }
};

export default auth