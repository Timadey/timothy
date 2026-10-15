import AdminLayout from '@/Layouts/AdminLayout';
import { Flash } from '@/Components/Flash';
import { QuickComposer, type NoteFormData } from '@/Components/QuickComposer';

export default function NoteComposer({ note }: { note: NoteFormData | null }) {
    return (
        <AdminLayout title={note ? 'Edit note' : 'New note'}>
            <Flash />
            <QuickComposer note={note} />
        </AdminLayout>
    );
}
