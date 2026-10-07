const symbols = { present: 'P', absent: 'A', holiday: 'H', notMarked: '—' }

function safeFilenamePart(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '') || 'Unknown'
}

function monthLabel(month, year) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function percentageValue(value) {
  return value == null ? '—' : value / 100
}

function applyPercentageFormat(sheet, addresses) {
  for (const address of addresses) {
    if (sheet[address] && typeof sheet[address].v === 'number') sheet[address].z = '0.00%'
  }
}

export async function createMonthlyWorkbook(report, generatedAt = new Date(), settings = {}) {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()
  const { section, period, students, holidays, summary } = report
  const periodLabel = monthLabel(period.month, period.year)
  const generatedDate = generatedAt.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const dailyHeaders = Array.from({ length: period.daysInMonth }, (_, index) => index + 1)
  const showRollNumber = settings.showRollNumber !== false
  const showStudentId = settings.showStudentId !== false
  const showPercentage = settings.showAttendancePercentage !== false
  const identityHeaders = [...(showRollNumber ? ['Roll No.'] : []), ...(showStudentId ? ['Student ID'] : []), 'Student Name']
  const headers = [...identityHeaders, ...dailyHeaders, 'Present', 'Absent', 'Holiday', 'Not Marked', 'Working Days', ...(showPercentage ? ['Attendance %'] : [])]
  const firstTableRow = settings.schoolName ? 12 : 11 // zero based; header follows the report summary
  const attendanceRows = [
    ['STUDENT ATTENDANCE REPORT'],
    ...(settings.schoolName ? [[settings.schoolName]] : []),
    [],
    ['Class', section.className, 'Section', section.name],
    ['Month', periodLabel, 'Generated', generatedDate],
    [],
    ['REPORT SUMMARY'],
    ['Total Students', summary.totalStudents, 'Working Days', summary.workingDays],
    ['Holidays', summary.holidays, 'Attendance Records', summary.attendanceRecords],
    ['Average Attendance', percentageValue(summary.averageAttendance), 'Not Marked', summary.notMarkedDays],
    [],
    [],
    headers,
  ]
  const percentageCells = []
  for (const student of students) {
    const values = [
      ...(showRollNumber ? [student.rollNumber] : []),
      ...(showStudentId ? [student.studentCode || ''] : []),
      student.name,
      ...dailyHeaders.map((day) => symbols[student.attendance[`${period.year}-${String(period.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`] || 'notMarked']),
      student.summary.present,
      student.summary.absent,
      student.summary.holiday,
      student.summary.notMarked,
      student.summary.workingDays,
      ...(showPercentage ? [percentageValue(student.summary.attendancePercentage)] : []),
    ]
    attendanceRows.push(values)
    percentageCells.push(XLSX.utils.encode_cell({ r: attendanceRows.length - 1, c: headers.length - 1 }))
  }

  const attendanceSheet = XLSX.utils.aoa_to_sheet(attendanceRows)
  const lastColumn = XLSX.utils.encode_col(headers.length - 1)
  attendanceSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
    { s: { r: settings.schoolName ? 6 : 5, c: 0 }, e: { r: settings.schoolName ? 6 : 5, c: 3 } },
  ]
  attendanceSheet['!cols'] = [
    ...(showRollNumber ? [{ wch: 11 }] : []),
    ...(showStudentId ? [{ wch: 17 }] : []),
    { wch: 30 },
    ...dailyHeaders.map(() => ({ wch: 5 })),
    { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 13 }, { wch: 13 }, ...(showPercentage ? [{ wch: 16 }] : []),
  ]
  const lastAttendanceRow = Math.max(firstTableRow, attendanceRows.length - 1)
  attendanceSheet['!autofilter'] = { ref: `A${firstTableRow + 1}:${lastColumn}${lastAttendanceRow + 1}` }
  const averageRow = settings.schoolName ? 9 : 8
  const averageAddress = XLSX.utils.encode_cell({ r: averageRow, c: 1 })
  percentageCells.push(averageAddress)
  applyPercentageFormat(attendanceSheet, percentageCells)
  XLSX.utils.book_append_sheet(workbook, attendanceSheet, 'Attendance')

  const summaryRows = [[
    'Student Name', ...(showRollNumber ? ['Roll Number'] : []), 'Present', 'Absent', 'Holiday', 'Not Marked', 'Working Days', ...(showPercentage ? ['Attendance %'] : []),
  ], ...students.map((student) => [
    student.name,
    ...(showRollNumber ? [student.rollNumber] : []),
    student.summary.present,
    student.summary.absent,
    student.summary.holiday,
    student.summary.notMarked,
    student.summary.workingDays,
    ...(showPercentage ? [percentageValue(student.summary.attendancePercentage)] : []),
  ])]
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows)
  summarySheet['!cols'] = [{ wch: 30 }, ...(showRollNumber ? [{ wch: 14 }] : []), { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 14 }, { wch: 14 }, ...(showPercentage ? [{ wch: 16 }] : [])]
  summarySheet['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(summaryRows[0].length - 1)}${Math.max(1, summaryRows.length)}` }
  if (showPercentage) applyPercentageFormat(summarySheet, students.map((_, index) => `${String.fromCharCode(65 + summaryRows[0].length - 1)}${index + 2}`))
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

  const holidayRows = holidays.length
    ? [['Date', 'Holiday Name', 'Type', 'Description'], ...holidays.map((holiday) => {
      const iso = holiday.date.slice(0, 10)
      const [year, month, day] = iso.split('-')
      return [`${day}/${month}/${year}`, holiday.name, holiday.type, holiday.description || '']
    })]
    : [['No holidays recorded.']]
  const holidaySheet = XLSX.utils.aoa_to_sheet(holidayRows)
  holidaySheet['!cols'] = [{ wch: 15 }, { wch: 28 }, { wch: 20 }, { wch: 40 }]
  if (holidays.length) holidaySheet['!autofilter'] = { ref: `A1:D${holidayRows.length}` }
  XLSX.utils.book_append_sheet(workbook, holidaySheet, 'Holidays')

  const filename = `Attendance_${safeFilenamePart(section.className)}_Section_${safeFilenamePart(section.name)}_${safeFilenamePart(monthLabel(period.month, period.year).replace(' ', '_'))}.xlsx`
  return { workbook, filename }
}

export async function downloadMonthlyWorkbook(report, settings = {}) {
  const XLSX = await import('xlsx')
  const { workbook, filename } = await createMonthlyWorkbook(report, new Date(), settings)
  if (settings.reportFooter) {
    const sheet = workbook.Sheets.Attendance
    const range = XLSX.utils.decode_range(sheet['!ref'])
    const row = range.e.r + 2
    XLSX.utils.sheet_add_aoa(sheet, [[settings.reportFooter]], { origin: { r: row, c: 0 } })
  }
  XLSX.writeFile(workbook, filename, { bookType: 'xlsx', compression: true, cellStyles: true })
  return filename
}
