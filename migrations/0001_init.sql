-- Migration number: 0001 	 2025-04-14T13:00:44.166Z
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  message TEXT NOT NULL,
  response TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  personality TEXT NOT NULL, -- 性格
  tone TEXT NOT NULL,      -- 口調
  default_response TEXT NOT NULL -- デフォルト応答
  -- 他にもキャラクター固有のパラメータを追加できます (例: 好感度、興味のある話題など)
);

-- キャラクターのサンプルデータ
INSERT INTO characters (name, personality, 口調, default_response) VALUES
  ('トロ', '元気で明るい', '～なのニャ', 'へへー、ボク、トロ！よろしくニャ！'),
  ('クロ', 'クールで知的', '～だよ', 'ふん、クロ様だ。何か用か？');
