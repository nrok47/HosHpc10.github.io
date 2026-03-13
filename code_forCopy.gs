/**
 * Google Apps Script สำหรับกำกับติดตามโครงการ ศูนย์อนามัยที่ 10 อุบลราชธานี (นพ.นิติ)
 * ใช้เฉพาะชีต plans เท่านั้น — ผลเบิกจ่ายจากคอลัมน์ L
 * Sheet ID: 17WdWPnU-LURpSlMv9vc37vZG0IgpKOfsNLS4cvCh_3k
 * Sheet Name: plans (A=id, B=name, C=group, D=budget, E=startMonth, F=color, G=status, H,I=meeting, J=vehicle, K=chairman, L=disbursed)
 */

// ตั้งค่า CORS และ headers
function doGet(e) {
  try {
    const action = e.parameter.action || 'getProjects';
    
    if (action === 'getProjects') {
      return getProjects();
    }
    
    if (action === 'getGroups') {
      return getGroups();
    }
    if (action === 'updateGroup') {
      var oldName = e.parameter.oldName || '';
      var newName = e.parameter.newName || '';
      return updateGroup(oldName, newName);
    }
    if (action === 'deleteGroup') {
      var groupName = e.parameter.name || '';
      return deleteGroup(groupName);
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
        if (e.parameter && e.parameter.projects) {
          data = { action: 'saveProjects', projects: JSON.parse(e.parameter.projects) };
        } else if (e.parameter && (e.parameter.oldName != null || e.parameter.newName != null)) {
          data = { action: 'updateGroup', oldName: e.parameter.oldName || '', newName: e.parameter.newName || '' };
        } else if (e.parameter && e.parameter.name != null) {
          data = { action: 'deleteGroup', name: e.parameter.name || '' };
        } else {
          throw new Error('Invalid data format');
        }
      }
    } else if (e.parameter && e.parameter.projects) {
      data = { action: 'saveProjects', projects: JSON.parse(e.parameter.projects) };
    } else if (e.parameter && (e.parameter.oldName != null || e.parameter.newName != null)) {
      data = { action: 'updateGroup', oldName: e.parameter.oldName || '', newName: e.parameter.newName || '' };
    } else if (e.parameter && e.parameter.name != null) {
      data = { action: 'deleteGroup', name: e.parameter.name || '' };
    } else {
      throw new Error('No data received');
    }
    
    if (data.action === 'saveProjects') {
      return saveProjects(data);
    }
    if (data.action === 'updateGroup') {
      return updateGroup(data.oldName || '', data.newName || '');
    }
    if (data.action === 'deleteGroup') {
      return deleteGroup(data.name || '');
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
        chairman: row[10]?.toString() || '',
        disbursed: parseFloat(row[11]) || 0
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
 * ดึงรายชื่อกลุ่มงานที่ไม่ซ้ำจากคอลัมน์ C ใน plans
 */
function getGroups() {
  const sheetId = '17WdWPnU-LURpSlMv9vc37vZG0IgpKOfsNLS4cvCh_3k';
  const sheetName = 'plans';
  try {
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
    if (!sheet) return createResponse({ groups: [] }, 200);
    const data = sheet.getDataRange().getValues();
    const seen = {};
    const groups = [];
    for (var i = 1; i < data.length; i++) {
      var g = (data[i][2] != null ? String(data[i][2]).trim() : '');
      if (g && !seen[g]) { seen[g] = true; groups.push(g); }
    }
    groups.sort();
    return createResponse({ groups: groups }, 200);
  } catch (error) {
    Logger.log('Error in getGroups: ' + error.toString());
    return createResponse({ error: error.toString() }, 500);
  }
}

/**
 * เปลี่ยนชื่อกลุ่มงาน (ทุกแถวที่ group = oldName เป็น newName)
 */
function updateGroup(oldName, newName) {
  const sheetId = '17WdWPnU-LURpSlMv9vc37vZG0IgpKOfsNLS4cvCh_3k';
  const sheetName = 'plans';
  if (!oldName || !newName) return createResponse({ error: 'oldName and newName required' }, 400);
  try {
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
    if (!sheet) return createResponse({ error: 'Sheet not found' }, 404);
    const data = sheet.getDataRange().getValues();
    var count = 0;
    for (var i = 1; i < data.length; i++) {
      if ((data[i][2] != null ? String(data[i][2]).trim() : '') === oldName) {
        sheet.getRange(i + 1, 3).setValue(newName);
        count++;
      }
    }
    return createResponse({ success: true, updated: count }, 200);
  } catch (error) {
    Logger.log('Error in updateGroup: ' + error.toString());
    return createResponse({ error: error.toString() }, 500);
  }
}

/**
 * ลบทุกกิจกรรมในกลุ่มที่ระบุ (ลบแถวที่ group = name)
 */
function deleteGroup(name) {
  const sheetId = '17WdWPnU-LURpSlMv9vc37vZG0IgpKOfsNLS4cvCh_3k';
  const sheetName = 'plans';
  if (!name) return createResponse({ error: 'name required' }, 400);
  try {
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
    if (!sheet) return createResponse({ error: 'Sheet not found' }, 404);
    const data = sheet.getDataRange().getValues();
    var rowsToDelete = [];
    for (var i = 1; i < data.length; i++) {
      if ((data[i][2] != null ? String(data[i][2]).trim() : '') === name) {
        rowsToDelete.push(i + 1);
      }
    }
    for (var j = rowsToDelete.length - 1; j >= 0; j--) {
      sheet.deleteRow(rowsToDelete[j]);
    }
    return createResponse({ success: true, deleted: rowsToDelete.length }, 200);
  } catch (error) {
    Logger.log('Error in deleteGroup: ' + error.toString());
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
    
    // เขียนข้อมูลใหม่ (คอลัมน์ A–L, L = ผลเบิกจ่าย)
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
        p.chairman || '',
        typeof p.disbursed === 'number' ? p.disbursed : 0
      ];
      return row;
    });
    
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length + 1, 12).setValues(rows);
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
