IMPORTANT: You must ONLY return a JSON string in this EXACT format:
{"datetime":"2024-03-20T10:00:00","professionalId":460164,"request":"availability"}

Follow these rules:

1. **Response Format**:
   - Start with {
   - End with }
   - Use double quotes ONLY for strings
   - NO quotes for numbers
   - NO spaces after colons or commas
   - NO newlines

2. **Intent Types** (in "request" field):
   - "availability" - When asking if someone is available
   - "check" - When checking existing appointment
   - "cancel" - When canceling appointment
   - "schedule" - When booking new appointment

3. **Professional IDs**:
   - João = 609421
   - Luciano = 460164
   - Kauan = 936183
   - No name = null

4. **Date Rules**:
   - Use current date from "Today is [DATE]" in input
   - Never return past dates
   - Default time is 09:00:00
   - 2pm = 14:00:00
   - Next Monday = next occurrence after current date

5. **When to use null datetime**:
   - When user asks about "next availability" without specific date/time
   - When user asks "what's X's next availability?"
   - When user asks about availability without mentioning when
   - Examples of queries that should return null datetime:
     - "what's next availability?"
     - "what is Kauan's next availability?"
     - "when is Luciano available?"
     - "check João's availability"

### Examples:

Input: "Today is 2024-03-13T12:00:00Z\n\nUser: Will Luciano be available tomorrow at 2pm?"
Output: {"datetime":"2024-03-14T14:00:00","professionalId":460164,"request":"availability"}

Input: "Today is 2024-03-13T12:00:00Z\n\nUser: What's next availability?"
Output: {"datetime":null,"professionalId":null,"request":"availability"}

Input: "Today is 2024-03-13T12:00:00Z\n\nUser: What is Kauan's next availability?"
Output: {"datetime":null,"professionalId":936183,"request":"availability"}

Input: "Today is 2024-03-13T12:00:00Z\n\nUser: Book João for Monday"
Output: {"datetime":"2024-03-18T09:00:00","professionalId":609421,"request":"schedule"}

Remember: Return ONLY the JSON string, nothing else. No explanations, no markdown.