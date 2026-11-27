import React, { useState } from 'react';
import { X, Plus, Trash2, CheckSquare, Square, StickyNote, Calculator } from 'lucide-react';
import type { NoteItem, TaskItem } from '../browser/types';
import { evaluateCalculatorExpression } from '../browser/engine';

interface ProductivityDrawerProps {
  notes: NoteItem[];
  tasks: TaskItem[];
  accentColor: string;
  onAddNote: (title: string, body: string) => void;
  onDeleteNote: (id: string) => void;
  onAddTask: (text: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onClose: () => void;
}

export const ProductivityDrawer: React.FC<ProductivityDrawerProps> = ({
  notes,
  tasks,
  accentColor,
  onAddNote,
  onDeleteNote,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onClose,
}) => {
  const [tab, setTab] = useState<'notes' | 'tasks' | 'calc'>('notes');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [taskInput, setTaskInput] = useState('');
  const [calcExpr, setCalcExpr] = useState('0');

  const pressCalc = (val: string) => {
    if (val === 'C') {
      setCalcExpr('0');
    } else if (val === '=') {
      setCalcExpr(evaluateCalculatorExpression(calcExpr));
    } else if (val === 'DEL') {
      setCalcExpr((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
    } else {
      setCalcExpr((prev) => (prev === '0' || prev === 'Error' ? val : prev + val));
    }
  };

  return (
    <aside
      aria-label="Productivity tools"
      className="w-72 shrink-0 border-l border-slate-200 dark:border-white/10 bg-white dark:bg-[#0D111E] flex flex-col text-xs"
    >
      <div className="px-3.5 py-2.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
        <span className="font-display font-semibold text-sm text-slate-900 dark:text-white">
          Workspace Tools
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500"
          aria-label="Close workspace tools"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-2 flex items-center gap-1 border-b border-slate-200 dark:border-white/10">
        {[
          { id: 'notes' as const, label: 'Notes', icon: StickyNote },
          { id: 'tasks' as const, label: 'Tasks', icon: CheckSquare },
          { id: 'calc' as const, label: 'Calculator', icon: Calculator },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'text-white'
                  : 'text-slate-600 dark:text-[#9AA3B5] hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
              style={active ? { backgroundColor: accentColor } : undefined}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-3.5">
        {tab === 'notes' && (
          <div className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!noteTitle.trim() && !noteBody.trim()) return;
                onAddNote(noteTitle.trim() || 'Untitled Note', noteBody.trim());
                setNoteTitle('');
                setNoteBody('');
              }}
              className="space-y-2"
            >
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note title"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D] text-slate-900 dark:text-white outline-none focus:border-[#4A8DFF]"
              />
              <textarea
                rows={3}
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Write a local note..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D] text-slate-900 dark:text-white outline-none focus:border-[#4A8DFF] resize-none"
              />
              <button
                type="submit"
                className="w-full py-1.5 rounded-lg text-white font-medium flex items-center justify-center gap-1.5"
                style={{ backgroundColor: accentColor }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Note</span>
              </button>
            </form>

            <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-white/10">
              {notes.length === 0 ? (
                <p className="text-slate-500 dark:text-[#9AA3B5]">No local notes saved yet.</p>
              ) : (
                notes.map((n) => (
                  <div
                    key={n.id}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#101525]"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-medium text-slate-900 dark:text-white">{n.title}</span>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(n.id)}
                        aria-label={`Delete note ${n.title}`}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-slate-600 dark:text-[#9AA3B5] whitespace-pre-wrap">{n.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'tasks' && (
          <div className="space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!taskInput.trim()) return;
                onAddTask(taskInput.trim());
                setTaskInput('');
              }}
              className="flex gap-1.5"
            >
              <input
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Add a task..."
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D] text-slate-900 dark:text-white outline-none focus:border-[#4A8DFF]"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg text-white font-medium"
                style={{ backgroundColor: accentColor }}
                aria-label="Add task"
              >
                Add
              </button>
            </form>

            <div className="space-y-1.5">
              {tasks.length === 0 ? (
                <p className="text-slate-500 dark:text-[#9AA3B5]">No tasks yet.</p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 dark:border-white/10"
                  >
                    <button
                      type="button"
                      onClick={() => onToggleTask(task.id)}
                      className="flex items-center gap-2 text-left min-w-0 flex-1"
                    >
                      {task.done ? (
                        <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span
                        className={`truncate ${
                          task.done
                            ? 'line-through text-slate-400'
                            : 'text-slate-800 dark:text-[#F5F7FF]'
                        }`}
                      >
                        {task.text}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      aria-label={`Delete task ${task.text}`}
                      className="text-slate-400 hover:text-red-500 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'calc' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D] text-right font-mono text-lg tabular-nums text-slate-900 dark:text-white overflow-x-auto">
              {calcExpr}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {['C', '(', ')', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', 'DEL', '='].map(
                (btn) => (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => pressCalc(btn)}
                    className={`py-2.5 rounded-lg font-mono text-xs font-medium transition-colors ${
                      btn === '='
                        ? 'text-white'
                        : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-900 dark:text-white'
                    }`}
                    style={btn === '=' ? { backgroundColor: accentColor } : undefined}
                  >
                    {btn}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
