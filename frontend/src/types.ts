export type SheetRow = {
  [key: string]: string | number | boolean | null;
};

export type Message = {
  role: 'user' | 'assistant';
  content: string;
  preview?: SheetRow;
};