import mongoose from 'mongoose'

const draftRecordSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  status: { type: String, enum: ['present', 'absent', ''], default: '' },
}, { _id: false })

const attendanceDraftSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  date: { type: Date, required: true },
  records: { type: [draftRecordSchema], default: [] },
  updatedByName: { type: String, default: '' },
}, { timestamps: true })

attendanceDraftSchema.index({ teacherId: 1, sectionId: 1, date: 1 }, { unique: true })
export default mongoose.model('AttendanceDraft', attendanceDraftSchema)
