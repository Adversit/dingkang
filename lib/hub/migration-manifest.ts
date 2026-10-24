// Static allowlist derived from the 33 retained modules/*/db/schema.ts business tables and SQL.
// This deliberately excludes hub_states, hub_state_versions and hub_files.
export type MigrationTable = {sourceProjectId:string;module:string;columns: readonly {name:string;type:string;notNull:boolean}[];primaryKey:readonly string[]};
export const MIGRATION_TABLES: Readonly<Record<string, MigrationTable>> = {
  "ai_dev_collaboration_workbench__workspaces": {
    "sourceProjectId": "appgprj_6aa917d1437c8191b4b56a66ae8215bf",
    "module": "ai-dev-collaboration-workbench",
    "columns": [
      {
        "name": "user_id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "data",
        "type": "text",
        "notNull": true
      },
      {
        "name": "revision",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "updated_at",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "user_id"
    ]
  },
  "ai_dev_collaboration_workbench__admin_reads": {
    "sourceProjectId": "appgprj_6aa917d1437c8191b4b56a66ae8215bf",
    "module": "ai-dev-collaboration-workbench",
    "columns": [
      {
        "name": "id",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "actor",
        "type": "text",
        "notNull": true
      },
      {
        "name": "target",
        "type": "text",
        "notNull": true
      },
      {
        "name": "action",
        "type": "text",
        "notNull": true
      },
      {
        "name": "reason",
        "type": "text",
        "notNull": true
      },
      {
        "name": "created_at",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "id"
    ]
  },
  "ai_dev_collaboration_workbench__delivery_projects": {
    "sourceProjectId": "appgprj_6aa917d1437c8191b4b56a66ae8215bf",
    "module": "ai-dev-collaboration-workbench",
    "columns": [
      {
        "name": "id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "owner",
        "type": "text",
        "notNull": true
      },
      {
        "name": "title",
        "type": "text",
        "notNull": true
      },
      {
        "name": "state",
        "type": "text",
        "notNull": true
      },
      {
        "name": "revision",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "operation",
        "type": "text",
        "notNull": true
      },
      {
        "name": "created_at",
        "type": "text",
        "notNull": true
      },
      {
        "name": "updated_at",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "id"
    ]
  },
  "ai_dev_collaboration_workbench__delivery_events": {
    "sourceProjectId": "appgprj_6aa917d1437c8191b4b56a66ae8215bf",
    "module": "ai-dev-collaboration-workbench",
    "columns": [
      {
        "name": "id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "owner",
        "type": "text",
        "notNull": true
      },
      {
        "name": "project_id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "operation",
        "type": "text",
        "notNull": true
      },
      {
        "name": "action",
        "type": "text",
        "notNull": true
      },
      {
        "name": "revision",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "summary",
        "type": "text",
        "notNull": true
      },
      {
        "name": "created_at",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "id"
    ]
  },
  "ai_dev_collaboration_workbench__delivery_calls": {
    "sourceProjectId": "appgprj_6aa917d1437c8191b4b56a66ae8215bf",
    "module": "ai-dev-collaboration-workbench",
    "columns": [
      {
        "name": "id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "owner",
        "type": "text",
        "notNull": true
      },
      {
        "name": "operation",
        "type": "text",
        "notNull": true
      },
      {
        "name": "project_id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "status",
        "type": "text",
        "notNull": true
      },
      {
        "name": "created_at",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "id"
    ]
  },
  "evopm_workbench__workspaces": {
    "sourceProjectId": "appgprj_6ad5cb4e1d488191b8bcfc7d9420ed51",
    "module": "evopm-workbench",
    "columns": [
      {
        "name": "owner_id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "state_json",
        "type": "text",
        "notNull": true
      },
      {
        "name": "revision",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "updated_at",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "owner_id"
    ]
  },
  "evopm_workbench__action_receipts": {
    "sourceProjectId": "appgprj_6ad5cb4e1d488191b8bcfc7d9420ed51",
    "module": "evopm-workbench",
    "columns": [
      {
        "name": "owner_id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "request_id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "request_hash",
        "type": "text",
        "notNull": true
      },
      {
        "name": "revision",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "result_json",
        "type": "text",
        "notNull": true
      },
      {
        "name": "created_at",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "owner_id",
      "request_id"
    ]
  },
  "evopm_workbench__analysis_leases": {
    "sourceProjectId": "appgprj_6ad5cb4e1d488191b8bcfc7d9420ed51",
    "module": "evopm-workbench",
    "columns": [
      {
        "name": "owner_id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "request_id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "token",
        "type": "text",
        "notNull": true
      },
      {
        "name": "expires_at",
        "type": "integer",
        "notNull": true
      }
    ],
    "primaryKey": [
      "owner_id",
      "request_id"
    ]
  },
  "roommate_housekeeper__demo_households": {
    "sourceProjectId": "appgprj_6ac500bf5c6c8191888ce0ed88f034cd",
    "module": "roommate-housekeeper",
    "columns": [
      {
        "name": "id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "data",
        "type": "text",
        "notNull": true
      },
      {
        "name": "version",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "updated_at",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "id"
    ]
  },
  "wandeng_evening__preferences": {
    "sourceProjectId": "appgprj_6ad5cb188f4081918a4578674ebd38f6",
    "module": "wandeng-evening",
    "columns": [
      {
        "name": "owner",
        "type": "text",
        "notNull": true
      },
      {
        "name": "history",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "memory",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "consent",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "epoch",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "updated",
        "type": "text",
        "notNull": true
      },
      {
        "name": "nickname",
        "type": "text",
        "notNull": true
      },
      {
        "name": "tone",
        "type": "text",
        "notNull": true
      },
      {
        "name": "reply_length",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "owner"
    ]
  },
  "wandeng_evening__conversations": {
    "sourceProjectId": "appgprj_6ad5cb188f4081918a4578674ebd38f6",
    "module": "wandeng-evening",
    "columns": [
      {
        "name": "id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "owner",
        "type": "text",
        "notNull": true
      },
      {
        "name": "title",
        "type": "text",
        "notNull": true
      },
      {
        "name": "mode",
        "type": "text",
        "notNull": true
      },
      {
        "name": "mood",
        "type": "text",
        "notNull": false
      },
      {
        "name": "created",
        "type": "text",
        "notNull": true
      },
      {
        "name": "updated",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "id"
    ]
  },
  "wandeng_evening__messages": {
    "sourceProjectId": "appgprj_6ad5cb188f4081918a4578674ebd38f6",
    "module": "wandeng-evening",
    "columns": [
      {
        "name": "id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "owner",
        "type": "text",
        "notNull": true
      },
      {
        "name": "conversation",
        "type": "text",
        "notNull": true
      },
      {
        "name": "role",
        "type": "text",
        "notNull": true
      },
      {
        "name": "content",
        "type": "text",
        "notNull": true
      },
      {
        "name": "context_blocked",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "created",
        "type": "text",
        "notNull": true
      },
      {
        "name": "memory_refs",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "id"
    ]
  },
  "wandeng_evening__memories": {
    "sourceProjectId": "appgprj_6ad5cb188f4081918a4578674ebd38f6",
    "module": "wandeng-evening",
    "columns": [
      {
        "name": "id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "owner",
        "type": "text",
        "notNull": true
      },
      {
        "name": "type",
        "type": "text",
        "notNull": true
      },
      {
        "name": "topic",
        "type": "text",
        "notNull": true
      },
      {
        "name": "content",
        "type": "text",
        "notNull": true
      },
      {
        "name": "sources",
        "type": "text",
        "notNull": true
      },
      {
        "name": "status",
        "type": "text",
        "notNull": true
      },
      {
        "name": "created",
        "type": "text",
        "notNull": true
      },
      {
        "name": "updated",
        "type": "text",
        "notNull": true
      },
      {
        "name": "expires",
        "type": "text",
        "notNull": false
      }
    ],
    "primaryKey": [
      "id"
    ]
  },
  "wandeng_evening__pages": {
    "sourceProjectId": "appgprj_6ad5cb188f4081918a4578674ebd38f6",
    "module": "wandeng-evening",
    "columns": [
      {
        "name": "id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "owner",
        "type": "text",
        "notNull": true
      },
      {
        "name": "title",
        "type": "text",
        "notNull": true
      },
      {
        "name": "content",
        "type": "text",
        "notNull": true
      },
      {
        "name": "date",
        "type": "text",
        "notNull": true
      },
      {
        "name": "mood",
        "type": "text",
        "notNull": false
      },
      {
        "name": "sources",
        "type": "text",
        "notNull": true
      },
      {
        "name": "created",
        "type": "text",
        "notNull": true
      },
      {
        "name": "updated",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "id"
    ]
  },
  "wandeng_evening__suppressions": {
    "sourceProjectId": "appgprj_6ad5cb188f4081918a4578674ebd38f6",
    "module": "wandeng-evening",
    "columns": [
      {
        "name": "id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "owner",
        "type": "text",
        "notNull": true
      },
      {
        "name": "hash",
        "type": "text",
        "notNull": true
      },
      {
        "name": "created",
        "type": "text",
        "notNull": true
      },
      {
        "name": "memory_id",
        "type": "text",
        "notNull": false
      },
      {
        "name": "sources",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "id"
    ]
  },
  "wandeng_evening__runs": {
    "sourceProjectId": "appgprj_6ad5cb188f4081918a4578674ebd38f6",
    "module": "wandeng-evening",
    "columns": [
      {
        "name": "id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "owner",
        "type": "text",
        "notNull": true
      },
      {
        "name": "conversation",
        "type": "text",
        "notNull": false
      },
      {
        "name": "model",
        "type": "text",
        "notNull": true
      },
      {
        "name": "status",
        "type": "text",
        "notNull": true
      },
      {
        "name": "duration",
        "type": "integer",
        "notNull": false
      },
      {
        "name": "input_tokens",
        "type": "integer",
        "notNull": false
      },
      {
        "name": "output_tokens",
        "type": "integer",
        "notNull": false
      },
      {
        "name": "created",
        "type": "text",
        "notNull": true
      },
      {
        "name": "expires",
        "type": "text",
        "notNull": false
      }
    ],
    "primaryKey": [
      "id"
    ]
  },
  "zhiliu_radar__sources": {
    "sourceProjectId": "appgprj_6ad5cae29fa8819186c1d8648f5913cf",
    "module": "zhiliu-radar",
    "columns": [
      {
        "name": "id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "name",
        "type": "text",
        "notNull": true
      },
      {
        "name": "url",
        "type": "text",
        "notNull": true
      },
      {
        "name": "kind",
        "type": "text",
        "notNull": true
      },
      {
        "name": "category",
        "type": "text",
        "notNull": true
      },
      {
        "name": "quality",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "official",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "enabled",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "etag",
        "type": "text",
        "notNull": false
      },
      {
        "name": "modified",
        "type": "text",
        "notNull": false
      },
      {
        "name": "last_attempt",
        "type": "text",
        "notNull": false
      },
      {
        "name": "last_success",
        "type": "text",
        "notNull": false
      },
      {
        "name": "last_error",
        "type": "text",
        "notNull": false
      },
      {
        "name": "failures",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "created_at",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "id"
    ]
  },
  "zhiliu_radar__items": {
    "sourceProjectId": "appgprj_6ad5cae29fa8819186c1d8648f5913cf",
    "module": "zhiliu-radar",
    "columns": [
      {
        "name": "id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "source_id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "raw_url",
        "type": "text",
        "notNull": true
      },
      {
        "name": "canonical_url",
        "type": "text",
        "notNull": true
      },
      {
        "name": "title",
        "type": "text",
        "notNull": true
      },
      {
        "name": "excerpt",
        "type": "text",
        "notNull": true
      },
      {
        "name": "content_hash",
        "type": "text",
        "notNull": true
      },
      {
        "name": "published_at",
        "type": "text",
        "notNull": false
      },
      {
        "name": "raw_published",
        "type": "text",
        "notNull": false
      },
      {
        "name": "ingested_at",
        "type": "text",
        "notNull": true
      },
      {
        "name": "scope",
        "type": "text",
        "notNull": true
      },
      {
        "name": "category",
        "type": "text",
        "notNull": true
      },
      {
        "name": "job",
        "type": "text",
        "notNull": false
      },
      {
        "name": "job_override",
        "type": "text",
        "notNull": false
      }
    ],
    "primaryKey": [
      "id"
    ]
  },
  "zhiliu_radar__item_sources": {
    "sourceProjectId": "appgprj_6ad5cae29fa8819186c1d8648f5913cf",
    "module": "zhiliu-radar",
    "columns": [
      {
        "name": "item_id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "source_id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "raw_url",
        "type": "text",
        "notNull": true
      },
      {
        "name": "fetched_at",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "item_id",
      "source_id"
    ]
  },
  "zhiliu_radar__events": {
    "sourceProjectId": "appgprj_6ad5cae29fa8819186c1d8648f5913cf",
    "module": "zhiliu-radar",
    "columns": [
      {
        "name": "id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "title",
        "type": "text",
        "notNull": true
      },
      {
        "name": "category",
        "type": "text",
        "notNull": true
      },
      {
        "name": "manual_title",
        "type": "text",
        "notNull": false
      },
      {
        "name": "manual_summary",
        "type": "text",
        "notNull": false
      },
      {
        "name": "locked",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "created_at",
        "type": "text",
        "notNull": true
      },
      {
        "name": "updated_at",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "id"
    ]
  },
  "zhiliu_radar__item_event_links": {
    "sourceProjectId": "appgprj_6ad5cae29fa8819186c1d8648f5913cf",
    "module": "zhiliu-radar",
    "columns": [
      {
        "name": "item_id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "event_id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "manual",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "relation",
        "type": "text",
        "notNull": true
      },
      {
        "name": "assigned_at",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "item_id"
    ]
  },
  "zhiliu_radar__reading_feedback": {
    "sourceProjectId": "appgprj_6ad5cae29fa8819186c1d8648f5913cf",
    "module": "zhiliu-radar",
    "columns": [
      {
        "name": "owner",
        "type": "text",
        "notNull": true
      },
      {
        "name": "event_id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "kind",
        "type": "text",
        "notNull": true
      },
      {
        "name": "created_at",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "owner",
      "event_id",
      "kind"
    ]
  },
  "zhiliu_radar__user_preferences": {
    "sourceProjectId": "appgprj_6ad5cae29fa8819186c1d8648f5913cf",
    "module": "zhiliu-radar",
    "columns": [
      {
        "name": "owner",
        "type": "text",
        "notNull": true
      },
      {
        "name": "value",
        "type": "text",
        "notNull": true
      },
      {
        "name": "updated_at",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "owner"
    ]
  },
  "zhiliu_radar__digests": {
    "sourceProjectId": "appgprj_6ad5cae29fa8819186c1d8648f5913cf",
    "module": "zhiliu-radar",
    "columns": [
      {
        "name": "id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "owner",
        "type": "text",
        "notNull": true
      },
      {
        "name": "date",
        "type": "text",
        "notNull": true
      },
      {
        "name": "content",
        "type": "text",
        "notNull": true
      },
      {
        "name": "event_ids",
        "type": "text",
        "notNull": true
      },
      {
        "name": "edited",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "created_at",
        "type": "text",
        "notNull": true
      },
      {
        "name": "updated_at",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "id"
    ]
  },
  "zhiliu_radar__ingestion_runs": {
    "sourceProjectId": "appgprj_6ad5cae29fa8819186c1d8648f5913cf",
    "module": "zhiliu-radar",
    "columns": [
      {
        "name": "id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "state",
        "type": "text",
        "notNull": true
      },
      {
        "name": "trigger",
        "type": "text",
        "notNull": true
      },
      {
        "name": "started_at",
        "type": "text",
        "notNull": true
      },
      {
        "name": "finished_at",
        "type": "text",
        "notNull": false
      },
      {
        "name": "total",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "succeeded",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "failed",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "inserted",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "duplicates",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "results",
        "type": "text",
        "notNull": true
      },
      {
        "name": "error",
        "type": "text",
        "notNull": false
      }
    ],
    "primaryKey": [
      "id"
    ]
  },
  "zhiliu_radar__operation_locks": {
    "sourceProjectId": "appgprj_6ad5cae29fa8819186c1d8648f5913cf",
    "module": "zhiliu-radar",
    "columns": [
      {
        "name": "key",
        "type": "text",
        "notNull": true
      },
      {
        "name": "token",
        "type": "text",
        "notNull": true
      },
      {
        "name": "expires",
        "type": "integer",
        "notNull": true
      }
    ],
    "primaryKey": [
      "key"
    ]
  },
  "zhiliu_radar__idempotency": {
    "sourceProjectId": "appgprj_6ad5cae29fa8819186c1d8648f5913cf",
    "module": "zhiliu-radar",
    "columns": [
      {
        "name": "key",
        "type": "text",
        "notNull": true
      },
      {
        "name": "response",
        "type": "text",
        "notNull": true
      },
      {
        "name": "created_at",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "key"
    ]
  },
  "zhiliu_radar__site_settings": {
    "sourceProjectId": "appgprj_6ad5cae29fa8819186c1d8648f5913cf",
    "module": "zhiliu-radar",
    "columns": [
      {
        "name": "key",
        "type": "text",
        "notNull": true
      },
      {
        "name": "value",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "key"
    ]
  },
  "zhiliu_radar__model_outputs": {
    "sourceProjectId": "appgprj_6ad5cae29fa8819186c1d8648f5913cf",
    "module": "zhiliu-radar",
    "columns": [
      {
        "name": "item_id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "status",
        "type": "text",
        "notNull": true
      },
      {
        "name": "model",
        "type": "text",
        "notNull": true
      },
      {
        "name": "provider",
        "type": "text",
        "notNull": true
      },
      {
        "name": "summary",
        "type": "text",
        "notNull": false
      },
      {
        "name": "title",
        "type": "text",
        "notNull": false
      },
      {
        "name": "reason",
        "type": "text",
        "notNull": false
      },
      {
        "name": "duration",
        "type": "integer",
        "notNull": false
      },
      {
        "name": "input_tokens",
        "type": "integer",
        "notNull": false
      },
      {
        "name": "output_tokens",
        "type": "integer",
        "notNull": false
      },
      {
        "name": "error",
        "type": "text",
        "notNull": false
      },
      {
        "name": "updated_at",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "item_id"
    ]
  },
  "zhizheng_research__projects": {
    "sourceProjectId": "appgprj_6ad5cb4ba6dc8191bbf778321724c018",
    "module": "zhizheng-research",
    "columns": [
      {
        "name": "id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "owner_id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "title",
        "type": "text",
        "notNull": true
      },
      {
        "name": "state",
        "type": "text",
        "notNull": true
      },
      {
        "name": "revision",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "updated_at",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "id"
    ]
  },
  "zhizheng_research__versions": {
    "sourceProjectId": "appgprj_6ad5cb4ba6dc8191bbf778321724c018",
    "module": "zhizheng-research",
    "columns": [
      {
        "name": "id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "project_id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "owner_id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "revision",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "state",
        "type": "text",
        "notNull": true
      },
      {
        "name": "created_at",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "id"
    ]
  },
  "zhizheng_research__files": {
    "sourceProjectId": "appgprj_6ad5cb4ba6dc8191bbf778321724c018",
    "module": "zhizheng-research",
    "columns": [
      {
        "name": "id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "project_id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "owner_id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "name",
        "type": "text",
        "notNull": true
      },
      {
        "name": "hash",
        "type": "text",
        "notNull": true
      },
      {
        "name": "kind",
        "type": "text",
        "notNull": true
      },
      {
        "name": "size",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "pages",
        "type": "integer",
        "notNull": false
      },
      {
        "name": "status",
        "type": "text",
        "notNull": true
      },
      {
        "name": "created_at",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "id"
    ]
  },
  "zhizheng_research__ai_usage": {
    "sourceProjectId": "appgprj_6ad5cb4ba6dc8191bbf778321724c018",
    "module": "zhizheng-research",
    "columns": [
      {
        "name": "id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "owner_id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "project_id",
        "type": "text",
        "notNull": true
      },
      {
        "name": "model",
        "type": "text",
        "notNull": true
      },
      {
        "name": "status",
        "type": "text",
        "notNull": true
      },
      {
        "name": "latency",
        "type": "integer",
        "notNull": true
      },
      {
        "name": "usage",
        "type": "text",
        "notNull": false
      },
      {
        "name": "created_at",
        "type": "text",
        "notNull": true
      }
    ],
    "primaryKey": [
      "id"
    ]
  }
};
