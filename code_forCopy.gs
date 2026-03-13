/**
 * Google Apps Script สำหรับ Budget Tracker
 * Sheet ID: 17WdWPnU-LURpSlMv9vc37vZG0IgpKOfsNLS4cvCh_3k
 * Sheet Name: plans
 */

// ตั้งค่า CORS และ headers
function doGet(e) {
  try {
    const action = e.parameter.action || 'getProjects';
    
    if (action === 'getProjects') {
      return getProjects();
    }
    
    if (action === 'getQueryDoc') {
      return getQueryDoc();
    }
    
    if (action === 'saveProjects') {
      const projectsData = JSON.parse(e.parameter.data || '[]');
      return saveProjects({ projects: projectsData });
    }
    
    return createResponse({ error: 'Invalid action' }, 400);
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return createResponse({ error: error.toString() }, 500);
  }
}

// รับ POST request สำหรับบันทึกข้อมูล
function doPost(e) {
  try {
    let data;
    
    // Handle both JSON and FormData
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        // If JSON parse fails, try to get from parameter (FormData)
        if (e.parameter && e.parameter.projects) {
          data = {
            action: e.parameter.action || 'saveProjects',
            projects: JSON.parse(e.parameter.projects)
          };
        } else {
          throw new Error('Invalid data format');
        }
      }
    } else if (e.parameter && e.parameter.projects) {
      data = {
        action: e.parameter.action || 'saveProjects',
        projects: JSON.parse(e.parameter.projects)
      };
    } else {
      throw new Error('No data received');
    }
    
    if (data.action === 'saveProjects') {
      return saveProjects(data);
    }
    
    return createResponse({ error: 'Invalid action' }, 400);
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return createResponse({ error: error.toString() }, 500);
  }
}

// ดึงข้อมูลโครงการทั้งหมด
function getProjects() {
  const sheetId = '17WdWPnU-LURpSlMv9vc37vZG0IgpKOfsNLS4cvCh_3k';
  const sheetName = 'plans';
  
  try {
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
    
    if (!sheet) {
      return createResponse({ error: 'Sheet not found' }, 404);
    }
    
    const data = sheet.getDataRange().getValues();
    
    if (data.length === 0) {
      return createResponse({ projects: [] }, 200);
    }
    
    // Header row
    const headers = data[0];
    
    // แปลงข้อมูลเป็น JSON
    const projects = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // ข้าม row ว่าง
      if (!row[0] && !row[1]) continue;
      
      const project = {
        id: row[0]?.toString() || '',
        name: row[1]?.toString() || '',
        group: row[2]?.toString() || '',
        budget: parseFloat(row[3]) || 0,
        startMonth: parseInt(row[4]) || 0,
        color: row[5]?.toString() || 'bg-blue-600',
        status: row[6]?.toString() || 'ยังไม่เริ่ม',
        meetingStartDate: row[7] ? formatDate(row[7]) : undefined,
        meetingEndDate: row[8] ? formatDate(row[8]) : undefined,
        vehicle: row[9]?.toString() || '',
        chairman: row[10]?.toString() || ''
      };
      
      projects.push(project);
    }
    
    return createResponse({ projects: projects }, 200);
    
  } catch (error) {
    Logger.log('Error in getProjects: ' + error.toString());
    return createResponse({ error: error.toString() }, 500);
  }
}

/**
 * ดึงข้อมูลจากชีต query_DOC สำหรับผลเบิกจ่าย
 * B=ชื่อโครงการ, C=ชื่อกิจกรรม, D=กิจกรรมดำเนินการ(แผน/ผล), E=เดือน, F=เงิน, G=กลุ่มงาน, H=สายงาน
 * เฉพาะแถวที่ D = "ผลการใช้จ่าย" เท่านั้น
 */
function getQueryDoc() {
  const sheetId = '17WdWPnU-LURpSlMv9vc37vZG0IgpKOfsNLS4cvCh_3k';
  const sheetName = 'query_DOC';
  
  try {
    const spreadsheet = SpreadsheetApp.openById(sheetId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      return createResponse({ rows: [] }, 200);
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return createResponse({ rows: [] }, 200);
    }
    
    const rows = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const colC = row[2];  // C = ชื่อกิจกรรม
      const colD = row[3];  // D = กิจกรรมดำเนินการ (แผน หรือ ผลการใช้จ่าย)
      const colE = row[4];  // E = เดือน (Attribute)
      const colF = row[5];  // F = เงิน (Value)
      // เฉพาะแถวที่ D เป็น "ผลการใช้จ่าย"
      const planOrResult = (colD != null ? String(colD).trim() : '');
      if (planOrResult.indexOf('ผลการใช้จ่าย') === -1) continue;
      const amount = typeof colF === 'number' ? colF : parseFloat(String(colF || 0)) || 0;
      if (!amount && !colC) continue;
      rows.push({
        activityLabel: (colC != null ? String(colC).trim() : ''),
        month: (colE != null ? String(colE).trim() : ''),
        amount: amount
      });
    }
    
    return createResponse({ rows: rows }, 200);
  } catch (error) {
    Logger.log('Error in getQueryDoc: ' + error.toString());
    return createResponse({ error: error.toString() }, 500);
  }
}

// บันทึกข้อมูลโครงการ
function saveProjects(data) {
  const sheetId = '17WdWPnU-LURpSlMv9vc37vZG0IgpKOfsNLS4cvCh_3k';
  const sheetName = 'plans';
  
  try {
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
    
    if (!sheet) {
      return createResponse({ error: 'Sheet not found' }, 404);
    }
    
    const projects = data.projects || [];
    Logger.log('Saving projects: ' + JSON.stringify(projects));
    
    // ล้างข้อมูลเก่า (เก็บ header)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }
    
    // เขียนข้อมูลใหม่
    const rows = projects.map(p => {
      const row = [
        p.id,
        p.name,
        p.group,
        p.budget,
        p.startMonth,
        p.color,
        p.status,
        p.meetingStartDate || '',
        p.meetingEndDate || '',
        p.vehicle || '',
        p.chairman || ''
      ];
      Logger.log('Row: ' + JSON.stringify(row));
      return row;
    });
    
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, 11).setValues(rows);
      Logger.log('Wrote ' + rows.length + ' rows to sheet');
    }
    
    return createResponse({ success: true, count: projects.length }, 200);
    
  } catch (error) {
    Logger.log('Error in saveProjects: ' + error.toString());
    return createResponse({ error: error.toString() }, 500);
  }
}

// Helper: แปลง Date เป็น ISO string
function formatDate(date) {
  if (!date) return undefined;
  
  try {
    if (typeof date === 'string') return date;
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return undefined;
    
    // Format: YYYY-MM-DD
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    return undefined;
  }
}

// Helper: สร้าง Response
function createResponse(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  
  // เพิ่ม CORS headers
  if (statusCode !== 200) {
    Logger.log('Error response: ' + JSON.stringify(data));
  }
  
  return output;
}

// ทดสอบการทำงาน
function testGetProjects() {
  const result = getProjects();
  Logger.log(result.getContent());
}

function testSaveProjects() {
  const testData = {
    projects: [
      {
        id: 'test1',
        name: 'โครงการทดสอบ',
        group: 'กลุ่มทดสอบ',
        budget: 100000,
        startMonth: 0,
        color: 'bg-blue-600',
        status: 'ยังไม่เริ่ม',
        meetingStartDate: '2024-10-15',
        meetingEndDate: '2024-10-20'
      }
    ]
  };
  
  const result = saveProjects(testData);
  Logger.log(result.getContent());
}
