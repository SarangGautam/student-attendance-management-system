import mongoose from 'mongoose'

const authSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, immutable: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

const AuthSession = mongoose.model('AuthSession', authSessionSchema)
export default AuthSession
