<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CollectedItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'url' => $this->url,
            'cover_image' => $this->coverUrl(),
            'creator' => $this->creator,
            'item_type' => $this->item_type,
            'annotation' => $this->annotation,
            'tags' => $this->whenLoaded('tags', fn () => $this->tags->pluck('name')),
        ];
    }
}
