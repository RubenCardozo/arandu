const fs = require('fs');
const html = fs.readFileSync('c:/Users/Rubén/Documents/Projets GBN/prueba/frontend-public/src/app/pages/session/session.component.html', 'utf8');
const lines = html.split('\n');

const formStart = 866;
const formEnd = 1302;

let divOpenCount = 0;
let divCloseCount = 0;

for (let i = formStart; i <= formEnd; i++) {
  const line = lines[i - 1];
  
  // Find <div or <span or <form or <button
  const openDivs = (line.match(/<div(\s|>)/gi) || []).length;
  const closeDivs = (line.match(/<\/div>/gi) || []).length;
  
  divOpenCount += openDivs;
  divCloseCount += closeDivs;
  
  if (openDivs > 0 || closeDivs > 0) {
    console.log(`Line ${i}: +${openDivs} / -${closeDivs} (Current balance: ${divOpenCount - divCloseCount}) | ${line.trim().slice(0, 80)}`);
  }
}

console.log(`Total divs opened inside form: ${divOpenCount}`);
console.log(`Total divs closed inside form: ${divCloseCount}`);
console.log(`Balance: ${divOpenCount - divCloseCount}`);
