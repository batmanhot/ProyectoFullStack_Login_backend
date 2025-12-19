import mongoose from "mongoose";

// const conectarDB = async () => {
//   try {
//     const db = await mongoose.connect(process.env.MONGO_URL);
//     const url = `${db.connection.host}:${db.connection.port}`;
//     console.log(`MongoDB conectado en: ${url}`);
//   } catch (error) {
//     console.log(`error: ${error.message}`);
//     process.exit(1);
//   }
// };

const conectarDB = async () => {
  try {
    const db = await mongoose.connect(process.env.MONGO_URL)
    const url = `${db.connection.host}:${db.connection.port}`;
    console.log(`MongoDB conectado en: ${url} - ${process.env.MONGO_URL}`);
    console.log('✅ Conectado a MongoDB Atlas');
  } catch (error) {
    console.error('❌ Error de conexión:', error);
  }
}


export default conectarDB;
