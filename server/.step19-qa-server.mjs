import 'dotenv/config'

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI must be configured for isolated authentication QA')
const uri = new URL(process.env.MONGODB_URI)
uri.pathname = '/student_attendance_step19_qa_20261006'
process.env.MONGODB_URI = uri.toString()
process.env.JWT_SECRET = 'step19-isolated-auth-qa-secret'
process.env.CLIENT_URL = 'http://127.0.0.1:5174'
process.env.PORT = '5001'
await import('./src/index.js')
