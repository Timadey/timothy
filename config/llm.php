<?php

return [
    'provider' => env('LLM_PROVIDER'),
    'base_url' => env('LLM_BASE_URL'),
    'api_key' => env('LLM_API_KEY'),
    'model' => env('LLM_MODEL'),
    'timeout' => (int) env('LLM_TIMEOUT', 10),
];
