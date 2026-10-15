<?php

use App\Models\Post;
use App\Models\Project;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Post::convertMarkdownBodiesToHtml();
        Project::convertDescriptionsToHtml();
    }

    public function down(): void
    {
        // Irreversible data migration: markdown sources were replaced by their rendered HTML.
    }
};
