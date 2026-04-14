-- Append CHAT ASSISTANT section to existing General Instructions, or create it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM knowledge_base WHERE category = 'instructions') THEN
    UPDATE knowledge_base
    SET content = content || E'\n\nCHAT ASSISTANT\n- When answering questions about deals, always reference the merchant/deal by name.\n- If multiple deals match a query, list them all briefly rather than picking one.\n- For document status questions, specify exactly which documents are missing vs. complete.',
        updated_at = now()
    WHERE category = 'instructions';
  ELSE
    INSERT INTO knowledge_base (category, title, content)
    VALUES (
      'instructions',
      'General Instructions',
      E'CHAT ASSISTANT\n- When answering questions about deals, always reference the merchant/deal by name.\n- If multiple deals match a query, list them all briefly rather than picking one.\n- For document status questions, specify exactly which documents are missing vs. complete.'
    );
  END IF;
END $$;
