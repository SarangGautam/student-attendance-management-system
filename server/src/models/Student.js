import mongoose from 'mongoose'

const studentSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', default: null, index: true },
  studentId: { type: String, trim: true, maxlength: 80, default: undefined },
  rollNumber: { type: String, required: true, trim: true, maxlength: 40 },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  parentName: { type: String, trim: true, maxlength: 120, default: '' },
  parentContact: { type: String, trim: true, maxlength: 40, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
}, { timestamps: true })

studentSchema.index({ teacherId: 1, sectionId: 1, rollNumber: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } })
studentSchema.index({ teacherId: 1, studentId: 1 }, { unique: true, partialFilterExpression: { studentId: { $type: 'string' } }, collation: { locale: 'en', strength: 2 } })
studentSchema.index({ teacherId: 1, classId: 1, sectionId: 1, status: 1 })
studentSchema.index({ teacherId: 1, status: 1, createdAt: -1 })
studentSchema.index({ teacherId: 1, name: 1 })

export default mongoose.model('Student', studentSchema)
