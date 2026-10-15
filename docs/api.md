# Timadey Public API

Read-only REST endpoints for published, public content. No authentication required.

All endpoints live under `/api` and return JSON. Content rules:

- Only posts/projects/collected items with `status = published` (posts) and `visibility = public` are exposed.
- Drafts, private items, and unpublished content always return `404`.
- List endpoints are paginated: **15 items per page** via `?page=` (posts list also supports `?per_page=`).
- Rate limited to **60 requests per minute** per user (or IP for guests); excess requests return `429`.
- Admin functionality is **not** part of this API. Admin endpoints are session-authenticated Inertia routes served from the web stack (see the `routes/web.php` `/admin` group).

## Status codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `400` | Missing/invalid query parameter (e.g. `/api/search` without `q`, unknown `status`, out-of-range `per_page`) |
| `404` | Resource not found, or slug not publicly visible |
| `429` | Rate limit exceeded (60 requests/minute) |

Errors are returned in Laravel's standard shape: `{ "message": "..." }`.

---

## `GET /api/posts`

List published articles (or notes with `?type=note`).

| Param | Type | Description |
|-------|------|-------------|
| `type` | string | `article` (default) or `note` |
| `q` | string | Filter by title substring |
| `tag` | string | Filter by tag slug |
| `topic` | string | Filter by topic slug |
| `status` | string | Only `published` is accepted (no-op confirm of the always-on public scope); any other value → `400`. Guests can never request drafts/private content. |
| `per_page` | int | Page size, 5–50 (default 15); out of range → `400` |
| `page` | int | Page number |

```json
{
  "data": [
    {
      "id": 1,
      "title": "Why Personal Websites Still Matter",
      "slug": "why-personal-websites-still-matter",
      "excerpt": "Owning your corner of the internet…",
      "post_type": "article",
      "reading_time": 4,
      "featured": false,
      "published_at": "2026-10-01T09:00:00+00:00",
      "tags": ["writing", "building"],
      "topics": ["Ideas in Progress"],
      "url": "/writing/why-personal-websites-still-matter",
      "body_html": "<p>…rendered markdown…</p>"
    }
  ],
  "links": { "first": "…", "last": "…", "prev": null, "next": "…" },
  "meta": { "current_page": 1, "per_page": 15, "total": 1 }
}
```

## `GET /api/posts/{slug}`

Single published article with rendered `body_html`. `404` for unknown or non-public slugs.

Response: `{ "data": { …post fields as above… } }`

## `GET /api/notes`

Same shape as `/api/posts`, but lists published notes (`post_type = note`). Supports `q` and `page`.

## `GET /api/notes/{slug}`

Single published note with `body_html`. `404` for unknown or non-public slugs.

## `GET /api/projects`

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | One of `idea`, `exploring`, `building`, `active`, `paused`, `completed`. Unknown values fall back to `idea` |
| `page` | int | Page number (15 per page) |

```json
{
  "data": [
    {
      "id": 1,
      "name": "Terminal Theme Kit",
      "slug": "terminal-theme-kit",
      "summary": "A small collection of dotfiles and scripts.",
      "description_html": "<p>…rendered markdown…</p>",
      "status": "completed",
      "featured": false,
      "cover_image": null,
      "repository_url": null,
      "live_url": null,
      "started_at": "2026-08-01",
      "completed_at": null,
      "tags": ["building"],
      "url": "/projects/terminal-theme-kit"
    }
  ],
  "links": { },
  "meta": { }
}
```

## `GET /api/projects/{slug}`

Single public project. Response: `{ "data": { …project fields… } }`. `404` for unknown or private projects.

## `GET /api/collected`

| Param | Type | Description |
|-------|------|-------------|
| `type` | string | `book`, `article`, `video`, `podcast`, `music`, `tool`, `quote`, `website`, `other` (unknown → `other`) |
| `q` | string | Matches title, annotation, or creator (case-insensitive) |
| `page` | int | Page number (15 per page) |

```json
{
  "data": [
    {
      "id": 1,
      "title": "Thinking in Systems",
      "url": null,
      "creator": "Donella Meadows",
      "item_type": "book",
      "annotation": "A classic introduction to systems thinking.",
      "tags": ["research"]
    }
  ],
  "links": { },
  "meta": { }
}
```

## `GET /api/search`

Full-text search across articles, notes, projects, and collected items.

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | **Required.** Missing/empty → `400` |
| `type` | string | Optional: `article`, `note`, `project`, `collected` |

Queries shorter than 2 characters return an empty result set (`200`).

```json
{
  "data": [
    {
      "type": "article",
      "title": "Quantum Notes",
      "snippet": "…context around the match…",
      "url": "/writing/quantum-notes",
      "date": "Oct 1, 2026"
    }
  ],
  "total": 1
}
```

---

## Examples

```bash
curl https://example.com/api/posts
curl https://example.com/api/posts/my-slug
curl "https://example.com/api/search?q=interfaces&type=article"
curl "https://example.com/api/projects?status=building"
```
