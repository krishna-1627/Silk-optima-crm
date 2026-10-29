const formatExportDate = (value) => {
  if (!value) return '';

  const trimmedValue = String(value).trim();
  if (!trimmedValue) return '';

  const dateOnlyMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const parsedDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return `${String(parsedDate.getUTCDate()).padStart(2, '0')} ${parsedDate.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })} ${parsedDate.getUTCFullYear()}`;
  }

  const parsedDate = new Date(trimmedValue);
  if (Number.isNaN(parsedDate.getTime())) return trimmedValue;

  return `${String(parsedDate.getDate()).padStart(2, '0')} ${parsedDate.toLocaleDateString('en-US', { month: 'short' })} ${parsedDate.getFullYear()}`;
};

const maskSensitiveValue = (value, keep = 4) => {
  if (!value) return 'Not provided';
  const trimmed = String(value).trim();
  if (trimmed.length <= keep) return trimmed;
  const visibleStart = Math.min(2, Math.floor(keep / 2));
  const visibleEnd = Math.max(0, keep - visibleStart);
  return `${trimmed.slice(0, visibleStart)}${'*'.repeat(Math.max(4, trimmed.length - visibleStart - visibleEnd))}${trimmed.slice(-visibleEnd || undefined)}`;
};

const formatDisplayTime = (value) => {
  if (!value) return 'Not provided';
  const parsedDate = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return 'Not provided';
  return `${parsedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} • ${parsedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
};

const safeText = (value) => {
  if (value === null || value === undefined) return 'Not provided';
  return String(value).trim() || 'Not provided';
};

const buildGeneratedEmployeeId = (databaseId) => {
  const numericId = Number(databaseId);
  if (!Number.isFinite(numericId) || numericId <= 0) return 'Not provided';
  return `SO-${new Date().getFullYear()}-${String(numericId).padStart(5, '0')}`;
};

export const resolveEmployeeDisplayId = (record) => {
  const source = record?.user || record || {};
  const explicitValue = record?.employeeId || record?.application_id || record?.employee_id || source?.application_id || source?.employee_id || source?.id || record?.id;

  if (!explicitValue && explicitValue !== 0) return 'Not provided';

  const value = String(explicitValue).trim();
  if (!value) return 'Not provided';

  if (value.startsWith('SO-')) return value;
  if (/^\d+$/.test(value)) return buildGeneratedEmployeeId(value);

  return value;
};

export const buildEmployeeExportRow = (employee) => {
  const source = employee?.user || employee || {};
  const employeeRecord = employee || {};
  const userLocation = source.location || employeeRecord.location || '';
  const [city, state] = String(userLocation).split(',').map((item) => item.trim()).filter(Boolean);

  return {
    employeeId: safeText(resolveEmployeeDisplayId(employeeRecord)),
    name: safeText(source.full_name || employeeRecord.name || employeeRecord.full_name || 'Employee'),
    email: safeText(source.email || employeeRecord.email),
    phone: safeText(source.phone || employeeRecord.phone),
    dateOfBirth: formatExportDate(source.date_of_birth || employeeRecord.dateOfBirth || employeeRecord.date_of_birth),
    gender: safeText(source.gender || employeeRecord.gender),
    role: safeText(source.role || employeeRecord.designation || employeeRecord.position || employeeRecord.role),
    doj: formatExportDate(employeeRecord.joiningDate || employeeRecord.hire_date || source.hire_date),
    status: safeText(employeeRecord.status || source.status),
    verification: safeText(employeeRecord.verificationStatus || employeeRecord.verification || 'Verified'),
    highestQualification: safeText(source.degree || employeeRecord.degree || employeeRecord.highestQualification),
    college: safeText(source.college || employeeRecord.college),
    university: safeText(source.university || employeeRecord.university),
    graduationYear: safeText(source.graduation_year || employeeRecord.graduationYear),
    graduationStatus: safeText(source.graduation_status || employeeRecord.graduationStatus),
    cgpa: safeText(source.cgpa || employeeRecord.cgpa),
    currentAddress: safeText(source.current_address || employeeRecord.currentAddress),
    permanentAddress: safeText(source.permanent_address || employeeRecord.permanentAddress),
    city: safeText(city || source.location || employeeRecord.city),
    state: safeText(state || employeeRecord.state),
    pinCode: safeText(source.pin_code || employeeRecord.pinCode),
    aadhaarNumber: maskSensitiveValue(source.aadhaar_number || employeeRecord.aadhaarNumber),
    panNumber: maskSensitiveValue(source.pan_number || employeeRecord.panNumber),
    aadhaarVerificationStatus: safeText(employeeRecord.aadhaarVerificationStatus || 'Not available'),
    panVerificationStatus: safeText(employeeRecord.panVerificationStatus || 'Not available'),
    linkedIn: safeText(source.linkedin || employeeRecord.linkedIn),
    github: safeText(source.github || employeeRecord.github),
    portfolio: safeText(source.portfolio || employeeRecord.portfolio),
    technicalSkills: safeText(source.skills || employeeRecord.technicalSkills || employeeRecord.skills),
    otherSkills: safeText(employeeRecord.otherSkills),
    emergencyContactName: safeText(employeeRecord.emergencyContactName || source.emergency_contact_name),
    emergencyContactNumber: safeText(employeeRecord.emergencyContactNumber || source.emergency_contact || employeeRecord.emergency_contact_number),
    relationship: safeText(employeeRecord.relationship),
    profilePhoto: safeText(source.profile_photo || employeeRecord.profilePhoto),
    lastUpdated: formatDisplayTime(employeeRecord.lastUpdated || employeeRecord.last_updated || source.updated_at || source.last_updated || source.created_at),
  };
};

export const buildExportRows = (employees) => employees.map((employee) => buildEmployeeExportRow(employee));

export const downloadBlob = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

const csvHeaders = [
  'Employee ID',
  'Name',
  'Email',
  'Phone',
  'Date of Birth',
  'Gender',
  'Role',
  'DOJ',
  'Status',
  'Verification',
  'Highest Qualification',
  'College',
  'University',
  'Graduation Year',
  'Graduation Status',
  'CGPA',
  'Current Address',
  'Permanent Address',
  'City',
  'State',
  'PIN Code',
  'Aadhaar Number',
  'PAN Number',
  'Aadhaar Verification Status',
  'PAN Verification Status',
  'LinkedIn',
  'GitHub',
  'Portfolio',
  'Technical Skills',
  'Other Skills',
  'Emergency Contact Name',
  'Emergency Contact Number',
  'Relationship',
  'Last Updated',
];

const csvValue = (value) => {
  const safeValue = String(value ?? '').replace(/"/g, '""');
  return /[",\n]/.test(safeValue) ? `"${safeValue}"` : safeValue;
};

const normalizeExportRow = (row) => {
  if (!row || typeof row !== 'object') return {};

  const normalized = {};
  Object.entries(row).forEach(([key, value]) => {
    normalized[key] = value;
    normalized[key.toLowerCase().replace(/[^a-z0-9]+/g, '')] = value;
  });
  return normalized;
};

const getExportValue = (row, header) => {
  const normalizedRow = normalizeExportRow(row);
  const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return normalizedRow[normalizedHeader] ?? normalizedRow[header] ?? '';
};

export const buildCsvContent = (rows) => {
  const lines = [csvHeaders.join(',')];
  rows.forEach((row) => {
    const values = csvHeaders.map((header) => csvValue(getExportValue(row, header)));
    lines.push(values.join(','));
  });
  return lines.join('\n');
};

export const buildExcelContent = (rows) => {
  const xmlRows = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    '<sheetData>',
    `<row>${csvHeaders.map((header) => `<c t="inlineStr"><is><t>${String(header).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</t></is></c>`).join('')}</row>`,
  ];

  rows.forEach((row) => {
    const cells = csvHeaders.map((header) => {
      return String(getExportValue(row, header) ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    });
    xmlRows.push(`<row>${cells.map((cell) => `<c t="inlineStr"><is><t>${cell}</t></is></c>`).join('')}</row>`);
  });

  xmlRows.push('</sheetData>', '</worksheet>');
  return xmlRows.join('');
};

export const buildDocxContent = (rows) => {
  const sections = rows.map((row) => {
    const lines = [
      `Employee ID: ${row.employeeId}`,
      `Name: ${row.name}`,
      `Email: ${row.email}`,
      `Phone: ${row.phone}`,
      `Role: ${row.role}`,
      `DOJ: ${row.doj}`,
      `Status: ${row.status}`,
      `Verification: ${row.verification}`,
      `Highest Qualification: ${row.highestQualification}`,
      `College: ${row.college}`,
      `University: ${row.university}`,
      `Graduation Year: ${row.graduationYear}`,
      `CGPA: ${row.cgpa}`,
      `Current Address: ${row.currentAddress}`,
      `Permanent Address: ${row.permanentAddress}`,
      `City: ${row.city}`,
      `State: ${row.state}`,
      `PIN Code: ${row.pinCode}`,
      `LinkedIn: ${row.linkedIn}`,
      `GitHub: ${row.github}`,
      `Portfolio: ${row.portfolio}`,
      `Emergency Contact: ${row.emergencyContactName} (${row.emergencyContactNumber})`,
      `Last Updated: ${row.lastUpdated}`,
    ];
    return `<w:p><w:r><w:t>${String(lines.join('\n')).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t></w:r></w:p>`;
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>SilkOptima Employee Report</w:t></w:r></w:p>${sections.join('')}</w:body></w:document>`;
};

export const buildPdfContent = (rows) => {
  const content = rows.map((row) => [
    `Employee ID: ${row.employeeId}`,
    `Name: ${row.name}`,
    `Email: ${row.email}`,
    `Role: ${row.role}`,
    `DOJ: ${row.doj}`,
    `Status: ${row.status}`,
    `Verification: ${row.verification}`,
    `Phone: ${row.phone}`,
    `Qualification: ${row.highestQualification}`,
    `College: ${row.college}`,
    `University: ${row.university}`,
    `CGPA: ${row.cgpa}`,
    `Current Address: ${row.currentAddress}`,
    `Permanent Address: ${row.permanentAddress}`,
    `Emergency Contact: ${row.emergencyContactName} (${row.emergencyContactNumber})`,
    `Last Updated: ${row.lastUpdated}`,
    '',
  ].join('\n')).join('\n');

  const escapedText = String(content).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const streamText = `BT /F1 11 Tf 50 760 Td (${escapedText}) Tj ET`;

  return `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 0 >>\nstream\n${streamText}\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000062 00000 n \n0000000119 00000 n \n0000000207 00000 n \n0000000300 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n0\n%%EOF`;
};

export const buildSingleProfileCsvContent = (row) => {
  const headers = [
    'Employee ID',
    'Full Name',
    'Email Address',
    'Phone Number',
    'Date of Birth',
    'Gender',
    'Role',
    'Date of Joining',
    'Verification Status',
    'Account Status',
    'Last Updated',
    'Highest Qualification',
    'College',
    'University',
    'Graduation Year',
    'Graduation Status',
    'CGPA',
    'Current Address',
    'Permanent Address',
    'City',
    'State',
    'PIN Code',
    'Aadhaar Number',
    'PAN Number',
    'Aadhaar Verification Status',
    'PAN Verification Status',
    'LinkedIn',
    'GitHub',
    'Portfolio',
    'Technical Skills',
    'Other Skills',
    'Emergency Contact Name',
    'Emergency Contact Number',
    'Relationship',
  ];
  const valueMap = {
    'Employee ID': row.employeeId,
    'Full Name': row.name,
    'Email Address': row.email,
    'Phone Number': row.phone,
    'Date of Birth': row.dateOfBirth,
    'Gender': row.gender,
    'Role': row.role,
    'Date of Joining': row.doj,
    'Verification Status': row.verification,
    'Account Status': row.status,
    'Last Updated': row.lastUpdated,
    'Highest Qualification': row.highestQualification,
    'College': row.college,
    'University': row.university,
    'Graduation Year': row.graduationYear,
    'Graduation Status': row.graduationStatus,
    'CGPA': row.cgpa,
    'Current Address': row.currentAddress,
    'Permanent Address': row.permanentAddress,
    'City': row.city,
    'State': row.state,
    'PIN Code': row.pinCode,
    'Aadhaar Number': row.aadhaarNumber,
    'PAN Number': row.panNumber,
    'Aadhaar Verification Status': row.aadhaarVerificationStatus,
    'PAN Verification Status': row.panVerificationStatus,
    'LinkedIn': row.linkedIn,
    'GitHub': row.github,
    'Portfolio': row.portfolio,
    'Technical Skills': row.technicalSkills,
    'Other Skills': row.otherSkills,
    'Emergency Contact Name': row.emergencyContactName,
    'Emergency Contact Number': row.emergencyContactNumber,
    'Relationship': row.relationship,
  };
  const values = headers.map((header) => csvValue(valueMap[header]));
  return [headers.join(','), values.join(',')].join('\n');
};

export const buildSingleProfileDocxContent = (row) => {
  const lines = [
    'SilkOptima Employee Report',
    '',
    `Employee ID: ${row.employeeId}`,
    `Full Name: ${row.name}`,
    `Email Address: ${row.email}`,
    `Phone Number: ${row.phone}`,
    `Date of Birth: ${row.dateOfBirth}`,
    `Gender: ${row.gender}`,
    `Role: ${row.role}`,
    `Date of Joining: ${row.doj}`,
    `Verification Status: ${row.verification}`,
    `Account Status: ${row.status}`,
    `Last Updated: ${row.lastUpdated}`,
    '',
    'Education',
    `Highest Qualification: ${row.highestQualification}`,
    `College: ${row.college}`,
    `University: ${row.university}`,
    `Graduation Year: ${row.graduationYear}`,
    `Graduation Status: ${row.graduationStatus}`,
    `CGPA: ${row.cgpa}`,
    '',
    'Address Information',
    `Current Address: ${row.currentAddress}`,
    `Permanent Address: ${row.permanentAddress}`,
    `City: ${row.city}`,
    `State: ${row.state}`,
    `PIN Code: ${row.pinCode}`,
    '',
    'Identity Verification',
    `Aadhaar Number: ${row.aadhaarNumber}`,
    `PAN Number: ${row.panNumber}`,
    `Aadhaar Verification Status: ${row.aadhaarVerificationStatus}`,
    `PAN Verification Status: ${row.panVerificationStatus}`,
    '',
    'Professional Links',
    `LinkedIn: ${row.linkedIn}`,
    `GitHub: ${row.github}`,
    `Portfolio: ${row.portfolio}`,
    '',
    'Skills',
    `Technical Skills: ${row.technicalSkills}`,
    `Other Skills: ${row.otherSkills}`,
    '',
    'Emergency Contact',
    `Emergency Contact Name: ${row.emergencyContactName}`,
    `Emergency Contact Number: ${row.emergencyContactNumber}`,
    `Relationship: ${row.relationship}`,
  ];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${lines.map((line) => `<w:p><w:r><w:t>${String(line).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`;
};

export const buildSingleProfilePdfContent = (row) => {
  const content = [
    'SilkOptima Employee Report',
    '',
    'Personal Information',
    `Employee ID: ${row.employeeId}`,
    `Full Name: ${row.name}`,
    `Email Address: ${row.email}`,
    `Phone Number: ${row.phone}`,
    `Date of Birth: ${row.dateOfBirth}`,
    `Gender: ${row.gender}`,
    `Role: ${row.role}`,
    `Date of Joining: ${row.doj}`,
    `Verification Status: ${row.verification}`,
    `Account Status: ${row.status}`,
    `Last Updated: ${row.lastUpdated}`,
    '',
    'Education',
    `Highest Qualification: ${row.highestQualification}`,
    `College: ${row.college}`,
    `University: ${row.university}`,
    `Graduation Year: ${row.graduationYear}`,
    `CGPA: ${row.cgpa}`,
    '',
    'Address Information',
    `Current Address: ${row.currentAddress}`,
    `Permanent Address: ${row.permanentAddress}`,
    `City: ${row.city}`,
    `State: ${row.state}`,
    `PIN Code: ${row.pinCode}`,
    '',
    'Identity Verification',
    `Aadhaar Number: ${row.aadhaarNumber}`,
    `PAN Number: ${row.panNumber}`,
    '',
    'Professional Links',
    `LinkedIn: ${row.linkedIn}`,
    `GitHub: ${row.github}`,
    `Portfolio: ${row.portfolio}`,
    '',
    'Skills',
    `Technical Skills: ${row.technicalSkills}`,
    `Other Skills: ${row.otherSkills}`,
    '',
    'Emergency Contact',
    `Emergency Contact Name: ${row.emergencyContactName}`,
    `Emergency Contact Number: ${row.emergencyContactNumber}`,
    `Relationship: ${row.relationship}`,
  ].join('\n');

  const escapedText = String(content).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const streamText = `BT /F1 11 Tf 50 760 Td (${escapedText}) Tj ET`;

  return `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 0 >>\nstream\n${streamText}\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000062 00000 n \n0000000119 00000 n \n0000000207 00000 n \n0000000300 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n0\n%%EOF`;
};
