import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDatabase } from '../config/database.js'

function sameKey(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

async function migrateHolidayOwnership() {
  await connectDatabase()
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB is not connected. Configure MONGODB_URI before running this migration.')
  }

  const collection = mongoose.connection.collection('holidays')
  const indexes = await collection.indexes()
  const unownedCount = await collection.countDocuments({
    $or: [{ teacherId: { $exists: false } }, { teacherId: null }],
  })
  const duplicate = await collection.aggregate([
    { $match: { teacherId: { $type: 'objectId' }, date: { $type: 'date' } } },
    { $group: { _id: { teacherId: '$teacherId', date: '$date' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 1 },
  ]).next()
  if (duplicate) {
    throw new Error('Duplicate holidays exist for a teacher and date. Resolve these records before creating the unique index.')
  }

  const compoundName = 'teacherId_1_date_1'
  const compoundIndex = indexes.find((index) => index.name === compoundName)
  if (compoundIndex && (!sameKey(compoundIndex.key, { teacherId: 1, date: 1 }) || compoundIndex.unique !== true)) {
    throw new Error(`Index ${compoundName} exists with unexpected options; no index was changed.`)
  }
  if (!compoundIndex) {
    await collection.createIndex({ teacherId: 1, date: 1 }, { unique: true, name: compoundName })
  }

  const globalDateIndex = indexes.find((index) => index.name === 'date_1')
  if (globalDateIndex) {
    if (!sameKey(globalDateIndex.key, { date: 1 }) || globalDateIndex.unique !== true) {
      throw new Error('Index date_1 exists with unexpected options; the old index was not removed.')
    }
    await collection.dropIndex('date_1')
  }

  console.log(`[migration] Holiday ownership index is ready. ${unownedCount} existing holiday record(s) still lack teacher ownership and were left unchanged.`)
  if (unownedCount > 0) {
    console.warn('[migration] Existing holidays without teacher ownership require manual assignment before they appear in teacher calendars.')
  }
}

try {
  await migrateHolidayOwnership()
} catch (error) {
  console.error(`[migration] ${error.message}`)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
