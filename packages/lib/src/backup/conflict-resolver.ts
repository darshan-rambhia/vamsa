// Conflict resolver utility for handling backup import conflicts
// This utility is designed to work with any database interface

export type ConflictResolutionStrategy = "skip" | "replace" | "merge";

export interface Conflict {
  type: "person" | "user" | "relationship" | "suggestion" | "settings";
  action: "create" | "update";
  existingId?: string;
  existingData?: Record<string, any>;
  newData: Record<string, any>;
  conflictFields: string[];
  severity: "low" | "medium" | "high";
  description: string;
}

export interface ImportStatistics {
  peopleImported: number;
  relationshipsImported: number;
  usersImported: number;
  suggestionsImported: number;
  photosImported: number;
  auditLogsImported: number;
  conflictsResolved: number;
  skippedItems: number;
}

export interface ImportedBy {
  id: string;
  email: string;
  name: string | null;
}

export interface DatabaseInterface {
  person: {
    findUnique: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
  user: {
    findUnique: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
  relationship: {
    findUnique: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
  suggestion: {
    create: (args: any) => Promise<any>;
  };
  familySettings: {
    findFirst: () => Promise<any>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
  auditLog: {
    create: (args: any) => Promise<any>;
  };
}

export class ConflictResolver {
  private strategy: ConflictResolutionStrategy;
  private importedBy: ImportedBy;
  private db: DatabaseInterface;
  private statistics: ImportStatistics = {
    peopleImported: 0,
    relationshipsImported: 0,
    usersImported: 0,
    suggestionsImported: 0,
    photosImported: 0,
    auditLogsImported: 0,
    conflictsResolved: 0,
    skippedItems: 0,
  };

  constructor(
    strategy: ConflictResolutionStrategy,
    importedBy: ImportedBy,
    db: DatabaseInterface
  ) {
    this.strategy = strategy;
    this.importedBy = importedBy;
    this.db = db;
  }

  async importData(
    extractedFiles: Map<string, any>,
    conflicts: Conflict[]
  ): Promise<{
    statistics: ImportStatistics;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Create conflict lookup for quick access
      const conflictMap = new Map<string, Conflict[]>();
      for (const conflict of conflicts) {
        const key = `${conflict.type}-${conflict.newData.id || conflict.existingId}`;
        if (!conflictMap.has(key)) {
          conflictMap.set(key, []);
        }
        conflictMap.get(key)!.push(conflict);
      }

      // Import in order: settings, people, users, relationships, suggestions, audit logs
      await this.importSettings(extractedFiles, conflictMap, errors, warnings);
      await this.importPeople(extractedFiles, conflictMap, errors, warnings);
      await this.importUsers(extractedFiles, conflictMap, errors, warnings);
      await this.importRelationships(
        extractedFiles,
        conflictMap,
        errors,
        warnings
      );
      await this.importSuggestions(
        extractedFiles,
        conflictMap,
        errors,
        warnings
      );
      await this.importAuditLogs(extractedFiles, conflictMap, errors, warnings);

      return {
        statistics: this.statistics,
        errors,
        warnings,
      };
    } catch (error) {
      console.error("Import error:", error);
      errors.push(
        `Import failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      return {
        statistics: this.statistics,
        errors,
        warnings,
      };
    }
  }

  private async importSettings(
    extractedFiles: Map<string, any>,
    conflictMap: Map<string, Conflict[]>,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    if (!extractedFiles.has("data/settings.json")) {
      return;
    }

    const settingsData = extractedFiles.get("data/settings.json");
    if (!settingsData) {
      return;
    }

    try {
      const existingSettings = await this.db.familySettings.findFirst();

      if (existingSettings) {
        if (this.strategy === "skip") {
          warnings.push("Skipped family settings (already exists)");
          this.statistics.skippedItems++;
          return;
        }

        if (this.strategy === "replace") {
          await this.db.familySettings.update({
            where: { id: existingSettings.id },
            data: this.prepareSettingsData(settingsData),
          });
          this.statistics.conflictsResolved++;
        } else if (this.strategy === "merge") {
          const updateData = this.mergeSettingsData(
            existingSettings,
            settingsData
          );

          if (Object.keys(updateData).length > 0) {
            await this.db.familySettings.update({
              where: { id: existingSettings.id },
              data: updateData,
            });
            this.statistics.conflictsResolved++;
          }
        }
      } else {
        await this.db.familySettings.create({
          data: this.prepareSettingsData(settingsData),
        });
      }
    } catch (error) {
      errors.push(
        `Failed to import settings: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private async importPeople(
    extractedFiles: Map<string, any>,
    conflictMap: Map<string, Conflict[]>,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    if (!extractedFiles.has("data/people.json")) {
      return;
    }

    const peopleData = extractedFiles.get("data/people.json");
    if (!Array.isArray(peopleData)) {
      return;
    }

    for (const person of peopleData) {
      try {
        const conflictKey = `person-${person.id}`;
        const personConflicts = conflictMap.get(conflictKey) || [];

        if (personConflicts.length > 0) {
          const hasHighSeverity = personConflicts.some(
            (c) => c.severity === "high"
          );

          if (
            this.strategy === "skip" ||
            (hasHighSeverity && this.strategy !== "replace")
          ) {
            warnings.push(
              `Skipped person ${person.firstName} ${person.lastName} due to conflicts`
            );
            this.statistics.skippedItems++;
            continue;
          }

          if (this.strategy === "replace") {
            const existingPerson = await this.db.person.findUnique({
              where: { id: person.id },
            });
            if (existingPerson) {
              await this.db.person.update({
                where: { id: person.id },
                data: this.preparePeopleData(person),
              });
              this.statistics.conflictsResolved++;
            } else {
              await this.db.person.create({
                data: this.preparePeopleData(person),
              });
            }
            this.statistics.peopleImported++;
          } else if (this.strategy === "merge") {
            const existingPerson = await this.db.person.findUnique({
              where: { id: person.id },
            });
            if (existingPerson) {
              const mergedData = this.mergePeopleData(existingPerson, person);
              await this.db.person.update({
                where: { id: person.id },
                data: mergedData,
              });
              this.statistics.conflictsResolved++;
            } else {
              await this.db.person.create({
                data: this.preparePeopleData(person),
              });
            }
            this.statistics.peopleImported++;
          }
        } else {
          // No conflicts, create new person
          await this.db.person.create({
            data: this.preparePeopleData(person),
          });
          this.statistics.peopleImported++;
        }
      } catch (error) {
        errors.push(
          `Failed to import person ${person.firstName} ${person.lastName}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }
  }

  private async importUsers(
    extractedFiles: Map<string, any>,
    conflictMap: Map<string, Conflict[]>,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    if (!extractedFiles.has("data/users.json")) {
      return;
    }

    const usersData = extractedFiles.get("data/users.json");
    if (!Array.isArray(usersData)) {
      return;
    }

    for (const user of usersData) {
      try {
        const conflictKey = `user-${user.id}`;
        const userConflicts = conflictMap.get(conflictKey) || [];

        if (userConflicts.length > 0) {
          if (this.strategy === "skip") {
            warnings.push(`Skipped user ${user.email} due to conflicts`);
            this.statistics.skippedItems++;
            continue;
          }

          if (this.strategy === "replace") {
            const existingUser = await this.db.user.findUnique({
              where: { id: user.id },
            });
            if (existingUser) {
              await this.db.user.update({
                where: { id: user.id },
                data: this.prepareUserData(user),
              });
              this.statistics.conflictsResolved++;
            } else {
              await this.db.user.create({
                data: this.prepareUserData(user),
              });
            }
            this.statistics.usersImported++;
          } else if (this.strategy === "merge") {
            const existingUser = await this.db.user.findUnique({
              where: { id: user.id },
            });
            if (existingUser) {
              const mergedData = this.mergeUserData(existingUser, user);
              await this.db.user.update({
                where: { id: user.id },
                data: mergedData,
              });
              this.statistics.conflictsResolved++;
            } else {
              await this.db.user.create({
                data: this.prepareUserData(user),
              });
            }
            this.statistics.usersImported++;
          }
        } else {
          // No conflicts, create new user
          await this.db.user.create({
            data: this.prepareUserData(user),
          });
          this.statistics.usersImported++;
        }
      } catch (error) {
        errors.push(
          `Failed to import user ${user.email}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }
  }

  private async importRelationships(
    extractedFiles: Map<string, any>,
    conflictMap: Map<string, Conflict[]>,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    if (!extractedFiles.has("data/relationships.json")) {
      return;
    }

    const relationshipsData = extractedFiles.get("data/relationships.json");
    if (!Array.isArray(relationshipsData)) {
      return;
    }

    for (const relationship of relationshipsData) {
      try {
        const conflictKey = `relationship-${relationship.id}`;
        const relationshipConflicts = conflictMap.get(conflictKey) || [];

        if (relationshipConflicts.length > 0) {
          if (this.strategy === "skip") {
            warnings.push(
              `Skipped relationship ${relationship.id} due to conflicts`
            );
            this.statistics.skippedItems++;
            continue;
          }

          if (this.strategy === "replace") {
            const existingRelationship = await this.db.relationship.findUnique({
              where: { id: relationship.id },
            });
            if (existingRelationship) {
              await this.db.relationship.update({
                where: { id: relationship.id },
                data: this.prepareRelationshipData(relationship),
              });
              this.statistics.conflictsResolved++;
            } else {
              await this.db.relationship.create({
                data: this.prepareRelationshipData(relationship),
              });
            }
            this.statistics.relationshipsImported++;
          } else if (this.strategy === "merge") {
            const existingRelationship = await this.db.relationship.findUnique({
              where: { id: relationship.id },
            });
            if (existingRelationship) {
              const mergedData = this.mergeRelationshipData(
                existingRelationship,
                relationship
              );
              await this.db.relationship.update({
                where: { id: relationship.id },
                data: mergedData,
              });
              this.statistics.conflictsResolved++;
            } else {
              await this.db.relationship.create({
                data: this.prepareRelationshipData(relationship),
              });
            }
            this.statistics.relationshipsImported++;
          }
        } else {
          // No conflicts, create new relationship
          await this.db.relationship.create({
            data: this.prepareRelationshipData(relationship),
          });
          this.statistics.relationshipsImported++;
        }
      } catch (error) {
        errors.push(
          `Failed to import relationship ${relationship.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }
  }

  private async importSuggestions(
    extractedFiles: Map<string, any>,
    conflictMap: Map<string, Conflict[]>,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    if (!extractedFiles.has("data/suggestions.json")) {
      return;
    }

    const suggestionsData = extractedFiles.get("data/suggestions.json");
    if (!Array.isArray(suggestionsData)) {
      return;
    }

    for (const suggestion of suggestionsData) {
      try {
        // Skip suggestions that reference non-existent users or people
        const submitterExists = await this.db.user.findUnique({
          where: { id: suggestion.submittedById },
        });
        if (!submitterExists) {
          warnings.push(
            `Skipped suggestion ${suggestion.id} - submitter not found`
          );
          this.statistics.skippedItems++;
          continue;
        }

        if (suggestion.targetPersonId) {
          const targetExists = await this.db.person.findUnique({
            where: { id: suggestion.targetPersonId },
          });
          if (!targetExists) {
            warnings.push(
              `Skipped suggestion ${suggestion.id} - target person not found`
            );
            this.statistics.skippedItems++;
            continue;
          }
        }

        await this.db.suggestion.create({
          data: {
            id: suggestion.id,
            type: suggestion.type,
            targetPersonId: suggestion.targetPersonId,
            suggestedData: suggestion.suggestedData,
            reason: suggestion.reason,
            status: suggestion.status,
            submittedById: suggestion.submittedById,
            reviewedById: suggestion.reviewedById,
            reviewNote: suggestion.reviewNote,
            submittedAt: new Date(suggestion.submittedAt),
            reviewedAt: suggestion.reviewedAt
              ? new Date(suggestion.reviewedAt)
              : null,
          },
        });
        this.statistics.suggestionsImported++;
      } catch (error) {
        errors.push(
          `Failed to import suggestion ${suggestion.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }
  }

  private async importAuditLogs(
    extractedFiles: Map<string, any>,
    conflictMap: Map<string, Conflict[]>,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    if (!extractedFiles.has("data/audit-logs.json")) {
      return;
    }

    const auditLogsData = extractedFiles.get("data/audit-logs.json");
    if (!Array.isArray(auditLogsData)) {
      return;
    }

    for (const auditLog of auditLogsData) {
      try {
        // Skip audit logs for non-existent users
        const userExists = await this.db.user.findUnique({
          where: { id: auditLog.userId },
        });
        if (!userExists) {
          warnings.push(`Skipped audit log ${auditLog.id} - user not found`);
          this.statistics.skippedItems++;
          continue;
        }

        await this.db.auditLog.create({
          data: {
            id: auditLog.id,
            userId: auditLog.userId,
            action: auditLog.action,
            entityType: auditLog.entityType,
            entityId: auditLog.entityId,
            previousData: auditLog.previousData,
            newData: auditLog.newData,
            ipAddress: auditLog.ipAddress,
            userAgent: auditLog.userAgent,
            createdAt: new Date(auditLog.createdAt),
          },
        });
        this.statistics.auditLogsImported++;
      } catch (error) {
        errors.push(
          `Failed to import audit log ${auditLog.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }
  }

  private preparePeopleData(person: any) {
    return {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email || null,
      createdAt: new Date(person.createdAt),
      updatedAt: new Date(person.updatedAt),
    };
  }

  private prepareUserData(user: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name || null,
      personId: user.personId || null,
      role: user.role,
      isActive: user.isActive !== false,
      mustChangePassword: user.mustChangePassword || false,
      invitedById: user.invitedById || null,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
      lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
    };
  }

  private prepareRelationshipData(relationship: any) {
    return {
      id: relationship.id,
      personId: relationship.personId,
      relatedPersonId: relationship.relatedPersonId,
      type: relationship.type,
      createdAt: new Date(relationship.createdAt),
      updatedAt: new Date(relationship.updatedAt),
    };
  }

  private prepareSettingsData(settings: any) {
    return {
      familyName: settings.familyName || "My Family",
      description: settings.description || null,
      locale: settings.locale || "en",
    };
  }

  private mergePeopleData(existing: any, incoming: any) {
    const merged: any = { ...existing };

    if (incoming.firstName) merged.firstName = incoming.firstName;
    if (incoming.lastName) merged.lastName = incoming.lastName;
    if (incoming.email) merged.email = incoming.email;

    return merged;
  }

  private mergeUserData(existing: any, incoming: any) {
    const merged: any = { ...existing };

    if (incoming.name) merged.name = incoming.name;
    if (incoming.personId) merged.personId = incoming.personId;
    if (incoming.role) merged.role = incoming.role;
    if (incoming.isActive !== undefined) merged.isActive = incoming.isActive;
    if (incoming.mustChangePassword !== undefined)
      merged.mustChangePassword = incoming.mustChangePassword;
    if (incoming.invitedById) merged.invitedById = incoming.invitedById;
    if (incoming.lastLoginAt)
      merged.lastLoginAt = new Date(incoming.lastLoginAt);

    return merged;
  }

  private mergeRelationshipData(existing: any, incoming: any) {
    const merged: any = { ...existing };

    if (incoming.type) merged.type = incoming.type;

    return merged;
  }

  private mergeSettingsData(existing: any, incoming: any) {
    const merged: any = { ...existing };

    if (incoming.familyName) merged.familyName = incoming.familyName;
    if (incoming.description) merged.description = incoming.description;
    if (incoming.locale) merged.locale = incoming.locale;

    return merged;
  }
}
