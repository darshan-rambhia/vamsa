// Date utilities
export {
  parseDateString,
  formatDate,
  formatDateForInput,
  calculateAge,
  createDateOnly,
  toDateOnly,
} from "./date";

// General utilities
export { generateRandomPassword, getInitials } from "./utils";

// Event utilities
export {
  mapGedcomTagToEventType,
  mapEventTypeToGedcomTag,
  getEventTypeLabel,
  type EventType,
  GEDCOM_TO_EVENT_TYPE,
  EVENT_TYPE_TO_GEDCOM,
  EVENT_TYPE_LABELS,
} from "./event";

// GEDCOM support
export * from "./gedcom";

// Logging
export {
  logger,
  createContextLogger,
  createRequestLogger,
  startTimer,
  serializeError,
} from "./logger";

// Backup utilities (re-exported from backup/index.ts)
export * from "./backup/index";
