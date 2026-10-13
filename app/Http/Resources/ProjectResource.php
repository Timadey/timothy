<?php

namespace App\Http\Resources;

use App\Services\MarkdownService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'summary' => $this->summary,
            'description_html' => app(MarkdownService::class)->render((string) $this->description),
            'status' => $this->status,
            'featured' => $this->featured,
            'cover_image' => $this->cover_image,
            'repository_url' => $this->repository_url,
            'live_url' => $this->live_url,
            'started_at' => $this->started_at?->toDateString(),
            'completed_at' => $this->completed_at?->toDateString(),
            'tags' => $this->whenLoaded('tags', fn () => $this->tags->pluck('name')),
            'url' => '/projects/'.$this->slug,
        ];
    }
}
