const fs = require('fs');
const path = require('path');

const PLANS_DIR = path.join(__dirname);

function parseStatus(statusLine) {
  if (!statusLine) return 'pending';
  
  if (statusLine.includes('[x]')) return 'completed';
  if (statusLine.includes('[-]')) return 'skipped';
  if (statusLine.includes('[ ]') && statusLine.match(/\[\s+\]/)) return 'pending';
  
  const lower = statusLine.toLowerCase();
  if (lower.includes('complete') || lower.includes('done') || lower.includes('✅')) return 'completed';
  if (lower.includes('progress') || lower.includes('corso') || lower.includes('in progress')) return 'in_progress';
  if (lower.includes('pending') || lower.includes('not started') || lower.includes('⬜')) return 'pending';
  if (lower.includes('cancelled') || lower.includes('canceled')) return 'cancelled';
  if (lower.includes('skipped')) return 'skipped';
  
  return 'pending';
}

function extractMetadata(content) {
  const result = {
    title: '',
    requirements: null,
    status: 'pending',
    created: null,
    lastUpdated: null,
    decisions: []
  };

  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) result.title = titleMatch[1];

  const requirementsMatch = content.match(/\*\*Requirements:\*\*\s*`([^`]+)`/);
  if (requirementsMatch) result.requirements = requirementsMatch[1];

  const statusMatch = content.match(/\*\*Status:\*\*\s*(.+?)(?:\n|$)/i) || content.match(/\*\*Stato:\*\*\s*(.+?)(?:\n|$)/i);
  if (statusMatch) {
    result.status = parseStatus(statusMatch[1]);
  }

  const createdMatch = content.match(/\*\*Created:\*\*\s*(.+?)(?:\n|$)/i) || content.match(/\*\*Creato:\*\*\s*(.+?)(?:\n|$)/i);
  if (createdMatch) result.created = createdMatch[1].trim();

  const lastUpdatedMatch = content.match(/\*\*Last Updated:\*\*\s*(.+?)(?:\n|$)/i) || content.match(/\*\*Ultimo aggiornamento:\*\*\s*(.+?)(?:\n|$)/i);
  if (lastUpdatedMatch) result.lastUpdated = lastUpdatedMatch[1].trim();

  const decisionsSection = content.match(/## Decisioni chiave\n\n([\s\S]*?)(?=\n---\n|\n## Task)/);
  if (decisionsSection) {
    const tableContent = decisionsSection[1];
    const rows = tableContent.split('\n').filter(row => row.includes('|') && !row.includes('---') && !row.startsWith('| Decisione'));
    for (const row of rows) {
      const cols = row.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 3) {
        result.decisions.push({
          decision: cols[0],
          choice: cols[1],
          date: cols[2]
        });
      }
    }
  }

  return result;
}

function extractStoryCoverage(content) {
  const stories = [];
  
  const storyTableMatch = content.match(/## Story Coverage\n\n([\s\S]*?)(?=\n---\n|\n## Phase|\n## Fase|\n## Task)/);
  if (!storyTableMatch) {
    const altTableMatch = content.match(/\| Story \| Description \|.*?\n\|[-| ]+\|[\s\S]*?(?=\n---\n|\n## Phase|\n## Fase)/);
    if (altTableMatch) {
      const rows = altTableMatch[0].split('\n');
      for (const row of rows) {
        if (row.includes('|') && !row.includes('---') && row.includes('US-')) {
          const cols = row.split('|').map(c => c.trim()).filter(Boolean);
          if (cols.length >= 3) {
            stories.push({
              id: cols[0],
              description: cols[1],
              tasks: cols[2],
              status: cols[3]?.replace(/[^\u0000-\u007F]/g, '') || 'unknown'
            });
          }
        }
      }
    }
    return stories;
  }

  const rows = storyTableMatch[1].split('\n').filter(row => row.includes('|') && !row.includes('---') && row.includes('US-'));
  for (const row of rows) {
    const cols = row.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length >= 3) {
      stories.push({
        id: cols[0],
        description: cols[1],
        tasks: cols[2],
        status: cols[3]?.replace(/[^\u0000-\u007F]/g, '') || 'unknown'
      });
    }
  }

  return stories;
}

function extractTasks(content) {
  const tasks = [];
  
  const taskHeaderPattern = /(?:^|\n)(#{1,3})\s+(?:(T-\d+)|Task\s+(\d+)):/gm;
  const headers = [];
  let match;
  
  while ((match = taskHeaderPattern.exec(content)) !== null) {
    const taskId = match[2] || `T-${match[3]}`;
    headers.push({ index: match.index, id: taskId });
  }
  
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].index;
    const end = i + 1 < headers.length ? headers[i + 1].index : content.length;
    const taskId = headers[i].id;
    const block = content.substring(start, end);
    
    const storiesMatch = block.match(/\*\*Stories?:\*\*\s*(.+?)(?:\n|$)/im);
    const sizeMatch = block.match(/\*\*Size:\*\*\s*(.+?)(?:\n|$)/im);
    const statusMatch = block.match(/\*\*Status:\*\*\s*(.+)/im) || block.match(/\*\*Stato:\*\*\s*(.+)/im);
    const dependsMatch = block.match(/\*\*Depends on:\*\*\s*(.+?)(?:\n|$)/im);
    
    const whatToDoMatch = block.match(/\*\*What to do:\*\*\n([\s\S]*?)(?=^\*\*Definition of Done)/m);
    const dodMatch = block.match(/\*\*Definition of Done:\*\*\n([\s\S]*?)(?=^\*\*|^#{1,3}\s+|$)/m);
    const notesMatch = block.match(/\*\*Implementation Notes:\*\*\n([\s\S]*?)(?=^\*\*|^#{1,3}\s+|$)/m);
    const decisionMatch = block.match(/⚠️\s+\*\*DECISION:\*\*\s*(.+?)(?:\n\n|^#{1,3}\s+)/m);
    
    const tasksList = [];
    const dodContent = dodMatch?.[1] || '';
    const dodItems = dodContent.match(/-\s+\[([x ])\]\s*(.+)/g) || [];
    for (const item of dodItems) {
      const itemMatch = item.match(/-\s+\[([x ])\]\s*(.+)/);
      if (itemMatch) {
        tasksList.push({
          description: itemMatch[2].trim(),
          completed: itemMatch[1] === 'x'
        });
      }
    }

    const task = {
      id: taskId,
      stories: storiesMatch?.[1]?.split(',').map(s => s.trim()) || [],
      size: sizeMatch?.[1]?.trim() || 'medium',
      status: parseStatus(statusMatch?.[1] || 'pending'),
      dependsOn: dependsMatch?.[1]?.split(',').map(d => d.trim()) || [],
      whatToDo: whatToDoMatch?.[1]?.trim().replace(/^[-*]\s+/gm, '').trim() || null,
      definitionOfDone: tasksList,
      decision: decisionMatch?.[1]?.trim() || null,
      notes: notesMatch?.[1]?.trim().replace(/^[-*]\s+/gm, '').trim() || null
    };

    tasks.push(task);
  }

  return tasks;
}

function parsePlanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath, '.md');
  
  const plan = {
    id: fileName,
    ...extractMetadata(content),
    stories: extractStoryCoverage(content),
    tasks: extractTasks(content)
  };

  return plan;
}

function convertPlansToJson() {
  if (!fs.existsSync(PLANS_DIR)) {
    console.error(`Plans directory not found: ${PLANS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(PLANS_DIR).filter(f => f.endsWith('.md'));
  
  if (files.length === 0) {
    console.error('No .md files found in plans directory');
    process.exit(1);
  }

  for (const file of files) {
    const filePath = path.join(PLANS_DIR, file);
    const plan = parsePlanFile(filePath);
    const jsonFileName = file.replace('.md', '.json');
    const jsonPath = path.join(PLANS_DIR, jsonFileName);
    
    fs.writeFileSync(jsonPath, JSON.stringify(plan, null, 2));
    console.log(`Generated: ${jsonFileName}`);
  }
  
  console.log(`\nConverted ${files.length} plan(s) to JSON`);
}

if (require.main === module) {
  convertPlansToJson();
}

module.exports = { parsePlanFile, parseStatus, extractMetadata, extractStoryCoverage, extractTasks };