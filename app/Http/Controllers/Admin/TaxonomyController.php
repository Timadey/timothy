<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\{Tag, Topic};
use Illuminate\Http\{RedirectResponse, Request};
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\{Inertia, Response};
use Closure;

class TaxonomyController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Tags', [
            'tags' => Tag::withCount('posts')->orderBy('name')->get(['id', 'name', 'slug', 'posts_count']),
            'topics' => Topic::withCount('posts')->orderBy('name')->get(['id', 'name', 'slug', 'posts_count']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'kind' => ['required', Rule::in(['tag', 'topic'])],
            'name' => [
                'required', 'string', 'max:50',
                function (string $attribute, mixed $value, Closure $fail) use ($request) {
                    $table = $request->input('kind') === 'topic' ? 'topics' : 'tags';
                    $slug = Str::slug((string) $value);

                    if ($slug !== '' && DB::table($table)->where('slug', $slug)->exists()) {
                        $fail('The name has already been taken.');
                    }
                },
            ],
        ]);

        $model = $data['kind'] === 'tag' ? new Tag() : new Topic();
        $model->name = $data['name'];
        $model->slug = Str::slug($data['name']);
        $model->save();

        return redirect()->route('admin.tags.index')->with('status', ucfirst($data['kind']).' created.');
    }

    public function destroy(Request $request, string $kind, int $id): RedirectResponse
    {
        abort_unless(in_array($kind, ['tag', 'topic'], true), 404);

        $model = $kind === 'tag' ? Tag::findOrFail($id) : Topic::findOrFail($id);
        $model->delete();

        return redirect()->route('admin.tags.index')->with('status', ucfirst($kind).' deleted.');
    }
}
