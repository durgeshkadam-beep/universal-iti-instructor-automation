'use strict';
// Privacy gate before sending learner or instructor text to an external Free Tier AI.
// Conservative, high-confidence identifiers. Other personal details must still be
// excluded by the user; this is not a complete PII detection system.
function personalDataWarning(input){
 if(typeof input!=='string')return 'Enter only a non-identifying learning question or topic.';
 const text=input.normalize('NFKC');
 if(/(?:^|[^\d])\d{4}[ -]?\d{4}[ -]?\d{4}(?!\d)/.test(text))return 'Remove Aadhaar-like 12-digit numbers before requesting external AI.';
 if(/(?:^|[^\d])(?:\+?91[ -]?)?[6-9]\d{9}(?!\d)/.test(text))return 'Remove phone numbers before requesting external AI.';
 if(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text))return 'Remove email addresses before requesting external AI.';
 return '';
}
module.exports={personalDataWarning};
