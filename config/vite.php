<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Vite Hot File
    |--------------------------------------------------------------------------
    |
    | Override the hot-file path so test/QA servers can serve the production
    | build (VITE_HOT_FILE=public/hot-e2e) while a local "npm run dev" keeps
    | using the default public/hot file.
    |
    */

    'hot_file' => env('VITE_HOT_FILE', public_path('hot')),

];
