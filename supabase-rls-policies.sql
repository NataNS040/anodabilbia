-- ============================================
-- POLÍTICAS RLS PARA ANODABIBLIA.COM
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. HABILITAR RLS nas tabelas (se ainda não estiver)
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

-- 2. REMOVER POLÍTICAS ANTIGAS (se existirem)
DROP POLICY IF EXISTS "Usuários podem ler seu próprio perfil" ON user_profile;
DROP POLICY IF EXISTS "Usuários podem criar seu próprio perfil" ON user_profile;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON user_profile;
DROP POLICY IF EXISTS "Usuários podem ler seu próprio progresso" ON reading_progress;
DROP POLICY IF EXISTS "Usuários podem inserir seu próprio progresso" ON reading_progress;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio progresso" ON reading_progress;
DROP POLICY IF EXISTS "Usuários podem deletar seu próprio progresso" ON reading_progress;

-- ============================================
-- POLÍTICAS PARA user_profile
-- ============================================

-- Permitir que usuários leiam seu próprio perfil
CREATE POLICY "Usuários podem ler seu próprio perfil"
ON user_profile
FOR SELECT
USING (auth.uid() = user_id);

-- Permitir que novos usuários criem seu perfil
CREATE POLICY "Usuários podem criar seu próprio perfil"
ON user_profile
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Permitir que usuários atualizem seu próprio perfil
CREATE POLICY "Usuários podem atualizar seu próprio perfil"
ON user_profile
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS PARA reading_progress
-- ============================================

-- Permitir que usuários leiam seu próprio progresso
CREATE POLICY "Usuários podem ler seu próprio progresso"
ON reading_progress
FOR SELECT
USING (auth.uid() = user_id);

-- Permitir que usuários insiram seu próprio progresso
CREATE POLICY "Usuários podem inserir seu próprio progresso"
ON reading_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Permitir que usuários atualizem seu próprio progresso
CREATE POLICY "Usuários podem atualizar seu próprio progresso"
ON reading_progress
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Permitir que usuários deletem seu próprio progresso
CREATE POLICY "Usuários podem deletar seu próprio progresso"
ON reading_progress
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Verificar se as políticas foram criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('user_profile', 'reading_progress')
ORDER BY tablename, policyname;
