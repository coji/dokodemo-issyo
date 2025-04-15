-- Add columns for character state management
ALTER TABLE characters ADD COLUMN mood TEXT DEFAULT 'normal';
ALTER TABLE characters ADD COLUMN learned_words TEXT DEFAULT '[]';
ALTER TABLE characters ADD COLUMN relationship_level INTEGER DEFAULT 0;
ALTER TABLE characters ADD COLUMN current_activity TEXT DEFAULT 'normal';
