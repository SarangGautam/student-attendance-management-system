const symbols = { present: 'P', absent: 'A', holiday: 'H', notMarked: '—' }
const totalPagesToken = '{total_pages_count_string}'

function safePart(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '') || 'Unknown'
}

function monthLabel(month, year) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function isoDate(iso) {
  const [year, month, day] = iso.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

function getFilename(report) {
  const section = report.section
  const period = monthLabel(report.period.month, report.period.year).replace(' ', '_')
  return `Attendance_${safePart(section.className)}_Section_${safePart(section.name)}_${safePart(period)}.pdf`
}

function addSummaryCards(doc, report, startY, pageWidth, marginX) {
  const pageInnerWidth = pageWidth - marginX * 2
  const gap = 6
  const cardWidth = (pageInnerWidth - gap * 5) / 6
  const cardHeight = 36
  const metrics = [
    ['Total Students', report.summary.totalStudents],
    ['Working Days', report.summary.workingDays],
    ['Holidays', report.summary.holidays],
    ['Attendance Records', report.summary.attendanceRecords],
    ['Average Attendance', report.summary.averageAttendance == null ? '—' : `${report.summary.averageAttendance}%`],
    ['Not Marked', report.summary.notMarkedDays],
  ]
  metrics.forEach(([label, value], index) => {
    const x = marginX + index * (cardWidth + gap)
    doc.setDrawColor(218, 226, 234)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(x, startY, cardWidth, cardHeight, 4, 4, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(91, 108, 124)
    doc.text(String(label), x + 6, startY + 12, { maxWidth: cardWidth - 12 })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(24, 50, 75)
    doc.text(String(value), x + 6, startY + 27, { maxWidth: cardWidth - 12 })
  })
  return startY + cardHeight
}

function makeDailyRows(report, settings = {}) {
  const { period } = report
  const showRollNumber = settings.showRollNumber !== false
  const showStudentId = settings.showStudentId !== false
  const showPercentage = settings.showAttendancePercentage !== false
  const days = Array.from({ length: period.daysInMonth }, (_, index) => index + 1)
  const identityCount = (showRollNumber ? 1 : 0) + (showStudentId ? 1 : 0) + 1
  const headers = [...(showRollNumber ? ['Roll'] : []), ...(showStudentId ? ['Student ID'] : []), 'Student Name', ...days.map(String), 'P', 'A', 'H', 'NM', 'Working Days', ...(showPercentage ? ['Attendance %'] : [])]
  const body = report.students.map((student) => [
    ...(showRollNumber ? [student.rollNumber] : []),
    ...(showStudentId ? [student.studentCode || '—'] : []),
    student.name,
    ...days.map((day) => {
      const date = `${period.year}-${String(period.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      return symbols[student.attendance[date] || 'notMarked']
    }),
    student.summary.present,
    student.summary.absent,
    student.summary.holiday,
    student.summary.notMarked,
    student.summary.workingDays,
    ...(showPercentage ? [student.summary.attendancePercentage == null ? '—' : `${student.summary.attendancePercentage}%`] : []),
  ])
  return { headers, body, days: days.length, identityCount, showPercentage }
}

function dailyColumnStyles(days, identityCount, showPercentage) {
  const styles = {
    [identityCount - 1]: { minCellWidth: 126, halign: 'left', overflow: 'linebreak' },
  }
  if (identityCount > 1) styles[0] = { cellWidth: 29, halign: 'center' }
  if (identityCount > 2) styles[1] = { cellWidth: 55, halign: 'center' }
  for (let index = 0; index < days; index += 1) styles[index + identityCount] = { cellWidth: 15, halign: 'center' }
  const summaryStart = days + identityCount
  ;[25, 25, 25, 29, 50, ...(showPercentage ? [56] : [])].forEach((cellWidth, index) => {
    styles[summaryStart + index] = { cellWidth, halign: 'center' }
  })
  return styles
}

function addFooter(doc, pageWidth, pageHeight, marginX, footerText) {
  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(218, 226, 234)
    doc.setLineWidth(0.5)
    doc.line(marginX, pageHeight - 26, pageWidth - marginX, pageHeight - 26)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
    doc.text(footerText || 'Student Attendance Management System', marginX, pageHeight - 13, { maxWidth: pageWidth - marginX * 2 - 100 })
    doc.text(`Page ${page} of ${totalPagesToken}`, pageWidth - marginX, pageHeight - 13, { align: 'right' })
  }
  doc.putTotalPages(totalPagesToken)
}

export async function createMonthlyReportPdf(report, generatedAt = new Date(), settings = {}) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'legal', compress: true })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 28
  const periodLabel = monthLabel(report.period.month, report.period.year)
  const generatedLabel = generatedAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  const { section } = report

  doc.setProperties({
    title: `Attendance Report - ${section.className} - Section ${section.name} - ${periodLabel}`,
    subject: 'Monthly student attendance report',
    creator: 'Student Attendance Management System',
  })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(24, 50, 75)
  let titleY = 30
  if (settings.schoolName) {
    doc.setFontSize(11)
    doc.text(settings.schoolName, marginX, titleY)
    titleY += 17
  }
  doc.setFontSize(17)
  doc.text('STUDENT ATTENDANCE REPORT', marginX, titleY)
  const detailY = titleY + 18
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(51, 65, 85)
  doc.text(`Class: ${section.className}`, marginX, detailY)
  doc.text(`Section: ${section.name}`, marginX + 210, detailY)
  doc.text(`Month: ${periodLabel}`, marginX + 340, detailY)
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text(`Generated On: ${generatedLabel}`, marginX, detailY + 16)

  const cardsBottom = addSummaryCards(doc, report, detailY + 28, pageWidth, marginX)
  if (report.summary.attendanceRecords === 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(146, 64, 14)
    doc.text('No attendance has been recorded for this period.', marginX, cardsBottom + 15)
  }
  const legendY = cardsBottom + (report.summary.attendanceRecords === 0 ? 31 : 17)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  doc.text('P = Present     A = Absent     H = Holiday     — = Not Marked', marginX, legendY)

  const { headers, body, days, identityCount, showPercentage } = makeDailyRows(report, settings)
  autoTable(doc, {
    head: [headers],
    body,
    startY: legendY + 10,
    margin: { top: 28, right: marginX, bottom: 32, left: marginX },
    tableWidth: pageWidth - marginX * 2,
    theme: 'grid',
    showHead: 'everyPage',
    pageBreak: 'auto',
    rowPageBreak: 'avoid',
    horizontalPageBreak: true,
    horizontalPageBreakRepeat: [0, 1],
    horizontalPageBreakBehaviour: 'afterAllRows',
    styles: { font: 'helvetica', fontSize: 7, cellPadding: 2, minCellHeight: 13, overflow: 'linebreak', textColor: [51, 65, 85], lineColor: [218, 226, 234], lineWidth: 0.35, valign: 'middle' },
    headStyles: { fillColor: [24, 50, 75], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7, halign: 'center', minCellHeight: 17 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: dailyColumnStyles(days, identityCount, showPercentage),
    didParseCell(data) {
      if (data.section === 'body' && data.column.index >= identityCount && data.column.index < days + identityCount) {
        if (data.cell.raw === 'P') data.cell.styles.textColor = [4, 120, 87]
        else if (data.cell.raw === 'A') data.cell.styles.textColor = [190, 24, 93]
        else if (data.cell.raw === 'H') data.cell.styles.textColor = [180, 83, 9]
        else data.cell.styles.textColor = [148, 163, 184]
        data.cell.styles.fontStyle = 'bold'
      }
      if (data.section === 'body' && data.column.index >= days + identityCount) data.cell.styles.fontStyle = 'bold'
    },
  })

  let nextY = doc.lastAutoTable.finalY + 25
  if (nextY > pageHeight - 95) {
    doc.addPage()
    nextY = 42
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(24, 50, 75)
  doc.text('STUDENT ATTENDANCE SUMMARY', marginX, nextY)
  const summaryColumnStyles = {}
  let summaryColumn = 0
  if (settings.showRollNumber !== false) summaryColumnStyles[summaryColumn++] = { cellWidth: 42, halign: 'center' }
  if (settings.showStudentId !== false) summaryColumnStyles[summaryColumn++] = { cellWidth: 55, halign: 'center' }
  summaryColumnStyles[summaryColumn++] = { minCellWidth: 220 }
  ;[90, 90, 90, 100, 105, ...(showPercentage ? [105] : [])].forEach((cellWidth) => {
    summaryColumnStyles[summaryColumn++] = { cellWidth, halign: 'center' }
  })
  autoTable(doc, {
    head: [[...(settings.showRollNumber === false ? [] : ['Roll']), ...(settings.showStudentId === false ? [] : ['Student ID']), 'Student Name', 'Present', 'Absent', 'Holiday', 'Not Marked', 'Working Days', ...(showPercentage ? ['Attendance %'] : [])]],
    body: report.students.map((student) => [
      ...(settings.showRollNumber === false ? [] : [student.rollNumber]),
      ...(settings.showStudentId === false ? [] : [student.studentCode || '—']),
      student.name,
      student.summary.present,
      student.summary.absent,
      student.summary.holiday,
      student.summary.notMarked,
      student.summary.workingDays,
      ...(showPercentage ? [student.summary.attendancePercentage == null ? '—' : `${student.summary.attendancePercentage}%`] : []),
    ]),
    startY: nextY + 9,
    margin: { top: 28, right: marginX, bottom: 32, left: marginX },
    tableWidth: pageWidth - marginX * 2,
    theme: 'grid',
    showHead: 'everyPage',
    pageBreak: 'auto',
    rowPageBreak: 'avoid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, minCellHeight: 15, overflow: 'linebreak', textColor: [51, 65, 85], lineColor: [218, 226, 234], lineWidth: 0.4, valign: 'middle' },
    headStyles: { fillColor: [24, 50, 75], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: summaryColumnStyles,
  })

  nextY = doc.lastAutoTable.finalY + 25
  if (nextY > pageHeight - 115) {
    doc.addPage()
    nextY = 42
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(24, 50, 75)
  doc.text('HOLIDAYS', marginX, nextY)
  if (report.holidays.length) {
    autoTable(doc, {
      head: [['Date', 'Holiday Name', 'Type', 'Description']],
      body: report.holidays.map((holiday) => [isoDate(holiday.date), holiday.name, holiday.type, holiday.description || '']),
      startY: nextY + 9,
      margin: { top: 28, right: marginX, bottom: 32, left: marginX },
      tableWidth: pageWidth - marginX * 2,
      theme: 'grid',
      showHead: 'everyPage',
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 4, minCellHeight: 16, overflow: 'linebreak', textColor: [51, 65, 85], lineColor: [218, 226, 234], lineWidth: 0.4, valign: 'middle' },
      headStyles: { fillColor: [24, 50, 75], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: 90, halign: 'center' }, 1: { cellWidth: 190 }, 2: { cellWidth: 150 }, 3: { minCellWidth: 400 } },
    })
  } else {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text('No holidays recorded.', marginX, nextY + 17)
  }

  addFooter(doc, pageWidth, pageHeight, marginX, settings.reportFooter)
  return { doc, filename: getFilename(report) }
}

export async function downloadMonthlyReportPdf(report, settings = {}) {
  const { doc, filename } = await createMonthlyReportPdf(report, new Date(), settings)
  doc.save(filename)
  return filename
}
