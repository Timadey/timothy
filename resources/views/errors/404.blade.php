<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Page not found — Timadey</title>
    <meta name="robots" content="noindex">
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            background: #fff;
            color: #1d1d1f;
            font-family: "Inter", system-ui, -apple-system, sans-serif;
            -webkit-font-smoothing: antialiased;
        }
        main {
            max-width: 42rem;
            margin: 0 auto;
            padding: 6rem 1.5rem;
            text-align: center;
        }
        .status {
            margin: 0;
            font-size: 0.875rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #86868b;
        }
        h1 { margin: 0.5rem 0 0; font-size: 1.875rem; font-weight: 600; letter-spacing: -0.02em; }
        p { margin: 0.75rem 0 0; color: #86868b; }
        nav { margin-top: 1.5rem; display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap; }
        a {
            display: inline-block;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            font-size: 0.875rem;
            text-decoration: none;
        }
        a.primary { background: #000; color: #fff; }
        a.primary:hover { opacity: 0.8; }
        a.secondary { border: 1px solid #d2d2d7; color: #1d1d1f; }
        a.secondary:hover { background: #f5f5f7; }
        a:focus-visible { outline: 2px solid #000; outline-offset: 2px; }
    </style>
</head>
<body>
    <main>
        <p class="status">404</p>
        <h1>This page doesn&rsquo;t exist</h1>
        <p>It may have moved, or it was never here.</p>
        <nav>
            <a class="primary" href="{{ url('/') }}">Back home</a>
            <a class="secondary" href="{{ url('/search') }}">Search the site</a>
        </nav>
    </main>
</body>
</html>
