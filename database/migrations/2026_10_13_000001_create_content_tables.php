<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('excerpt')->nullable();
            $table->longText('body')->nullable();
            $table->string('post_type')->default('article');
            $table->string('status')->default('draft');
            $table->string('visibility')->default('public');
            $table->boolean('featured')->default(false);
            $table->string('cover_image')->nullable();
            $table->string('meta_title')->nullable();
            $table->string('meta_description')->nullable();
            $table->string('og_image')->nullable();
            $table->unsignedInteger('reading_time')->default(0);
            $table->boolean('is_demo')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
            $table->index(['status', 'post_type', 'published_at']);
        });

        Schema::create('topics', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('tags', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->timestamps();
        });

        Schema::create('taggables', function (Blueprint $table) {
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $table->morphs('taggable');
            $table->primary(['tag_id', 'taggable_id', 'taggable_type']);
        });

        Schema::create('topicables', function (Blueprint $table) {
            $table->foreignId('topic_id')->constrained()->cascadeOnDelete();
            $table->morphs('topicable');
            $table->primary(['topic_id', 'topicable_id', 'topicable_type']);
        });

        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('summary')->nullable();
            $table->longText('description')->nullable();
            $table->string('status')->default('idea');
            $table->string('visibility')->default('public');
            $table->string('cover_image')->nullable();
            $table->string('repository_url')->nullable();
            $table->string('live_url')->nullable();
            $table->date('started_at')->nullable();
            $table->date('completed_at')->nullable();
            $table->boolean('featured')->default(false);
            $table->boolean('is_demo')->default(false);
            $table->softDeletes();
            $table->timestamps();
            $table->index(['status', 'visibility']);
        });

        Schema::create('collected_items', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('url')->nullable();
            $table->string('creator')->nullable();
            $table->string('item_type')->default('other');
            $table->text('annotation')->nullable();
            $table->string('visibility')->default('public');
            $table->boolean('is_demo')->default(false);
            $table->timestamps();
            $table->index(['item_type', 'visibility']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('collected_items');
        Schema::dropIfExists('projects');
        Schema::dropIfExists('topicables');
        Schema::dropIfExists('taggables');
        Schema::dropIfExists('tags');
        Schema::dropIfExists('topics');
        Schema::dropIfExists('posts');
    }
};
