const fs = require('fs');
const content = fs.readFileSync('e:/ecommerce_website/src/pages/CheckoutPage.tsx', 'utf8');
const openBraces = (content.match(/\{/g) || []).length;
const closeBraces = (content.match(/\}/g) || []).length;
const openParens = (content.match(/\(/g) || []).length;
const closeParens = (content.match(/\)/g) || []).length;
console.log(`Braces: { ${openBraces}, } ${closeBraces}`);
console.log(`Parens: ( ${openParens}, ) ${closeParens}`);
