<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    private const STATUSES = ['idea', 'exploring', 'building', 'active', 'paused', 'completed'];

    public function index(Request $request)
    {
        $query = Project::publiclyVisible()->with('tags')->orderByDesc('featured')->latest('updated_at');

        if ($status = $request->query('status')) {
            $query->where('status', in_array($status, self::STATUSES, true) ? $status : 'idea');
        }

        return ProjectResource::collection($query->paginate(15)->withQueryString());
    }

    public function show(string $slug)
    {
        return new ProjectResource(
            Project::publiclyVisible()->where('slug', $slug)->with('tags')->firstOrFail()
        );
    }
}
