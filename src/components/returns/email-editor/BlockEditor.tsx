import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RhNotificationEventType } from '@/types/returns-hub';
import type { EmailBlock, EmailDesignConfig } from './emailEditorTypes';
import { SubjectLineEditor } from './SubjectLineEditor';
import { BlockEditorToolbar } from './BlockEditorToolbar';
import { BlockEditorBlock } from './BlockEditorBlock';
import { VariableInserter } from './VariableInserter';

interface BlockEditorProps {
  subject: string;
  onSubjectChange: (subject: string) => void;
  designConfig: EmailDesignConfig;
  onDesignConfigChange: (config: EmailDesignConfig) => void;
  eventType: RhNotificationEventType;
  locale: string;
  onLocaleChange: (locale: string) => void;
}

export function BlockEditor({
  subject,
  onSubjectChange,
  designConfig,
  onDesignConfigChange,
  eventType,
  locale,
  onLocaleChange,
}: BlockEditorProps) {
  const { t } = useTranslation('returns');
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const isLocale = locale !== 'en';
  const localeContent = isLocale ? designConfig.locales?.[locale] : undefined;
  const blocks = localeContent?.blocks || designConfig.blocks;
  const currentSubject = (isLocale && localeContent?.subjectTemplate) || subject;

  const updateBlocks = (newBlocks: EmailBlock[]) => {
    if (isLocale) {
      const updatedLocales = { ...designConfig.locales };
      updatedLocales[locale] = { ...updatedLocales[locale], blocks: newBlocks };
      onDesignConfigChange({ ...designConfig, locales: updatedLocales });
    } else {
      onDesignConfigChange({ ...designConfig, blocks: newBlocks });
    }
  };

  const handleSubjectChange = (val: string) => {
    if (isLocale) {
      const updatedLocales = { ...designConfig.locales };
      updatedLocales[locale] = { ...updatedLocales[locale], subjectTemplate: val };
      onDesignConfigChange({ ...designConfig, locales: updatedLocales });
    } else {
      onSubjectChange(val);
    }
  };

  const handleAddBlock = (block: EmailBlock) => {
    const newBlocks = [...blocks, block];
    updateBlocks(newBlocks);
    setSelectedBlockIndex(newBlocks.length - 1);
  };

  const handleUpdateBlock = (index: number, block: EmailBlock) => {
    const newBlocks = [...blocks];
    newBlocks[index] = block;
    updateBlocks(newBlocks);
  };

  const handleDeleteBlock = (index: number) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    updateBlocks(newBlocks);
    setSelectedBlockIndex(null);
  };

  const handleDuplicateBlock = (index: number) => {
    const original = blocks[index];
    const duplicate = { ...original, id: Math.random().toString(36).slice(2, 10) };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, duplicate);
    updateBlocks(newBlocks);
    setSelectedBlockIndex(index + 1);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newBlocks = [...blocks];
    [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    updateBlocks(newBlocks);
    setSelectedBlockIndex(index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index === blocks.length - 1) return;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    updateBlocks(newBlocks);
    setSelectedBlockIndex(index + 1);
  };

  const handleInsertVariable = (variable: string) => {
    if (selectedBlockIndex === null) return;
    const block = blocks[selectedBlockIndex];
    if (block.type === 'text') {
      handleUpdateBlock(selectedBlockIndex, { ...block, content: block.content + variable });
    } else if (block.type === 'info-box') {
      handleUpdateBlock(selectedBlockIndex, { ...block, value: block.value + variable });
    } else if (block.type === 'button') {
      handleUpdateBlock(selectedBlockIndex, { ...block, text: block.text + variable });
    }
  };

  return (
    <div className="space-y-4">
      {/* Language toggle */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => onLocaleChange('en')}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            locale === 'en' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'
          }`}
        >
          EN
        </button>
        <button
          onClick={() => onLocaleChange('de')}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            locale === 'de' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'
          }`}
        >
          DE
        </button>
      </div>

      <SubjectLineEditor
        value={currentSubject}
        onChange={handleSubjectChange}
        eventType={eventType}
      />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t('Email Body')} ({locale.toUpperCase()})</h3>
        <VariableInserter eventType={eventType} onInsert={handleInsertVariable} />
      </div>

      <BlockEditorToolbar onAddBlock={handleAddBlock} />

      <div className="space-y-2">
        {blocks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
            {t('Add blocks to build your email')}
          </div>
        ) : (
          blocks.map((block, index) => (
            <div
              key={block.id}
              className={index === blocks.length - 1 ? '' : ''}
              style={{
                animation: 'block-insert 0.2s ease-out',
              }}
            >
              <BlockEditorBlock
                block={block}
                isSelected={selectedBlockIndex === index}
                isFirst={index === 0}
                isLast={index === blocks.length - 1}
                onSelect={() => setSelectedBlockIndex(selectedBlockIndex === index ? null : index)}
                onChange={(b) => handleUpdateBlock(index, b)}
                onDelete={() => handleDeleteBlock(index)}
                onDuplicate={() => handleDuplicateBlock(index)}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
