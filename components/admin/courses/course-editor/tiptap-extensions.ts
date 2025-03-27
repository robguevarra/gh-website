import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import CodeBlock from '@tiptap/extension-code-block'
import Youtube from '@tiptap/extension-youtube'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { Extension } from '@tiptap/core'

// Custom extension for quiz blocks
const QuizBlock = Extension.create({
  name: 'quizBlock',
  addCommands() {
    return {
      setQuizBlock: () => ({ commands }) => {
        return commands.insertContent({
          type: 'quizBlock',
          content: [{ type: 'paragraph' }],
        })
      },
    }
  },
})

// Custom extension for assignment blocks
const AssignmentBlock = Extension.create({
  name: 'assignmentBlock',
  addCommands() {
    return {
      setAssignmentBlock: () => ({ commands }) => {
        return commands.insertContent({
          type: 'assignmentBlock',
          content: [{ type: 'paragraph' }],
        })
      },
    }
  },
})

export const extensions = [
  StarterKit,
  Placeholder.configure({
    placeholder: 'Start writing your lesson content...',
  }),
  Image.configure({
    HTMLAttributes: {
      class: 'rounded-lg max-w-full h-auto',
    },
    addAttributes() {
      return {
        src: {
          default: null,
        },
        alt: {
          default: null,
        },
      }
    },
  }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      rel: 'noopener noreferrer',
      class: 'text-primary hover:underline',
    },
  }),
  Table.configure({
    HTMLAttributes: {
      class: 'border-collapse table-auto w-full',
    },
  }),
  TableRow.configure({
    HTMLAttributes: {
      class: 'border-b',
    },
  }),
  TableCell.configure({
    HTMLAttributes: {
      class: 'border p-2',
    },
  }),
  TableHeader.configure({
    HTMLAttributes: {
      class: 'border p-2 bg-muted font-semibold',
    },
  }),
  CodeBlock.configure({
    HTMLAttributes: {
      class: 'rounded-lg bg-muted p-4 font-mono',
    },
  }),
  Youtube.configure({
    HTMLAttributes: {
      class: 'w-full aspect-video rounded-lg',
    },
  }),
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  Underline,
  QuizBlock,
  AssignmentBlock,
] 