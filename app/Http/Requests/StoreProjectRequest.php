<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isOwner() ?? false;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('description'))) {
            $this->merge([
                'description' => \App\Support\HtmlSanitizer::sanitize($this->input('description'), 'description'),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:200'],
            'slug' => ['nullable', 'string', 'max:220', Rule::unique('projects', 'slug')->ignore($this->route('project'))],
            'summary' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string', 'max:500000'],
            'status' => ['required', Rule::in(['idea', 'exploring', 'building', 'active', 'paused', 'completed'])],
            'visibility' => ['required', Rule::in(['public', 'private'])],
            'cover_image' => ['nullable', 'string', 'max:500'],
            'repository_url' => ['nullable', 'url', 'max:500'],
            'live_url' => ['nullable', 'url', 'max:500'],
            'started_at' => ['nullable', 'date'],
            'completed_at' => ['nullable', 'date', 'after_or_equal:started_at'],
            'featured' => ['boolean'],
            'tags' => ['array'],
            'tags.*' => ['string', 'max:50'],
        ];
    }
}
