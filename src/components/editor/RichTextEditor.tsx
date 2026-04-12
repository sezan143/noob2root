import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useEffect, useCallback, useRef, useState } from "react";
import { EditorToolbar } from "./EditorToolbar";

const lowlight = createLowlight(common);

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onImageUpload?: (file: File) => Promise<string>;
}

export function RichTextEditor({ content, onChange, placeholder, onImageUpload }: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const isInternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline cursor-pointer" },
      }),
      Image.configure({
        HTMLAttributes: { class: "rounded-lg max-w-full mx-auto my-4" },
      }),
      Placeholder.configure({
        placeholder: placeholder || "Start writing your post...",
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Typography,
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true;
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none min-h-[400px] px-6 py-4 focus:outline-none",
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files.length && onImageUpload) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith("image/")) {
            event.preventDefault();
            onImageUpload(file).then((url) => {
              const { tr } = view.state;
              const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (pos) {
                const node = view.state.schema.nodes.image.create({ src: url });
                view.dispatch(tr.insert(pos.pos, node));
              }
            });
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items && onImageUpload) {
          for (const item of Array.from(items)) {
            if (item.type.startsWith("image/")) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) {
                onImageUpload(file).then((url) => {
                  editor?.chain().focus().setImage({ src: url }).run();
                });
              }
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML() && !isInternalUpdate.current) {
      editor.commands.setContent(content || "");
    }
    isInternalUpdate.current = false;
  }, [content, editor]);

  const addImage = useCallback(() => {
    if (!onImageUpload) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const url = await onImageUpload(file);
        editor?.chain().focus().setImage({ src: url }).run();
      }
    };
    input.click();
  }, [editor, onImageUpload]);

  const setLink = useCallback(() => {
    if (!editor) return;
    if (showLinkInput) {
      if (linkUrl) {
        editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
      }
      setShowLinkInput(false);
      setLinkUrl("");
    } else {
      const previousUrl = editor.getAttributes("link").href || "";
      setLinkUrl(previousUrl);
      setShowLinkInput(true);
    }
  }, [editor, showLinkInput, linkUrl]);

  const removeLink = useCallback(() => {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="rich-editor-wrapper rounded-lg border border-border/50 bg-card overflow-hidden flex flex-col max-h-[700px]">
      <EditorToolbar
        editor={editor}
        onAddImage={addImage}
        onSetLink={setLink}
        onRemoveLink={removeLink}
        showLinkInput={showLinkInput}
        linkUrl={linkUrl}
        onLinkUrlChange={setLinkUrl}
        onLinkSubmit={() => {
          if (linkUrl) {
            editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
          }
          setShowLinkInput(false);
          setLinkUrl("");
        }}
      />

      <div className="overflow-y-auto flex-1">
        <EditorContent editor={editor} />
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t border-border/30 text-xs text-muted-foreground">
        <span>{editor.storage.characterCount?.characters?.() ?? editor.getText().length} characters</span>
        <span>{editor.storage.characterCount?.words?.() ?? editor.getText().split(/\s+/).filter(Boolean).length} words</span>
      </div>
    </div>
  );
}
