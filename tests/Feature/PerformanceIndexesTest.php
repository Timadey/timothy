<?php

use Illuminate\Support\Facades\DB;

it('adds the content performance indexes', function () {
    $names = collect(DB::select(
        "SELECT indexname FROM pg_indexes WHERE tablename IN ('posts', 'projects', 'collected_items')"
    ))->pluck('indexname');

    expect($names)->toContain(
        'posts_post_type_visibility_status_published_at_index',
        'posts_featured_index',
        'projects_featured_index',
        'projects_updated_at_index',
        'collected_items_created_at_index',
    );
});
