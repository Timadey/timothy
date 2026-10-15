<?php

namespace App\Http\Controllers;

use App\Models\{Post, Project, Setting};
use Illuminate\Http\Response;

class SeoController extends Controller
{
    public function sitemap(): Response
    {
        $static = ['/', '/writing', '/notes', '/projects', '/collected', '/activity', '/now', '/about', '/ask', '/search'];

        $urls = collect($static)->map(fn ($path) => ['loc' => url($path), 'lastmod' => now()->toW3cString()]);

        Post::publiclyVisible()->orderByDesc('updated_at')->get(['slug', 'post_type', 'updated_at'])
            ->each(function ($p) use ($urls) {
                $urls->push([
                    'loc' => url('/'.($p->post_type === 'article' ? 'writing' : 'notes').'/'.$p->slug),
                    'lastmod' => $p->updated_at->toW3cString(),
                ]);
            });

        Project::publiclyVisible()->orderByDesc('updated_at')->get(['slug', 'updated_at'])
            ->each(fn ($p) => $urls->push([
                'loc' => url('/projects/'.$p->slug),
                'lastmod' => $p->updated_at->toW3cString(),
            ]));

        $body = $urls->map(fn ($u) =>
            "  <url>\n    <loc>{$u['loc']}</loc>\n    <lastmod>{$u['lastmod']}</lastmod>\n  </url>")->implode("\n");

        return response(
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n{$body}\n</urlset>",
            200,
            ['Content-Type' => 'application/xml']
        );
    }

    public function robots(): Response
    {
        $content = "User-agent: *\nDisallow: /admin\nDisallow: /preview\nAllow: /\n\nSitemap: ".url('/sitemap.xml')."\n";

        return response($content, 200, ['Content-Type' => 'text/plain']);
    }

    public function rss(): Response
    {
        $posts = Post::publiclyVisible()->whereIn('post_type', ['article', 'note'])
            ->latest('published_at')->limit(20)->get();

        $items = $posts->map(function ($p) {
            $link = url('/'.($p->post_type === 'article' ? 'writing' : 'notes').'/'.$p->slug);
            $title = e($p->titleOrSnippet());
            $description = e($p->excerpt ?: mb_substr(strip_tags((string) $p->body), 0, 300));
            $pubDate = $p->published_at?->toRfc7231String() ?? $p->created_at->toRfc7231String();

            return "    <item>\n      <title>{$title}</title>\n      <link>{$link}</link>\n      <guid isPermaLink=\"true\">{$link}</guid>\n      <description>{$description}</description>\n      <pubDate>{$pubDate}</pubDate>\n    </item>";
        })->implode("\n");

        $xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<rss version=\"2.0\">\n  <channel>\n    <title>".e(Setting::get('site_title') ?: config('app.name', 'Timadey'))."</title>\n    <link>".url('/')."</link>\n    <description>Latest writing and notes from Timadey.</description>\n{$items}\n  </channel>\n</rss>";

        return response($xml, 200, ['Content-Type' => 'application/xml']);
    }
}
