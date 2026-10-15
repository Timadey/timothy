<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isOwner() ?? false;
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('post_type') !== 'note' && is_string($this->input('body'))) {
            $this->merge([
                'body' => \App\Support\HtmlSanitizer::sanitize($this->input('body')),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'title' => $this->isNote()
                ? ['nullable', 'string', 'max:200']
                : ['required', 'string', 'max:200'],
            'slug' => ['nullable', 'string', 'max:220', Rule::unique('posts', 'slug')->ignore($this->route('post'))],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'body' => $this->isNote() && $this->input('status') === 'published'
                ? ['required', 'string', 'max:500000']
                : ['nullable', 'string', 'max:500000'],
            'post_type' => ['required', Rule::in(['article', 'note', 'question'])],
            'status' => ['required', Rule::in(['draft', 'published', 'archived'])],
            'visibility' => ['required', Rule::in(['public', 'private'])],
            'featured' => ['boolean'],
            'cover_image' => ['nullable', 'string', 'max:500'],
            'meta_title' => ['nullable', 'string', 'max:200'],
            'meta_description' => ['nullable', 'string', 'max:300'],
            'tags' => ['array'],
            'tags.*' => ['string', 'max:50'],
            'topics' => ['array'],
            'topics.*' => ['string', 'max:50'],
        ];
    }

    private function isNote(): bool
    {
        return $this->input('post_type') === 'note';
    }
}
