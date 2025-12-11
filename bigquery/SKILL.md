---
name: bigquery
description: Instructions for querying Google BigQuery using the bq command-line tool. Useful for running SQL queries, exploring datasets, and exporting results.
---

# BigQuery Skill

This skill enables you to query Google BigQuery using the `bq` command-line tool.

Authentication is already configured. The default project is `project_id`.

Use the `project_id_exploration` dataset as scratch space for temporary tables and experimentation.

The `public` dataset contains tables synced from the production Postgres database.

## 1. Explore Available Datasets

List datasets in the current project (defaults to `project_id`):

```bash
bq ls
```

List datasets in a specific project:

```bash
bq ls --project_id=PROJECT_ID
```

List tables in a dataset:

```bash
bq ls PROJECT_ID:DATASET_NAME
```

Get table schema:

```bash
bq show --schema --format=prettyjson PROJECT_ID:DATASET_NAME.TABLE_NAME
```

## 2. Run Queries

**Run a simple query:**

```bash
bq query --use_legacy_sql=false 'SELECT * FROM `project.dataset.table` LIMIT 10'
```

**Run a query with formatted output:**

```bash
bq query --use_legacy_sql=false --format=prettyjson 'YOUR_QUERY'
```

**Run a query and save to a destination table:**

```bash
bq query --use_legacy_sql=false --destination_table=PROJECT:DATASET.NEW_TABLE 'YOUR_QUERY'
```

**Run a dry run to estimate costs:**

```bash
bq query --use_legacy_sql=false --dry_run 'YOUR_QUERY'
```

## 3. Export Results

**Export to CSV:**

```bash
bq query --use_legacy_sql=false --format=csv 'YOUR_QUERY' > results.csv
```

## 4. Best Practices

- Always use `--use_legacy_sql=false` for standard SQL syntax
- Use `LIMIT` clauses when exploring data to reduce costs
- Use `--dry_run` to estimate query costs before running expensive queries
- Use backticks around table references: `` `project.dataset.table` ``

## 5. Common Patterns

**Preview table data:**

```bash
bq head -n 10 PROJECT:DATASET.TABLE
```

**Get table info (row count, size):**

```bash
bq show --format=prettyjson PROJECT:DATASET.TABLE
```

**Query with parameters:**

```bash
bq query --use_legacy_sql=false --parameter='name:STRING:value' 'SELECT * FROM `table` WHERE col = @name'
```
