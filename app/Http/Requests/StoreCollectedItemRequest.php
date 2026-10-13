<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCollectedItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isOwner() ?? false;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:300'],
            'url' => ['nullable', 'url', 'max:1000'],
            'creator' => ['nullable', 'string', 'max:200'],
            'item_type' => ['required', Rule::in(['book', 'article', 'video', 'podcast', 'music', 'tool', 'quote', 'website', 'other'])],
            'annotation' => ['nullable', 'string', 'max:5000'],
            'visibility' => ['required', Rule::in(['public', 'private'])],
            'tags' => ['array'],
            'tags.*' => ['string', 'max:50'],
        ];
    }
}
