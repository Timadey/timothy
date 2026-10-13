import { useForm } from '@inertiajs/react';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({ email: '', password: '' });

    return (
        <div className="flex min-h-screen items-center justify-center bg-surface px-4">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    post('/admin/login');
                }}
                className="w-full max-w-sm rounded-md border border-hairline bg-white p-8"
            >
                <h1 className="text-xl font-semibold tracking-tight">Timadey Admin</h1>
                <p className="mt-1 text-sm text-meta">Sign in to manage your site.</p>

                <label className="mt-6 block text-sm font-medium">
                    Email
                    <input
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        className="mt-1 w-full rounded-md border border-hairline px-3 py-2 text-sm focus:border-primary"
                        autoComplete="email"
                        required
                    />
                </label>
                {errors.email && <p className="mt-1 text-sm text-red-700">{errors.email}</p>}

                <label className="mt-4 block text-sm font-medium">
                    Password
                    <input
                        type="password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        className="mt-1 w-full rounded-md border border-hairline px-3 py-2 text-sm focus:border-primary"
                        autoComplete="current-password"
                        required
                    />
                </label>

                <button
                    type="submit"
                    disabled={processing}
                    className="mt-6 w-full rounded-md bg-primary py-2 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50"
                >
                    {processing ? 'Signing in…' : 'Sign in'}
                </button>
            </form>
        </div>
    );
}
