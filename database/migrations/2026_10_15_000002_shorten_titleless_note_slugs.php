<?php

use App\Models\Post;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Post::shortenTitlelessSlugs();
    }

    public function down(): void
    {
        // Irreversible data migration: shortened slugs cannot restore their originals.
    }
};
