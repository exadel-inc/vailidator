const AuditReportJsonSchema = {
  "type": "object",
  "properties": {
    "seo": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "title": { "type": "string" },
          "status": { "type": "string", "enum": ["pass", "fail", "warning"] },
          "description": { "type": "string" },
          "recommendation": { "type": ["string", "null"] }
        },
        "required": ["id", "title", "status", "description", "recommendation"],
        "additionalProperties": false
      }
    },
    "accessibility": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "title": { "type": "string" },
          "status": { "type": "string", "enum": ["pass", "fail", "warning"] },
          "description": { "type": "string" },
          "recommendation": { "type": ["string", "null"] }
        },
        "required": ["id", "title", "status", "description", "recommendation"],
        "additionalProperties": false
      }
    },
    "validation": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "rule": { "type": "string" },
          "status": { "type": "string", "enum": ["pass", "fail", "warning"] },
          "description": { "type": "string" },
          "recommendation": { "type": ["string", "null"] }
        },
        "required": ["rule", "status", "description", "recommendation"],
        "additionalProperties": false
      }
    },
    "summary": { "type": "string" }
  },
  "required": ["seo", "accessibility", "validation", "summary"],
  "additionalProperties": false
}

export default AuditReportJsonSchema
