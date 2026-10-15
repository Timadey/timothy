<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAboutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isOwner() ?? false;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('body'))) {
            $this->merge([
                'body' => \App\Support\HtmlSanitizer::sanitize($this->input('body')),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'body' => ['nullable', 'string', 'max:500000'],
        ];
    }
}
