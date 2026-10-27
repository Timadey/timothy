<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            // public list queries: publiclyVisible()->ofType()->latest('published_at')
            $table->index(['post_type', 'visibility', 'status', 'published_at']);
            $table->index('featured');
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->index('featured');
            $table->index('updated_at');
        });

        Schema::table('collected_items', function (Blueprint $table) {
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropIndex(['post_type', 'visibility', 'status', 'published_at']);
            $table->dropIndex(['featured']);
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->dropIndex(['featured']);
            $table->dropIndex(['updated_at']);
        });

        Schema::table('collected_items', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
        });
    }
};
