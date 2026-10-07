import mongoose from 'mongoose'

const holidaySchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  date: { type: Date, required: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  type: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 500, default: '' },
}, { timestamps: true })

holidaySchema.index({ teacherId: 1, date: 1 }, { unique: true })

export default mongoose.model('Holiday', holidaySchema)
