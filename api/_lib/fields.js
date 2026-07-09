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
};

export const VOLUNTEER_FIELDS = {
  ID: 'Volunteer ID',
  NAME: 'שם מלא',
  PHONE: 'טלפון',
  DEVICE_CLAIMED: 'משויך למכשיר',
  STATUS: 'סטטוס',
  ROLE: 'תפקיד',
  COORDINATOR_PASSWORD: 'סיסמת רכז',
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
};

export const COORDINATOR_ROLES = [VOLUNTEER_ROLE.MANAGER, VOLUNTEER_ROLE.AREA_COORDINATOR];

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
