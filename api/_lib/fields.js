// Maps semantic keys to the actual (Hebrew) Airtable field names, so the
// rest of the codebase never has to embed raw Hebrew field names.

export const TABLES = {
  VOLUNTEERS: 'Volunteers',
  PATROLS: 'Patrols',
  PATROL_ROUTES: 'Patrol Routes',
  REGISTRATIONS: 'Registrations',
  ANNOUNCEMENTS: 'Announcements',
  EMERGENCY_CONTACTS: 'Emergency Contacts',
  PATROL_EVENTS: 'Patrol Events',
  HADAR_NEW_REPORT: 'Hadar_New_Report',
  STREETS: 'Streets',
  ACTIVITY_LOG: 'Activity_Log',
  REPORT_CATEGORIES: 'Report Categories',
  REPORT_SUBCATEGORIES: 'Report Subcategories',
};

export const VOLUNTEER_FIELDS = {
  ID: 'Volunteer ID',
  NAME: 'שם מלא',
  PHONE: 'טלפון',
  DEVICE_CLAIMED: 'משויך למכשיר',
  STATUS: 'סטטוס',
  ROLE: 'תפקיד',
  COORDINATOR_PASSWORD: 'סיסמת רכז',
  MOKAD_PASSWORD: 'סיסמת מוקד',
  REGISTRATIONS: 'Registrations',
};

export const VOLUNTEER_STATUS = {
  ACTIVE: 'פעיל',
};

export const VOLUNTEER_ROLE = {
  MANAGER: 'מנהל',
  AREA_COORDINATOR: 'רכז אזור',
  PATROL_LEADER: 'מוביל סיור',
  VOLUNTEER: 'מתנדב',
  MOKADAN: 'מוקדן',
};

export const COORDINATOR_ROLES = [VOLUNTEER_ROLE.MANAGER, VOLUNTEER_ROLE.AREA_COORDINATOR];
export const MOKAD_ROLES = [VOLUNTEER_ROLE.MOKADAN, VOLUNTEER_ROLE.MANAGER, VOLUNTEER_ROLE.AREA_COORDINATOR];

export const PATROL_FIELDS = {
  ID: 'Patrol ID',
  ROUTE: 'Route',
  DATE: 'תאריך',
  DAY_OF_WEEK: 'יום בשבוע',
  START_TIME: 'שעת התחלה',
  END_TIME: 'שעת סיום',
  LEADER: 'מוביל סיור',
  MAX_PARTICIPANTS: 'מספר משתתפים מקס',
  REGISTERED_COUNT: 'מספר נרשמים',
  SPOTS_LEFT: 'מקומות פנויים',
  STATUS: 'סטטוס סיור',
  REGISTRATIONS_LINK: 'נרשמים',
  NOTES: 'הערות',
  VERIFICATION_TASKS: 'Hadar_New_Report',
};

export const PATROL_STATUS = {
  OPEN: 'פתוח',
  FULL: 'מלא',
  FINISHED: 'הסתיים',
  CANCELLED: 'בוטל',
  DRAFT: 'טיוטה',
};

export const ROUTE_FIELDS = {
  ID: 'Route ID',
  NAME: 'שם המסלול',
  AREA: 'אזור',
  DURATION: 'משך',
  MEETING_POINT: 'נקודת מפגש',
  DESCRIPTION: 'תיאור מסלול הסיור',
  MAP: 'מפה',
  LINK: 'קישור למסלול',
  STREETS_LIST: 'רחובות המסלול',
  ACTIVE: 'פעיל',
  SPECIAL_INSTRUCTIONS: 'הנחיות מיוחדות',
  PATROLS: 'Patrols',
};

export const REGISTRATION_FIELDS = {
  ID: 'Registation ID', // note: typo exists in the live Airtable base itself
  PATROLS: 'Patrols',
  VOLUNTEER: 'מתנדב',
  REGISTERED_AT: 'תאריך הרשמה',
  STATUS: 'סטטוס',
};

export const REGISTRATION_STATUS = {
  REGISTERED: 'נרשם',
  CANCELLED: 'ביטל',
  WAITLIST: 'רשימת המתנה',
  ATTENDED: 'הגיע',
  NO_SHOW: 'לא הגיע',
};

export const ANNOUNCEMENT_FIELDS = {
  TITLE: 'כותרת',
  CONTENT: 'תוכן',
  TYPE: 'סוג',
  EXPIRY: 'תוקף',
  PINNED: 'נעוץ למעלה',
  ACTIVE: 'פעיל',
  CREATED_AT: 'תאריך יצירה',
};

export const ANNOUNCEMENT_TYPE = {
  UPDATE: 'עדכון שוטף',
  GUIDELINE: 'הנחיה קבועה',
  COMMUNITY_NEWS: 'חדשות בקהילה',
};

export const EMERGENCY_CONTACT_FIELDS = {
  NAME: 'שם שירות',
  PHONE: 'טלפון',
  ACTIVE: 'פעיל',
  ORDER: 'סדר תצוגה',
};

export const EVENT_FIELDS = {
  ID: 'Event ID',
  PATROL: 'Patrol',
  REPORTER: 'מדווח',
  TIME: 'שעה',
  CATEGORY: 'Categories',
  SUBCATEGORY: 'Subategories', // note: typo exists in the live Airtable base itself
  LOCATION: 'כתובת / מיקום',
  INTERVENTION: 'התערבות המתנדבים',
  DESCRIPTION: 'תיאור',
  STATUS: 'מצב בסיום הסיור',
};

export const EVENT_STATUS = {
  RESOLVED: 'הסתיים',
  NEEDS_FOLLOWUP: 'דורש טיפול נוסף',
};

export const STREET_FIELDS = {
  NAME: 'שם רחוב',
};

export const REPORT_CATEGORY_FIELDS = {
  NAME: 'שם קטגוריה',
};

export const REPORT_SUBCATEGORY_FIELDS = {
  NAME: 'שם תת קטגוריה',
  CATEGORY: 'שם קטגוריה',
};

export const HADAR_REPORT_FIELDS = {
  ID: 'מזהה',
  REPORT_TYPE: 'סוג דיווח',
  CATEGORY: 'קטגוריה',
  SUBCATEGORY: 'תת קטגוריה',
  DESCRIPTION: 'תיאור',
  STREET: 'רחוב',
  SUBCATEGORY_DISPLAY: 'תת קטגוריה לתצוגה',
  HOUSE_NUMBER: 'מס בית',
  MAIN_PHOTO: 'תמונה ראשית',
  REPORTER: 'שם מדווח', // link to Volunteers — only for reports actually filed by a registered volunteer
  REPORTER_NAME_TEXT: 'שם פונה', // free-text name, for residents / unmatched reporters
  PHONE: 'מספר טלפון',
  EMAIL: 'אימייל',
  REPORTED_AT: 'תאריך דיווח',
  STATUS: 'סטטוס',
  LAST_VERIFIED_AT: 'תאריך אימות אחרון',
  URGENCY: 'דחיפות',
  REQUIRES_VISIT: 'דורש ביקור',
  VISIT_DATE: 'תאריך ביקור',
  HANDLED_BY: 'טופל ע"י',
  TREATMENT_LOG: 'לוג טיפול',
  SOURCE: 'מקור הדיווח',
  MAP_ADDRESS: 'כתובת למפה',
  DISPLAYED_ADDRESS: 'כתובת מוצגת',
  DAYS_SINCE_REPORT: 'ימים מאז דיווח',
  VERIFYING_PATROL: 'סיור מאמת',
  ACTIVITY_LOG: 'Activity_Log',
  LAT: 'Lat',
  LNG: 'Lng',
};

export const HADAR_REPORT_TYPE = {
  ANONYMOUS: 'אנונימי',
  IDENTIFIED: 'מזוהה',
};

export const HADAR_REPORT_STATUS = {
  NEW: 'חדש',
  VERIFIED: 'אומת',
  IN_TREATMENT: 'בטיפול',
  CLOSED: 'נסגר',
};

export const HADAR_REPORT_URGENCY = {
  LOW: 'נמוכה',
  MEDIUM: 'בינונית',
  HIGH: 'גבוהה',
};

export const ACTIVITY_LOG_FIELDS = {
  REPORT_NUMBER: 'מספר דיווח',
  DATETIME: 'תאריך ושעה',
  RELATED_REPORT: 'קשור למפגע',
  ACTION_TYPE: 'סוג פעולה',
  CONTENT: 'תוכן דיווח',
  VOLUNTEER: 'שם מתנדב',
  FORWARDED_TO: 'הועבר לטיפול',
  TRACKING_PHOTO: 'תמונת מעקב',
  MUNICIPALITY_RESPONSE_STATUS: 'סטטוס מענה עירייה',
  MUNICIPALITY_RESPONSE_DATE: 'תאריך מענה',
};

export const MUNICIPALITY_RESPONSE_STATUS = {
  AWAITING: 'ממתין למענה',
  RESPONDED: 'נענה',
  HANDLED: 'טופל',
  REJECTED: 'נדחה',
};

export const ACTIVITY_LOG_ACTION_TYPE = {
  FIELD_VERIFICATION: 'אימות שטח',
  MUNICIPALITY_CONTACT: 'פניה לעירייה',
  RESIDENT_UPDATE: 'עדכון ע"י תושב',
  REPEAT_VISIT: 'ביקור חוזר',
  STATUS_CHANGE: 'שינוי סטטוס',
  HISTORICAL_INFO: 'מידע הסטורי',
  SOLUTION_IDEA: 'רעיון לפתרון',
  PHOTO_DOCUMENTATION: 'תיעוד מצולם',
};
