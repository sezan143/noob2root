import { Editor } from "@tiptap/react";
import {
  Bold, Italic, Underline, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus, ImagePlus, Link, Unlink, AlignLeft,
  AlignCenter, AlignRight, Highlighter, Undo, Redo, CodeSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EditorToolbarProps {
  editor: Editor;
  onAddImage: () => void;
  onSetLink: () => void;
  onRemoveLink: () => void;
  showLinkInput: boolean;
  linkUrl: string;
  onLinkUrlChange: (url: string) => void;
  onLinkSubmit: () => void;
}

function ToolBtn({ icon: Icon, label, isActive, onClick, disabled }: {
  icon: any; label: string; isActive?: boolean; onClick: () => void; disabled?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className={`h-8 w-8 p-0 ${isActive ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function EditorToolbar({
  editor, onAddImage, onSetLink, onRemoveLink,
  showLinkInput, linkUrl, onLinkUrlChange, onLinkSubmit,
}: EditorToolbarProps) {
  return (
    <div className="border-b border-border/50 bg-muted/30 sticky top-0 z-10">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
        <ToolBtn icon={Undo} label="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} />
        <ToolBtn icon={Redo} label="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} />
        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolBtn icon={Bold} label="Bold" isActive={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
        <ToolBtn icon={Italic} label="Italic" isActive={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
        <ToolBtn icon={Underline} label="Underline" isActive={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} />
        <ToolBtn icon={Strikethrough} label="Strikethrough" isActive={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} />
        <ToolBtn icon={Highlighter} label="Highlight" isActive={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} />
        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolBtn icon={Heading1} label="Heading 1" isActive={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
        <ToolBtn icon={Heading2} label="Heading 2" isActive={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
        <ToolBtn icon={Heading3} label="Heading 3" isActive={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolBtn icon={List} label="Bullet list" isActive={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <ToolBtn icon={ListOrdered} label="Numbered list" isActive={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
        <ToolBtn icon={Quote} label="Blockquote" isActive={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
        <ToolBtn icon={Code} label="Inline code" isActive={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} />
        <ToolBtn icon={CodeSquare} label="Code block" isActive={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
        <ToolBtn icon={Minus} label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolBtn icon={AlignLeft} label="Align left" isActive={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} />
        <ToolBtn icon={AlignCenter} label="Align center" isActive={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} />
        <ToolBtn icon={AlignRight} label="Align right" isActive={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} />
        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolBtn icon={ImagePlus} label="Insert image" onClick={onAddImage} />
        <ToolBtn icon={Link} label="Add link" isActive={editor.isActive("link")} onClick={onSetLink} />
        {editor.isActive("link") && (
          <ToolBtn icon={Unlink} label="Remove link" onClick={onRemoveLink} />
        )}
      </div>

      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-border/30 bg-muted/50">
          <Input
            value={linkUrl}
            onChange={(e) => onLinkUrlChange(e.target.value)}
            placeholder="https://example.com"
            className="h-8 text-sm flex-1"
            onKeyDown={(e) => e.key === "Enter" && onLinkSubmit()}
            autoFocus
          />
          <Button type="button" size="sm" className="h-8" onClick={onLinkSubmit}>Apply</Button>
        </div>
      )}
    </div>
  );
}
