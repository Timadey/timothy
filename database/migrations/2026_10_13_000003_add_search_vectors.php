<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(body, ''))) STORED");
        DB::statement('CREATE INDEX IF NOT EXISTS posts_search_vector_idx ON posts USING GIN (search_vector)');

        DB::statement("ALTER TABLE projects ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(description, ''))) STORED");
        DB::statement('CREATE INDEX IF NOT EXISTS projects_search_vector_idx ON projects USING GIN (search_vector)');

        DB::statement("ALTER TABLE collected_items ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(annotation, '') || ' ' || coalesce(creator, ''))) STORED");
        DB::statement('CREATE INDEX IF NOT EXISTS collected_items_search_vector_idx ON collected_items USING GIN (search_vector)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS collected_items_search_vector_idx');
        DB::statement('ALTER TABLE collected_items DROP COLUMN IF EXISTS search_vector');
        DB::statement('DROP INDEX IF EXISTS projects_search_vector_idx');
        DB::statement('ALTER TABLE projects DROP COLUMN IF EXISTS search_vector');
        DB::statement('DROP INDEX IF EXISTS posts_search_vector_idx');
        DB::statement('ALTER TABLE posts DROP COLUMN IF EXISTS search_vector');
    }
};
