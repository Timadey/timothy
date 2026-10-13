<?php

namespace App\Services;

use App\Models\{CollectedItem, Post, Project};

class SearchService
{
    public function search(string $query, ?string $type = null, int $limit = 30): array
    {
        $query = trim($query);
        if ($query === '') {
            return [];
        }

        $results = [];

        if (! $type || $type === 'article' || $type === 'note') {
            $rows = Post::publiclyVisible()
                ->when($type, fn ($q) => $q->where('post_type', $type))
                ->whereRaw('search_vector @@ websearch_to_tsquery(?, ?)', ['english', $query])
                ->orderByRaw('ts_rank(search_vector, websearch_to_tsquery(?, ?)) DESC', ['english', $query])
                ->limit($limit)->get(['id', 'title', 'slug', 'excerpt', 'post_type', 'published_at']);

            foreach ($rows as $r) {
                $results[] = [
                    'type' => $r->post_type === 'article' ? 'article' : 'note',
                    'title' => $r->title,
                    'snippet' => $this->snippet($r->excerpt ?: $r->title, $query),
                    'url' => '/'.($r->post_type === 'article' ? 'writing' : 'notes').'/'.$r->slug,
                    'date' => $r->published_at?->format('M j, Y'),
                ];
            }
        }

        if (! $type || $type === 'project') {
            $needle = '%'.mb_strtolower($query).'%';
            $rows = Project::publiclyVisible()
                ->where(fn ($w) => $w
                    ->whereRaw('search_vector @@ websearch_to_tsquery(?, ?)', ['english', $query])
                    ->orWhereRaw('LOWER(name) LIKE ?', [$needle])
                    ->orWhereRaw('LOWER(COALESCE(summary, \'\')) LIKE ?', [$needle]))
                ->orderByRaw('ts_rank(search_vector, websearch_to_tsquery(?, ?)) DESC', ['english', $query])
                ->limit($limit)->get(['name', 'slug', 'summary', 'updated_at']);

            foreach ($rows as $r) {
                $results[] = [
                    'type' => 'project',
                    'title' => $r->name,
                    'snippet' => $this->snippet($r->summary ?? '', $query),
                    'url' => '/projects/'.$r->slug,
                    'date' => $r->updated_at->format('M j, Y'),
                ];
            }
        }

        if (! $type || $type === 'collected') {
            $needle = '%'.mb_strtolower($query).'%';
            $rows = CollectedItem::publiclyVisible()
                ->where(fn ($w) => $w
                    ->whereRaw('search_vector @@ websearch_to_tsquery(?, ?)', ['english', $query])
                    ->orWhereRaw('LOWER(title) LIKE ?', [$needle])
                    ->orWhereRaw('LOWER(COALESCE(annotation, \'\')) LIKE ?', [$needle]))
                ->orderByRaw('ts_rank(search_vector, websearch_to_tsquery(?, ?)) DESC', ['english', $query])
                ->limit($limit)->get(['title', 'url', 'annotation', 'created_at', 'id']);

            foreach ($rows as $r) {
                $results[] = [
                    'type' => 'collected',
                    'title' => $r->title,
                    'snippet' => $this->snippet($r->annotation ?? '', $query),
                    'url' => $r->url ?: '/collected',
                    'date' => $r->created_at->format('M j, Y'),
                ];
            }
        }

        return array_slice($results, 0, $limit);
    }

    private function snippet(string $text, string $query): string
    {
        $plain = trim(preg_replace('/\s+/', ' ', strip_tags($text)));
        $words = preg_split('/\s+/', $query);

        foreach ($words as $word) {
            $pos = stripos($plain, $word);
            if ($pos !== false) {
                $start = max(0, $pos - 60);

                return ($start > 0 ? '…' : '').mb_substr($plain, $start, 160).'…';
            }
        }

        return mb_substr($plain, 0, 160);
    }
}
