'use strict';
// Server-owned schemas; client role selection or arbitrary schemas cannot alter this contract.
const schemas={
  "theory": {
    "type": "object",
    "properties": {
      "objective": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 4000
        },
        "maxItems": 200
      },
      "materials": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 4000
        },
        "maxItems": 200
      },
      "review": {
        "type": "string",
        "maxLength": 4000
      },
      "motivation": {
        "type": "string",
        "maxLength": 4000
      },
      "steps": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "topic": {
              "type": "string",
              "maxLength": 4000
            },
            "information": {
              "type": "string",
              "maxLength": 4000
            },
            "spotHint": {
              "type": "string",
              "maxLength": 4000
            }
          },
          "required": [
            "topic",
            "information",
            "spotHint"
          ],
          "additionalProperties": false
        },
        "maxItems": 200
      },
      "questions": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 4000
        },
        "maxItems": 200
      },
      "summary": {
        "type": "string",
        "maxLength": 4000
      },
      "assignment": {
        "type": "string",
        "maxLength": 4000
      },
      "nextLesson": {
        "type": "string",
        "maxLength": 4000
      }
    },
    "required": [
      "objective",
      "materials",
      "review",
      "motivation",
      "steps",
      "questions",
      "summary",
      "assignment",
      "nextLesson"
    ],
    "additionalProperties": false
  },
  "practical": {
    "type": "object",
    "properties": {
      "objective": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 4000
        },
        "maxItems": 200
      },
      "tools": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 4000
        },
        "maxItems": 200
      },
      "steps": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "procedure": {
              "type": "string",
              "maxLength": 4000
            },
            "keyPoint": {
              "type": "string",
              "maxLength": 4000
            },
            "spotHint": {
              "type": "string",
              "maxLength": 4000
            }
          },
          "required": [
            "procedure",
            "keyPoint",
            "spotHint"
          ],
          "additionalProperties": false
        },
        "maxItems": 200
      },
      "questions": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 4000
        },
        "maxItems": 200
      },
      "nextDemo": {
        "type": "string",
        "maxLength": 4000
      }
    },
    "required": [
      "objective",
      "tools",
      "steps",
      "questions",
      "nextDemo"
    ],
    "additionalProperties": false
  },
  "syllabus": {
    "type": "object",
    "properties": {
      "trade": {
        "type": "string",
        "maxLength": 4000
      },
      "items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "type": {
              "type": "string",
              "enum": [
                "theory",
                "practical"
              ],
              "maxLength": 4000
            },
            "module": {
              "type": "string",
              "maxLength": 4000
            },
            "title": {
              "type": "string",
              "maxLength": 4000
            },
            "hours": {
              "type": "number",
              "minimum": 0.5
            },
            "confidence": {
              "type": "number",
              "minimum": 0,
              "maximum": 1
            }
          },
          "required": [
            "type",
            "module",
            "title",
            "hours",
            "confidence"
          ],
          "additionalProperties": false
        },
        "maxItems": 200
      }
    },
    "required": [
      "trade",
      "items"
    ],
    "additionalProperties": false
  }
};
function valid(value,s){
 if(s.type==='object')return !!value&&typeof value==='object'&&!Array.isArray(value)&&(s.required||[]).every(k=>Object.hasOwn(value,k))&&Object.keys(value).every(k=>Object.hasOwn(s.properties,k)&&valid(value[k],s.properties[k]));
 if(s.type==='array')return Array.isArray(value)&&value.length<=s.maxItems&&value.every(x=>valid(x,s.items));
 if(s.type==='string')return typeof value==='string'&&value.length<=s.maxLength&&(!s.enum||s.enum.includes(value));
 if(s.type==='number')return typeof value==='number'&&Number.isFinite(value)&&(s.minimum===undefined||value>=s.minimum)&&(s.maximum===undefined||value<=s.maximum);
 return false;
}
function parseTeaching(text,type){
 const value=JSON.parse(text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
 if(!valid(value,schemas[type]))throw Error('Invalid teaching structure');
 return JSON.stringify(value);
}
module.exports={schemas,parseTeaching};
