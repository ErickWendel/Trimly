export const intentSchema = {
    "type": "object",
    "properties": {
        "datetime": {
            "type": ["string", "null"],
            "format": "date-time"
        },
        "professionalId": {
            "type": ["number", "null"]
        },
        "request": {
            "type": "string",
            "enum": ["availability", "check", "cancel", "schedule", "giveup", "unknown"]
        },
        "message": {
            "type": "string"
        }
    },
    "required": ["request"]
};

export const schedulerSchema = {
    "type": "object",
    "properties": {
        "isAIReply": {
            "type": "boolean"
        },
        "message": {
            "type": "string"
        }
    },
    "required": ["isAIReply", "message"]
};
