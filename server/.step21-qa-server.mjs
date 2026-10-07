import 'dotenv/config'

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI must be configured for isolated Step 21 QA')
const uri = new URL(process.env.MONGODB_URI)
uri.pathname = '/student_attendance_step21_qa_20261007'
process.env.MONGODB_URI = uri.toString()
process.env.JWT_SECRET = 'step21-isolated-auth-qa-secret'
process.env.CLIENT_URL = 'http://127.0.0.1:5176'
process.env.PORT = '5003'
await import('./src/index.js')
