<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const SEARCH_VECTOR_SQL = "ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(body, ''))) STORED";

    public function up(): void
    {
        DB::statement('DROP INDEX IF EXISTS posts_search_vector_idx');
        DB::statement('ALTER TABLE posts DROP COLUMN IF EXISTS search_vector');

        Schema::table('posts', function (Blueprint $table) {
            $table->string('title')->nullable()->change();
        });

        DB::statement(self::SEARCH_VECTOR_SQL);
        DB::statement('CREATE INDEX IF NOT EXISTS posts_search_vector_idx ON posts USING GIN (search_vector)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS posts_search_vector_idx');
        DB::statement('ALTER TABLE posts DROP COLUMN IF EXISTS search_vector');

        Schema::table('posts', function (Blueprint $table) {
            $table->string('title')->nullable(false)->change();
        });

        DB::statement(self::SEARCH_VECTOR_SQL);
        DB::statement('CREATE INDEX IF NOT EXISTS posts_search_vector_idx ON posts USING GIN (search_vector)');
    }
};
