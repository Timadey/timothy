<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    @php($seo = \App\Support\Seo::forPage($page ?? null))
    <title>{{ $seo['title'] }}</title>
    @if ($seo['description'])
        <meta name="description" content="{{ $seo['description'] }}">
    @endif
    @if ($seo['robots'])
        <meta name="robots" content="{{ $seo['robots'] }}">
    @endif
    @if ($seo['canonical'])
        <link rel="canonical" href="{{ $seo['canonical'] }}">
    @endif
    @if ($seo['rss'])
        <link rel="alternate" type="application/rss+xml" title="RSS feed" href="/rss.xml">
    @endif
    @foreach ($seo['og'] as $property => $content)
        @foreach ((array) $content as $value)
            <meta property="{{ $property }}" content="{{ $value }}">
        @endforeach
    @endforeach
    @foreach ($seo['twitter'] as $name => $content)
        <meta name="{{ $name }}" content="{{ $content }}">
    @endforeach
    @foreach ($seo['jsonLd'] as $block)
        <script type="application/ld+json">{!! json_encode($block, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) !!}</script>
    @endforeach
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
    @inertiaHead
</head>
<body>
    @inertia
</body>
</html>
