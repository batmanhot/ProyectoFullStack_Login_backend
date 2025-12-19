import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

console.log("Cargando mi modelo USER en MONGODB - MONGOOSE")

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  passwordvalor: { type: String, required: false },
  nombres: { type: String, required: true },
  apellidos: { type: String, required: true },
  telefono: { type: Number, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  isOnline: { type: Boolean, default: false },
  lastLogin: { type: Date },

  active: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationExpires: { type: Date },
  verifiedAt: { type: Date },
  reset: { type: Boolean, default: false },
  resetToken: { type: String },
  resetTokenExpires: { type: Date },
  resetAt: { type: Date }


},
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  console.log("Grabando mi modelo USER en MONGODB - MONGOOSE", this.email)

  // Si la contraseña no se ha modificado, no la vuelvas a hashear
  if (!this.isModified('password')) return next();

  try {
    this.password = await bcrypt.hash(this.password, 10);
    console.log('Password hasheado exitosamente');
    next();
  } catch (error) {
    next(error);
  }
});

export const User = mongoose.model('User', userSchema);


// Modelo para roles
const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  permissions: [{ type: String }]
}, { timestamps: true });

export const Role = mongoose.model("Roles", roleSchema);

// Modelo para auditoria
const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true }, // LOGIN, ROLE_CHANGE, STATUS_UPDATE
  details: { type: String },
  ip: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export const AuditLog = mongoose.model("AuditoriaLog", auditLogSchema);

//export default User