export const TEACHER_NAME_ERROR = 'Name can contain letters and spaces only.'
export const EMAIL_ERROR = 'Enter a valid email address.'

const teacherNamePattern = /^[A-Za-z]+(?: [A-Za-z]+)*$/
const emailPattern = /^(?=.{1,254}$)(?=.{1,64}@)[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/

export function normalizeTeacherName(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function isValidTeacherName(value) {
  return typeof value === 'string' && value.length >= 2 && value.length <= 100 && teacherNamePattern.test(value)
}

export function normalizeTeacherEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function isValidTeacherEmail(value) {
  return typeof value === 'string' && emailPattern.test(value)
}
