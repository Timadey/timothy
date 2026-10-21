<?php

namespace App\Http\Requests;

use App\Support\CollectedTypes;
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
            'cover_image' => ['nullable', 'string', 'max:1000'],
            'cover_image_file' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp,avif', 'max:4096'],
            'cover_image_clear' => ['nullable', 'boolean'],
            'creator' => ['nullable', 'string', 'max:200'],
            'item_type' => ['required', Rule::in(CollectedTypes::values())],
            'annotation' => ['nullable', 'string', 'max:5000'],
            'visibility' => ['required', Rule::in(['public', 'private'])],
            'tags' => ['array'],
            'tags.*' => ['string', 'max:50'],
        ];
    }
}
