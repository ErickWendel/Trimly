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
            "enum": ["availability", "check", "cancel", "schedule", "giveup", "information", "unknown"]
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

export const messageSchema = {
    type: 'object',
    properties: {
        message: {
            type: 'string',
            description: 'a user-friendly message to be spoken to the user'
        },
        isAIReply: {
            type: 'boolean',
            description: 'a flag to indicate that this is a message from the AI'
        }
    },
    required: ['message', 'isAIReply']
}
