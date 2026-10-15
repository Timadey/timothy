<?php

namespace App\Services;

use App\Models\{CollectedItem, Post, Project};

class FeedService
{
    public function recent(int $limit = 12): array
    {
        $items = [];

        foreach (Post::publiclyVisible()->with('tags')->latest('published_at')->limit($limit)->get() as $post) {
            $items[] = [
                'id' => 'post-'.$post->id,
                'type' => $post->post_type,
                'label' => match ($post->post_type) {
                    'article' => 'Wrote',
                    'note' => 'Noted',
                    'question' => 'Asked',
                    default => 'Posted',
                },
                'title' => $post->titleOrSnippet(),
                'message' => $post->excerpt,
                'url' => '/'.($post->post_type === 'article' ? 'writing' : 'notes').'/'.$post->slug,
                'date' => $post->published_at?->toIso8601String(),
                'tags' => $post->tags->pluck('name')->all(),
            ];
        }

        foreach (Project::publiclyVisible()->with('tags')->latest('updated_at')->limit($limit)->get() as $project) {
            $items[] = [
                'id' => 'project-'.$project->id,
                'type' => 'project',
                'label' => 'Building',
                'title' => $project->name,
                'message' => $project->summary,
                'url' => '/projects/'.$project->slug,
                'date' => $project->updated_at->toIso8601String(),
                'tags' => $project->tags->pluck('name')->all(),
            ];
        }

        foreach (CollectedItem::publiclyVisible()->with('tags')->latest('created_at')->limit($limit)->get() as $item) {
            $items[] = [
                'id' => 'collected-'.$item->id,
                'type' => 'collected',
                'label' => 'Collected',
                'title' => $item->title,
                'message' => $item->annotation,
                'url' => $item->url ?: '/collected',
                'date' => $item->created_at->toIso8601String(),
                'tags' => $item->tags->pluck('name')->all(),
            ];
        }

        usort($items, fn ($a, $b) => strtotime($b['date']) <=> strtotime($a['date']));

        return array_slice($items, 0, $limit);
    }
}
