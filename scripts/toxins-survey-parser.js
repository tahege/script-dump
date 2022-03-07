const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const results = [];
let questions = {};
let lib = {};
let stats = {};

// const ld50Group = (q) => q.includes("At your entity, which of the following measures do you require");
// const GENERAL_OVERSIGHT = "General Oversight";
const DATA_DIR = path.resolve(__dirname, '../data');

fs.createReadStream(path.resolve(DATA_DIR, 'toxins-survey-raw.csv'))
  .pipe(csv({
    mapHeaders: ({ header }) => {
      const parts = header.includes(':') ? header.split(':') : header.split('?');
      const question = parts[0].trim();
      const option = parts.length > 1 ? parts[1].trim().replace(/ ?- Text/, '').replace(/ ?- /g, '').replace(/\([^()]+\)/, '').trim() : null;
      if (!questions[question]) {
        questions[question] = {
          options: new Set(),
          values: new Set()
        };
      }
      if (option) {
        questions[question].options.add(option);
      }
      // if (ld50Group(question)) {
      //   questions[question].options.add(GENERAL_OVERSIGHT);
      // }

      lib[header] = { question, option, root: questions[question] };
      return header;
    },
    mapValues: ({ header, value }) => {
      const parts = header.includes(':') ? header.split(':') : header.split('?');
      const question = parts[0].trim();
      value.split(',').forEach(val => questions[question].values.add(val.trim()));
      return value.replace(/Yes, /g, '').replace(/e\.g\.,/g, 'for ').replace(/, /g, ' or ').replace(/(\(|\))/g, '').replace(/ or or /g, ' or ').replace(/\s\s/g, ' ');
    }
  }))
  .on('data', (data) => results.push(data))
  .on('end', () => {
    let filtered = results
      .filter(row => row['Do you work in the United States?'] === 'Yes');
    let mapped = filtered.map(row => {
      const obj = {};
      let hasOversights = {};
      Object.entries(row)
        .forEach(([key, value]) => {
          if ([
            'Start Date',
            'End Date',
            'Response Type',
            'Progress',
            'Duration (in seconds)',
            'Finished',
            'Recorded Date',
            'Response ID',
            'Distribution Channel',
            'User Language'
          ].includes(key)) {
            return;
          }
          const { question, option } = lib[key];
          if (question && !option) {
            obj[question] = value;
          } else if (!obj[question]) {
            obj[question] = { [option]: value };
          } else {
            obj[question][option] = value;
          }
          if (!value) {
            return;
          }
          if (!stats[question]) {
            stats[question] = { _count: 0 };
          }
          if (question && !option) {
            stats[question]._count++;
          } else {
            stats[question]._count = filtered.length;
          }
          if (option) {
            if (!stats[question][option]) {
              stats[question][option] = { _count: 0 };
            }
            stats[question][option]._count++;
          }
          // const isLD50Group = ld50Group(question);
          // const isOversight = ["Institutional Biosafety Committee Review", "Biosafety Officer or equivalent Review", "Other Safety Committee Review", "Alternate / Responsible Official Review", "Oversight of ordering process"].includes(option);
          // if (isLD50Group) {
          //   if (!stats[question][GENERAL_OVERSIGHT]) {
          //     stats[question][GENERAL_OVERSIGHT] = { _count: 0 };
          //   }
          //   if (isOversight && !hasOversights[question]) {
          //     // console.log(question, option, value);
          //     stats[question][GENERAL_OVERSIGHT]._count++;
          //     hasOversights[question] = true;
          //   }
          // }
          value.split(',').forEach(val => {
            const valT = val.trim();
            if (option) {
              if (!stats[question][option][valT]) {
                stats[question][option][valT] = 0;
              }
              stats[question][option][valT]++;
            } else {
              if (!stats[question][valT]) {
                stats[question][valT] = 0;
              }
              stats[question][valT]++;
            }
          });
        });
      return obj;
    });
    console.log(mapped.length);
    fs.writeFileSync(path.resolve(DATA_DIR, 'toxins-survey-data.json'), JSON.stringify(mapped, null, 4));
    fs.writeFileSync(path.resolve(DATA_DIR, 'toxins-survey-lib.json'), JSON.stringify(lib, (key, value) => {
      if (value instanceof Set) {
        return Array.from(value.values());
      }
      return value;
    }, 4));
    fs.writeFileSync(path.resolve(DATA_DIR, 'toxins-survey-stats.json'), JSON.stringify(stats, null, 4));
  });