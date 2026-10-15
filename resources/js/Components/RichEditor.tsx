import { useCallback, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';

interface RichEditorProps {
    value: string;
    onChange: (html: string) => void;
}

const editorClass =
    'min-h-[16rem] px-3 py-2 text-sm leading-relaxed focus:outline-none prose-custom';

async function uploadImage(file: File): Promise<string> {
    const form = new FormData();
    form.append('image', file);

    const xsrf = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '';
    const response = await fetch('/admin/uploads', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': decodeURIComponent(xsrf),
        },
        body: form,
        credentials: 'same-origin',
    });

    if (!response.ok) {
        throw new Error('Image upload failed');
    }

    const data = (await response.json()) as { url: string };

    return data.url;
}

function bubbleButtonClass(active: boolean): string {
    return `rounded px-2 py-1 text-xs font-medium ${
        active ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
    }`;
}

export function RichEditor({ value, onChange }: RichEditorProps) {
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const initialContent = useRef(value);

    const insertFile = useCallback(async (editor: ReturnType<typeof useEditor>, file: File) => {
        if (!editor || uploading) return;
        setUploading(true);
        setUploadError(null);
        try {
            const url = await uploadImage(file);
            editor.chain().focus().setImage({ src: url, alt: file.name }).run();
        } catch {
            setUploadError('Upload failed. Try a jpg, png, webp, or gif under 5MB.');
        } finally {
            setUploading(false);
        }
    }, [uploading]);

    const editor = useEditor({
        extensions: [StarterKit, Image],
        content: initialContent.current,
        shouldRerenderOnTransaction: true,
        onUpdate: ({ editor: current }) => {
            onChangeRef.current(current.getHTML());
        },
        editorProps: {
            attributes: { class: editorClass },
            handleDrop: (_view, event) => {
                const file = event.dataTransfer?.files?.[0];
                if (file && file.type.startsWith('image/')) {
                    void insertFile(editor, file);
                    return true;
                }
                return false;
            },
            handlePaste: (_view, event) => {
                const file = event.clipboardData?.files?.[0];
                if (file && file.type.startsWith('image/')) {
                    void insertFile(editor, file);
                    return true;
                }
                return false;
            },
        },
    });

    const handleStyle = (value: string) => {
        if (!editor) return;
        if (value === 'paragraph') {
            editor.chain().focus().setParagraph().run();
            return;
        }
        const level = Number(value.slice(1)) as 1 | 2 | 3;
        editor.chain().focus().toggleHeading({ level }).run();
    };

    const toggleLink = (labelFor: 'bar' | 'bubble') => {
        if (!editor) return;
        if (editor.isActive('link')) {
            editor.chain().focus().unsetLink().run();
            return;
        }
        const href = window.prompt('Link URL');
        if (href) {
            editor.chain().focus().setLink({ href }).run();
        }
        void labelFor;
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            void insertFile(editor, file);
        }
        event.target.value = '';
    };

    const styleValue = editor?.isActive('heading')
        ? `h${editor.getAttributes('heading').level}`
        : 'paragraph';

    return (
        <div className="rounded-md border border-hairline focus-within:border-primary">
            <div className="flex flex-wrap items-center gap-1 border-b border-hairline px-2 py-1.5">
                <select
                    aria-label="Text style"
                    value={styleValue}
                    onChange={(e) => handleStyle(e.target.value)}
                    className="rounded border-transparent bg-transparent px-1 py-1 text-xs font-medium text-ink hover:border-hairline focus:border-hairline focus:outline-none"
                >
                    <option value="paragraph">Text</option>
                    <option value="h2">H2</option>
                    <option value="h3">H3</option>
                </select>
                <span className="mx-1 h-4 w-px bg-hairline" aria-hidden="true" />
                <button
                    type="button"
                    aria-label="Link"
                    onClick={() => toggleLink('bar')}
                    className="rounded px-2 py-1 text-xs font-medium text-ink hover:bg-surface"
                >
                    Link
                </button>
                <button
                    type="button"
                    aria-label="Insert image"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded px-2 py-1 text-xs font-medium text-ink hover:bg-surface disabled:opacity-50"
                >
                    {uploading ? 'Uploading…' : 'Image'}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    aria-label="Image file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>

            <EditorContent editor={editor} />

            {editor && (
                <BubbleMenu
                    editor={editor}
                    className="flex items-center gap-0.5 rounded-lg bg-ink px-1.5 py-1 shadow-lg"
                >
                    <button
                        type="button"
                        aria-label="Bold"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={bubbleButtonClass(editor.isActive('bold'))}
                    >
                        <strong>B</strong>
                    </button>
                    <button
                        type="button"
                        aria-label="Italic"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={bubbleButtonClass(editor.isActive('italic'))}
                    >
                        <em>I</em>
                    </button>
                    <button
                        type="button"
                        aria-label="Underline"
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        className={bubbleButtonClass(editor.isActive('underline'))}
                    >
                        <u>U</u>
                    </button>
                    <span className="mx-0.5 h-4 w-px bg-white/25" aria-hidden="true" />
                    <button
                        type="button"
                        aria-label="Quote"
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        className={bubbleButtonClass(editor.isActive('blockquote'))}
                    >
                        &ldquo;
                    </button>
                    <button
                        type="button"
                        aria-label="Code"
                        onClick={() => editor.chain().focus().toggleCode().run()}
                        className={bubbleButtonClass(editor.isActive('code'))}
                    >
                        &lt;/&gt;
                    </button>
                    <span className="mx-0.5 h-4 w-px bg-white/25" aria-hidden="true" />
                    <button
                        type="button"
                        aria-label="Link selected text"
                        onClick={() => toggleLink('bubble')}
                        className={bubbleButtonClass(editor.isActive('link'))}
                    >
                        Link
                    </button>
                </BubbleMenu>
            )}

            {uploadError && (
                <p role="alert" className="border-t border-hairline px-3 py-2 text-xs text-red-700">
                    {uploadError}
                </p>
            )}
        </div>
    );
}
