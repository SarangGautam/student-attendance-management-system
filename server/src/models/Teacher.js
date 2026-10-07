import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { isValidTeacherEmail, isValidTeacherName } from '../utils/teacherValidation.js'

const teacherSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
      validate: { validator: isValidTeacherName, message: 'Name can contain letters and spaces only.' },
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      validate: { validator: isValidTeacherEmail, message: 'Enter a valid email address.' },
    },
    password: { type: String, required: true, select: false, minlength: 6 },
    role: { type: String, enum: ['teacher'], default: 'teacher' },
    schoolName: { type: String, trim: true, maxlength: 160, default: '' },
    designation: { type: String, trim: true, maxlength: 100, default: '' },
    schoolAddress: { type: String, trim: true, maxlength: 500, default: '' },
    schoolPhone: { type: String, trim: true, maxlength: 40, default: '' },
    reportFooter: { type: String, trim: true, maxlength: 200, default: '' },
    showStudentId: { type: Boolean, default: true },
    showRollNumber: { type: Boolean, default: true },
    showAttendancePercentage: { type: Boolean, default: true },
  },
  { timestamps: true },
)

teacherSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 12)
})

teacherSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password)
}

teacherSchema.set('toJSON', {
  transform(_document, result) {
    delete result.password
    delete result.__v
    return result
  },
})

const Teacher = mongoose.model('Teacher', teacherSchema)
export default Teacher
