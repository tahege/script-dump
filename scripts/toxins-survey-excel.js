const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { removeStopwords, eng } = require('stopword');

const DATA_DIR = path.resolve(__dirname, '../data');
const CUSTOM_STOPWORDS = ['choose', 'entity', 'best', 'matches', 'toxin', 'toxins', 'go', 'does', 'means', 'using', 'when', 'use', 'keep', 'please', 'people', 'certain', 'below', 'explain', 'people', 'oftendo', 'us', 'derived', 'researchers', 'researcher', 'consideration', 'biologically', 'performing', 'quantities', 'thinking', 'following', 'components', 'component', 'currently', 'indicate', 'part', 'review', 'often', 'groups', 'working', 'specific', 'workers', 'place', 'barriers', 'physically', 'present', 'provide', 'provided', 'prior', 'receive', 'prevented', 'measures', 'registered'];

const data = JSON.parse(fs.readFileSync(path.resolve(DATA_DIR, 'toxins-survey-stats.json')));
// console.log(data);
const workbook = xlsx.utils.book_new();
Object.entries(data)
  .forEach(([question, answers], i, l) => {
    const sheetname = removeStopwords(
      question
        .replace(/\s*\(.*?\)\s*/g, ' ')
        .replace(/[,\-_\?\.]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace('assessment', 'assess')
        .replace('implemented', 'implement')
        .replace('program components', 'components')
        .replace('post approval monitoring', 'PAM')
        .replace('require', 'req')
        .replace('locking', 'lock')
        .replace('select', 'sel')
        .replace('security', 'sec')
        .replace('secured', 'sec')
        .replace('laboratory', 'lab')
        .replace('laboratories', 'labs')
        .replace('ordering', 'order')
        .replace('authorized', 'auth')
        .replace('implement', 'impl')
        .replace('information', 'info')
        .replace('circumstances', 'circ')
        .replace('policy', 'pol')
        .replace('Dual Use Research of Concern', 'DURC')
        .toLowerCase()
        .trim()
        .split(' '),
      [...eng, ...CUSTOM_STOPWORDS]
    ).join('_');
    if (answers['Selected Choice']) {
      // Normalize multi-select answers
      answers = answers['Selected Choice'];
    }
    const headings = [];
    const labels = [];
    const sheetdata = [];
    const maxColChars = [0];
    Object.entries(answers)
      .forEach(([answerLabel, answerObj]) => {
        if (answerLabel === '_count') {
          return;
        }
        if (!labels.includes(answerLabel)) {
          labels.push(answerLabel);
          sheetdata.push([answerLabel]);
          maxColChars[0] = Math.max(maxColChars[0] || 0, Math.max(answerLabel.length, 5));
        }
        const row = labels.findIndex(label => label === answerLabel);
        if (typeof answerObj !== 'object') {
          const col = 1;
          sheetdata[row][col] = answerObj;
          maxColChars[col] = Math.max(maxColChars[col] || 0, 5);
        } else {
          Object.entries(answerObj)
            .forEach(([answerType, answerValue]) => {
              if (answerType === '_count') {
                return;
              }
              if (headings.length === 0) {
                headings.push('');
                sheetdata.unshift(headings);
              }
              if (!headings.includes(answerType)) {
                headings.push(answerType);
              }
              const col = headings.findIndex(heading => heading === answerType);
              sheetdata[row + 1][col] = answerValue;
              maxColChars[col] = Math.max(maxColChars[col] || 0, Math.max(answerType.length, 5));
            });
        }
      });
    sheetdata.unshift([question]);
    const worksheet = xlsx.utils.aoa_to_sheet(sheetdata);
    worksheet['!merges'] = [{ s: { c: 0, r: 0 }, e: {c: 16, r: 0 } }];
    worksheet['!cols'] = maxColChars.map(max => ({ wch: max }));
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetname);
  });
xlsx.writeFileXLSX(workbook, path.resolve(DATA_DIR, 'toxins-survey-data.xlsx'));