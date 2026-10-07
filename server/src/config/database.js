import mongoose from 'mongoose'

export const DATABASE_SETUP_MESSAGE = 'MongoDB is not configured. Add MONGODB_URI to server/.env.'

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI?.trim()
  if (!uri) {
    console.warn(`[database] ${DATABASE_SETUP_MESSAGE}`)
    return false
  }

  await mongoose.connect(uri)
  console.log('[database] MongoDB connected')
  return true
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1
}
