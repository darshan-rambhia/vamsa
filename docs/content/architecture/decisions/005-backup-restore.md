# Backup and Restore Implementation Plan

## Overview

Implement comprehensive backup and restore functionality for Vamsa Family Tree, allowing administrators to:

- Export all family tree data to a downloadable archive
- Restore from previously exported backups
- Handle conflicts during restoration
- Validate data integrity

## Technical Design

### Data Export Format

The backup will be a ZIP archive containing:

```
vamsa-backup-{timestamp}.zip
├── metadata.json          # Backup metadata and version info
├── data/
│   ├── people.json        # All Person records
│   ├── relationships.json # All Relationship records
│   ├── users.json         # User accounts (sanitized)
│   ├── suggestions.json   # Pending suggestions
│   ├── settings.json      # Family settings
│   └── audit-logs.json    # Audit trail
└── photos/                # All uploaded photos
    └── {personId}/
        └── {filename}
```

### Backup Metadata Structure

```typescript
interface BackupMetadata {
  version: string; // App version
  backupVersion: "1.0"; // Backup format version
  createdAt: string; // ISO timestamp
  createdBy: {
    id: string;
    email: string;
    name: string;
  };
  statistics: {
    peopleCount: number;
    relationshipsCount: number;
    usersCount: number;
    photosCount: number;
    totalSizeMB: number;
  };
  databaseProvider: "postgresql" | "sqlite";
}
```

### Conflict Resolution Strategy

During restore, handle conflicts with these options:

1. **Skip** - Keep existing data, skip conflicting imports
2. **Replace** - Overwrite existing data with backup data
3. **Merge** - Intelligently merge data (newest wins for updates)

### Security Considerations

1. **Export Security**:
   - Require admin authentication
   - Log export actions in audit trail
   - Sanitize sensitive data (password hashes excluded)
   - Add rate limiting to prevent abuse

2. **Import Security**:
   - Validate backup file integrity
   - Check backup version compatibility
   - Require admin confirmation before restore
   - Create automatic backup before restore
   - Validate all data against schemas

## Implementation Breakdown

### Phase 1: Backend Export API (vamsa-bl7.2)

**Files to create/modify:**

- `src/actions/backup.ts` - Export logic
- `src/app/api/admin/backup/export/route.ts` - Streaming ZIP download
- `src/schemas/backup.ts` - Validation schemas

**Acceptance Criteria:**

- [ ] Admin can trigger full data export
- [ ] Export includes all database tables
- [ ] Photos are included in the archive
- [ ] Metadata file contains backup info
- [ ] Download streams as ZIP file
- [ ] Export action logged in audit trail
- [ ] Rate limited to 1 export per 5 minutes

### Phase 2: Backend Import API (vamsa-bl7.3)

**Files to create/modify:**

- `src/actions/restore.ts` - Import logic with conflict resolution
- `src/app/api/admin/backup/import/route.ts` - File upload and processing
- `src/lib/backup/validator.ts` - Backup validation utilities
- `src/lib/backup/conflict-resolver.ts` - Conflict resolution logic

**Acceptance Criteria:**

- [ ] Admin can upload backup ZIP file
- [ ] Backup format and version validated
- [ ] Preview shows what will be imported
- [ ] Conflict resolution options work correctly
- [ ] Photos restored to storage adapter
- [ ] Database transaction ensures atomicity
- [ ] Import action logged in audit trail
- [ ] Automatic backup created before restore

### Phase 3: Frontend UI (vamsa-bl7.4)

**Files to create/modify:**

- `src/app/(dashboard)/admin/backup/page.tsx` - Main backup/restore page
- `src/components/admin/backup-export.tsx` - Export UI component
- `src/components/admin/backup-import.tsx` - Import UI component
- `src/components/admin/import-preview.tsx` - Preview and conflict resolution

**Acceptance Criteria:**

- [ ] Admin menu includes "Backup & Restore" option
- [ ] Export section shows last backup info
- [ ] Export button triggers download with progress
- [ ] Import section accepts ZIP file upload
- [ ] Import preview shows statistics
- [ ] Conflict resolution UI is intuitive
- [ ] Success/error messages are clear
- [ ] Loading states during operations

## API Endpoints

### Export Endpoint

```
GET /api/admin/backup/export
Response: Streaming ZIP file download
Headers:
  - Content-Type: application/zip
  - Content-Disposition: attachment; filename="vamsa-backup-{timestamp}.zip"
```

### Import Endpoints

```
POST /api/admin/backup/validate
Body: FormData with backup file
Response: {
  valid: boolean;
  metadata: BackupMetadata;
  conflicts: ConflictSummary;
}

POST /api/admin/backup/import
Body: FormData with backup file + resolution strategy
Response: {
  success: boolean;
  imported: ImportStatistics;
  errors?: string[];
}
```

## Database Considerations

### Transaction Management

- Use Prisma transactions for atomic imports
- Rollback on any validation failure
- Handle large datasets with batching

### Performance Optimization

- Stream large exports instead of loading all data
- Process imports in chunks
- Add progress tracking for long operations

## Testing Strategy

### Unit Tests

- Backup format validation
- Conflict resolution logic
- Data transformation functions

### Integration Tests

- Full export/import cycle
- Photo storage handling
- Transaction rollback scenarios

### E2E Tests

- Complete backup workflow
- Import with conflicts
- Error handling

## Migration Path

No database migrations needed - using existing schema.

## Error Handling

### Export Errors

- Database connection issues → Retry with backoff
- Storage access issues → Clear error message
- Memory issues → Stream data in chunks

### Import Errors

- Invalid file format → Show validation errors
- Version mismatch → Suggest upgrade path
- Conflicts → Present resolution options
- Storage full → Check before import

## Future Enhancements

1. **Scheduled Backups** - Automatic daily/weekly backups
2. **Cloud Storage** - Direct backup to S3/Google Drive
3. **Incremental Backups** - Only export changes since last backup
4. **Selective Restore** - Choose specific data to restore
5. **Backup Encryption** - Password-protected archives

## Dependencies

- `archiver` - For creating ZIP files
- `unzipper` - For extracting ZIP files
- `stream` - For handling large files
- Existing Prisma models and storage adapter

## Security Checklist

- [ ] Admin-only access enforced
- [ ] File upload size limits
- [ ] Malicious file detection
- [ ] SQL injection prevention
- [ ] Path traversal prevention
- [ ] Rate limiting implemented
- [ ] Audit logging complete
