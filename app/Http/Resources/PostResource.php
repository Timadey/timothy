<?php

namespace App\Http\Resources;

use App\Services\MarkdownService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
            'post_type' => $this->post_type,
            'reading_time' => $this->reading_time,
            'featured' => $this->featured,
            'published_at' => $this->published_at?->toIso8601String(),
            'tags' => $this->whenLoaded('tags', fn () => $this->tags->pluck('name')),
            'topics' => $this->whenLoaded('topics', fn () => $this->topics->pluck('name')),
            'url' => '/'.($this->post_type === 'article' ? 'writing' : 'notes').'/'.$this->slug,
            'body_html' => app(MarkdownService::class)->render((string) $this->body),
        ];
    }
}
