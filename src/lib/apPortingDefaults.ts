import type { Subject } from "@/types/firestore";
import type { OutputData } from "@editorjs/editorjs";

export const DEFAULT_PORTING_SUBJECT: Subject = {
  title: "AP Porting",
  units: [
    {
      id: "porting-unit-1",
      title: "Unit 1: Porting Basics",
      chapters: [
        {
          id: "porting-chap-1",
          title: "Chapter 1: Formatting Practice",
          isPublic: true,
        },
        {
          id: "porting-chap-2",
          title: "Chapter 2: Advanced Layouts",
          isPublic: true,
        }
      ],
      tests: [
        {
          id: "porting-test-1",
          name: "Porting MCQs",
          questions: [
            {
              question: { value: "What is the primary formatting syntax used on FiveHive?", files: [] },
              type: "mcq",
              options: [
                { id: "opt-1", value: { value: "Markdown & EditorJS", files: [] } },
                { id: "opt-2", value: { value: "HTML directly", files: [] } },
                { id: "opt-3", value: { value: "PlainText", files: [] } },
                { id: "opt-4", value: { value: "BBCode", files: [] } }
              ],
              answers: ["opt-1"],
              explanation: { value: "FiveHive uses EditorJS and supporting block structures for formatting article chapters.", files: [] },
              content: { value: "Porting uses EditorJS. Please review the options.", files: [] },
              topic: "Porting Basics"
            }
          ],
          time: 600,
          directions: "Answer the practice questions to test your porting skills.",
          isPublic: true
        }
      ]
    }
  ]
};

export const DEFAULT_PORTING_ARTICLES: Record<string, OutputData> = {
  "porting-chap-1": {
    time: Date.now(),
    blocks: [
      {
        id: "block-1",
        type: "header",
        data: { text: "Welcome to AP Porting Practice", level: 1 },
      },
      {
        id: "block-2",
        type: "header",
        data: { text: "Getting Started with Articles", level: 2 },
      },
      {
        id: "block-3",
        type: "paragraph",
        data: { text: "This is a default prompt/article designed for porters to practice editing, formatting, and saving content. Try adding a new list or table!" },
      }
    ],
    version: "2.30.2"
  },
  "porting-chap-2": {
    time: Date.now(),
    blocks: [
      {
        id: "block-a",
        type: "header",
        data: { text: "Advanced Layouts & Testing", level: 1 },
      },
      {
        id: "block-b",
        type: "paragraph",
        data: { text: "You can practice complex elements like adding multiple-choice questions inline or using equations with LaTeX." },
      }
    ],
    version: "2.30.2"
  }
};
